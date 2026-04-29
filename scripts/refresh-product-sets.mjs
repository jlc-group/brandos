import dotenv from "dotenv";
import pg from "pg";

const BRANDOS_ENV_PATH = process.env.BRANDOS_ENV_PATH ?? "D:/Server/run/brandos/.env.prod";
const brandId = Number(process.env.BRANDOS_LEGACY_BRAND_ID ?? "1");

dotenv.config({ path: BRANDOS_ENV_PATH });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function buildName(codes) {
  return codes.join(" + ");
}

async function refreshProductSets({ apply }) {
  const contentSets = await pool.query(`
    with mapped as (
      select
        ch."id" as "contentHistoryId",
        ch."brandId",
        ch."views",
        ch."reach",
        ch."totalMediaCost",
        ch."pfmScore",
        ch."publishedAt",
        array_agg(s."id" order by s."sku") as sku_ids,
        array_agg(s."sku" order by s."sku") as sku_codes,
        array_agg(s."name" order by s."sku") as sku_names
      from "content_history" ch
      join "content_history_skus" chs on chs."contentHistoryId" = ch."id"
      join "skus" s on s."id" = chs."skuId"
      where ch."brandId" = $1
      group by ch."id"
      having count(*) > 0
    )
    select
      "brandId",
      array_to_string(sku_codes, ',') as key,
      sku_ids,
      sku_codes,
      sku_names,
      count(*)::int as "contentCount",
      coalesce(sum("views"), 0)::real as "totalViews",
      coalesce(sum("reach"), 0)::real as "totalReach",
      coalesce(sum("totalMediaCost"), 0)::real as "totalMediaCost",
      coalesce(avg("pfmScore"), 0)::real as "avgPfmScore",
      max("publishedAt") as "lastContentAt"
    from mapped
    group by "brandId", sku_ids, sku_codes, sku_names
    order by count(*) desc, key asc
  `, [brandId]);

  const stats = {
    discoveredSets: contentSets.rowCount,
    insertedOrUpdated: 0,
    skuLinksInserted: 0,
    staleDeactivated: 0,
  };

  if (!apply) return stats;

  const activeKeys = [];
  for (const set of contentSets.rows) {
    activeKeys.push(set.key);
    const result = await pool.query(`
      insert into "product_sets" (
        "brandId", "key", "name", "skuCount", "contentCount", "totalViews", "totalReach",
        "totalMediaCost", "avgPfmScore", "lastContentAt", "source", "status", "createdAt", "updatedAt"
      )
      values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'auto','active',now(),now())
      on conflict ("brandId", "key") do update set
        "name" = excluded."name",
        "skuCount" = excluded."skuCount",
        "contentCount" = excluded."contentCount",
        "totalViews" = excluded."totalViews",
        "totalReach" = excluded."totalReach",
        "totalMediaCost" = excluded."totalMediaCost",
        "avgPfmScore" = excluded."avgPfmScore",
        "lastContentAt" = excluded."lastContentAt",
        "status" = 'active',
        "updatedAt" = now()
      returning "id"
    `, [
      brandId,
      set.key,
      buildName(set.sku_codes),
      set.sku_codes.length,
      set.contentCount,
      set.totalViews,
      set.totalReach,
      set.totalMediaCost,
      set.avgPfmScore,
      set.lastContentAt,
    ]);

    const productSetId = result.rows[0].id;
    await pool.query(`delete from "product_set_skus" where "productSetId" = $1`, [productSetId]);
    for (const [index, skuId] of set.sku_ids.entries()) {
      await pool.query(`
        insert into "product_set_skus"
          ("productSetId", "skuId", "skuCodeSnapshot", "skuNameSnapshot", "position", "createdAt")
        values ($1,$2,$3,$4,$5,now())
      `, [productSetId, skuId, set.sku_codes[index], set.sku_names[index], index]);
      stats.skuLinksInserted += 1;
    }
    stats.insertedOrUpdated += 1;
  }

  if (activeKeys.length > 0) {
    const stale = await pool.query(`
      update "product_sets"
      set "status" = 'inactive', "updatedAt" = now()
      where "brandId" = $1 and not ("key" = any($2::text[]))
    `, [brandId, activeKeys]);
    stats.staleDeactivated = stale.rowCount ?? 0;
  }

  return stats;
}

async function verifyProductSets() {
  const result = await pool.query(`
    select
      count(*)::int as "sets",
      coalesce(sum("contentCount"), 0)::int as "contentSetLinks",
      coalesce(max("skuCount"), 0)::int as "maxSkus",
      count(*) filter (where "skuCount" > 1)::int as "multiSkuSets"
    from "product_sets"
    where "brandId" = $1 and "status" = 'active'
  `, [brandId]);
  return result.rows[0];
}

async function main() {
  const mode = process.argv[2] ?? "dry-run";
  if (!["dry-run", "apply", "verify"].includes(mode)) {
    throw new Error("Usage: node scripts/refresh-product-sets.mjs [dry-run|apply|verify]");
  }
  try {
    if (mode === "verify") {
      console.log(JSON.stringify({ mode, brandId, verification: await verifyProductSets() }, null, 2));
      return;
    }
    const refresh = await refreshProductSets({ apply: mode === "apply" });
    const verification = mode === "apply" ? await verifyProductSets() : undefined;
    console.log(JSON.stringify({ mode, brandId, refresh, verification }, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
