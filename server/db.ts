import { and, desc, eq, gte, ilike, inArray, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  InsertUser,
  brands,
  brandRules,
  contentCalendar,
  contentHistory,
  contentHistorySkus,
  contentMatrix,
  performanceData,
  adRecommendations,
  productSets,
  productSetSkus,
  skus,
  socialAccounts,
  socialSyncRuns,
  users,
  type InsertBrand,
  type InsertBrandRule,
  type InsertContentCalendar,
  type InsertContentHistory,
  type InsertContentMatrix,
  type InsertPerformanceData,
  type InsertAdRecommendation,
  type InsertSku,
  type InsertSocialAccount,
  type InsertSocialSyncRun,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      _db = drizzle(pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Brands ───────────────────────────────────────────────────────────────────

export async function getAllBrands() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(brands).where(eq(brands.isActive, true)).orderBy(brands.name);
}

export async function getBrandById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(brands).where(eq(brands.id, id)).limit(1);
  return result[0];
}

export async function upsertBrand(data: InsertBrand & { id?: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (data.id) {
    const { id, ...rest } = data;
    await db.update(brands).set({ ...rest, updatedAt: new Date() }).where(eq(brands.id, id));
    return id;
  }
  const result = await db.insert(brands).values(data).returning({ id: brands.id });
  return result[0].id;
}

// ─── Brand Rules ──────────────────────────────────────────────────────────────

export async function getBrandRules(brandId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(brandRules.isActive, true)];
  if (brandId) conditions.push(eq(brandRules.brandId, brandId));
  return db.select().from(brandRules).where(and(...conditions)).orderBy(brandRules.category, brandRules.priority);
}

export async function createBrandRule(data: InsertBrandRule) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(brandRules).values(data).returning({ id: brandRules.id });
  return result[0].id;
}

export async function updateBrandRule(id: number, data: Partial<InsertBrandRule>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.update(brandRules).set({ ...data, updatedAt: new Date() }).where(eq(brandRules.id, id));
}

export async function deleteBrandRule(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.update(brandRules).set({ isActive: false, updatedAt: new Date() }).where(eq(brandRules.id, id));
}

// ─── SKUs ─────────────────────────────────────────────────────────────────────

export async function getSkus(brandId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(skus.isActive, true)];
  if (brandId) conditions.push(eq(skus.brandId, brandId));
  return db.select().from(skus).where(and(...conditions)).orderBy(skus.category, skus.name);
}

export async function createSku(data: InsertSku) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(skus).values(data).returning({ id: skus.id });
  return result[0].id;
}

export async function updateSku(id: number, data: Partial<InsertSku>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.update(skus).set({ ...data, updatedAt: new Date() }).where(eq(skus.id, id));
}

export async function deleteSku(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.update(skus).set({ isActive: false, updatedAt: new Date() }).where(eq(skus.id, id));
}

// ─── Content Matrix ───────────────────────────────────────────────────────────

export async function getContentMatrixBySkuId(skuId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(contentMatrix).where(eq(contentMatrix.skuId, skuId));
}

export async function getAllContentMatrix(brandId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (brandId) {
    const skuIds = await db.select({ id: skus.id }).from(skus).where(eq(skus.brandId, brandId));
    const ids = skuIds.map(s => s.id);
    if (ids.length === 0) return [];
    return db.select().from(contentMatrix)
      .where(inArray(contentMatrix.skuId, ids))
      .orderBy(contentMatrix.skuId, contentMatrix.priority);
  }
  return db.select().from(contentMatrix).orderBy(contentMatrix.skuId, contentMatrix.priority);
}

export async function createContentMatrix(data: InsertContentMatrix) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(contentMatrix).values(data).returning({ id: contentMatrix.id });
  return result[0].id;
}

export async function updateContentMatrix(id: number, data: Partial<InsertContentMatrix>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.update(contentMatrix).set({ ...data, updatedAt: new Date() }).where(eq(contentMatrix.id, id));
}

export async function deleteContentMatrix(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.delete(contentMatrix).where(eq(contentMatrix.id, id));
}

// ─── Content Calendar ─────────────────────────────────────────────────────────

export async function getContentCalendar(from: Date, to: Date, brandId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [gte(contentCalendar.targetDate, from), lte(contentCalendar.targetDate, to)];
  if (brandId) conditions.push(eq(contentCalendar.brandId, brandId));
  return db.select().from(contentCalendar).where(and(...conditions)).orderBy(contentCalendar.targetDate);
}

export async function createCalendarEntry(data: InsertContentCalendar) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(contentCalendar).values(data).returning({ id: contentCalendar.id });
  return result[0].id;
}

export async function updateCalendarEntry(id: number, data: Partial<InsertContentCalendar>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.update(contentCalendar).set({ ...data, updatedAt: new Date() }).where(eq(contentCalendar.id, id));
}

export async function deleteCalendarEntry(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.delete(contentCalendar).where(eq(contentCalendar.id, id));
}

// ─── Social Sync ───────────────────────────────────────────────────────────────

export async function getSocialAccounts(brandId?: number, platform?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (brandId) conditions.push(eq(socialAccounts.brandId, brandId));
  if (platform) conditions.push(eq(socialAccounts.platform, platform));
  return db.select().from(socialAccounts)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(socialAccounts.platform, socialAccounts.accountName);
}

export async function upsertSocialAccount(data: InsertSocialAccount) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(socialAccounts).values(data).onConflictDoUpdate({
    target: [socialAccounts.brandId, socialAccounts.platform, socialAccounts.accountKey],
    set: {
      accountName: data.accountName,
      pageId: data.pageId,
      businessId: data.businessId,
      advertiserId: data.advertiserId,
      accessTokenEnvKey: data.accessTokenEnvKey,
      refreshTokenEnvKey: data.refreshTokenEnvKey,
      status: data.status ?? "active",
      lastError: null,
      metadata: data.metadata,
      updatedAt: new Date(),
    },
  }).returning({ id: socialAccounts.id });
  return result[0].id;
}

export async function updateSocialAccountSyncState(
  id: number,
  data: { lastSyncedAt?: Date | null; lastError?: string | null; status?: string },
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.update(socialAccounts)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(socialAccounts.id, id));
}

export async function createSocialSyncRun(data: InsertSocialSyncRun) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(socialSyncRuns).values(data).returning({ id: socialSyncRuns.id });
  return result[0].id;
}

export async function finishSocialSyncRun(
  id: number,
  data: { status: "success" | "failed"; stats?: Record<string, unknown>; error?: string | null },
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.update(socialSyncRuns)
    .set({ ...data, finishedAt: new Date() })
    .where(eq(socialSyncRuns.id, id));
}

export async function getSocialSyncRuns(limit = 20, brandId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = brandId ? [eq(socialSyncRuns.brandId, brandId)] : [];
  return db.select().from(socialSyncRuns)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(socialSyncRuns.startedAt))
    .limit(limit);
}

// ─── Content History ──────────────────────────────────────────────────────────

export type ContentHistoryListOptions = {
  search?: string;
  view?: "all" | "last100" | "bestPFM" | "notProper" | "shouldRunAds" | "noProductMapping" | "highEngagement" | "multiSku";
  platform?: string;
  contentType?: string;
  skuId?: number;
  productSetId?: number;
  mapping?: "all" | "mapped" | "unmapped";
  status?: "all" | "published" | "unpublished";
  contentStatus?: string;
  sortBy?: "publishedAt" | "createdAt" | "views" | "reach" | "likes" | "comments" | "shares" | "bookmarks" | "pfmScore" | "totalMediaCost" | "adsCount";
  sortDir?: "asc" | "desc";
};

function buildContentHistoryConditions(brandId?: number, options: ContentHistoryListOptions = {}) {
  const conditions = [];
  if (brandId) conditions.push(eq(contentHistory.brandId, brandId));
  if (options.platform && options.platform !== "all") conditions.push(eq(contentHistory.platform, options.platform));
  if (options.contentType && options.contentType !== "all") conditions.push(eq(contentHistory.contentType, options.contentType as any));
  if (options.contentStatus && options.contentStatus !== "all") conditions.push(eq(contentHistory.contentStatus, options.contentStatus));
  if (options.skuId) {
    conditions.push(or(
      eq(contentHistory.skuId, options.skuId),
      sql`exists (
        select 1 from "content_history_skus" chs
        where chs."contentHistoryId" = ${contentHistory.id}
        and chs."skuId" = ${options.skuId}
      )`,
    ));
  }
  if (options.productSetId) {
    conditions.push(sql`not exists (
      select 1
      from "product_set_skus" pss
      where pss."productSetId" = ${options.productSetId}
        and not exists (
          select 1
          from "content_history_skus" chs
          where chs."contentHistoryId" = ${contentHistory.id}
            and chs."skuId" = pss."skuId"
        )
    )`);
  }
  if (options.mapping === "mapped") {
    conditions.push(or(
      isNotNull(contentHistory.skuId),
      sql`exists (
        select 1 from "content_history_skus" chs
        where chs."contentHistoryId" = ${contentHistory.id}
      )`,
    ));
  }
  if (options.mapping === "unmapped") {
    conditions.push(and(
      isNull(contentHistory.skuId),
      sql`not exists (
        select 1 from "content_history_skus" chs
        where chs."contentHistoryId" = ${contentHistory.id}
      )`,
    ));
  }
  if (options.status === "published") conditions.push(isNotNull(contentHistory.publishedAt));
  if (options.status === "unpublished") conditions.push(isNull(contentHistory.publishedAt));
  if (options.view === "noProductMapping") {
    conditions.push(and(
      isNull(contentHistory.skuId),
      sql`not exists (
        select 1 from "content_history_skus" chs
        where chs."contentHistoryId" = ${contentHistory.id}
      )`,
    ));
  }
  if (options.view === "multiSku") {
    conditions.push(sql`(
      select count(*)
      from "content_history_skus" chs
      where chs."contentHistoryId" = ${contentHistory.id}
    ) > 1`);
  }
  if (options.view === "bestPFM") conditions.push(sql`coalesce(${contentHistory.pfmScore}, 0) > 0`);
  if (options.view === "highEngagement") {
    conditions.push(sql`(
      (coalesce(${contentHistory.likes}, 0) + coalesce(${contentHistory.comments}, 0) + coalesce(${contentHistory.shares}, 0))::numeric
      / nullif(coalesce(${contentHistory.views}, 0), 0)
    ) >= 0.03`);
  }
  if (options.view === "shouldRunAds") {
    conditions.push(and(
      sql`coalesce(${contentHistory.contentStatus}, '') not in ('DELETED', 'NO_IDENTITY', 'CLOSE')`,
      or(isNull(contentHistory.contentExpireDate), sql`${contentHistory.contentExpireDate} > now()`),
      sql`(
        coalesce(${contentHistory.pfmScore}, 0) > 0.5
        or (coalesce(${contentHistory.totalMediaCost}, 0) < 3000 and coalesce(${contentHistory.views}, 0) < 300000)
      )`,
      sql`exists (
        select 1 from "content_history_skus" chs
        where chs."contentHistoryId" = ${contentHistory.id}
      )`,
    ));
  }
  if (options.view === "notProper") {
    conditions.push(or(
      isNull(contentHistory.contentStatus),
      sql`coalesce(${contentHistory.contentStatus}, '') in ('', 'NO_IDENTITY')`,
      isNull(contentHistory.contentExpireDate),
      and(
        isNull(contentHistory.skuId),
        sql`not exists (
          select 1 from "content_history_skus" chs
          where chs."contentHistoryId" = ${contentHistory.id}
        )`,
      ),
    ));
  }
  const search = options.search?.trim();
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(or(
      ilike(contentHistory.title, pattern),
      ilike(contentHistory.caption, pattern),
      ilike(contentHistory.hook, pattern),
      ilike(contentHistory.externalId, pattern),
    ));
  }
  return conditions;
}

export type ContentSkuMapping = {
  id: number;
  skuId: number;
  sku: string;
  name: string;
  category?: string | null;
  position?: number | null;
};

async function getContentSkuMappings(contentIds: number[]) {
  const db = await getDb();
  if (!db || contentIds.length === 0) return new Map<number, ContentSkuMapping[]>();
  const rows = await db.select({
    id: contentHistorySkus.id,
    contentHistoryId: contentHistorySkus.contentHistoryId,
    skuId: contentHistorySkus.skuId,
    sku: skus.sku,
    name: skus.name,
    category: skus.category,
    position: contentHistorySkus.position,
  })
    .from(contentHistorySkus)
    .innerJoin(skus, eq(contentHistorySkus.skuId, skus.id))
    .where(inArray(contentHistorySkus.contentHistoryId, contentIds))
    .orderBy(contentHistorySkus.position, skus.name);

  const byContent = new Map<number, ContentSkuMapping[]>();
  for (const row of rows) {
    const list = byContent.get(row.contentHistoryId) ?? [];
    list.push({
      id: row.id,
      skuId: row.skuId,
      sku: row.sku,
      name: row.name,
      category: row.category,
      position: row.position,
    });
    byContent.set(row.contentHistoryId, list);
  }
  return byContent;
}

async function enrichContentHistoryRows<T extends { id: number; skuId?: number | null }>(rows: T[]) {
  const mappings = await getContentSkuMappings(rows.map((row) => row.id));
  return rows.map((row) => ({
    ...row,
    skuMappings: mappings.get(row.id) ?? [],
  }));
}

function getContentHistoryOrder(options: ContentHistoryListOptions = {}) {
  const sortColumns = {
    publishedAt: contentHistory.publishedAt,
    createdAt: contentHistory.createdAt,
    views: contentHistory.views,
    reach: contentHistory.reach,
    likes: contentHistory.likes,
    comments: contentHistory.comments,
    shares: contentHistory.shares,
    bookmarks: contentHistory.bookmarks,
    pfmScore: contentHistory.pfmScore,
    totalMediaCost: contentHistory.totalMediaCost,
    adsCount: contentHistory.adsCount,
  };
  const defaultSort = options.view === "bestPFM"
    ? "pfmScore"
    : options.view === "shouldRunAds"
      ? "pfmScore"
      : "publishedAt";
  const sortColumn = sortColumns[options.sortBy ?? defaultSort];
  return options.sortDir === "asc"
    ? sql`${sortColumn} asc nulls last`
    : sql`${sortColumn} desc nulls last`;
}

export async function getContentHistory(
  limit = 50,
  offset = 0,
  brandId?: number,
  options: ContentHistoryListOptions = {},
) {
  const db = await getDb();
  if (!db) return [];
  const conditions = buildContentHistoryConditions(brandId, options);
  const rows = await db.select().from(contentHistory)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(getContentHistoryOrder(options), desc(contentHistory.id))
    .limit(limit)
    .offset(offset);
  return enrichContentHistoryRows(rows);
}

export async function getContentHistoryById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contentHistory).where(eq(contentHistory.id, id)).limit(1);
  const enriched = await enrichContentHistoryRows(result);
  return enriched[0];
}

export async function getContentHistorySummary(brandId?: number, options: ContentHistoryListOptions = {}) {
  const db = await getDb();
  if (!db) {
    return {
      totalContents: 0,
      totalViews: 0,
      totalReach: 0,
      totalLikes: 0,
      totalComments: 0,
      totalShares: 0,
      avgScore: 0,
    };
  }
  const conditions = buildContentHistoryConditions(brandId, options);
  const result = await db.select({
    totalContents: sql<number>`count(*)`,
    totalViews: sql<number>`coalesce(sum(${contentHistory.views}), 0)`,
    totalReach: sql<number>`coalesce(sum(${contentHistory.reach}), 0)`,
    totalLikes: sql<number>`coalesce(sum(${contentHistory.likes}), 0)`,
    totalComments: sql<number>`coalesce(sum(${contentHistory.comments}), 0)`,
    totalShares: sql<number>`coalesce(sum(${contentHistory.shares}), 0)`,
    avgScore: sql<number>`coalesce(avg(((coalesce(${contentHistory.likes}, 0) + coalesce(${contentHistory.comments}, 0) + coalesce(${contentHistory.shares}, 0))::numeric * 100) / nullif(coalesce(${contentHistory.views}, 0), 0)), 0)`,
  }).from(contentHistory)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const summary = result[0];
  return {
    totalContents: Number(summary?.totalContents ?? 0),
    totalViews: Number(summary?.totalViews ?? 0),
    totalReach: Number(summary?.totalReach ?? 0),
    totalLikes: Number(summary?.totalLikes ?? 0),
    totalComments: Number(summary?.totalComments ?? 0),
    totalShares: Number(summary?.totalShares ?? 0),
    avgScore: Number(summary?.avgScore ?? 0),
  };
}

export async function createContentHistory(data: InsertContentHistory) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(contentHistory).values(data).returning({ id: contentHistory.id });
  return result[0].id;
}

export async function upsertContentHistoryByExternalId(data: InsertContentHistory) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (!data.platform || !data.externalId) return createContentHistory(data);
  const result = await db.insert(contentHistory).values(data).onConflictDoUpdate({
    target: [contentHistory.platform, contentHistory.externalId],
    set: {
      brandId: data.brandId,
      skuId: data.skuId,
      socialAccountId: data.socialAccountId,
      title: data.title,
      contentType: data.contentType,
      hook: data.hook,
      caption: data.caption,
      publishedAt: data.publishedAt,
      videoUrl: data.videoUrl,
      thumbnailUrl: data.thumbnailUrl,
      views: data.views,
      reach: data.reach,
      likes: data.likes,
      comments: data.comments,
      shares: data.shares,
      rawData: data.rawData,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    },
  }).returning({ id: contentHistory.id });
  return result[0].id;
}

export async function updateContentHistory(id: number, data: Partial<InsertContentHistory>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.update(contentHistory).set({ ...data, updatedAt: new Date() }).where(eq(contentHistory.id, id));
}

export async function updateContentHistorySkus(contentHistoryId: number, skuIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const uniqueSkuIds = Array.from(new Set(skuIds.filter((id) => Number.isFinite(id))));

  await db.delete(contentHistorySkus).where(eq(contentHistorySkus.contentHistoryId, contentHistoryId));
  if (uniqueSkuIds.length > 0) {
    const skuRows = await db.select().from(skus).where(inArray(skus.id, uniqueSkuIds));
    const skuMap = new Map(skuRows.map((sku) => [sku.id, sku]));
    await db.insert(contentHistorySkus).values(uniqueSkuIds.map((skuId, index) => {
      const sku = skuMap.get(skuId);
      return {
        contentHistoryId,
        skuId,
        skuCodeSnapshot: sku?.sku,
        skuNameSnapshot: sku?.name,
        position: index,
      };
    }));
  }

  await db.update(contentHistory)
    .set({ skuId: uniqueSkuIds[0] ?? null, updatedAt: new Date() })
    .where(eq(contentHistory.id, contentHistoryId));

  return { count: uniqueSkuIds.length };
}

// ─── Product Sets ─────────────────────────────────────────────────────────────

export type ProductSetListOptions = {
  brandId?: number;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: "contentCount" | "avgPfmScore" | "totalViews" | "totalMediaCost" | "lastContentAt";
  sortDir?: "asc" | "desc";
};

export async function getProductSets(options: ProductSetListOptions = {}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(productSets.status, "active")];
  if (options.brandId) conditions.push(eq(productSets.brandId, options.brandId));
  if (options.search?.trim()) {
    const pattern = `%${options.search.trim()}%`;
    const searchCondition = or(ilike(productSets.key, pattern), ilike(productSets.name, pattern));
    if (searchCondition) conditions.push(searchCondition);
  }
  const sortColumns = {
    contentCount: productSets.contentCount,
    avgPfmScore: productSets.avgPfmScore,
    totalViews: productSets.totalViews,
    totalMediaCost: productSets.totalMediaCost,
    lastContentAt: productSets.lastContentAt,
  };
  const sortColumn = sortColumns[options.sortBy ?? "contentCount"];
  const rows = await db.select().from(productSets)
    .where(and(...conditions))
    .orderBy(options.sortDir === "asc" ? sql`${sortColumn} asc nulls last` : sql`${sortColumn} desc nulls last`, productSets.key)
    .limit(options.limit ?? 100)
    .offset(options.offset ?? 0);

  const ids = rows.map((row) => row.id);
  if (ids.length === 0) return [];
  const skuRows = await db.select({
    productSetId: productSetSkus.productSetId,
    skuId: productSetSkus.skuId,
    sku: skus.sku,
    name: skus.name,
    position: productSetSkus.position,
  })
    .from(productSetSkus)
    .innerJoin(skus, eq(productSetSkus.skuId, skus.id))
    .where(inArray(productSetSkus.productSetId, ids))
    .orderBy(productSetSkus.productSetId, productSetSkus.position, skus.sku);

  const bySet = new Map<number, Array<{ skuId: number; sku: string; name: string; position: number | null }>>();
  for (const sku of skuRows) {
    const list = bySet.get(sku.productSetId) ?? [];
    list.push({ skuId: sku.skuId, sku: sku.sku, name: sku.name, position: sku.position });
    bySet.set(sku.productSetId, list);
  }
  return rows.map((row) => ({ ...row, skus: bySet.get(row.id) ?? [] }));
}

export async function getProductSetById(id: number) {
  const sets = await getProductSets({ limit: 1, offset: 0 });
  const db = await getDb();
  if (!db) return undefined;
  const [row] = await db.select().from(productSets).where(eq(productSets.id, id)).limit(1);
  if (!row) return undefined;
  const enriched = await getProductSets({ search: row.key, brandId: row.brandId ?? undefined, limit: 20 });
  return enriched.find((set) => set.id === id) ?? sets.find((set) => set.id === id);
}

export async function deleteContentHistory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.delete(contentHistory).where(eq(contentHistory.id, id));
}

// ─── Performance Data ─────────────────────────────────────────────────────────

export async function getPerformanceData(from?: Date, to?: Date, limit = 100, brandId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (from) conditions.push(gte(performanceData.date, from));
  if (to) conditions.push(lte(performanceData.date, to));
  if (brandId) conditions.push(eq(performanceData.brandId, brandId));
  return db.select().from(performanceData)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(performanceData.date))
    .limit(limit);
}

export async function insertPerformanceData(data: InsertPerformanceData[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (data.length === 0) return 0;
  await db.insert(performanceData).values(data);
  return data.length;
}

export async function insertSocialPerformanceData(data: InsertPerformanceData[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  if (data.length === 0) return 0;
  await db.insert(performanceData).values(data);
  return data.length;
}

export async function getPerformanceSummary(brandId?: number) {
  const db = await getDb();
  if (!db) return null;
  const conditions = brandId ? [eq(performanceData.brandId, brandId)] : [];
  const result = await db.select({
    totalSpend: sql<number>`COALESCE(SUM(${performanceData.spend}), 0)`,
    totalRevenue: sql<number>`COALESCE(SUM(${performanceData.revenue}), 0)`,
    totalViews: sql<number>`COALESCE(SUM(${performanceData.views}), 0)`,
    totalConversions: sql<number>`COALESCE(SUM(${performanceData.conversions}), 0)`,
    avgRoas: sql<number>`COALESCE(AVG(${performanceData.roas}), 0)`,
    avgCtr: sql<number>`COALESCE(AVG(${performanceData.ctr}), 0)`,
    count: sql<number>`COUNT(*)`,
  }).from(performanceData).where(conditions.length > 0 ? and(...conditions) : undefined);
  return result[0] ?? null;
}

// ─── Ads Recommendations ──────────────────────────────────────────────────────

export async function getAdRecommendations(brandId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(adRecommendations.isActioned, false)];
  if (brandId) conditions.push(eq(adRecommendations.brandId, brandId));
  return db.select().from(adRecommendations)
    .where(and(...conditions))
    .orderBy(desc(adRecommendations.priority), desc(adRecommendations.createdAt));
}

export async function createAdRecommendation(data: InsertAdRecommendation) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(adRecommendations).values(data).returning({ id: adRecommendations.id });
  return result[0].id;
}

export async function markRecommendationActioned(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.update(adRecommendations).set({ isActioned: true, actionedAt: new Date(), updatedAt: new Date() }).where(eq(adRecommendations.id, id));
}

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────

export async function getDashboardKPIs(brandId?: number) {
  const db = await getDb();
  if (!db) return null;

  const calendarCond = brandId ? eq(contentCalendar.brandId, brandId) : undefined;
  const historyCond = brandId ? eq(contentHistory.brandId, brandId) : undefined;
  const recCond = brandId ? and(eq(adRecommendations.isActioned, false), eq(adRecommendations.brandId, brandId))
                          : eq(adRecommendations.isActioned, false);

  const [calendarStats] = await db.select({ count: sql<number>`COUNT(*)` }).from(contentCalendar).where(calendarCond);
  const [historyStats] = await db.select({ count: sql<number>`COUNT(*)` }).from(contentHistory).where(historyCond);
  const [pendingRecs] = await db.select({ count: sql<number>`COUNT(*)` }).from(adRecommendations).where(recCond);
  const perfSummary = await getPerformanceSummary(brandId);

  return {
    plannedContent: Number(calendarStats?.count ?? 0),
    publishedContent: Number(historyStats?.count ?? 0),
    pendingRecommendations: Number(pendingRecs?.count ?? 0),
    totalSpend: perfSummary?.totalSpend ?? 0,
    totalRevenue: perfSummary?.totalRevenue ?? 0,
    avgRoas: perfSummary?.avgRoas ?? 0,
    totalViews: perfSummary?.totalViews ?? 0,
  };
}
