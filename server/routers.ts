import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import {
  getBrandRules,
  createBrandRule,
  updateBrandRule,
  deleteBrandRule,
  getSkus,
  createSku,
  updateSku,
  deleteSku,
  getContentMatrixBySkuId,
  getAllContentMatrix,
  createContentMatrix,
  updateContentMatrix,
  deleteContentMatrix,
  getContentCalendar,
  createCalendarEntry,
  updateCalendarEntry,
  deleteCalendarEntry,
  getContentHistory,
  getContentHistoryById,
  getContentHistorySummary,
  createContentHistory,
  updateContentHistory,
  updateContentHistorySkus,
  deleteContentHistory,
  getProductSets,
  getPerformanceData,
  insertPerformanceData,
  getPerformanceSummary,
  getAdRecommendations,
  createAdRecommendation,
  markRecommendationActioned,
  getDashboardKPIs,
  getAllBrands,
  upsertBrand,
  getSocialAccounts,
  upsertSocialAccount,
} from "./db";
import {
  getSocialSyncStatus,
  syncFacebookPosts,
  syncTikTokAds,
  syncTikTokContent,
} from "./socialSync";

// ─── Brands Router ────────────────────────────────────────────────────────────
const brandsRouter = router({
  list: protectedProcedure.query(() => getAllBrands()),
  upsert: protectedProcedure
    .input(z.object({
      id: z.number().optional(),
      name: z.string(),
      slug: z.string(),
      description: z.string().optional(),
      logoUrl: z.string().optional(),
      primaryColor: z.string().optional(),
      isActive: z.boolean().default(true),
    }))
    .mutation(({ input }) => upsertBrand(input)),
});

// ─── Brand Brain Router ───────────────────────────────────────────────────────
const brandBrainRouter = router({
  list: protectedProcedure
    .input(z.object({ brandId: z.number().optional() }))
    .query(({ input }) => getBrandRules(input.brandId)),
  create: protectedProcedure
    .input(z.object({
      brandId: z.number(),
      category: z.string(),
      title: z.string(),
      description: z.string(),
      examples: z.string().optional(),
      priority: z.number().default(0),
    }))
    .mutation(({ input }) => { const { description, examples, ...rest } = input as any; return createBrandRule({ ...rest, content: description ?? "", isActive: true }); }),
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      category: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      examples: z.string().optional(),
      priority: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(({ input }) => {
      const { id, description, examples, ...rest } = input as any;
      return updateBrandRule(id, { ...rest, ...(description !== undefined ? { content: description } : {}) });
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteBrandRule(input.id)),
});

// ─── SKU Router ───────────────────────────────────────────────────────────────
const skuRouter = router({
  list: protectedProcedure
    .input(z.object({ brandId: z.number().optional() }))
    .query(({ input }) => getSkus(input.brandId)),
  create: protectedProcedure
    .input(z.object({
      brandId: z.number(),
      name: z.string(),
      sku: z.string(),
      category: z.string(),
      description: z.string().optional(),
      targetAudience: z.string().optional(),
      keyBenefits: z.string().optional(),
      price: z.number().optional(),
      imageUrl: z.string().optional(),
    }))
    .mutation(({ input }) => { const { targetAudience, keyBenefits, ...rest } = input as any; return createSku({ ...rest, isActive: true }); }),
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      category: z.string().optional(),
      description: z.string().optional(),
      targetAudience: z.string().optional(),
      keyBenefits: z.string().optional(),
      price: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(({ input }) => {
      const { id, targetAudience, keyBenefits, ...rest } = input as any;
      return updateSku(id, rest);
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteSku(input.id)),
  getMatrix: protectedProcedure
    .input(z.object({ skuId: z.number() }))
    .query(({ input }) => getContentMatrixBySkuId(input.skuId)),
  getAllMatrix: protectedProcedure
    .input(z.object({ brandId: z.number().optional() }))
    .query(({ input }) => getAllContentMatrix(input.brandId)),
  createMatrix: protectedProcedure
    .input(z.object({
      skuId: z.number(),
      contentType: z.string(),
      framework: z.string().optional(),
      hookTemplate: z.string().optional(),
      captionTemplate: z.string().optional(),
      notes: z.string().optional(),
      priority: z.number().default(0),
    }))
    .mutation(({ input }) => createContentMatrix({ ...input, contentType: input.contentType as any })),
  updateMatrix: protectedProcedure
    .input(z.object({
      id: z.number(),
      contentType: z.string().optional(),
      framework: z.string().optional(),
      hookTemplate: z.string().optional(),
      captionTemplate: z.string().optional(),
      notes: z.string().optional(),
      priority: z.number().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...rest } = input;
      return updateContentMatrix(id, { ...rest, ...(rest.contentType ? { contentType: rest.contentType as any } : {}) });
    }),
  deleteMatrix: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteContentMatrix(input.id)),
});

// ─── Content Calendar Router ──────────────────────────────────────────────────
const calendarRouter = router({
  list: protectedProcedure
    .input(z.object({
      from: z.date(),
      to: z.date(),
      brandId: z.number().optional(),
    }))
    .query(({ input }) => getContentCalendar(input.from, input.to, input.brandId)),
  create: protectedProcedure
    .input(z.object({
      brandId: z.number(),
      skuId: z.number().optional(),
      skuIds: z.array(z.number()).optional(),
      title: z.string(),
      contentType: z.string(),
      hook: z.string().optional(),
      caption: z.string().optional(),
      coverConcept: z.string().optional(),
      targetDate: z.date(),
      platform: z.string().default("tiktok"),
      status: z.enum(["planned", "in_progress", "published", "cancelled"]).default("planned"),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => createCalendarEntry({ ...input, contentType: input.contentType as any })),
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().optional(),
      contentType: z.string().optional(),
      hook: z.string().optional(),
      caption: z.string().optional(),
      coverConcept: z.string().optional(),
      targetDate: z.date().optional(),
      status: z.enum(["planned", "in_progress", "published", "cancelled"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...rest } = input;
      return updateCalendarEntry(id, { ...rest, ...(rest.contentType ? { contentType: rest.contentType as any } : {}) });
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteCalendarEntry(input.id)),
  generate: protectedProcedure
    .input(z.object({
      brandId: z.number(),
      weekStart: z.date(),
      postsPerWeek: z.number().default(7),
    }))
    .mutation(async ({ input }) => {
      const rules = await getBrandRules(input.brandId);
      const skuList = await getSkus(input.brandId);
      const rulesText = rules.map((r) => `[${r.category}] ${r.title}: ${r.content}`).join("\n");
      const skuText = skuList.map((s) => `- ${s.name} (${s.category}): ${s.description ?? ""}`).join("\n");
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "คุณเป็น Content Director ผู้เชี่ยวชาญ TikTok Content Strategy สำหรับแบรนด์ไทย" },
          {
            role: "user",
            content: `สร้าง Content Calendar ${input.postsPerWeek} posts สำหรับสัปดาห์ที่เริ่ม ${input.weekStart.toISOString().split("T")[0]}

Brand Rules:
${rulesText}

สินค้า:
${skuText}

ตอบเป็น JSON:
{"posts": [{"title": "...", "contentType": "SALE|EDUCATION|ENTERTAINMENT|REVIEW|LIFESTYLE", "hook": "...", "caption": "...", "coverConcept": "...", "targetDate": "YYYY-MM-DD", "skuName": "ชื่อสินค้า", "notes": "..."}]}`,
          },
        ],
        response_format: { type: "json_object" },
      });
      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : "{}";
      let posts: any[] = [];
      try {
        const parsed = JSON.parse(content);
        posts = parsed.posts ?? [];
      } catch (_e) {
        posts = [];
      }
      const created = [];
      for (const post of posts) {
        const matchedSku = skuList.find((s) => s.name === post.skuName);
        const id = await createCalendarEntry({
          brandId: input.brandId,
          skuId: matchedSku?.id,
          title: post.title,
          contentType: post.contentType ?? "EDUCATION",
          hook: post.hook,
          caption: post.caption,
          coverConcept: post.coverConcept,
          targetDate: new Date(post.targetDate),
          platform: "tiktok",
          status: "planned",
          notes: post.notes,
        });
        created.push(id);
      }
      return { created: created.length, posts };
    }),
});

// ─── Content History Router ───────────────────────────────────────────────────
const historyFiltersSchema = z.object({
  limit: z.number().min(1).max(200).default(50),
  offset: z.number().min(0).default(0),
  brandId: z.number().optional(),
  search: z.string().optional(),
  view: z.enum(["all", "last100", "bestPFM", "notProper", "shouldRunAds", "noProductMapping", "highEngagement", "multiSku"]).default("all"),
  platform: z.string().optional(),
  contentType: z.string().optional(),
  skuId: z.number().optional(),
  productSetId: z.number().optional(),
  mapping: z.enum(["all", "mapped", "unmapped"]).default("all"),
  status: z.enum(["all", "published", "unpublished"]).default("all"),
  contentStatus: z.string().optional(),
  sortBy: z.enum(["publishedAt", "createdAt", "views", "reach", "likes", "comments", "shares", "bookmarks", "pfmScore", "totalMediaCost", "adsCount"]).default("publishedAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

const historyRouter = router({
  list: protectedProcedure
    .input(historyFiltersSchema)
    .query(({ input }) => getContentHistory(
      input.view === "last100" ? Math.min(input.limit, 100) : input.limit,
      input.offset,
      input.brandId,
      input,
    )),
  summary: protectedProcedure
    .input(historyFiltersSchema.omit({ limit: true, offset: true }))
    .query(({ input }) => getContentHistorySummary(input.brandId, input)),
  analyzeWithAI: protectedProcedure
    .input(z.object({ id: z.number(), brandId: z.number().optional() }))
    .mutation(async ({ input }) => {
      const item = await getContentHistoryById(input.id);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Content not found" });
      const brandId = input.brandId ?? item.brandId ?? undefined;
      const [skuList, rules] = await Promise.all([
        getSkus(brandId),
        getBrandRules(brandId),
      ]);
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "คุณเป็น BrandOS AI Strategist ที่ช่วยทีม content, sale และ performance marketing วิเคราะห์ content ภาษาไทยอย่างเป็นระบบและตอบเป็น JSON เท่านั้น",
          },
          {
            role: "user",
            content: `วิเคราะห์ content นี้เพื่อช่วยทีม Jula's Herb ตัดสินใจต่อยอดด้าน content, sale และ marketing

Content:
${JSON.stringify({
  id: item.id,
  title: item.title,
  hook: item.hook,
  caption: item.caption,
  platform: item.platform,
  contentType: item.contentType,
  publishedAt: item.publishedAt,
  metrics: {
    views: item.views,
    reach: item.reach,
    likes: item.likes,
    bookmarks: item.bookmarks,
    comments: item.comments,
    shares: item.shares,
    pfmScore: item.pfmScore,
    totalMediaCost: item.totalMediaCost,
    adsCount: item.adsCount,
  },
  contentStatus: item.contentStatus,
  contentExpireDate: item.contentExpireDate,
  currentSkuIds: item.skuMappings?.map((mapping) => mapping.skuId) ?? (item.skuId ? [item.skuId] : []),
  currentSkus: item.skuMappings?.map((mapping) => ({ id: mapping.skuId, sku: mapping.sku, name: mapping.name })) ?? [],
  notes: item.notes,
}, null, 2)}

Available SKUs:
${skuList.map((sku) => `- id=${sku.id} ${sku.name} (${sku.category ?? "uncategorized"}): ${sku.description ?? ""}`).join("\n") || "- none"}

Brand rules:
${rules.slice(0, 12).map((rule) => `- [${rule.category}] ${rule.title}: ${rule.content}`).join("\n") || "- none"}

ตอบเป็น JSON รูปแบบนี้:
{
  "summary": "สรุป content 1-2 ประโยค",
  "salesAngle": "มุมขายที่ควรใช้",
  "recommendedSkuIds": [1, 2],
  "recommendedSkuNames": ["ชื่อสินค้า 1", "ชื่อสินค้า 2"],
  "funnelStage": "awareness|consideration|conversion|retention",
  "organicScore": 0-100,
  "adsPotential": "low|medium|high",
  "recommendedActions": ["action 1", "action 2", "action 3"],
  "nextContentIdeas": ["idea 1", "idea 2"],
  "reasoning": "เหตุผลสั้นๆ"
}`,
          },
        ],
        response_format: { type: "json_object" },
      });
      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : "{}";
      try {
        return JSON.parse(content);
      } catch (_error) {
        return {
          summary: content,
          salesAngle: "",
          recommendedSkuIds: [],
          recommendedSkuNames: [],
          funnelStage: "awareness",
          organicScore: 0,
          adsPotential: "medium",
          recommendedActions: [],
          nextContentIdeas: [],
          reasoning: "AI response was not valid JSON",
        };
      }
    }),
  create: protectedProcedure
    .input(z.object({
      brandId: z.number(),
      skuId: z.number().optional(),
      skuIds: z.array(z.number()).optional(),
      title: z.string(),
      contentType: z.string(),
      hook: z.string().optional(),
      caption: z.string().optional(),
      platform: z.string().default("tiktok"),
      publishedAt: z.date().optional(),
      videoUrl: z.string().optional(),
      views: z.number().optional(),
      likes: z.number().optional(),
      bookmarks: z.number().optional(),
      comments: z.number().optional(),
      shares: z.number().optional(),
      pfmScore: z.number().optional(),
      totalMediaCost: z.number().optional(),
      adsCount: z.number().optional(),
      contentStatus: z.string().nullable().optional(),
      contentExpireDate: z.date().nullable().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { skuIds, ...data } = input;
      const id = await createContentHistory({ ...data, skuId: data.skuId ?? skuIds?.[0], contentType: input.contentType as any });
      if (skuIds?.length) await updateContentHistorySkus(id, skuIds);
      return id;
    }),
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      skuId: z.number().nullable().optional(),
      skuIds: z.array(z.number()).optional(),
      title: z.string().optional(),
      contentType: z.string().optional(),
      hook: z.string().nullable().optional(),
      caption: z.string().nullable().optional(),
      views: z.number().optional(),
      reach: z.number().optional(),
      likes: z.number().optional(),
      bookmarks: z.number().optional(),
      comments: z.number().optional(),
      shares: z.number().optional(),
      pfmScore: z.number().optional(),
      totalMediaCost: z.number().optional(),
      adsCount: z.number().optional(),
      contentStatus: z.string().nullable().optional(),
      contentExpireDate: z.date().nullable().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, contentType, skuIds, ...rest } = input;
      await updateContentHistory(id, { ...rest, ...(contentType ? { contentType: contentType as any } : {}) });
      if (skuIds !== undefined) await updateContentHistorySkus(id, skuIds);
      return { success: true };
    }),
  updateSkus: protectedProcedure
    .input(z.object({ id: z.number(), skuIds: z.array(z.number()) }))
    .mutation(({ input }) => updateContentHistorySkus(input.id, input.skuIds)),
  bulkUpdateSkus: protectedProcedure
    .input(z.object({ ids: z.array(z.number()), skuIds: z.array(z.number()) }))
    .mutation(async ({ input }) => {
      for (const id of input.ids) {
        await updateContentHistorySkus(id, input.skuIds);
      }
      return { updated: input.ids.length };
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteContentHistory(input.id)),
});

// ─── Product Sets Router ─────────────────────────────────────────────────────
const productSetsRouter = router({
  list: protectedProcedure
    .input(z.object({
      brandId: z.number().optional(),
      search: z.string().optional(),
      limit: z.number().min(1).max(200).default(100),
      offset: z.number().min(0).default(0),
      sortBy: z.enum(["contentCount", "avgPfmScore", "totalViews", "totalMediaCost", "lastContentAt"]).default("contentCount"),
      sortDir: z.enum(["asc", "desc"]).default("desc"),
    }))
    .query(({ input }) => getProductSets(input)),
});

// ─── Performance Router ───────────────────────────────────────────────────────
const performanceRouter = router({
  list: protectedProcedure
    .input(z.object({ from: z.date().optional(), to: z.date().optional(), limit: z.number().default(100), brandId: z.number().optional() }))
    .query(({ input }) => getPerformanceData(input.from, input.to, input.limit, input.brandId)),
  summary: protectedProcedure
    .input(z.object({ brandId: z.number().optional() }))
    .query(({ input }) => getPerformanceSummary(input.brandId)),
  import: protectedProcedure
    .input(z.object({
      brandId: z.number(),
      data: z.array(z.object({
        externalId: z.string().optional(),
        campaignName: z.string().optional(),
        adName: z.string().optional(),
        date: z.date(),
        platform: z.string().default("tiktok"),
        spend: z.number().default(0),
        revenue: z.number().default(0),
        impressions: z.number().default(0),
        clicks: z.number().default(0),
        conversions: z.number().default(0),
        views: z.number().default(0),
        roas: z.number().default(0),
        ctr: z.number().default(0),
        cpa: z.number().default(0),
        completionRate: z.number().default(0),
      })),
    }))
    .mutation(({ input }) => insertPerformanceData(input.data.map((d) => ({ ...d, brandId: input.brandId })))),
  analyze: protectedProcedure
    .input(z.object({ from: z.date().optional(), to: z.date().optional(), brandId: z.number().optional() }))
    .mutation(async ({ input }) => {
      const data = await getPerformanceData(input.from, input.to, 50, input.brandId);
      if (data.length === 0) return { insights: [], summary: null };
      const summary = await getPerformanceSummary(input.brandId);
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "คุณเป็น Performance Analyst ผู้เชี่ยวชาญ TikTok Ads" },
          {
            role: "user",
            content: `วิเคราะห์ Performance Data ต่อไปนี้:
Total Spend: ${summary?.totalSpend}
Total Revenue: ${summary?.totalRevenue}
Avg ROAS: ${summary?.avgRoas}
Avg CTR: ${summary?.avgCtr}
Total Views: ${summary?.totalViews}

Top entries:
${JSON.stringify(data.slice(0, 10), null, 2)}

ให้ insights เป็นภาษาไทย ตอบเป็น JSON:
{"insights": [{"type": "warning|success|info", "title": "...", "description": "...", "action": "..."}]}`,
          },
        ],
        response_format: { type: "json_object" },
      });
      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : "{}";
      let insights: any[] = [];
      try {
        const parsed = JSON.parse(content);
        insights = parsed.insights ?? [];
      } catch (_e) {
        insights = [];
      }
      return { insights, summary };
    }),
});

// ─── Social Sync Router ────────────────────────────────────────────────────────
const socialRouter = router({
  status: protectedProcedure
    .input(z.object({ brandId: z.number().optional() }).optional())
    .query(({ input }) => getSocialSyncStatus(input?.brandId)),
  accounts: protectedProcedure
    .input(z.object({
      brandId: z.number().optional(),
      platform: z.string().optional(),
    }).optional())
    .query(({ input }) => getSocialAccounts(input?.brandId, input?.platform)),
  upsertAccount: protectedProcedure
    .input(z.object({
      brandId: z.number(),
      platform: z.enum(["tiktok", "facebook"]),
      accountKey: z.string().min(1),
      accountName: z.string().optional(),
      pageId: z.string().optional(),
      businessId: z.string().optional(),
      advertiserId: z.string().optional(),
      accessTokenEnvKey: z.string().optional(),
      refreshTokenEnvKey: z.string().optional(),
      status: z.string().default("active"),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(({ input }) => upsertSocialAccount(input)),
  syncTikTokContent: protectedProcedure
    .input(z.object({
      brandId: z.number().default(1),
      accountId: z.number().optional(),
      businessId: z.string().optional(),
      maxPages: z.number().min(1).max(20).default(5),
    }))
    .mutation(({ input }) => syncTikTokContent(input)),
  syncFacebookPosts: protectedProcedure
    .input(z.object({
      brandId: z.number().default(1),
      accountId: z.number().optional(),
      pageId: z.string().optional(),
      daysBack: z.number().min(1).max(3650).default(365),
      skipInsights: z.boolean().default(false),
    }))
    .mutation(({ input }) => syncFacebookPosts(input)),
  syncTikTokAds: protectedProcedure
    .input(z.object({
      brandId: z.number().default(1),
      accountId: z.number().optional(),
      advertiserId: z.string().optional(),
    }))
    .mutation(({ input }) => syncTikTokAds(input)),
});

// ─── Anti-Annoy Router ────────────────────────────────────────────────────────
const antiAnnoyRouter = router({
  analyze: protectedProcedure
    .input(z.object({
      periodStart: z.date(),
      periodEnd: z.date(),
      brandId: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const calendarEntries = await getContentCalendar(input.periodStart, input.periodEnd, input.brandId);
      const historyEntries = await getContentHistory(100, 0, input.brandId);
      const allContent = [
        ...calendarEntries.map((c) => ({ type: c.contentType, hook: c.hook, title: c.title, skuId: c.skuId })),
        ...historyEntries
          .filter((h) => h.publishedAt && h.publishedAt >= input.periodStart && h.publishedAt <= input.periodEnd)
          .map((h) => ({ type: h.contentType, hook: h.hook, title: h.title, skuId: h.skuId })),
      ];
      const total = allContent.length || 1;
      const typeCounts: Record<string, number> = {};
      for (const c of allContent) {
        typeCounts[c.type] = (typeCounts[c.type] ?? 0) + 1;
      }
      const saleRatio = (typeCounts["SALE"] ?? 0) / total;
      const educationRatio = (typeCounts["EDUCATION"] ?? 0) / total;
      const entertainmentRatio = (typeCounts["ENTERTAINMENT"] ?? 0) / total;
      const reviewRatio = (typeCounts["REVIEW"] ?? 0) / total;
      const lifestyleRatio = (typeCounts["LIFESTYLE"] ?? 0) / total;
      const hooks = allContent.map((c) => c.hook).filter(Boolean);
      const hookCounts: Record<string, number> = {};
      for (const h of hooks) {
        if (h) hookCounts[h] = (hookCounts[h] ?? 0) + 1;
      }
      const repeatHookCount = Object.values(hookCounts).filter((v) => v > 1).length;
      const skuCounts: Record<string, number> = {};
      for (const c of allContent) {
        if (c.skuId) skuCounts[String(c.skuId)] = (skuCounts[String(c.skuId)] ?? 0) + 1;
      }
      const repeatSkuCount = Object.values(skuCounts).filter((v) => v > 3).length;
      let score = 0;
      if (saleRatio > 0.5) score += 40;
      else if (saleRatio > 0.35) score += 20;
      if (repeatHookCount > 3) score += 20;
      if (repeatSkuCount > 2) score += 20;
      if (entertainmentRatio < 0.1) score += 10;
      if (lifestyleRatio < 0.05) score += 10;
      score = Math.min(score, 100);
      const aiResponse = await invokeLLM({
        messages: [
          { role: "system", content: "คุณเป็น Anti-Annoy Agent วิเคราะห์ว่า content น่าเบื่อหรือขายของมากเกินไปไหม" },
          {
            role: "user",
            content: `วิเคราะห์ Content Mix:
Sale: ${(saleRatio * 100).toFixed(0)}%, Education: ${(educationRatio * 100).toFixed(0)}%
Entertainment: ${(entertainmentRatio * 100).toFixed(0)}%, Review: ${(reviewRatio * 100).toFixed(0)}%
Lifestyle: ${(lifestyleRatio * 100).toFixed(0)}%
Hook ซ้ำ: ${repeatHookCount}, SKU ซ้ำมาก: ${repeatSkuCount}, Score: ${score}/100
ตอบ JSON: {"insights": [{"severity": "high|medium|low", "message": "..."}], "recommendations": ["..."]}`,
          },
        ],
        response_format: { type: "json_object" },
      });
      const rawAiContent = aiResponse.choices[0]?.message?.content;
      const aiContent = typeof rawAiContent === "string" ? rawAiContent : "{}";
      let aiData: any = {};
      try { aiData = JSON.parse(aiContent); } catch (_e) { aiData = {}; }
      return {
        score,
        saleRatio,
        educationRatio,
        entertainmentRatio,
        reviewRatio,
        lifestyleRatio,
        repeatHookCount,
        repeatSkuCount,
        totalContent: allContent.length,
        insights: aiData.insights ?? [],
        recommendations: aiData.recommendations ?? [],
      };
    }),
});

// ─── AI Generator Router ──────────────────────────────────────────────────────
const aiGeneratorRouter = router({
  generate: protectedProcedure
    .input(z.object({
      brandId: z.number(),
      skuId: z.number().optional(),
      contentType: z.string(),
      count: z.number().default(3),
    }))
    .mutation(async ({ input }) => {
      const rules = await getBrandRules(input.brandId);
      const skuList = await getSkus(input.brandId);
      const targetSku = input.skuId ? skuList.find((s) => s.id === input.skuId) : null;
      const rulesText = rules.map((r) => `[${r.category}] ${r.title}: ${r.content}`).join("\n");
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "คุณเป็น Content Creator ผู้เชี่ยวชาญ TikTok สำหรับแบรนด์ไทย" },
          {
            role: "user",
            content: `สร้าง ${input.count} Content Ideas สำหรับ:
ประเภท: ${input.contentType}
สินค้า: ${targetSku ? `${targetSku.name} - ${targetSku.description}` : "ทั่วไป"}

Brand Rules:
${rulesText}

ตอบ JSON: {"ideas": [{"hook": "hook 3 วินาที", "caption": "caption เต็ม", "coverConcept": "concept ภาพปก", "callToAction": "CTA", "notes": "หมายเหตุ"}]}`,
          },
        ],
        response_format: { type: "json_object" },
      });
      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : "{}";
      try {
        const parsed = JSON.parse(content);
        return { ideas: parsed.ideas ?? [] };
      } catch (_e) {
        return { ideas: [] };
      }
    }),
});

// ─── Ads Recommendation Router ────────────────────────────────────────────────
const adsRecommendationRouter = router({
  list: protectedProcedure
    .input(z.object({ brandId: z.number().optional() }))
    .query(({ input }) => getAdRecommendations(input.brandId)),
  generate: protectedProcedure
    .input(z.object({ brandId: z.number(), from: z.date().optional(), to: z.date().optional() }))
    .mutation(async ({ input }) => {
      const perfData = await getPerformanceData(input.from, input.to, 50, input.brandId);
      if (perfData.length === 0) return { created: 0 };
      const dataForAI = perfData.map((d) => ({
        id: d.id, adId: d.adId, views: d.views, roas: d.roas,
        ctr: d.ctr, spend: d.spend, cpa: d.cpa, videoViewsComplete: d.videoViewsComplete, conversions: d.conversions,
      }));
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "คุณเป็น Media Buyer ผู้เชี่ยวชาญ TikTok Ads" },
          {
            role: "user",
            content: `วิเคราะห์ Performance และแนะนำ action:
${JSON.stringify(dataForAI, null, 2)}
ตอบ JSON: {"recommendations": [{"contentId": 1, "action": "scale|stop|test_variation|monitor|optimize", "reason": "...", "priority": "high|medium|low", "analysis": "...", "estimatedImpact": "..."}]}`,
          },
        ],
        response_format: { type: "json_object" },
      });
      const rawContent = response.choices[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : "{}";
      let recs: any[] = [];
      try {
        const parsed = JSON.parse(content);
        recs = parsed.recommendations ?? [];
      } catch (_e) { recs = []; }
      let created = 0;
      for (const rec of recs) {
        const perfEntry = perfData.find((d) => d.id === rec.contentId);
        if (!perfEntry) continue;
        await createAdRecommendation({
          brandId: input.brandId,
          adId: perfEntry.adId,
          adName: perfEntry.adName,
          action: rec.action ?? "monitor",
          reason: rec.reason ?? "",
          priority: typeof rec.priority === "number" ? rec.priority : (rec.priority === "high" ? 3 : rec.priority === "medium" ? 2 : 1),
          aiAnalysis: rec.analysis,
          estimatedImpact: rec.estimatedImpact,
          isActioned: false,
        });
        created++;
      }
      return { created };
    }),
  markActioned: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => markRecommendationActioned(input.id)),
});

// ─── Dashboard Router ─────────────────────────────────────────────────────────
const dashboardRouter = router({
  kpis: protectedProcedure
    .input(z.object({ brandId: z.number().optional() }))
    .query(({ input }) => getDashboardKPIs(input.brandId)),
});

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  dashboard: dashboardRouter,
  brands: brandsRouter,
  brandBrain: brandBrainRouter,
  sku: skuRouter,
  calendar: calendarRouter,
  history: historyRouter,
  productSets: productSetsRouter,
  performance: performanceRouter,
  social: socialRouter,
  antiAnnoy: antiAnnoyRouter,
  aiGenerator: aiGeneratorRouter,
  adsRecommendation: adsRecommendationRouter,
});

export type AppRouter = typeof appRouter;
