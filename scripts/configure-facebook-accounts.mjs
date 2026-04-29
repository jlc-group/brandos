import fs from "node:fs";
import { Pool } from "pg";

const BRANDOS_ENV_PATH = process.env.BRANDOS_ENV_PATH ?? "D:/Server/run/brandos/.env.prod";
let brandId = Number(process.env.BRANDOS_FACEBOOK_BRAND_ID ?? "1");

function parseEnvFile(path) {
  const env = {};
  const text = fs.readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    env[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return env;
}

function list(value) {
  if (!value) return [];
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

async function ensureBrand(db) {
  if (Number.isFinite(brandId) && brandId > 0) {
    const existing = await db.query(`select id from brands where id = $1 limit 1`, [brandId]);
    if (existing.rowCount) return brandId;
  }

  const result = await db.query(
    `insert into brands (name, slug, description, vertical, "isActive", "createdAt", "updatedAt")
     values ($1, $2, $3, $4, true, now(), now())
     on conflict (slug) do update set
       name = excluded.name,
       description = excluded.description,
       vertical = excluded.vertical,
       "isActive" = true,
       "updatedAt" = now()
     returning id`,
    ["Jula's Herb", "julas-herb", "Primary brand for social sync", "Beauty and Health"],
  );
  brandId = result.rows[0].id;
  return brandId;
}

async function main() {
  const env = parseEnvFile(BRANDOS_ENV_PATH);
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is missing from BrandOS env");

  const pageIds = list(env.FB_PAGE_IDS);
  const adAccountIds = list(env.FB_AD_ACCOUNT_IDS);
  const db = new Pool({ connectionString: env.DATABASE_URL });

  try {
    const resolvedBrandId = await ensureBrand(db);
    let pageAccounts = 0;
    for (const pageId of pageIds) {
      await db.query(
        `insert into social_accounts (
          "brandId", platform, "accountKey", "accountName", "pageId", status, metadata, "createdAt", "updatedAt"
        )
        values ($1, 'facebook', $2, $3, $2, 'active', $4, now(), now())
        on conflict ("brandId", platform, "accountKey") do update set
          "accountName" = excluded."accountName",
          "pageId" = excluded."pageId",
          status = 'active',
          metadata = excluded.metadata,
          "updatedAt" = now()`,
        [resolvedBrandId, pageId, `Facebook Page ${pageId}`, JSON.stringify({ source: "FB_PAGE_IDS" })],
      );
      pageAccounts += 1;
    }

    let adAccounts = 0;
    for (const adAccountId of adAccountIds) {
      await db.query(
        `insert into social_accounts (
          "brandId", platform, "accountKey", "accountName", "advertiserId", status, metadata, "createdAt", "updatedAt"
        )
        values ($1, 'facebook', $2, $3, $2, 'active', $4, now(), now())
        on conflict ("brandId", platform, "accountKey") do update set
          "accountName" = excluded."accountName",
          "advertiserId" = excluded."advertiserId",
          status = 'active',
          metadata = excluded.metadata,
          "updatedAt" = now()`,
        [resolvedBrandId, `act_${adAccountId}`, `Facebook Ad Account ${adAccountId}`, JSON.stringify({ source: "FB_AD_ACCOUNT_IDS" })],
      );
      adAccounts += 1;
    }

    console.log(JSON.stringify({ brandId: resolvedBrandId, pageAccounts, adAccounts }, null, 2));
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
