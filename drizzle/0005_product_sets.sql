CREATE TABLE IF NOT EXISTS "product_sets" (
  "id" serial PRIMARY KEY,
  "brandId" integer REFERENCES "brands"("id"),
  "key" varchar(500) NOT NULL,
  "name" varchar(500) NOT NULL,
  "skuCount" integer DEFAULT 0,
  "contentCount" integer DEFAULT 0,
  "totalViews" real DEFAULT 0,
  "totalReach" real DEFAULT 0,
  "totalMediaCost" real DEFAULT 0,
  "avgPfmScore" real DEFAULT 0,
  "lastContentAt" timestamp,
  "source" varchar(80) DEFAULT 'auto',
  "status" varchar(50) DEFAULT 'active',
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_sets_brand_key_unique"
  ON "product_sets" ("brandId", "key");

ALTER TABLE "product_sets"
  ALTER COLUMN "totalViews" TYPE real USING "totalViews"::real,
  ALTER COLUMN "totalReach" TYPE real USING "totalReach"::real;

CREATE TABLE IF NOT EXISTS "product_set_skus" (
  "id" serial PRIMARY KEY,
  "productSetId" integer NOT NULL REFERENCES "product_sets"("id") ON DELETE CASCADE,
  "skuId" integer NOT NULL REFERENCES "skus"("id"),
  "skuCodeSnapshot" varchar(100),
  "skuNameSnapshot" varchar(200),
  "position" integer DEFAULT 0,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_set_skus_set_sku_unique"
  ON "product_set_skus" ("productSetId", "skuId");

CREATE INDEX IF NOT EXISTS "product_sets_content_count_idx"
  ON "product_sets" ("contentCount");

CREATE INDEX IF NOT EXISTS "product_sets_avg_pfm_idx"
  ON "product_sets" ("avgPfmScore");
