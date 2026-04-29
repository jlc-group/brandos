import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  InsertUser,
  brands,
  brandRules,
  contentCalendar,
  contentHistory,
  contentMatrix,
  performanceData,
  adRecommendations,
  skus,
  users,
  type InsertBrand,
  type InsertBrandRule,
  type InsertContentCalendar,
  type InsertContentHistory,
  type InsertContentMatrix,
  type InsertPerformanceData,
  type InsertAdRecommendation,
  type InsertSku,
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

// ─── Content History ──────────────────────────────────────────────────────────

export async function getContentHistory(limit = 50, offset = 0, brandId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = brandId ? [eq(contentHistory.brandId, brandId)] : [];
  return db.select().from(contentHistory)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(contentHistory.publishedAt))
    .limit(limit)
    .offset(offset);
}

export async function createContentHistory(data: InsertContentHistory) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(contentHistory).values(data).returning({ id: contentHistory.id });
  return result[0].id;
}

export async function updateContentHistory(id: number, data: Partial<InsertContentHistory>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  return db.update(contentHistory).set({ ...data, updatedAt: new Date() }).where(eq(contentHistory.id, id));
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
