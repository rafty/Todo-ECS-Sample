# infra

このディレクトリは AWS CDK（TypeScript）でインフラを定義する領域です。

## 前提
- Node.js（本リポジトリの推奨バージョンに従う）
- AWS CLI
- AWS CDK v2
- AWS認証情報（対象アカウントへ AssumeRole 可能な状態）

## 主要コマンド
`infra/` 直下で実行します。

```bash
npm install
npm run build
npm test -- --runInBand
npx cdk synth -c env=prod
npx cdk diff -c env=prod
```

## 環境切替ルール
- 環境は `-c env=<dev|stg|prod>` で指定します。
- 未指定または不正値の場合、`bin/infra.ts` でエラー終了します（誤デプロイ防止）。
- 環境値（`accountId` / `region`）は `lib/config/environment-config.ts` で管理します。

## 002-create_network で追加された内容
- 新規VPC（デフォルトVPC不使用）
- 2AZ / 3層サブネット（`front` / `application` / `datastore`）
- NAT Gateway 1台
- 共通タグ `env` / `service` / `version`（`version=1.00`）

## 004-awscdk_docker_image_deployment で追加された内容
- `Todo` ECR リポジトリを CDK で作成
- `backend/` の Dockerfile をビルドし、ECR に `latest` タグで配布
- `RemovalPolicy.DESTROY`（サンプル要件として `prod` 含む全対象環境）
- ECR のイメージスキャン設定、ライフサイクルポリシー、タグ不変設定は未採用
- ECS サービス更新はこの機能の対象外（ECR 配布まで）

## 005-ecs-aurora-jpa で追加された内容
- ALB / ECS(Fargate) / Aurora Serverless v2(PostgreSQL) / Secrets Manager をCDKで作成
- `todo:latest` イメージをECSタスク定義で参照
- DB接続情報をSecrets Manager経由でECSコンテナに注入
- ALB/ECS/Aurora 用 Security Group を追加し、`ALB -> ECS -> Aurora` の通信経路を明示
- ALB ヘルスチェック（`path=/`）とターゲットグループ連携を追加

## 006-api-and-springboot-controller-service で追加された内容
- CloudFront Distribution を追加し、公開経路を `CloudFront -> ALB -> ECS` に統一
- ALB の Security Group 受信元を CloudFront managed prefix list 起点に制限（ALB 直アクセス抑止）
- Cognito User Pool / App Client / Hosted UI Domain を追加
  - 自己登録可、MFA不要、簡易パスワードポリシー
  - App Client は Public Client（secret なし）+ Authorization Code Flow
  - callback URL: `https://d123456abcdef8.cloudfront.net/auth/callback`
  - logout URL: `https://d123456abcdef8.cloudfront.net/`
- ALB ヘルスチェックパスを `/actuator/health` に統一

## 実行時の注意
- `cdk deploy` / `cdk synth` / `cdk diff` 実行時に Docker デーモンが必要です。
- AWS 認証情報に ECR への push 権限が必要です。
- `prod` 実行時は、`111111111111` 側の CDK lookup role を Assume できる認証が必要です。

## 関連ドキュメント
- ネットワーク詳細: `../docs/infra/network-baseline.md`
- ECR配布詳細: `../docs/infra/ecr-image-deployment.md`
- ECS/Aurora実行基盤: `../docs/infra/ecs-aurora-runtime-baseline.md`
- ADR: `../docs/adr/002-network-baseline-and-env-switching.md`
