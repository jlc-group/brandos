import { describe, expect, it } from "vitest";
import {
  mapFacebookPostToContentInput,
  mapTikTokAdToPerformanceInput,
  mapTikTokVideoToContentInput,
} from "./socialSync";

describe("social sync mappers", () => {
  it("maps TikTok video metrics into content history input", () => {
    const mapped = mapTikTokVideoToContentInput({
      item_id: "7345001",
      create_time: 1_700_000_000,
      caption: "Hook แรกของคลิป",
      share_url: "https://www.tiktok.com/@brand/video/7345001",
      thumbnail_url: "https://example.com/thumb.jpg",
      video_views: 1200,
      reach: 900,
      likes: 80,
      comments: 7,
      shares: 12,
    }, { brandId: 1, socialAccountId: 2 });

    expect(mapped.platform).toBe("tiktok");
    expect(mapped.externalId).toBe("7345001");
    expect(mapped.views).toBe(1200);
    expect(mapped.reach).toBe(900);
    expect(mapped.socialAccountId).toBe(2);
    expect(mapped.publishedAt).toBeInstanceOf(Date);
  });

  it("maps Facebook post insights into content history input", () => {
    const mapped = mapFacebookPostToContentInput({
      id: "page_123",
      created_time: "2026-04-01T12:00:00+0000",
      message: "โพสต์ใหม่",
      permalink_url: "https://facebook.com/page/posts/123",
      full_picture: "https://example.com/fb.jpg",
    }, {
      post_impressions: 5000,
      post_impressions_unique: 3500,
      likes: 100,
      comments: 9,
      shares: 3,
    }, { brandId: 1, pageId: "page" });

    expect(mapped.platform).toBe("facebook");
    expect(mapped.externalId).toBe("page_123");
    expect(mapped.views).toBe(5000);
    expect(mapped.reach).toBe(3500);
    expect(mapped.rawData).toMatchObject({ pageId: "page" });
  });

  it("maps TikTok ad identity into performance input", () => {
    const mapped = mapTikTokAdToPerformanceInput({
      ad_id: "ad_1",
      ad_name: "Creative A",
      campaign_id: "camp_1",
      campaign_name: "Campaign",
      adgroup_id: "group_1",
      adgroup_name: "Group",
      tiktok_item_id: "7345001",
    }, { brandId: 1 });

    expect(mapped.platform).toBe("tiktok");
    expect(mapped.adId).toBe("ad_1");
    expect(mapped.externalId).toBe("7345001");
    expect(mapped.campaignName).toBe("Campaign");
  });
});
