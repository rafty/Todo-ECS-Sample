const DEFAULT_RUNTIME_CONFIG = {
  cognitoDomain: '',
  cognitoClientId: '',
  oauthScopes: ['openid', 'email', 'profile'],
  callbackPath: '/auth/callback',
  logoutPath: '/',
  apiBasePath: '/api',
  persistRefreshToken: false,
};

function normalizePath(pathValue, fallbackValue) {
  if (typeof pathValue !== 'string' || pathValue.trim().length === 0) {
    return fallbackValue;
  }

  if (pathValue.startsWith('/')) {
    return pathValue;
  }

  return `/${pathValue}`;
}

function normalizeScopes(rawScopes) {
  if (Array.isArray(rawScopes)) {
    return rawScopes.filter((scope) => typeof scope === 'string' && scope.trim().length > 0);
  }

  if (typeof rawScopes === 'string') {
    return rawScopes
      .split(' ')
      .map((scope) => scope.trim())
      .filter((scope) => scope.length > 0);
  }

  return [...DEFAULT_RUNTIME_CONFIG.oauthScopes];
}

function normalizeRuntimeConfig(rawConfig) {
  return {
    cognitoDomain:
      typeof rawConfig?.cognitoDomain === 'string' ? rawConfig.cognitoDomain.replace(/\/+$/, '') : '',
    cognitoClientId: typeof rawConfig?.cognitoClientId === 'string' ? rawConfig.cognitoClientId : '',
    oauthScopes: normalizeScopes(rawConfig?.oauthScopes),
    callbackPath: normalizePath(rawConfig?.callbackPath, DEFAULT_RUNTIME_CONFIG.callbackPath),
    logoutPath: normalizePath(rawConfig?.logoutPath, DEFAULT_RUNTIME_CONFIG.logoutPath),
    apiBasePath: normalizePath(rawConfig?.apiBasePath, DEFAULT_RUNTIME_CONFIG.apiBasePath),
    persistRefreshToken:
      typeof rawConfig?.persistRefreshToken === 'boolean'
        ? rawConfig.persistRefreshToken
        : DEFAULT_RUNTIME_CONFIG.persistRefreshToken,
  };
}

export function hasCognitoRuntimeConfig(runtimeConfig) {
  return runtimeConfig.cognitoDomain.length > 0 && runtimeConfig.cognitoClientId.length > 0;
}

export async function loadRuntimeConfig() {
  try {
    // なぜ必要か: ビルド成果物を再生成せず環境ごとに値を差し替えるため、配備時JSONを優先して読む。
    const runtimeConfigResponse = await fetch('/runtime-config.json', {
      cache: 'no-store',
    });

    if (!runtimeConfigResponse.ok) {
      return { ...DEFAULT_RUNTIME_CONFIG };
    }

    const runtimeConfig = await runtimeConfigResponse.json();
    return normalizeRuntimeConfig(runtimeConfig);
  } catch {
    // なぜ必要か: ローカル開発で設定ファイル未配置でも画面を起動できるようにするため。
    return { ...DEFAULT_RUNTIME_CONFIG };
  }
}
