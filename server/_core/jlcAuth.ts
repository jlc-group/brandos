/**
 * JLC SSO Authentication Module
 * Replaces Manus OAuth with JLC internal SSO (OAuth2 Authorization Code flow)
 *
 * JLC SSO Endpoints:
 *   Authorize:  GET  /oauth/authorize
 *   Token:      POST /oauth/token
 *   UserInfo:   GET  /oauth/userinfo
 *
 * Flow:
 *   1. Frontend redirects user to JLC SSO /oauth/authorize
 *   2. User logs in on SSO portal
 *   3. SSO redirects back to /api/auth/jlc/callback?code=...
 *   4. Backend exchanges code for access_token via /oauth/token
 *   5. Backend fetches user info via /oauth/userinfo
 *   6. Backend creates session JWT and sets cookie
 */

import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { SignJWT, jwtVerify } from "jose";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";

// ─── Config ──────────────────────────────────────────────────────────────────

export const JLC_SSO_CONFIG = {
  /** Internal URL for server-to-server calls */
  ssoBaseUrl: process.env.JLC_SSO_URL ?? "http://localhost:10100",
  clientId: process.env.JLC_SSO_CLIENT_ID ?? "",
  clientSecret: process.env.JLC_SSO_CLIENT_SECRET ?? "",
  /** App identifier stored in session JWT (replaces Manus appId) */
  appId: "brandos",
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JlcTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export interface JlcUserInfo {
  sub: string;           // user id (used as openId)
  email: string;
  name: string;
  given_name?: string;
  family_name?: string;
  given_name_en?: string;
  family_name_en?: string;
  phone_number?: string;
  position?: string;
  department?: string;
  company_code?: string;
  company_name?: string;
  employee_code?: string;
}

// ─── Session JWT helpers ──────────────────────────────────────────────────────

function getSessionSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? "";
  return new TextEncoder().encode(secret);
}

export async function createJlcSessionToken(
  openId: string,
  name: string,
  options: { expiresInMs?: number } = {}
): Promise<string> {
  const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
  const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);
  return new SignJWT({
    openId,
    appId: JLC_SSO_CONFIG.appId,
    name,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(getSessionSecret());
}

export async function verifyJlcSession(
  cookieValue: string | undefined | null
): Promise<{ openId: string; appId: string; name: string } | null> {
  if (!cookieValue) return null;
  try {
    const { payload } = await jwtVerify(cookieValue, getSessionSecret(), {
      algorithms: ["HS256"],
    });
    const { openId, appId, name } = payload as Record<string, unknown>;
    if (
      typeof openId !== "string" || !openId ||
      typeof appId !== "string" || !appId ||
      typeof name !== "string" || !name
    ) {
      return null;
    }
    return { openId, appId, name };
  } catch {
    return null;
  }
}

// ─── OAuth2 helpers ───────────────────────────────────────────────────────────

async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<JlcTokenResponse> {
  const url = `${JLC_SSO_CONFIG.ssoBaseUrl}/oauth/token`;
  const body = JSON.stringify({
    grant_type: "authorization_code",
    client_id: JLC_SSO_CONFIG.clientId,
    client_secret: JLC_SSO_CONFIG.clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`JLC SSO token exchange failed (${res.status}): ${text}`);
  }

  const data = await res.json() as { success?: boolean; data?: JlcTokenResponse } & JlcTokenResponse;
  // JLC SSO wraps response in { success, data } or returns directly
  return (data.data ?? data) as JlcTokenResponse;
}

async function getUserInfo(accessToken: string): Promise<JlcUserInfo> {
  const url = `${JLC_SSO_CONFIG.ssoBaseUrl}/oauth/userinfo`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`JLC SSO userinfo failed (${res.status})`);
  }

  const data = await res.json() as { success?: boolean; data?: JlcUserInfo } & JlcUserInfo;
  return (data.data ?? data) as JlcUserInfo;
}

// ─── Express route registration ───────────────────────────────────────────────

export function registerJlcAuthRoutes(app: Express) {
  /**
   * GET /api/auth/jlc/callback
   * OAuth2 authorization code callback from JLC SSO
   */
  app.get("/api/auth/jlc/callback", async (req: Request, res: Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : undefined;
    const error = typeof req.query.error === "string" ? req.query.error : undefined;

    if (error) {
      console.error("[JLC SSO] OAuth error:", error, req.query.error_description);
      return res.redirect("/?error=" + encodeURIComponent(String(error)));
    }

    if (!code) {
      return res.status(400).json({ error: "Missing authorization code" });
    }

    const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/jlc/callback`;

    try {
      // Exchange code for token
      const tokens = await exchangeCodeForToken(code, redirectUri);

      // Get user info
      const userInfo = await getUserInfo(tokens.access_token);

      if (!userInfo.sub) {
        return res.status(400).json({ error: "Missing user ID from SSO" });
      }

      // Upsert user in local DB
      await db.upsertUser({
        openId: String(userInfo.sub),
        name: userInfo.name ?? null,
        email: userInfo.email ?? null,
        loginMethod: "jlc-sso",
        lastSignedIn: new Date(),
      });

      // Create session JWT
      const sessionToken = await createJlcSessionToken(
        String(userInfo.sub),
        userInfo.name ?? "",
        { expiresInMs: ONE_YEAR_MS }
      );

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (err) {
      console.error("[JLC SSO] Callback failed:", err);
      res.status(500).json({ error: "JLC SSO authentication failed" });
    }
  });
}

// ─── Authenticate request (used by context.ts) ────────────────────────────────

import { parse as parseCookieHeader } from "cookie";
import { ForbiddenError } from "@shared/_core/errors";
import type { User } from "../../drizzle/schema";

export async function authenticateJlcRequest(req: Request): Promise<User> {
  const cookieHeader = req.headers.cookie;
  const cookies = cookieHeader
    ? new Map(Object.entries(parseCookieHeader(cookieHeader)))
    : new Map<string, string>();

  const sessionCookie = cookies.get(COOKIE_NAME);
  const session = await verifyJlcSession(sessionCookie);

  if (!session) {
    throw ForbiddenError("Invalid session cookie");
  }

  const signedInAt = new Date();
  let user = await db.getUserByOpenId(session.openId);

  if (!user) {
    throw ForbiddenError("User not found — please log in again");
  }

  await db.upsertUser({ openId: user.openId, lastSignedIn: signedInAt });
  return user;
}
