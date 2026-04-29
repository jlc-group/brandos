ALTER TABLE "content_history"
  ADD COLUMN IF NOT EXISTS "bookmarks" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "pfmScore" real DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "videoDuration" real DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalMediaCost" real DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "adsCount" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "contentStatus" varchar(80),
  ADD COLUMN IF NOT EXISTS "contentExpireDate" timestamp;

UPDATE "content_history"
SET
  "bookmarks" = COALESCE(NULLIF("rawData"->>'bookmarks', '')::integer, "bookmarks", 0),
  "pfmScore" = COALESCE(NULLIF("rawData"->>'pfm_score', '')::real, "pfmScore", 0),
  "videoDuration" = COALESCE(NULLIF("rawData"->>'video_duration', '')::real, "videoDuration", 0),
  "totalMediaCost" = COALESCE(NULLIF("rawData"->>'ads_total_media_cost', '')::real, "totalMediaCost", 0),
  "contentStatus" = COALESCE(NULLIF("rawData"->>'content_status', ''), "contentStatus"),
  "contentExpireDate" = COALESCE(NULLIF("rawData"->>'content_expire_date', '')::timestamp, "contentExpireDate"),
  "adsCount" = CASE
    WHEN json_typeof("rawData"->'ads_details') = 'array' THEN json_array_length("rawData"->'ads_details')
    ELSE COALESCE("adsCount", 0)
  END
WHERE "rawData" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "content_history_content_status_idx"
  ON "content_history" ("contentStatus");

CREATE INDEX IF NOT EXISTS "content_history_content_expire_date_idx"
  ON "content_history" ("contentExpireDate");

CREATE INDEX IF NOT EXISTS "content_history_pfm_score_idx"
  ON "content_history" ("pfmScore");
