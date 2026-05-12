# frontend

このディレクトリは Todo SPA（React + Vite）を管理します。  
認証は Cognito Hosted UI（Authorization Code + PKCE）を利用し、API は `/api/todos` を呼び出します。

## 前提
- Node.js（プロジェクト推奨バージョン）
- npm

## 主要コマンド
`frontend/` 直下で実行します。

```bash
npm install
npm run lint
npm run build
npm run dev -- --host 127.0.0.1 --port 4173
```

## 実行時設定（runtime-config.json）

本アプリは `/runtime-config.json` を起動時に読み込みます。  
CDK デプロイ時は `infra` 側の `BucketDeployment` で自動生成されます。

| キー | 説明 | 例 |
| --- | --- | --- |
| `cognitoDomain` | Hosted UI ドメイン（末尾 `/` なし） | `https://xxx.auth.ap-northeast-1.amazoncognito.com` |
| `cognitoClientId` | Cognito App Client ID | `xxxxxxxxxxxx` |
| `oauthScopes` | OAuth スコープ配列 | `["openid","email","profile"]` |
| `callbackPath` | Cognito callback パス | `/auth/callback` |
| `logoutPath` | Cognito logout 後の戻り先パス | `/` |
| `apiBasePath` | API ベースパス（CloudFront 同一オリジン） | `/api` |
| `persistRefreshToken` | `true` のときのみ refresh token を `sessionStorage` に保存 | `false` |

## ローカル開発時の設定例

ローカルで認証導線まで確認する場合は `frontend/public/runtime-config.json` を作成してください。

```json
{
  "cognitoDomain": "https://your-domain.auth.ap-northeast-1.amazoncognito.com",
  "cognitoClientId": "your-client-id",
  "oauthScopes": ["openid", "email", "profile"],
  "callbackPath": "/auth/callback",
  "logoutPath": "/",
  "apiBasePath": "/api",
  "persistRefreshToken": false
}
```

## セッション管理方針
- access token はメモリ保持のみです。
- refresh token はメモリ保持を基本とし、`persistRefreshToken=true` の場合のみ `sessionStorage` に保存します。
- `localStorage` は使用しません。

## 関連ドキュメント
- 詳細フロー: `../docs/frontend/README.md`
- backend API 契約: `../docs/backend/api.md`
