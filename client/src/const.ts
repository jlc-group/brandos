export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Generate JLC SSO login URL (OAuth2 Authorization Code flow)
 * Redirects user to JLC SSO portal for authentication.
 * After login, SSO redirects back to /api/auth/jlc/callback?code=...
 */
export const getLoginUrl = () => {
  const ssoBaseUrl = import.meta.env.VITE_JLC_SSO_URL ?? "https://sso.jlcgroup.co";
  const clientId = import.meta.env.VITE_JLC_SSO_CLIENT_ID ?? "";
  const redirectUri = `${window.location.origin}/api/auth/jlc/callback`;

  const url = new URL(`${ssoBaseUrl}/oauth/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "openid profile email");

  return url.toString();
};
