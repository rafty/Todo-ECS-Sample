# Plan: 006-api-and-springboot-controller-service

## 実装方針
- 本 feature は **複数領域**（`infra/` と `backend/`）で実施する。
- `infra/` は既存の ALB/ECS/Aurora 基盤を維持しつつ、CloudFront と Cognito を追加して「公開経路」と「認証基盤」を成立させる。
- `backend/` は Todo API の Controller/Service 層と Spring Security OAuth2 Resource Server を追加し、Cognito JWT の検証と `owner_subject` 境界を実装する。
- 既存の Construct 分割方針（SRP）と Spring のレイヤ分離（Controller -> Service -> Repository）を崩さず、最小差分で実現する。

## 変更対象
- `infra/lib/infra-stack.ts`
  - CloudFront / Cognito の Construct 呼び出しを追加する。
  - ALB ヘルスチェックパスを `/actuator/health` へ変更する。
  - CloudFront ドメイン、Cognito 識別子（UserPoolId/AppClientId/Issuer など）の `CfnOutput` を追加する。
- `infra/lib/constructs/`（追加・更新）
  - 新規: `todo-cloudfront-construct.ts`（ALB origin、HTTPS 強制、API 向け no-cache behavior、Authorization ヘッダー転送）
  - 新規: `todo-cognito-construct.ts`（User Pool / App Client / Hosted UI Domain）
  - 既存更新: `todo-app-security-groups-construct.ts`（ALB ingress を CloudFront managed prefix list 起点に制限）
  - 既存更新: `todo-alb-construct.ts`（ターゲットグループのヘルスチェック `/actuator/health` 連携）
- `infra/test/infra.test.ts`
  - CloudFront / Cognito のリソース追加を検証する。
  - ALB ヘルスチェックパス、SG 制限（CloudFront prefix list 起点）を検証する。
- `backend/pom.xml`
  - `spring-boot-starter-security` と `spring-boot-starter-oauth2-resource-server` を追加する。
- `backend/src/main/resources/application.properties`
  - JWT 検証用設定（issuer 等）を環境変数参照で追加する。
- `backend/src/main/java/com/example/backend/` 配下（追加）
  - `controllers/`（Todo API Controller）
  - `services/`（Service interface）
  - `services/impl/`（Service 実装）
  - `config/` または `security/`（SecurityFilterChain / JWT converter / 認証設定）
  - `dto/`（リクエスト/レスポンス DTO。必要最小限）
  - `exception/`（必要時。404/バリデーションエラー整理）
- `backend/src/test/java/com/example/backend/` 配下（追加）
  - Controller 層の認証/レスポンス検証
  - Service 層の owner 境界検証

## 変更しないもの
- `frontend/` の Hosted UI ログイン実装（画面・トークン保持・遷移）。
- 既存 Aurora スキーマ（`V1__create_todos_table.sql`）の大幅変更。
- 独自ドメイン（Route53）/ ACM 証明書 / WAF の導入。
- ALB 側 Cognito/OIDC 認証機能（backend 側 JWT 検証方針を維持）。
- CI/CD パイプラインの新規構築。

## 技術方針
- 既存パターンの再利用方針
  - `infra`: 既存の `bin -> stack -> constructs` を維持し、Stack には組み立て責務のみを持たせる。
  - `backend`: Entity/Repository 既存実装を再利用し、Controller/Service を追加する。
- 新規クラス/コンポーネント方針
  - CloudFront と Cognito は Construct を分離し、インフラ責務を局所化する。
  - backend は API 層（Controller）とドメイン操作（Service）を分離し、Repository 直接利用を禁止する。
- 新規設定追加の要否
  - 追加する: JWT issuer・認証関連設定、Cognito App Client callback/logout 設定。
  - Cognito App Client の URL は prod で以下を設定値として固定する。  
    callback: `https://d123456abcdef8.cloudfront.net/auth/callback`  
    logout: `https://d123456abcdef8.cloudfront.net/`
  - 維持する: DB 接続は既存 Secrets 注入方式。
- 新規依存追加の要否
  - `backend` に Spring Security / OAuth2 Resource Server 依存を追加する。
  - `infra` は既存 `aws-cdk-lib` の L2/L3 Construct を優先し、追加依存は原則不要。
- 既存インフラ/契約への変更
  - 既存 VPC/ECS/Aurora を継続利用し、CloudFront/Cognito を上位レイヤとして追加する。
  - `-c env=<dev|stg|prod>` と共通タグ運用を維持する。

## データや契約への影響
- DB スキーマ
  - 新規マイグレーションは原則不要。既存 `todos` テーブルを継続利用する。
- API 契約
  - `/api/todos` CRUD を追加する。
  - `owner_subject` はリクエストで受け取らず JWT `sub` から解決する。
  - 権限不整合時レスポンスは `404` に統一する（`401`: 未認証、`404`: 他ユーザー所有または未存在）。
  - 一覧 API のページング/検索パラメータは `page`, `size`, `sort`, `completed`, `q` を採用する。
  - 一覧 API のデフォルトは `page=0`, `size=20`, `sort=updatedAt,desc`、`size` 上限は `100` とする。
  - エラー契約は Problem Details（`application/problem+json`）へ統一する。
- イベント契約
  - 追加なし。
- 環境変数
  - 追加予定: JWT issuer や認証関連の環境変数（例: `SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI`）。
- Secret / 設定値
  - 追加: Cognito App Client callback/logout URL（prod 固定値）。  
    callback: `https://d123456abcdef8.cloudfront.net/auth/callback`  
    logout: `https://d123456abcdef8.cloudfront.net/`
  - 維持: DB Secret は Secrets Manager を利用。
- デプロイ/運用への影響
  - CloudFront 経由公開となるため、疎通確認先は ALB DNS ではなく CloudFront ドメインを主とする。
  - Cognito Hosted UI と JWT 有効期限を考慮した運用確認が必要になる。

## リスク
- 破壊的変更の可能性
  - ALB ingress 制御を CloudFront prefix list に切り替える際、設定不備で API 到達不能になる可能性がある。
- 互換性への影響
  - backend にセキュリティを有効化するため、認証例外パス設計が不足すると既存ヘルスチェックが失敗する可能性がある。
- 運用影響
  - CloudFront キャッシュ/ヘッダー転送設定不備で、認証付き API が誤動作する可能性がある。
- セキュリティ影響
  - JWT 検証を簡易運用にするため、`client_id`/scope を必須化しない点は本番強化の課題として残る。
- 監視影響
  - 認証失敗（401/404）とアプリ障害（5xx）を区別できるログ出力設計が必要。

## 検証方針
- `backend/`
  - `./mvnw test`: 既存 + 追加テストの回帰確認。
  - `./mvnw -DskipTests compile`: 依存追加後のコンパイル確認。
  - 認証検証: JWT なしで 401、他ユーザー境界で 404 を確認。
- `infra/`
  - `npm run build`: TypeScript コンパイル確認。
  - `npm test -- --runInBand`: CloudFront/Cognito/SG/ヘルスチェックのテンプレートアサーション確認。
  - `npx cdk synth -c env=prod`: 追加リソースと構成整合を確認。
  - `npx cdk diff -c env=prod`: 影響範囲を確認（ALB SG 更新、CloudFront/Cognito 追加）。
- 確認観点
  - CloudFront behavior が API 用 no-cache かつ Authorization 転送になっていること。
  - ALB ヘルスチェックが `/actuator/health` であること。
  - Cognito App Client が Public Client + Authorization Code + PKCE 前提であること。
  - Cognito App Client の callback/logout URL が以下固定値であること。  
    callback: `https://d123456abcdef8.cloudfront.net/auth/callback`  
    logout: `https://d123456abcdef8.cloudfront.net/`
  - 一覧 API が `page`, `size`, `sort`, `completed`, `q` を受け付け、`size` 上限 `100` が有効であること。
  - エラーレスポンスが `application/problem+json` 形式で返ること。
  - backend が Controller -> Service -> Repository の依存方向を維持していること。

## ドキュメント更新方針
- `infra/README.md`
  - CloudFront/Cognito 追加後の確認コマンド・出力値確認手順の追記要否を確認する。
- `docs/infra/`
  - `ecs-aurora-runtime-baseline.md` を更新し、CloudFront/Cognito を含む構成図へ改訂する。
- `README.md`（ルート）
  - 実装範囲の説明に認証基盤と公開経路の更新が必要か確認する。
- `docs/adr/`
  - 「ALB 認証を使わず backend JWT 検証を採用」「CloudFront 標準ドメイン採用」を長期方針として残す必要があれば ADR 追加を検討する。

## 実施順序
1. 事前整理
   - `specs.md` の受け入れ条件を `infra` と `backend` の作業単位へ分解する。
   - 既存 `infra` Construct と `backend` パッケージ構成に合わせ、追加ファイル配置を確定する。
2. `infra` 実装
   - Cognito Construct を追加し、User Pool / App Client / Hosted UI Domain を実装する。
   - CloudFront Construct を追加し、ALB origin と API behavior（HTTPS 強制・Authorization 転送・no-cache）を実装する。
   - ALB SG 制御とヘルスチェックパスを更新し、Stack 出力を追加する。
3. `backend` 実装
   - Security 依存と設定を追加し、Resource Server を構成する。
   - Todo Controller/Service を追加し、`owner_subject` を JWT `sub` で解決する実装にする。
   - バリデーション、`404` 統一方針、Problem Details エラー形式を実装する。
   - 一覧 API の契約（`page`, `size`, `sort`, `completed`, `q`、`size<=100`）を実装する。
4. 検証
   - `backend` テストと `infra` テスト/`synth`/`diff` を実施し、受け入れ条件との一致を確認する。
5. ドキュメント反映
   - README / docs の更新要否を確認し、必要差分のみ反映する。
