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

## 関連ドキュメント
- ネットワーク詳細: `../docs/infra/network-baseline.md`
- ADR: `../docs/adr/002-network-baseline-and-env-switching.md`
