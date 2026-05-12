export type RuntimeConfig = {
  cognitoDomain: string;
  cognitoClientId: string;
  oauthScopes: string[];
  callbackPath: string;
  logoutPath: string;
  apiBasePath: string;
  persistRefreshToken: boolean;
};

export type RuntimeConfigJson = Partial<{
  cognitoDomain: unknown;
  cognitoClientId: unknown;
  oauthScopes: unknown;
  callbackPath: unknown;
  logoutPath: unknown;
  apiBasePath: unknown;
  persistRefreshToken: unknown;
}>;
