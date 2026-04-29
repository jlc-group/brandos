import fs from "node:fs";
import { Pool } from "pg";

const LEGACY_ENV_PATH = process.env.LEGACY_TIKTOK_ENV_PATH ?? "D:/Backup/program_old/TiktokPFMWebApp/.env";
const BRANDOS_ENV_PATH = process.env.BRANDOS_ENV_PATH ?? "D:/Server/run/brandos/.env.prod";
const brandId = Number(process.env.BRANDOS_LEGACY_BRAND_ID ?? "1");

function parseEnvFile(path) {
  const env = {};
  const text = fs.readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    env[key] = value;
  }
  return env;
}

function getRequiredEnv(env, key) {
  const value = env[key];
  if (!value) throw new Error(`Missing ${key}`);
  return value;
}

function parseProductCodes(value) {
  if (!value) return [];
  const parsed = typeof value === "string" ? safeJsonParse(value) : value;
  if (Array.isArray(parsed)) {
    return parsed.map((item) => String(item).trim()).filter(Boolean).sort();
  }
  return String(value)
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean)
    .sort();
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch (_error) {
    return value;
  }
}

async function ensureLegacySkus(legacyDb, brandosDb) {
  const products = await legacyDb.query(`
    select code, productname, status, allocate_status
    from products
    where code is not null and productname is not null
    order by code
  `);

  let inserted = 0;
  let updated = 0;
  for (const product of products.rows) {
    const existing = await brandosDb.query(
      `select id from skus where "brandId" = $1 and sku = $2 limit 1`,
      [brandId, product.code],
    );
    if (existing.rowCount) {
      await brandosDb.query(
        `update skus
         set name = $1, category = $2, "isActive" = $3, "updatedAt" = now()
         where id = $4`,
        [product.productname, product.status || "Legacy", product.allocate_status !== false, existing.rows[0].id],
      );
      updated += 1;
    } else {
      await brandosDb.query(
        `insert into skus ("brandId", sku, name, category, "isActive", "createdAt", "updatedAt")
         values ($1, $2, $3, $4, $5, now(), now())`,
        [brandId, product.code, product.productname, product.status || "Legacy", product.allocate_status !== false],
      );
      inserted += 1;
    }
  }

  return { fetched: products.rowCount, inserted, updated };
}

async function loadSkuMap(brandosDb) {
  const result = await brandosDb.query(`select id, sku, name from skus where "brandId" = $1`, [brandId]);
  return new Map(result.rows.map((sku) => [sku.sku, sku]));
}

async function backfillMappings({ legacyDb, brandosDb, apply }) {
  const legacyPosts = await legacyDb.query(`
    select item_id, products_json
    from tiktok_posts
    where item_id is not null
      and products_json is not null
      and coalesce(content_status, '') <> 'DELETED'
    order by create_time asc
  `);
  const skuMap = await loadSkuMap(brandosDb);

  const stats = {
    legacyPosts: legacyPosts.rowCount,
    postsWithProducts: 0,
    matchedContents: 0,
    missingContents: 0,
    missingSkus: new Map(),
    mappingsInserted: 0,
    mappingsDeleted: 0,
    compatibilitySkuUpdated: 0,
  };

  for (const post of legacyPosts.rows) {
    const productCodes = parseProductCodes(post.products_json);
    if (productCodes.length === 0) continue;
    stats.postsWithProducts += 1;

    const content = await brandosDb.query(
      `select id from content_history where platform = 'tiktok' and "externalId" = $1 limit 1`,
      [post.item_id],
    );
    if (!content.rowCount) {
      stats.missingContents += 1;
      continue;
    }
    stats.matchedContents += 1;

    const contentHistoryId = content.rows[0].id;
    const skuRows = [];
    for (const code of productCodes) {
      const sku = skuMap.get(code);
      if (!sku) {
        stats.missingSkus.set(code, (stats.missingSkus.get(code) ?? 0) + 1);
        continue;
      }
      skuRows.push(sku);
    }

    if (!apply) continue;

    const deleted = await brandosDb.query(
      `delete from content_history_skus where "contentHistoryId" = $1`,
      [contentHistoryId],
    );
    stats.mappingsDeleted += deleted.rowCount ?? 0;

    for (const [index, sku] of skuRows.entries()) {
      await brandosDb.query(
        `insert into content_history_skus
          ("contentHistoryId", "skuId", "skuCodeSnapshot", "skuNameSnapshot", position, "createdAt")
         values ($1, $2, $3, $4, $5, now())
         on conflict ("contentHistoryId", "skuId") do update set
           "skuCodeSnapshot" = excluded."skuCodeSnapshot",
           "skuNameSnapshot" = excluded."skuNameSnapshot",
           position = excluded.position`,
        [contentHistoryId, sku.id, sku.sku, sku.name, index],
      );
      stats.mappingsInserted += 1;
    }

    await brandosDb.query(
      `update content_history set "skuId" = $1, "updatedAt" = now() where id = $2`,
      [skuRows[0]?.id ?? null, contentHistoryId],
    );
    stats.compatibilitySkuUpdated += 1;
  }

  return {
    ...stats,
    missingSkus: Object.fromEntries([...stats.missingSkus.entries()].sort((a, b) => b[1] - a[1])),
  };
}

async function verifyMappings(brandosDb) {
  const [mappingRows, mappedContents, multiSkuContents, maxSkusPerContent] = await Promise.all([
    brandosDb.query(`select count(*)::int as count from content_history_skus`),
    brandosDb.query(`select count(distinct "contentHistoryId")::int as count from content_history_skus`),
    brandosDb.query(`
      select count(*)::int as count
      from (
        select "contentHistoryId"
        from content_history_skus
        group by "contentHistoryId"
        having count(*) > 1
      ) mapped
    `),
    brandosDb.query(`
      select coalesce(max(sku_count), 0)::int as count
      from (
        select count(*) as sku_count
        from content_history_skus
        group by "contentHistoryId"
      ) mapped
    `),
  ]);

  return {
    mappingRows: mappingRows.rows[0]?.count ?? 0,
    mappedContents: mappedContents.rows[0]?.count ?? 0,
    multiSkuContents: multiSkuContents.rows[0]?.count ?? 0,
    maxSkusPerContent: maxSkusPerContent.rows[0]?.count ?? 0,
  };
}

async function main() {
  const mode = process.argv[2] ?? "dry-run";
  const apply = mode === "apply";
  if (!["dry-run", "apply", "verify"].includes(mode)) {
    throw new Error("Usage: node scripts/legacy-product-mapping-backfill.mjs [dry-run|apply|verify]");
  }

  const legacyEnv = parseEnvFile(LEGACY_ENV_PATH);
  const brandosEnv = parseEnvFile(BRANDOS_ENV_PATH);
  const legacyDb = new Pool({
    connectionString: getRequiredEnv(legacyEnv, "DATABASE_URL"),
    ssl: { rejectUnauthorized: false },
  });
  const brandosDb = new Pool({ connectionString: getRequiredEnv(brandosEnv, "DATABASE_URL") });

  try {
    if (mode === "verify") {
      console.log(JSON.stringify({ mode, brandId, verification: await verifyMappings(brandosDb) }, null, 2));
      return;
    }
    const skus = apply ? await ensureLegacySkus(legacyDb, brandosDb) : { skipped: true };
    const mappings = await backfillMappings({ legacyDb, brandosDb, apply });
    const verification = apply ? await verifyMappings(brandosDb) : undefined;
    console.log(JSON.stringify({ mode, brandId, skus, mappings, verification }, null, 2));
  } finally {
    await legacyDb.end();
    await brandosDb.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
