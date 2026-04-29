import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  real,
  boolean,
  json,
  serial,
} from "drizzle-orm/pg-core";

// ─── Enums ─────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const contentTypeEnum = pgEnum("content_type", ["SALE", "EDUCATION", "ENTERTAINMENT", "REVIEW", "LIFESTYLE", "HOOK", "CHALLENGE", "COLLAB"]);
export const calendarStatusEnum = pgEnum("calendar_status", ["planned", "in_progress", "published", "cancelled"]);
export const adActionEnum = pgEnum("ad_action", ["scale", "stop", "test_variation", "monitor", "optimize"]);
export const performancePeriodEnum = pgEnum("performance_period", ["daily", "weekly", "monthly"]);

// ─── Users ──────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Brands ─────────────────────────────────────────────────────────────────────

export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 50 }).notNull().unique(),
  description: text("description"),
  logoUrl: text("logoUrl"),
  primaryColor: varchar("primaryColor", { length: 20 }),
  vertical: varchar("vertical", { length: 100 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Brand = typeof brands.$inferSelect;
export type InsertBrand = typeof brands.$inferInsert;

// ─── Brand Brain ───────────────────────────────────────────────────────────────

export const brandRules = pgTable("brand_rules", {
  id: serial("id").primaryKey(),
  brandId: integer("brandId").references(() => brands.id),
  category: varchar("category", { length: 50 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  priority: integer("priority").default(1),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type BrandRule = typeof brandRules.$inferSelect;
export type InsertBrandRule = typeof brandRules.$inferInsert;

// ─── SKUs ──────────────────────────────────────────────────────────────────────

export const skus = pgTable("skus", {
  id: serial("id").primaryKey(),
  brandId: integer("brandId").references(() => brands.id),
  sku: varchar("sku", { length: 100 }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  category: varchar("category", { length: 100 }),
  description: text("description"),
  price: real("price"),
  imageUrl: text("imageUrl"),
  shopeeUrl: text("shopeeUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Sku = typeof skus.$inferSelect;
export type InsertSku = typeof skus.$inferInsert;

// ─── Content Matrix ────────────────────────────────────────────────────────────

export const contentMatrix = pgTable("content_matrix", {
  id: serial("id").primaryKey(),
  skuId: integer("skuId").references(() => skus.id).notNull(),
  contentType: contentTypeEnum("contentType").notNull(),
  angle: varchar("angle", { length: 200 }),
  hookIdeas: json("hookIdeas").$type<string[]>(),
  targetAudience: varchar("targetAudience", { length: 200 }),
  priority: integer("priority").default(1),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ContentMatrix = typeof contentMatrix.$inferSelect;
export type InsertContentMatrix = typeof contentMatrix.$inferInsert;

// ─── Content Calendar ──────────────────────────────────────────────────────────

export const contentCalendar = pgTable("content_calendar", {
  id: serial("id").primaryKey(),
  brandId: integer("brandId").references(() => brands.id),
  skuId: integer("skuId").references(() => skus.id),
  title: varchar("title", { length: 300 }).notNull(),
  contentType: contentTypeEnum("contentType").notNull(),
  hook: text("hook"),
  caption: text("caption"),
  coverConcept: text("coverConcept"),
  targetDate: timestamp("targetDate"),
  status: calendarStatusEnum("status").default("planned").notNull(),
  platform: varchar("platform", { length: 50 }).default("tiktok"),
  notes: text("notes"),
  aiGenerated: boolean("aiGenerated").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ContentCalendar = typeof contentCalendar.$inferSelect;
export type InsertContentCalendar = typeof contentCalendar.$inferInsert;

// ─── Content History ───────────────────────────────────────────────────────────

export const contentHistory = pgTable("content_history", {
  id: serial("id").primaryKey(),
  brandId: integer("brandId").references(() => brands.id),
  skuId: integer("skuId").references(() => skus.id),
  title: varchar("title", { length: 300 }).notNull(),
  contentType: contentTypeEnum("contentType").notNull(),
  hook: text("hook"),
  caption: text("caption"),
  platform: varchar("platform", { length: 50 }).default("tiktok"),
  publishedAt: timestamp("publishedAt"),
  videoUrl: text("videoUrl"),
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type ContentHistory = typeof contentHistory.$inferSelect;
export type InsertContentHistory = typeof contentHistory.$inferInsert;

// ─── Performance Data ──────────────────────────────────────────────────────────

export const performanceData = pgTable("performance_data", {
  id: serial("id").primaryKey(),
  brandId: integer("brandId").references(() => brands.id),
  skuId: integer("skuId").references(() => skus.id),
  adId: varchar("adId", { length: 100 }),
  adName: varchar("adName", { length: 300 }),
  campaignId: varchar("campaignId", { length: 100 }),
  campaignName: varchar("campaignName", { length: 300 }),
  adGroupId: varchar("adGroupId", { length: 100 }),
  adGroupName: varchar("adGroupName", { length: 300 }),
  date: timestamp("date").notNull(),
  period: performancePeriodEnum("period").default("daily"),
  spend: real("spend").default(0),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  conversions: integer("conversions").default(0),
  revenue: real("revenue").default(0),
  ctr: real("ctr").default(0),
  cpc: real("cpc").default(0),
  cpa: real("cpa").default(0),
  roas: real("roas").default(0),
  views: integer("views").default(0),
  videoViews3s: integer("videoViews3s").default(0),
  videoViewsComplete: integer("videoViewsComplete").default(0),
  platform: varchar("platform", { length: 50 }).default("tiktok"),
  rawData: json("rawData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PerformanceData = typeof performanceData.$inferSelect;
export type InsertPerformanceData = typeof performanceData.$inferInsert;

// ─── Ads Recommendations ───────────────────────────────────────────────────────

export const adRecommendations = pgTable("ad_recommendations", {
  id: serial("id").primaryKey(),
  brandId: integer("brandId").references(() => brands.id),
  skuId: integer("skuId").references(() => skus.id),
  adId: varchar("adId", { length: 100 }),
  adName: varchar("adName", { length: 300 }),
  action: adActionEnum("action").notNull(),
  reason: text("reason").notNull(),
  priority: integer("priority").default(1),
  estimatedImpact: text("estimatedImpact"),
  aiAnalysis: text("aiAnalysis"),
  isActioned: boolean("isActioned").default(false),
  actionedAt: timestamp("actionedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type AdRecommendation = typeof adRecommendations.$inferSelect;
export type InsertAdRecommendation = typeof adRecommendations.$inferInsert;
