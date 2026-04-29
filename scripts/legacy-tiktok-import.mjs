import fs from "node:fs";
import { Pool } from "pg";

const LEGACY_ENV_PATH = process.env.LEGACY_TIKTOK_ENV_PATH ?? "D:/Backup/program_old/TiktokPFMWebApp/.env";
const BRANDOS_ENV_PATH = process.env.BRANDOS_ENV_PATH ?? "D:/Server/run/brandos/.env.prod";
let brandId = Number(process.env.BRANDOS_LEGACY_BRAND_ID ?? "1");

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

function updateEnvFile(path, updates) {
  const lines = fs.existsSync(path) ? fs.readFileSync(path, "utf8").split(/\r?\n/) : [];
  const seen = new Set();
  const next = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) return line;
    const key = trimmed.slice(0, trimmed.indexOf("=")).trim();
    if (!(key in updates)) return line;
    seen.add(key);
    return `${key}=${updates[key]}`;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!value || seen.has(key)) continue;
    next.push(`${key}=${value}`);
  }

  fs.writeFileSync(path, next.join("\n").replace(/\n{3,}/g, "\n\n"), "utf8");
}

function getRequiredEnv(env, key) {
  const value = env[key];
  if (!value) throw new Error(`Missing ${key}`);
  return value;
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toJsonValue(value) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (_error) {
    return value;
  }
}

function trimTitle(value, fallback) {
  const normalized = String(value ?? "").trim() || fallback;
  return normalized.length > 300 ? `${normalized.slice(0, 297)}...` : normalized;
}

function mapContentType(value) {
  const text = String(value ?? "").toUpperCase();
  if (text.includes("SALE") || text.includes("SELL") || text.includes("PROMO")) return "SALE";
  if (text.includes("REVIEW")) return "REVIEW";
  if (text.includes("ENTERTAIN")) return "ENTERTAINMENT";
  if (text.includes("LIFESTYLE")) return "LIFESTYLE";
  if (text.includes("HOOK")) return "HOOK";
  if (text.includes("CHALLENGE")) return "CHALLENGE";
  if (text.includes("COLLAB")) return "COLLAB";
  return "EDUCATION";
}

async function inspectLegacyDb(legacyDb) {
  const tables = ["products", "tiktok_posts", "tiktok_ads_account", "content_type", "content_status", "product_groups"];
  const counts = {};
  for (const table of tables) {
    try {
      const result = await legacyDb.query(`select count(*)::int as count from ${table}`);
      counts[table] = result.rows[0]?.count ?? 0;
    } catch (_error) {
      counts[table] = "missing";
    }
  }

  const range = await legacyDb.query(`
    select min(create_time) as earliest, max(create_time) as latest
    from tiktok_posts
    where create_time is not null
  `);

  return { counts, tiktokPostsRange: range.rows[0] };
}

async function configureBrandosEnv(legacyEnv) {
  const updates = {
    TIKTOK_MAIN_ACCESS_TOKEN: legacyEnv.TIKTOK_MAIN_ACCESS_TOKEN,
    TIKTOK_ACCESS_TOKEN: legacyEnv.TIKTOK_MAIN_ACCESS_TOKEN,
    TIKTOK_AD_TOKEN: legacyEnv.TIKTOK_AD_TOKEN,
    TIKTOK_BUSINESS_ID: legacyEnv.BUSINESS_ID,
    TIKTOK_ADVERTISER_ID: legacyEnv.ADVERTISER_ID_IDAC_MAIN,
    TIKTOK_ADVERTISER_ID_IDAC_MAIN: legacyEnv.ADVERTISER_ID_IDAC_MAIN,
    TIKTOK_ADVERTISER_ID_IDAC_ECOM: legacyEnv.ADVERTISER_ID_IDAC_ECOM,
    TIKTOK_ADVERTISER_ID_IDAC_JDENT: legacyEnv.ADVERTISER_ID_IDAC_JDENT,
    TIKTOK_ADVERTISER_ID_ENTRA: legacyEnv.ADVERTISER_ID_ENTRA,
    TIKTOK_ADVERTISER_ID_GRVT: legacyEnv.ADVERTISER_ID_GRVT,
  };

  updateEnvFile(BRANDOS_ENV_PATH, updates);
  return Object.fromEntries(Object.entries(updates).map(([key, value]) => [key, Boolean(value)]));
}

async function ensureBrand(brandosDb) {
  if (Number.isFinite(brandId) && brandId > 0) {
    const byId = await brandosDb.query(`select id from brands where id = $1 limit 1`, [brandId]);
    if (byId.rowCount) return brandId;
  }

  const result = await brandosDb.query(
    `insert into brands (name, slug, description, vertical, "isActive", "createdAt", "updatedAt")
     values ($1, $2, $3, $4, true, now(), now())
     on conflict (slug) do update set
       name = excluded.name,
       description = excluded.description,
       vertical = excluded.vertical,
       "isActive" = true,
       "updatedAt" = now()
     returning id`,
    ["Jula's Herb", "julas-herb", "Imported from legacy TikTok PFM system", "Beauty and Health"],
  );
  brandId = result.rows[0].id;
  return brandId;
}

async function importProducts(legacyDb, brandosDb) {
  const result = await legacyDb.query(`
    select code, productname, status, allocate_status
    from products
    where code is not null and productname is not null
    order by code
  `);

  let inserted = 0;
  let updated = 0;
  for (const row of result.rows) {
    const existing = await brandosDb.query(`select id from skus where "brandId" = $1 and sku = $2 limit 1`, [
      brandId,
      row.code,
    ]);

    if (existing.rowCount) {
      await brandosDb.query(
        `update skus set name = $1, category = $2, "isActive" = $3, "updatedAt" = now() where id = $4`,
        [row.productname, row.status || "Legacy", row.allocate_status !== false, existing.rows[0].id],
      );
      updated += 1;
    } else {
      await brandosDb.query(
        `insert into skus ("brandId", sku, name, category, "isActive", "createdAt", "updatedAt")
         values ($1, $2, $3, $4, $5, now(), now())`,
        [brandId, row.code, row.productname, row.status || "Legacy", row.allocate_status !== false],
      );
      inserted += 1;
    }
  }

  return { fetched: result.rowCount, inserted, updated };
}

async function importTikTokPosts(legacyDb, brandosDb) {
  const result = await legacyDb.query(`
    select
      create_time,
      update_time,
      channel_acc_id,
      channel_type,
      item_id,
      url,
      caption,
      thumbnail_url,
      video_duration,
      total_time_watched,
      average_time_watched,
      full_video_watched_rate,
      impression_sources,
      reach,
      video_views,
      likes,
      bookmarks,
      comments,
      shares,
      pfm_score,
      products,
      products_json,
      ads_details,
      ads_total_media_cost,
      content_type,
      content_status,
      creator_details,
      targeting_details,
      content_expire_date,
      boost_factor,
      boost_start_date,
      boost_expire_date,
      boost_reason
    from tiktok_posts
    where item_id is not null
      and create_time is not null
      and coalesce(content_status, '') <> 'DELETED'
    order by create_time asc
  `);

  await brandosDb.query(
    `delete from performance_data where platform = 'tiktok' and "rawData"->>'source' = 'TiktokPFMWebApp'`,
  );

  let upserted = 0;
  let performanceRows = 0;
  for (const row of result.rows) {
    const rawData = {
      source: "TiktokPFMWebApp",
      channel_acc_id: row.channel_acc_id,
      channel_type: row.channel_type,
      update_time: row.update_time,
      video_duration: row.video_duration,
      total_time_watched: row.total_time_watched,
      average_time_watched: row.average_time_watched,
      full_video_watched_rate: row.full_video_watched_rate,
      impression_sources: toJsonValue(row.impression_sources),
      bookmarks: row.bookmarks,
      pfm_score: row.pfm_score,
      products: row.products,
      products_json: toJsonValue(row.products_json),
      ads_details: toJsonValue(row.ads_details),
      ads_total_media_cost: row.ads_total_media_cost,
      content_status: row.content_status,
      creator_details: toJsonValue(row.creator_details),
      targeting_details: toJsonValue(row.targeting_details),
      content_expire_date: row.content_expire_date,
      boost_factor: row.boost_factor,
      boost_start_date: row.boost_start_date,
      boost_expire_date: row.boost_expire_date,
      boost_reason: row.boost_reason,
    };

    const contentResult = await brandosDb.query(
      `insert into content_history (
        "brandId", "externalId", title, "contentType", caption, platform, "publishedAt",
        "videoUrl", "thumbnailUrl", views, reach, likes, comments, shares, "rawData",
        "lastSyncedAt", notes, "createdAt", "updatedAt"
      )
      values ($1,$2,$3,$4,$5,'tiktok',$6,$7,$8,$9,$10,$11,$12,$13,$14,now(),$15,now(),now())
      on conflict (platform, "externalId") do update set
        title = excluded.title,
        "contentType" = excluded."contentType",
        caption = excluded.caption,
        "publishedAt" = excluded."publishedAt",
        "videoUrl" = excluded."videoUrl",
        "thumbnailUrl" = excluded."thumbnailUrl",
        views = excluded.views,
        reach = excluded.reach,
        likes = excluded.likes,
        comments = excluded.comments,
        shares = excluded.shares,
        "rawData" = excluded."rawData",
        "lastSyncedAt" = now(),
        "updatedAt" = now()
      returning id`,
      [
        brandId,
        row.item_id,
        trimTitle(row.caption, `TikTok ${row.item_id}`),
        mapContentType(row.content_type),
        row.caption,
        row.create_time,
        row.url,
        row.thumbnail_url,
        toNumber(row.video_views),
        toNumber(row.reach),
        toNumber(row.likes),
        toNumber(row.comments),
        toNumber(row.shares),
        JSON.stringify(rawData),
        "Imported from TiktokPFMWebApp legacy database",
      ],
    );

    await brandosDb.query(
      `insert into performance_data (
        "brandId", "contentHistoryId", "externalId", date, period, platform,
        views, impressions, clicks, spend, revenue, "rawData", "createdAt", "updatedAt"
      )
      values ($1,$2,$3,$4,'daily','tiktok',$5,0,0,$6,0,$7,now(),now())`,
      [
        brandId,
        contentResult.rows[0].id,
        row.item_id,
        row.create_time,
        toNumber(row.video_views),
        toNumber(row.ads_total_media_cost),
        JSON.stringify({
          source: "TiktokPFMWebApp",
          reach: row.reach,
          pfm_score: row.pfm_score,
          likes: row.likes,
          comments: row.comments,
          shares: row.shares,
          bookmarks: row.bookmarks,
          content_status: row.content_status,
          content_type: row.content_type,
        }),
      ],
    );

    upserted += 1;
    performanceRows += 1;
  }

  return { fetched: result.rowCount, upserted, performanceRows };
}

async function seedSocialAccounts(legacyEnv, brandosDb) {
  const accounts = [
    {
      platform: "tiktok",
      accountKey: legacyEnv.BUSINESS_ID,
      accountName: "Legacy TikTok Business",
      businessId: legacyEnv.BUSINESS_ID,
      advertiserId: legacyEnv.ADVERTISER_ID_IDAC_MAIN,
      accessTokenEnvKey: "TIKTOK_MAIN_ACCESS_TOKEN",
    },
  ];

  let upserted = 0;
  for (const account of accounts) {
    if (!account.accountKey) continue;
    await brandosDb.query(
      `insert into social_accounts (
        "brandId", platform, "accountKey", "accountName", "businessId", "advertiserId",
        "accessTokenEnvKey", status, metadata, "createdAt", "updatedAt"
      )
      values ($1,$2,$3,$4,$5,$6,$7,'active',$8,now(),now())
      on conflict ("brandId", platform, "accountKey") do update set
        "accountName" = excluded."accountName",
        "businessId" = excluded."businessId",
        "advertiserId" = excluded."advertiserId",
        "accessTokenEnvKey" = excluded."accessTokenEnvKey",
        status = 'active',
        metadata = excluded.metadata,
        "updatedAt" = now()`,
      [
        brandId,
        account.platform,
        account.accountKey,
        account.accountName,
        account.businessId,
        account.advertiserId,
        account.accessTokenEnvKey,
        JSON.stringify({ source: "TiktokPFMWebApp" }),
      ],
    );
    upserted += 1;
  }
  return { upserted };
}

async function main() {
  const mode = process.argv[2] ?? "inspect";
  const legacyEnv = parseEnvFile(LEGACY_ENV_PATH);
  const brandosEnv = parseEnvFile(BRANDOS_ENV_PATH);

  const legacyDb = new Pool({
    connectionString: getRequiredEnv(legacyEnv, "DATABASE_URL"),
    ssl: { rejectUnauthorized: false },
  });
  const brandosDb = new Pool({ connectionString: getRequiredEnv(brandosEnv, "DATABASE_URL") });

  try {
    if (mode === "inspect") {
      console.log(JSON.stringify(await inspectLegacyDb(legacyDb), null, 2));
      return;
    }

    await ensureBrand(brandosDb);
    const configuredKeys = await configureBrandosEnv(legacyEnv);
    const accountStats = await seedSocialAccounts(legacyEnv, brandosDb);
    if (mode === "configure") {
      console.log(JSON.stringify({ configuredKeys, socialAccounts: accountStats }, null, 2));
      return;
    }

    if (mode === "import") {
      const products = await importProducts(legacyDb, brandosDb);
      const content = await importTikTokPosts(legacyDb, brandosDb);
      console.log(JSON.stringify({ configuredKeys, socialAccounts: accountStats, products, content }, null, 2));
      return;
    }

    throw new Error(`Unknown mode: ${mode}`);
  } finally {
    await legacyDb.end();
    await brandosDb.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
