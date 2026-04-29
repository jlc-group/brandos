const TIKTOK_API_BASE_URL = process.env.TIKTOK_API_BASE_URL ?? "https://business-api.tiktok.com/open_api/v1.3";
const FACEBOOK_GRAPH_API_BASE_URL = process.env.FACEBOOK_GRAPH_API_BASE_URL ?? "https://graph.facebook.com/v23.0";

type JsonRecord = Record<string, unknown>;

function getEnvValue(key?: string | null) {
  return key ? process.env[key] : undefined;
}

function readJsonList(value?: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch (_error) {
    // Fall back to comma-separated env values.
  }
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    const body = await response.text().catch(() => response.statusText);
    throw new Error(`HTTP ${response.status}: ${body}`);
  }
  return response.json() as Promise<T>;
}

export type TikTokVideo = {
  item_id?: string;
  create_time?: number | string;
  thumbnail_url?: string;
  share_url?: string;
  caption?: string;
  video_views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  reach?: number;
  [key: string]: unknown;
};

export type TikTokAd = {
  ad_id?: string;
  advertiser_id?: string;
  campaign_id?: string;
  campaign_name?: string;
  adgroup_id?: string;
  adgroup_name?: string;
  ad_name?: string;
  tiktok_item_id?: string;
  [key: string]: unknown;
};

export type FacebookPost = {
  id?: string;
  created_time?: string;
  message?: string;
  story?: string;
  permalink_url?: string;
  full_picture?: string;
  is_published?: boolean;
  is_hidden?: boolean;
  [key: string]: unknown;
};

export class TikTokClient {
  constructor(private readonly tokenEnvKey?: string | null) {}

  private async getAccessToken() {
    const directToken = getEnvValue(this.tokenEnvKey)
      ?? process.env.TIKTOK_ACCESS_TOKEN
      ?? process.env.TIKTOK_MAIN_ACCESS_TOKEN
      ?? process.env.TIKTOK_AD_TOKEN;
    if (directToken) return directToken;

    const clientId = process.env.TIKTOK_CLIENT_ID;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
    const refreshToken = getEnvValue(process.env.TIKTOK_REFRESH_TOKEN_ENV_KEY)
      ?? process.env.TIKTOK_REFRESH_TOKEN;
    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error("Missing TikTok token or refresh credentials");
    }

    const data = await fetchJson<{ data?: { access_token?: string } }>(
      `${TIKTOK_API_BASE_URL}/tt_user/oauth2/refresh_token/`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      },
    );
    const token = data.data?.access_token;
    if (!token) throw new Error("TikTok refresh response did not include access_token");
    return token;
  }

  async fetchVideos(businessId: string, maxPages = 5) {
    const accessToken = await this.getAccessToken();
    const videos: TikTokVideo[] = [];
    let cursor: string | undefined;

    for (let page = 0; page < maxPages; page += 1) {
      const url = new URL(`${TIKTOK_API_BASE_URL}/business/video/list/`);
      url.searchParams.set("business_id", businessId);
      url.searchParams.set("max_count", "20");
      url.searchParams.set("fields", JSON.stringify([
        "item_id",
        "create_time",
        "thumbnail_url",
        "share_url",
        "caption",
        "video_views",
        "likes",
        "comments",
        "shares",
        "reach",
        "video_duration",
        "full_video_watched_rate",
        "total_time_watched",
        "average_time_watched",
        "impression_sources",
      ]));
      if (cursor) url.searchParams.set("cursor", cursor);

      const data = await fetchJson<{ data?: { videos?: TikTokVideo[]; cursor?: string; has_more?: boolean } }>(
        url.toString(),
        { headers: { "Access-Token": accessToken } },
      );
      const pageVideos = data.data?.videos ?? [];
      videos.push(...pageVideos);
      if (!data.data?.has_more || !data.data.cursor) break;
      cursor = data.data.cursor;
    }

    return videos;
  }
}

export class TikTokAdsClient {
  constructor(private readonly tokenEnvKey?: string | null) {}

  private getAccessToken() {
    const token = getEnvValue(this.tokenEnvKey)
      ?? process.env.TIKTOK_AD_TOKEN
      ?? process.env.TIKTOK_ACCESS_TOKEN
      ?? process.env.TIKTOK_MAIN_ACCESS_TOKEN;
    if (!token) throw new Error("Missing TikTok Ads access token");
    return token;
  }

  async fetchAds(advertiserId: string, pageLimit = 5) {
    const token = this.getAccessToken();
    const ads: TikTokAd[] = [];

    for (let page = 1; page <= pageLimit; page += 1) {
      const url = new URL(`${TIKTOK_API_BASE_URL}/ad/get/`);
      url.searchParams.set("advertiser_id", advertiserId);
      url.searchParams.set("page", String(page));
      url.searchParams.set("page_size", "1000");
      url.searchParams.set("fields", JSON.stringify([
        "advertiser_id",
        "campaign_id",
        "campaign_name",
        "adgroup_id",
        "adgroup_name",
        "ad_id",
        "ad_name",
        "tiktok_item_id",
        "operation_status",
        "secondary_status",
        "create_time",
        "modify_time",
      ]));

      const data = await fetchJson<{ data?: { list?: TikTokAd[]; page_info?: { total_page?: number } } }>(
        url.toString(),
        { headers: { "Access-Token": token } },
      );
      ads.push(...(data.data?.list ?? []));
      const totalPage = data.data?.page_info?.total_page ?? 1;
      if (page >= totalPage) break;
    }

    return ads;
  }
}

export class FacebookClient {
  constructor(private readonly tokenEnvKey?: string | null) {}

  static defaultPageIds() {
    return readJsonList(process.env.FB_PAGE_IDS);
  }

  static defaultPageAccessTokens() {
    return readJsonList(process.env.FB_PAGE_ACCESS_TOKEN);
  }

  private getPageAccessToken(pageId?: string) {
    const explicitToken = getEnvValue(this.tokenEnvKey);
    if (explicitToken) return explicitToken;

    const tokens = FacebookClient.defaultPageAccessTokens();
    const pageIds = FacebookClient.defaultPageIds();
    const pageIndex = pageId ? pageIds.indexOf(pageId) : -1;
    const token = pageIndex >= 0 ? tokens[pageIndex] : tokens[0];
    if (!token) throw new Error("Missing Facebook page access token");
    return token;
  }

  async fetchPosts(pageId: string, daysBack = 365, limit = 100) {
    const token = this.getPageAccessToken(pageId);
    const posts: FacebookPost[] = [];
    const since = Math.floor((Date.now() - daysBack * 24 * 60 * 60 * 1000) / 1000);
    let nextUrl: string | null = `${FACEBOOK_GRAPH_API_BASE_URL}/${pageId}/feed`;
    let firstPage = true;

    while (nextUrl) {
      const requestUrl: URL = new URL(nextUrl);
      if (firstPage) {
        requestUrl.searchParams.set("fields", "id,created_time,message,story,is_published,is_hidden,permalink_url,full_picture");
        requestUrl.searchParams.set("limit", String(limit));
        requestUrl.searchParams.set("since", String(since));
        requestUrl.searchParams.set("access_token", token);
      }
      const data: { data?: FacebookPost[]; paging?: { next?: string } } = await fetchJson(requestUrl.toString());
      posts.push(...(data.data ?? []));
      nextUrl = data.paging?.next ?? null;
      firstPage = false;
    }

    return posts;
  }

  async fetchPostInsights(postId: string, pageId?: string) {
    const token = this.getPageAccessToken(pageId);
    const insightMetrics = ["post_impressions", "post_impressions_unique", "post_clicks", "post_reactions_by_type_total"];
    const insights: JsonRecord = {};

    for (const metric of insightMetrics) {
      const url = new URL(`${FACEBOOK_GRAPH_API_BASE_URL}/${postId}/insights`);
      url.searchParams.set("metric", metric);
      url.searchParams.set("access_token", token);
      try {
        const data = await fetchJson<{ data?: Array<{ name?: string; values?: Array<{ value?: unknown }> }> }>(url.toString());
        for (const item of data.data ?? []) {
          const name = item.name;
          if (name) insights[name] = item.values?.[0]?.value ?? 0;
        }
      } catch (_error) {
        // Some metrics are unavailable for certain post types; keep syncing the post.
      }
    }

    const engagementUrl = new URL(`${FACEBOOK_GRAPH_API_BASE_URL}/${postId}`);
    engagementUrl.searchParams.set("fields", "shares,comments.summary(true),likes.summary(true)");
    engagementUrl.searchParams.set("access_token", token);
    try {
      const data = await fetchJson<{
        shares?: { count?: number };
        comments?: { summary?: { total_count?: number } };
        likes?: { summary?: { total_count?: number } };
      }>(engagementUrl.toString());
      insights.shares = data.shares?.count ?? 0;
      insights.comments = data.comments?.summary?.total_count ?? 0;
      insights.likes = data.likes?.summary?.total_count ?? 0;
    } catch (_error) {
      // Engagement can fail independently from the feed fetch.
    }

    return insights;
  }
}
