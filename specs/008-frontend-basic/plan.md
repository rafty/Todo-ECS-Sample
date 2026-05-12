# Plan: 008-frontend-basic

## 実装方針
- 本 feature は **複数領域**（`frontend/`、`infra/`、`docs/`）で実施する。
- `frontend/` は JavaScript のまま（TypeScript 移行は対象外）で、Cognito Hosted UI（Authorization Code + PKCE）と Todo CRUD UI を実装する。
- 認証トークンはメモリ中心で管理し、`localStorage` は使用しない。永続化が必要な場合のみ refresh token を `sessionStorage` に保存し、回転後トークンへ都度置き換える。
- `infra/` は CloudFront を「S3 静的配信（default）」と「`/api/*` の ALB 転送」に再構成し、`s3deploy.BucketDeployment` で `frontend/dist` を配備する。
- Cognito callback/logout URL は `distribution.distributionDomainName` から組み立てて `UserPoolClient` に直接設定し、固定プレースホルダ値を廃止する。
- 既存 `backend/` API 契約（`/api/todos`）は変更せず、frontend 側で既存契約を消費する。

## 変更対象
- `frontend/package.json`
  - ルーティングと認証コールバック処理に必要な最小依存（例: `react-router-dom`）の追加可否を反映する。
- `frontend/src/`
  - 既存 `App.jsx` / `main.jsx` を Todo SPA 本体に置き換える。
  - 認証導線（ログイン開始、コールバック処理、ログアウト、トークン更新）を追加する。
  - Todo API クライアント、画面状態管理（loading/empty/error）を追加する。
  - runtime 設定読込（Cognito domain/clientId 等）を追加する。
- `infra/lib/infra-stack.ts`
  - Frontend 配信用 S3、CloudFront 再構成、BucketDeployment、Cognito callback/logout 動的設定を組み立てる。
  - frontend 実行に必要な出力値（CloudFront ドメイン、Cognito 情報）を整理する。
- `infra/lib/constructs/`
  - 既存 `todo-cloudfront-construct.ts` を static 配信 + `/api/*` behavior 対応へ更新する。
  - 既存 `todo-cognito-construct.ts` を callback/logout 外部注入 + Refresh Token Rotation 前提へ更新する。
  - 必要に応じて frontend 配備専用 Construct（S3 + BucketDeployment）を新規追加する。
- `infra/test/infra.test.ts`
  - S3 / BucketDeployment / CloudFront behavior / Cognito callback/logout のアサーションを追加・更新する。
- ドキュメント
  - `frontend/README.md`（日本語化を含む内容更新）
  - `docs/README.md`（`docs/frontend/` への導線追加）
  - `docs/frontend/`（新規作成時）
  - `docs/infra/ecs-aurora-runtime-baseline.md`（配信構成更新が必要な場合）

## 変更しないもの
- `backend/` の実装（Controller/Service/Repository、JWT 検証ロジック、DB スキーマ）。
- 独自ドメイン、ACM、WAF、Shield Advanced、CI/CD パイプライン。
- UI デザイン基準の最終確定（ライブラリ採用方針・テーマ方針）。
- `frontend/` の TypeScript 全面移行。

## 技術方針
- 既存パターンの再利用方針
  - `infra` は既存の Construct 分割方針（SRP）を維持し、Stack は「組み立て責務」に限定する。
  - `frontend` は Vite/React 既存構成を維持し、過剰なフレームワーク追加（Amplify 依存追加など）は行わない。
- 認証実装方針
  - Hosted UI への認可リクエストは PKCE（`code_verifier` / `code_challenge`）と `state` を必須化する。
  - コールバックで `code` をトークンエンドポイントに交換し、access token をメモリ保持する。
  - refresh token を保持する場合は `sessionStorage` のみ許可し、rotation で返る最新 token に更新する。
  - API 呼び出し前に access token 有効期限を確認し、必要時は refresh grant で再取得する。
- frontend 設定値の注入方針
  - 設定値はコード直書きを避け、配備時に注入可能な runtime 設定ファイル（例: `runtime-config.json`）を採用する。
  - `runtime-config.json` は `BucketDeployment` の `Source.jsonData` で生成し、CDK Token（UserPoolClientId 等）を埋め込む。
  - redirect URI は `window.location.origin` 基準で組み立て、CloudFront ドメイン変更に追従させる。
- インフラ実装方針
  - CloudFront default behavior は private S3 origin（OAC）に設定し、`defaultRootObject=index.html` を指定する。
  - `/api/*` behavior は既存 ALB origin へ転送し、`CACHING_DISABLED` + Authorization ヘッダー転送を維持する。
  - SPA 直アクセス対策として 403/404 を `/index.html` へフォールバックする。
  - `BucketDeployment` で CloudFront invalidation（`/*`）を実行し、配信反映遅延を抑える。
- Cognito 設定方針
  - callback/logout URL は `https://${distribution.distributionDomainName}/auth/callback` / `https://${distribution.distributionDomainName}/` を直接設定する。
  - Refresh Token Rotation を有効化し、rotation 前提で app client の auth flow を定義する。
- 新規依存追加の要否
  - frontend は最小限（主にルーティング）に限定して依存追加する。
  - infra は既存 `aws-cdk-lib` で実現し、追加依存は原則不要。

## データや契約への影響
- DB スキーマ
  - 変更なし。
- API 契約
  - `docs/backend/api.md` の既存契約をそのまま利用（追加・変更なし）。
- イベント契約
  - 変更なし。
- 環境変数
  - frontend 実行設定はビルド時固定値より runtime 設定を優先し、環境ごとに差し替え可能にする。
- Secret / 設定値
  - Cognito client secret は引き続き使用しない（Public Client）。
  - refresh token は `localStorage` へ保存しない。
- デプロイ/運用への影響
  - `frontend/dist` が存在しない状態では `s3deploy.Source.asset` が失敗するため、`cdk synth/deploy` 前に frontend build が必要。
  - Cognito callback/logout は CloudFront ドメイン参照となるため、固定 URL の手動更新運用が不要になる。

## リスク
- 破壊的変更の可能性
  - CloudFront default origin を ALB から S3 へ切り替えるため、behavior 設定漏れがあると API または SPA の到達性が失われる。
- 互換性への影響
  - callback/logout URL を動的化するため、既存手動運用を前提にした手順が残っていると齟齬が出る。
- 運用影響
  - `frontend/dist` 未生成状態で infra コマンドを実行すると失敗するため、実行順序の徹底が必要。
- セキュリティ影響
  - PKCE/state 検証不備や refresh token 保持不備があると、セッション乗っ取りリスクが高まる。
- 監視影響
  - SPA/認証の障害は CloudFront・Cognito・frontend の複合要因になりやすく、切り分け手順をドキュメント化する必要がある。

## 検証方針
- `frontend/`
  - `npm run lint`
  - `npm run build`
  - ローカル動作確認（`npm run dev`）で以下を確認:
    - 未認証時のログイン遷移
    - `/auth/callback` 処理
    - Todo 一覧/作成/更新/削除
    - 401 時の再認証導線
    - refresh token 更新時のトークン差し替え
- `infra/`
  - `npm run build`
  - `npm test -- --runInBand`
  - `npx cdk synth -c env=<env>`
  - （可能なら）`npx cdk diff -c env=<env>`
  - 確認観点:
    - S3 バケット private + CloudFront OAC
    - CloudFront default=S3、`/api/*`=ALB
    - API behavior の no-cache / Authorization 転送
    - SPA fallback（403/404 -> `/index.html`）
    - Cognito callback/logout が `distributionDomainName` ベースで構成
    - Refresh Token Rotation が有効
- 結合確認（実環境）
  - CloudFront URL 表示
  - Hosted UI ログイン/ログアウト
  - backend `/api/todos` 到達と認証境界

## ドキュメント更新方針
- `frontend/README.md`
  - ローカル実行、build、認証設定、runtime 設定ファイル読み込み手順を日本語で記載する。
- `docs/frontend/`（新規）
  - SPA 認証フロー（Hosted UI + PKCE + token refresh）と画面利用手順を記載する。
- `docs/README.md`
  - `docs/frontend/` へのリンクを追加する。
- `docs/infra/ecs-aurora-runtime-baseline.md`
  - CloudFront が S3 + `/api/*` ALB の二系統 origin になった構成図へ更新する。
- `docs/adr/`
  - 原則不要。運用ポリシーとして長期保持が必要な判断（token 保持制約、dynamic callback 運用）を恒久化する場合のみ追加検討。

## 実施順序
1. 事前整理
   - `specs.md` の FR-FE / FR-INF / FR-DOC を実装単位へ分解し、frontend/infra/docs の責務境界を固定する。
   - frontend の設定注入方式（runtime-config）と認証フローの最終設計を確定する。
2. infra の配信基盤更新
   - S3 static hosting 用バケットと配備処理（BucketDeployment）を追加する。
   - CloudFront を default=S3、`/api/*`=ALB に更新し、SPA fallback と invalidation を設定する。
   - Cognito callback/logout を `distribution.distributionDomainName` ベースへ変更する。
   - Refresh Token Rotation 設定を app client に追加する。
3. frontend 実装
   - ルーティング（アプリ本体/コールバック）と Todo UI を実装する。
   - PKCE ログイン、token 交換、refresh、ログアウト処理を実装する。
   - token 保存ポリシー（memory + optional sessionStorage refresh only）を実装する。
   - backend API クライアントとエラーハンドリングを実装する。
4. テスト・検証
   - frontend lint/build とローカル動作確認を実施する。
   - infra build/test/synth/diff を実施し、テンプレート差分を確認する。
5. ドキュメント更新
   - frontend/README、docs/frontend、docs/README、必要に応じて docs/infra を更新する。
   - 手順書と実際のコマンド/出力値が一致していることを確認する。

## 未解決事項
- 現時点で未解決事項はなし（`specs.md` の未確定事項は方針決定済み）。
