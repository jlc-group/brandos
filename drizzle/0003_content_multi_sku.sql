CREATE TABLE IF NOT EXISTS "content_history_skus" (
  "id" serial PRIMARY KEY,
  "contentHistoryId" integer NOT NULL REFERENCES "content_history"("id") ON DELETE CASCADE,
  "skuId" integer NOT NULL REFERENCES "skus"("id"),
  "skuCodeSnapshot" varchar(100),
  "skuNameSnapshot" varchar(200),
  "position" integer DEFAULT 0,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "content_history_skus_content_sku_unique"
  ON "content_history_skus" ("contentHistoryId", "skuId");

INSERT INTO "content_history_skus" ("contentHistoryId", "skuId", "skuCodeSnapshot", "skuNameSnapshot", "position")
SELECT ch."id", ch."skuId", s."sku", s."name", 0
FROM "content_history" ch
JOIN "skus" s ON s."id" = ch."skuId"
WHERE ch."skuId" IS NOT NULL
ON CONFLICT ("contentHistoryId", "skuId") DO NOTHING;
