import { consumePkceCodeVerifier, createPkceAuthorizationRequest } from './pkce';
import {
  clearTokenStore,
  configureTokenStore,
  getAccessToken,
  getRefreshToken,
  hasValidAccessToken,
  updateTokenSet,
} from './token-store';

function buildAbsoluteUrl(path) {
  return new URL(path, window.location.origin).toString();
}

async function requestToken(runtimeConfig, body) {
  const tokenResponse = await fetch(`${runtimeConfig.cognitoDomain}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const responseBody = await tokenResponse.json().catch(() => null);

  if (!tokenResponse.ok) {
    const errorDescription =
      typeof responseBody?.error_description === 'string'
        ? responseBody.error_description
        : 'トークン交換に失敗しました。';
    throw new Error(errorDescription);
  }

  return responseBody ?? {};
}

export function initializeAuthRuntime(runtimeConfig) {
  configureTokenStore({
    persistRefreshToken: runtimeConfig.persistRefreshToken,
  });
}

export async function startHostedUiLogin(runtimeConfig) {
  // なぜ必要か: callback URL を実際の配信URL基準で固定し、環境差異での認証失敗を防ぐため。
  const redirectUri = buildAbsoluteUrl(runtimeConfig.callbackPath);
  const authorizeUrl = await createPkceAuthorizationRequest({
    cognitoDomain: runtimeConfig.cognitoDomain,
    cognitoClientId: runtimeConfig.cognitoClientId,
    oauthScopes: runtimeConfig.oauthScopes,
    redirectUri,
  });

  window.location.assign(authorizeUrl);
}

export async function completeHostedUiLogin(runtimeConfig, callbackQueryString) {
  const callbackParams = new URLSearchParams(callbackQueryString);
  const oauthError = callbackParams.get('error');
  const oauthErrorDescription = callbackParams.get('error_description');

  if (oauthError) {
    throw new Error(oauthErrorDescription ?? `認証に失敗しました: ${oauthError}`);
  }

  const authorizationCode = callbackParams.get('code');
  const returnedState = callbackParams.get('state');

  if (!authorizationCode || !returnedState) {
    throw new Error('認証レスポンスに code または state が不足しています。');
  }

  const codeVerifier = consumePkceCodeVerifier(returnedState);
  const redirectUri = buildAbsoluteUrl(runtimeConfig.callbackPath);

  const tokenRequestBody = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: runtimeConfig.cognitoClientId,
    code: authorizationCode,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });

  const tokenSet = await requestToken(runtimeConfig, tokenRequestBody.toString());
  updateTokenSet(tokenSet);
}

export async function ensureAccessToken(runtimeConfig) {
  if (hasValidAccessToken()) {
    return getAccessToken();
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return '';
  }

  try {
    // なぜ必要か: access token の期限切れ時に再ログインを強制せず、継続操作を可能にするため。
    const refreshRequestBody = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: runtimeConfig.cognitoClientId,
      refresh_token: refreshToken,
    });

    const refreshedTokenSet = await requestToken(runtimeConfig, refreshRequestBody.toString());
    updateTokenSet(refreshedTokenSet);
    return getAccessToken();
  } catch {
    clearTokenStore();
    return '';
  }
}

export function clearAuthSession() {
  clearTokenStore();
}

export function hasRefreshSession() {
  return getRefreshToken().length > 0;
}

export function buildHostedUiLogoutUrl(runtimeConfig) {
  const logoutRedirectUri = buildAbsoluteUrl(runtimeConfig.logoutPath);
  const logoutParameters = new URLSearchParams({
    client_id: runtimeConfig.cognitoClientId,
    logout_uri: logoutRedirectUri,
  });
  return `${runtimeConfig.cognitoDomain}/logout?${logoutParameters.toString()}`;
}
