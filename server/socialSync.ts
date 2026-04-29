import type { InsertContentHistory, InsertPerformanceData, SocialAccount } from "../drizzle/schema";
import {
  createSocialSyncRun,
  finishSocialSyncRun,
  getSocialAccounts,
  getSocialSyncRuns,
  insertSocialPerformanceData,
  updateSocialAccountSyncState,
  upsertContentHistoryByExternalId,
} from "./db";
import { FacebookClient, type FacebookPost, TikTokAdsClient, type TikTokAd, TikTokClient, type TikTokVideo } from "./socialClients";

type SyncStats = {
  fetched: number;
  upserted: number;
  errors: number;
};

function asNumber(value: unknown, fallback = 0) {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function parseTikTokDate(value: unknown) {
  if (!value) return undefined;
  if (typeof value === "number") return new Date(value > 10_000_000_000 ? value : value * 1000);
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return new Date(numeric > 10_000_000_000 ? numeric : numeric * 1000);
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseFacebookDate(value: unknown) {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function trimTitle(value: string, fallback: string) {
  const title = value.trim() || fallback;
  return title.length > 300 ? title.slice(0, 297) + "..." : title;
}

export function mapTikTokVideoToContentInput(
  video: TikTokVideo,
  opts: { brandId: number; socialAccountId?: number },
): InsertContentHistory {
  const externalId = String(video.item_id ?? "").trim();
  const caption = typeof video.caption === "string" ? video.caption : "";
  return {
    brandId: opts.brandId,
    socialAccountId: opts.socialAccountId,
    externalId,
    title: trimTitle(caption, externalId ? `TikTok ${externalId}` : "TikTok Content"),
    contentType: "EDUCATION",
    caption,
    platform: "tiktok",
    publishedAt: parseTikTokDate(video.create_time),
    videoUrl: typeof video.share_url === "string" ? video.share_url : undefined,
    thumbnailUrl: typeof video.thumbnail_url === "string" ? video.thumbnail_url : undefined,
    views: asNumber(video.video_views),
    reach: asNumber(video.reach),
    likes: asNumber(video.likes),
    comments: asNumber(video.comments),
    shares: asNumber(video.shares),
    rawData: video,
    lastSyncedAt: new Date(),
    notes: "Synced from TikTok Business API",
  };
}

export function mapFacebookPostToContentInput(
  post: FacebookPost,
  insights: Record<string, unknown>,
  opts: { brandId: number; socialAccountId?: number; pageId: string },
): InsertContentHistory {
  const externalId = String(post.id ?? "").trim();
  const caption = String(post.message ?? post.story ?? "");
  return {
    brandId: opts.brandId,
    socialAccountId: opts.socialAccountId,
    externalId,
    title: trimTitle(caption, externalId ? `Facebook ${externalId}` : "Facebook Content"),
    contentType: "EDUCATION",
    caption,
    platform: "facebook",
    publishedAt: parseFacebookDate(post.created_time),
    videoUrl: typeof post.permalink_url === "string" ? post.permalink_url : undefined,
    thumbnailUrl: typeof post.full_picture === "string" ? post.full_picture : undefined,
    views: asNumber(insights.post_impressions),
    reach: asNumber(insights.post_impressions_unique),
    likes: asNumber(insights.likes),
    comments: asNumber(insights.comments),
    shares: asNumber(insights.shares),
    rawData: { post, insights, pageId: opts.pageId },
    lastSyncedAt: new Date(),
    notes: "Synced from Facebook Graph API",
  };
}

export function mapTikTokAdToPerformanceInput(
  ad: TikTokAd,
  opts: { brandId: number; socialAccountId?: number },
): InsertPerformanceData {
  const itemId = typeof ad.tiktok_item_id === "string" ? ad.tiktok_item_id : undefined;
  return {
    brandId: opts.brandId,
    externalId: itemId,
    adId: typeof ad.ad_id === "string" ? ad.ad_id : undefined,
    adName: typeof ad.ad_name === "string" ? ad.ad_name : undefined,
    campaignId: typeof ad.campaign_id === "string" ? ad.campaign_id : undefined,
    campaignName: typeof ad.campaign_name === "string" ? ad.campaign_name : undefined,
    adGroupId: typeof ad.adgroup_id === "string" ? ad.adgroup_id : undefined,
    adGroupName: typeof ad.adgroup_name === "string" ? ad.adgroup_name : undefined,
    date: new Date(),
    period: "daily",
    platform: "tiktok",
    rawData: { ad, socialAccountId: opts.socialAccountId },
  };
}

async function findSocialAccount(brandId: number, platform: string, accountId?: number) {
  const accounts = await getSocialAccounts(brandId, platform);
  if (accountId) return accounts.find((account) => account.id === accountId);
  return accounts.find((account) => account.status === "active") ?? accounts[0];
}

async function runTrackedSync<T>(
  params: {
    brandId: number;
    platform: string;
    syncType: string;
    account?: SocialAccount;
    action: () => Promise<T>;
    getStats: (result: T) => Record<string, unknown>;
  },
) {
  const runId = await createSocialSyncRun({
    brandId: params.brandId,
    platform: params.platform,
    syncType: params.syncType,
    socialAccountId: params.account?.id,
    status: "running",
  });

  try {
    const result = await params.action();
    const stats = params.getStats(result);
    await finishSocialSyncRun(runId, { status: "success", stats });
    if (params.account) {
      await updateSocialAccountSyncState(params.account.id, {
        lastSyncedAt: new Date(),
        lastError: null,
        status: "active",
      });
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishSocialSyncRun(runId, { status: "failed", error: message });
    if (params.account) {
      await updateSocialAccountSyncState(params.account.id, {
        lastError: message,
        status: "error",
      });
    }
    throw error;
  }
}

export async function syncTikTokContent(input: {
  brandId: number;
  accountId?: number;
  businessId?: string;
  maxPages?: number;
}) {
  const account = await findSocialAccount(input.brandId, "tiktok", input.accountId);
  const businessId = input.businessId ?? account?.businessId ?? process.env.TIKTOK_BUSINESS_ID;
  if (!businessId) throw new Error("Missing TikTok business_id");

  return runTrackedSync({
    brandId: input.brandId,
    platform: "tiktok",
    syncType: "content",
    account,
    action: async () => {
      const client = new TikTokClient(account?.accessTokenEnvKey);
      const videos = await client.fetchVideos(businessId, input.maxPages ?? 5);
      const stats: SyncStats = { fetched: videos.length, upserted: 0, errors: 0 };

      for (const video of videos) {
        try {
          const data = mapTikTokVideoToContentInput(video, {
            brandId: input.brandId,
            socialAccountId: account?.id,
          });
          if (!data.externalId) {
            stats.errors += 1;
            continue;
          }
          await upsertContentHistoryByExternalId(data);
          stats.upserted += 1;
        } catch (_error) {
          stats.errors += 1;
        }
      }

      return stats;
    },
    getStats: (stats) => stats,
  });
}

export async function syncFacebookPosts(input: {
  brandId: number;
  accountId?: number;
  pageId?: string;
  daysBack?: number;
  skipInsights?: boolean;
}) {
  const account = await findSocialAccount(input.brandId, "facebook", input.accountId);
  const pageId = input.pageId ?? account?.pageId ?? FacebookClient.defaultPageIds()[0];
  if (!pageId) throw new Error("Missing Facebook page_id");
  const pageIds = !input.pageId && !account?.pageId ? FacebookClient.defaultPageIds() : [pageId];

  return runTrackedSync({
    brandId: input.brandId,
    platform: "facebook",
    syncType: "content",
    account,
    action: async () => {
      const client = new FacebookClient(account?.accessTokenEnvKey);
      const stats: SyncStats = { fetched: 0, upserted: 0, errors: 0 };

      for (const currentPageId of pageIds) {
        const posts = await client.fetchPosts(currentPageId, input.daysBack ?? 365);
        stats.fetched += posts.length;

        for (const post of posts) {
          try {
            const insights = input.skipInsights || !post.id ? {} : await client.fetchPostInsights(post.id, currentPageId);
            const data = mapFacebookPostToContentInput(post, insights, {
              brandId: input.brandId,
              socialAccountId: account?.id,
              pageId: currentPageId,
            });
            if (!data.externalId) {
              stats.errors += 1;
              continue;
            }
            await upsertContentHistoryByExternalId(data);
            stats.upserted += 1;
          } catch (_error) {
            stats.errors += 1;
          }
        }
      }

      return stats;
    },
    getStats: (stats) => stats,
  });
}

export async function syncTikTokAds(input: {
  brandId: number;
  accountId?: number;
  advertiserId?: string;
}) {
  const account = await findSocialAccount(input.brandId, "tiktok", input.accountId);
  const advertiserId = input.advertiserId ?? account?.advertiserId ?? process.env.TIKTOK_ADVERTISER_ID;
  if (!advertiserId) throw new Error("Missing TikTok advertiser_id");

  return runTrackedSync({
    brandId: input.brandId,
    platform: "tiktok",
    syncType: "ads",
    account,
    action: async () => {
      const client = new TikTokAdsClient(account?.accessTokenEnvKey);
      const ads = await client.fetchAds(advertiserId);
      const rows = ads.map((ad) => mapTikTokAdToPerformanceInput(ad, {
        brandId: input.brandId,
        socialAccountId: account?.id,
      }));
      const inserted = await insertSocialPerformanceData(rows);
      return { fetched: ads.length, inserted };
    },
    getStats: (stats) => stats,
  });
}

export async function getSocialSyncStatus(brandId?: number) {
  const [accounts, runs] = await Promise.all([
    getSocialAccounts(brandId),
    getSocialSyncRuns(20, brandId),
  ]);

  return {
    accounts,
    runs,
    env: {
      tiktokContentReady: Boolean(process.env.TIKTOK_ACCESS_TOKEN || process.env.TIKTOK_MAIN_ACCESS_TOKEN || process.env.TIKTOK_AD_TOKEN),
      tiktokBusinessIdReady: Boolean(process.env.TIKTOK_BUSINESS_ID),
      tiktokAdvertiserIdReady: Boolean(process.env.TIKTOK_ADVERTISER_ID),
      facebookReady: Boolean(process.env.FB_PAGE_ACCESS_TOKEN),
      facebookPageIds: FacebookClient.defaultPageIds(),
    },
  };
}
