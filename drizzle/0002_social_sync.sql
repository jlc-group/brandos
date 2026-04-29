CREATE TABLE IF NOT EXISTS "social_accounts" (
  "id" serial PRIMARY KEY,
  "brandId" integer NOT NULL REFERENCES "brands"("id"),
  "platform" varchar(50) NOT NULL,
  "accountKey" varchar(200) NOT NULL,
  "accountName" varchar(200),
  "pageId" varchar(100),
  "businessId" varchar(100),
  "advertiserId" varchar(100),
  "accessTokenEnvKey" varchar(100),
  "refreshTokenEnvKey" varchar(100),
  "status" varchar(50) NOT NULL DEFAULT 'active',
  "lastSyncedAt" timestamp,
  "lastError" text,
  "metadata" json,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "social_accounts_platform_account_unique"
  ON "social_accounts" ("brandId", "platform", "accountKey");

CREATE TABLE IF NOT EXISTS "social_sync_runs" (
  "id" serial PRIMARY KEY,
  "socialAccountId" integer REFERENCES "social_accounts"("id"),
  "brandId" integer NOT NULL REFERENCES "brands"("id"),
  "platform" varchar(50) NOT NULL,
  "syncType" varchar(50) NOT NULL,
  "status" varchar(50) NOT NULL DEFAULT 'running',
  "startedAt" timestamp NOT NULL DEFAULT now(),
  "finishedAt" timestamp,
  "stats" json,
  "error" text
);

ALTER TABLE "content_history" ADD COLUMN IF NOT EXISTS "socialAccountId" integer REFERENCES "social_accounts"("id");
ALTER TABLE "content_history" ADD COLUMN IF NOT EXISTS "externalId" varchar(200);
ALTER TABLE "content_history" ADD COLUMN IF NOT EXISTS "thumbnailUrl" text;
ALTER TABLE "content_history" ADD COLUMN IF NOT EXISTS "reach" integer DEFAULT 0;
ALTER TABLE "content_history" ADD COLUMN IF NOT EXISTS "rawData" json;
ALTER TABLE "content_history" ADD COLUMN IF NOT EXISTS "lastSyncedAt" timestamp;

CREATE UNIQUE INDEX IF NOT EXISTS "content_history_platform_external_unique"
  ON "content_history" ("platform", "externalId");

ALTER TABLE "performance_data" ADD COLUMN IF NOT EXISTS "contentHistoryId" integer REFERENCES "content_history"("id");
ALTER TABLE "performance_data" ADD COLUMN IF NOT EXISTS "externalId" varchar(200);
