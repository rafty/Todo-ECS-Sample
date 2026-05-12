const PKCE_STATE_STORAGE_KEY = 'todo.auth.pkce.state';
const PKCE_VERIFIER_STORAGE_KEY = 'todo.auth.pkce.verifier';
const PKCE_CREATED_AT_STORAGE_KEY = 'todo.auth.pkce.createdAt';
const PKCE_TRANSACTION_TTL_MS = 10 * 60 * 1000;

type CreatePkceAuthorizationRequestInput = {
  cognitoDomain: string;
  cognitoClientId: string;
  oauthScopes: string[];
  redirectUri: string;
};

function base64UrlEncode(sourceBytes: Uint8Array): string {
  const binaryString = String.fromCharCode(...sourceBytes);
  const base64String = btoa(binaryString);
  return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function createRandomUrlSafeValue(byteLength: number): string {
  const randomBytes = new Uint8Array(byteLength);
  crypto.getRandomValues(randomBytes);
  return base64UrlEncode(randomBytes);
}

async function createCodeChallenge(codeVerifier: string): Promise<string> {
  const verifierBytes = new TextEncoder().encode(codeVerifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', verifierBytes);
  return base64UrlEncode(new Uint8Array(hashBuffer));
}

function persistPkceTransaction(state: string, codeVerifier: string): void {
  // なぜ必要か: Hosted UI リダイレクト往復後も state / verifier を検証できるようにするため。
  sessionStorage.setItem(PKCE_STATE_STORAGE_KEY, state);
  sessionStorage.setItem(PKCE_VERIFIER_STORAGE_KEY, codeVerifier);
  sessionStorage.setItem(PKCE_CREATED_AT_STORAGE_KEY, String(Date.now()));
}

function clearPkceTransaction(): void {
  // なぜ必要か: 使い終わった検証値を残さず、再利用リスクを避けるため。
  sessionStorage.removeItem(PKCE_STATE_STORAGE_KEY);
  sessionStorage.removeItem(PKCE_VERIFIER_STORAGE_KEY);
  sessionStorage.removeItem(PKCE_CREATED_AT_STORAGE_KEY);
}

export async function createPkceAuthorizationRequest({
  cognitoDomain,
  cognitoClientId,
  oauthScopes,
  redirectUri,
}: CreatePkceAuthorizationRequestInput): Promise<string> {
  // なぜ必要か: 認可コードフローをPKCE化し、code盗難時の悪用を抑止するため。
  const state = createRandomUrlSafeValue(32);
  const codeVerifier = createRandomUrlSafeValue(64);
  const codeChallenge = await createCodeChallenge(codeVerifier);

  persistPkceTransaction(state, codeVerifier);

  const authorizeParameters = new URLSearchParams({
    response_type: 'code',
    client_id: cognitoClientId,
    redirect_uri: redirectUri,
    scope: oauthScopes.join(' '),
    state,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
  });

  return `${cognitoDomain}/oauth2/authorize?${authorizeParameters.toString()}`;
}

export function consumePkceCodeVerifier(expectedState: string): string {
  const storedState = sessionStorage.getItem(PKCE_STATE_STORAGE_KEY);
  const storedVerifier = sessionStorage.getItem(PKCE_VERIFIER_STORAGE_KEY);
  const storedCreatedAt = Number(sessionStorage.getItem(PKCE_CREATED_AT_STORAGE_KEY));

  clearPkceTransaction();

  // なぜ必要か: state 不一致時に CSRF 攻撃を検出して認可コード交換を拒否するため。
  if (!storedState || storedState !== expectedState) {
    throw new Error('認証リクエスト検証に失敗しました（state不一致）。');
  }

  // なぜ必要か: 古い認証トランザクションを拒否し、再利用攻撃の余地を減らすため。
  if (!Number.isFinite(storedCreatedAt) || Date.now() - storedCreatedAt > PKCE_TRANSACTION_TTL_MS) {
    throw new Error('認証リクエストの有効期限が切れています。再ログインしてください。');
  }

  if (!storedVerifier) {
    throw new Error('認証リクエスト検証に必要なコード情報が失われました。');
  }

  return storedVerifier;
}
