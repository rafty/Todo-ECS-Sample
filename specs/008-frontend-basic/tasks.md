# Tasks: 008-frontend-basic

## 前提確認
- [x] 1.1 ルート `AGENTS.md`、`frontend/AGENTS.md`、`infra/AGENTS.md`、`docs/AGENTS.md` を確認し、複数領域変更時の作業ルールを再確認する
- [x] 1.2 ルート `README.md`、`frontend/README.md`、`infra/README.md`、`docs/README.md` を確認し、既存構成とコマンド前提を整理する
- [x] 1.3 `specs/008-frontend-basic/specs.md` と `specs/008-frontend-basic/plan.md` を確認し、受け入れ条件と対象外（TypeScript移行、UI基準確定、backend変更なし）をチェックリスト化する
- [x] 1.4 `specs.md` に未確定事項が存在しないことを確認し、決定済み方針（token保持、dynamic callback/logout、Refresh Token Rotation）を実装前提として固定する
- [x] 1.5 既存 `frontend/src/`、`infra/lib/constructs/`、`infra/test/infra.test.ts` を確認し、追加・更新ファイルの責務境界を確定する
- [x] 1.6 検証前提（Node/npm、Docker、AWS認証、`-c env=<dev|stg|prod>`）を確認し、実行不可時の記録方針を決める

## 実装タスク

### infra: S3 静的配信 + CloudFront + Cognito 動的連携
- [x] 2.1 frontend 配信責務を扱う Construct（新規または既存更新）を実装し、S3 バケット（private / Block Public Access）を定義する
- [x] 2.2 CloudFront Distribution の default behavior を S3 origin に変更し、`defaultRootObject=index.html` を設定する
- [x] 2.3 CloudFront に SPA フォールバック（403/404 -> `/index.html`）を設定し、`/auth/callback` 直アクセスを解決できるようにする
- [x] 2.4 CloudFront の `/api/*` behavior を既存 ALB origin に設定し、`CACHING_DISABLED` と Authorization ヘッダー転送を維持する
- [x] 2.5 CloudFront の viewer HTTPS 強制設定と、既存 ALB 受信制限（CloudFront managed prefix list）を維持する
- [x] 2.6 `s3deploy.BucketDeployment` で `frontend/dist` を S3 配備する定義を追加し、CloudFront invalidation（`/*`）を設定する
- [x] 2.7 frontend runtime 設定ファイル（例: `runtime-config.json`）を `Source.jsonData` で配備し、Cognito/CloudFront 必要値を注入する
- [x] 2.8 `todo-cognito-construct.ts` を更新し、callback/logout URL を引数注入できる形へ変更する
- [x] 2.9 callback/logout URL を `https://${distribution.distributionDomainName}/auth/callback` / `https://${distribution.distributionDomainName}/` で組み立てて App Client に設定する
- [x] 2.10 Cognito App Client に Refresh Token Rotation を有効化し、rotation 前提の auth flow 設定に更新する
- [x] 2.11 `infra/lib/infra-stack.ts` で構成を組み立て、frontend 実行に必要な `CfnOutput`（CloudFrontドメイン、Hosted UI情報、ClientId等）を整理する
- [x] 2.12 `infra/test/infra.test.ts` を更新し、S3/BucketDeployment/CloudFront/Cognito の期待構成をアサーション化する

### frontend: Todo SPA + Hosted UI 認証フロー
- [x] 3.1 `frontend/package.json` を更新し、ルーティング等の最小依存を追加する（不要な依存追加は行わない）
- [x] 3.2 `frontend/src/main.jsx` と `frontend/src/App.jsx` を再構成し、画面ルート（アプリ本体 / auth callback）を定義する
- [x] 3.3 runtime 設定ローダーを実装し、Cognito domain/clientId 等をコード直書きせず参照できるようにする
- [x] 3.4 PKCE ユーティリティ（`code_verifier` / `code_challenge` 生成、`state` 管理）を実装する
- [x] 3.5 Hosted UI ログイン開始処理を実装し、Authorization Code + PKCE で `/oauth2/authorize` に遷移させる
- [x] 3.6 `/auth/callback` 処理を実装し、`code` と `state` を検証して `/oauth2/token` 交換を実行する
- [x] 3.7 トークンストアを実装し、access token はメモリ保持、refresh token は必要時のみ `sessionStorage` 保持に制御する（`localStorage` 禁止）
- [x] 3.8 refresh 処理を実装し、rotation 後の refresh token へ都度置き換える
- [x] 3.9 API クライアントを実装し、`Authorization: Bearer <access_token>` 付与と 401 時の再認証導線を実装する
- [x] 3.10 Todo 一覧/作成/更新/削除 UI を実装し、既存 backend API 契約（`docs/backend/api.md`）に合わせる
- [x] 3.11 UI にローディング・空状態・入力エラー・通信エラー表示を実装する
- [x] 3.12 ログアウト処理を実装し、クライアント状態クリア後に Cognito `/logout` エンドポイントへ遷移させる

## テスト / 検証タスク

### frontend 検証
- [x] 4.1 `frontend/` で `npm run lint` を実行し、静的検証を通過させる
- [x] 4.2 `frontend/` で `npm run build` を実行し、`dist/` 生成を確認する
- [x] 4.3 `frontend/` で `npm run dev` を起動し、未認証時ログイン導線と `/auth/callback` 画面遷移を確認する（CLIで `/` と `/auth/callback` 到達を確認。Hosted UI実操作は未確認）
- [ ] 4.4 ローカル結合確認で Todo 一覧/作成/更新/削除、401 時再認証導線、token 更新挙動を確認する

### infra 検証
- [x] 5.1 `infra/` で `npm run build` を実行し、TypeScript コンパイルを確認する
- [x] 5.2 `infra/` で `npm test -- --runInBand` を実行し、テンプレートテスト回帰がないことを確認する
- [ ] 5.3 `infra/` で `npx cdk synth -c env=<env>` を実行し、S3/BucketDeployment/CloudFront/Cognito 構成が出力されることを確認する
- [ ] 5.4 `infra/` で `npx cdk diff -c env=<env>` を実行し、差分が意図範囲に限定されることを確認する
- [ ] 5.5 synth/diff 出力から callback/logout の `distributionDomainName` 連携、Refresh Token Rotation 設定、SPA fallback 設定を確認する
- [x] 5.6 未実施検証がある場合は、未確認範囲と理由（認証不足、Docker未起動等）を記録する（`cdk synth/diff` は lookup role Assume 権限不足で未完了）

### 実環境確認
- [ ] 6.1 CloudFront URL で SPA が表示されることを確認する
- [ ] 6.2 Hosted UI ログイン後に `/api/todos` へ到達できることを確認する
- [ ] 6.3 ログアウト後に再度未認証状態へ戻ることを確認する

## ドキュメント更新タスク
- [x] 7.1 `frontend/README.md` を日本語で更新し、ローカル実行・build・runtime 設定手順を記載する
- [x] 7.2 `docs/frontend/` を新規作成し、SPA 認証フロー（Hosted UI + PKCE + token refresh）と利用手順を記載する
- [x] 7.3 `docs/README.md` を更新し、`docs/frontend/` への導線を追加する
- [x] 7.4 必要に応じて `docs/infra/ecs-aurora-runtime-baseline.md` を更新し、CloudFront 二系統 origin 構成（S3 + `/api/*` ALB）を反映する
- [x] 7.5 `docs/adr/` 更新要否を確認し、必要な設計判断がある場合のみ追加する（不要なら「更新なし」を記録）

## 完了確認
- [ ] 8.1 `specs/008-frontend-basic/specs.md` の受け入れ条件をすべて満たしていることを確認する
- [x] 8.2 変更範囲が `frontend/`、`infra/`、`docs/` に限定され、`backend/` へ不要変更がないことを確認する
- [x] 8.3 対象外（TypeScript全面移行、UI基準確定、独自ドメイン/ACM/WAF、CI/CD新規構築）が差分に含まれていないことを確認する
- [x] 8.4 シークレット、`.env` 実値、認証情報、state ファイル、不要生成物が差分に含まれていないことを確認する
- [x] 8.5 実行コマンド、結果、未実施理由を作業ログとして整理する

## 並列化の目安
- [x] 9.1 `2.x infra` と `3.x frontend` は一部並列実施可能（合流点は `4.x` / `5.x` 検証）
- [x] 9.2 `7.x ドキュメント更新` は `4.x` / `5.x` 検証結果が確定してから実施する

## 未実施メモ
- 4.4 は Cognito / backend 接続先を使ったローカル結合環境がないため未確認。
- 5.3/5.4/5.5 は `111111111111` 側 CDK lookup role Assume 権限不足で未確認。
- 6.1/6.2/6.3 は実環境デプロイ未実施のため未確認。
- 7.5 の ADR 追加は不要（既存方針内で完結するため更新なし）。
