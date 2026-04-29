import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@julaherbthailand.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("auth.me", () => {
  it("returns authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeTruthy();
    expect(result?.email).toBe("test@julaherbthailand.com");
  });
});

describe("appRouter structure", () => {
  it("has all required routers", () => {
    const routerKeys = Object.keys(appRouter._def.procedures);
    const requiredProcedures = [
      "auth.me",
      "auth.logout",
      "dashboard.kpis",
      "brandBrain.list",
      "brandBrain.create",
      "sku.list",
      "sku.create",
      "calendar.list",
      "calendar.create",
      "calendar.aiGenerate",
      "history.list",
      "history.create",
      "performance.list",
      "performance.import",
      "performance.analyze",
      "antiAnnoy.latest",
      "antiAnnoy.analyze",
      "aiGenerator.generate",
      "adsRecommendation.list",
      "adsRecommendation.generate",
    ];

    for (const proc of requiredProcedures) {
      expect(routerKeys, `Missing procedure: ${proc}`).toContain(proc);
    }
  });
});
