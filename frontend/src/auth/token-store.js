const REFRESH_TOKEN_STORAGE_KEY = 'todo.auth.refreshToken';

const authTokenState = {
  accessToken: '',
  accessTokenExpiresAtMs: 0,
  refreshToken: '',
  persistRefreshToken: false,
};

function decodeJwtPayload(accessToken) {
  try {
    const tokenParts = accessToken.split('.');
    if (tokenParts.length < 2) {
      return null;
    }

    const payloadBase64 = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayloadBase64 = payloadBase64.padEnd(Math.ceil(payloadBase64.length / 4) * 4, '=');
    const payloadJson = atob(paddedPayloadBase64);
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

function readRefreshTokenFromSessionStorage() {
  try {
    return sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function writeRefreshTokenToSessionStorage(refreshToken) {
  try {
    if (refreshToken) {
      sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
      return;
    }
    sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  } catch {
    // なぜ必要か: sessionStorage が無効な実行環境でも認証処理自体は継続できるようにするため。
  }
}

function resolveAccessTokenExpiry(accessToken) {
  const payload = decodeJwtPayload(accessToken);

  if (payload && typeof payload.exp === 'number') {
    return payload.exp * 1000;
  }

  // なぜ必要か: exp を解釈できない場合でも即時失効扱いを避け、最低限の再認証動線を確保するため。
  return Date.now() + 60 * 1000;
}

export function configureTokenStore({ persistRefreshToken }) {
  // なぜ必要か: セッション永続化方針（メモリ中心 / 必要時のみ sessionStorage）を実行時設定で切り替えるため。
  authTokenState.persistRefreshToken = Boolean(persistRefreshToken);
  authTokenState.refreshToken = authTokenState.persistRefreshToken ? readRefreshTokenFromSessionStorage() : '';
}

export function updateTokenSet(tokenResponse) {
  if (typeof tokenResponse.access_token === 'string' && tokenResponse.access_token.length > 0) {
    authTokenState.accessToken = tokenResponse.access_token;
    authTokenState.accessTokenExpiresAtMs = resolveAccessTokenExpiry(tokenResponse.access_token);
  }

  const nextRefreshToken =
    typeof tokenResponse.refresh_token === 'string' && tokenResponse.refresh_token.length > 0
      ? tokenResponse.refresh_token
      : authTokenState.refreshToken;

  authTokenState.refreshToken = nextRefreshToken ?? '';

  if (authTokenState.persistRefreshToken) {
    writeRefreshTokenToSessionStorage(authTokenState.refreshToken);
  }
}

export function clearTokenStore() {
  authTokenState.accessToken = '';
  authTokenState.accessTokenExpiresAtMs = 0;
  authTokenState.refreshToken = '';
  writeRefreshTokenToSessionStorage('');
}

export function getAccessToken() {
  return authTokenState.accessToken;
}

export function hasValidAccessToken(expirySkewMs = 30 * 1000) {
  if (!authTokenState.accessToken) {
    return false;
  }

  return authTokenState.accessTokenExpiresAtMs > Date.now() + expirySkewMs;
}

export function getRefreshToken() {
  return authTokenState.refreshToken;
}
