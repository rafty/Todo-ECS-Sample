# Spec: 016-aurora-postgresql-versionup

## 概要
- `infra/` の AWS CDK 定義で固定されている Aurora PostgreSQL `16.4` を、16 系の最新マイナーバージョンへ更新する。
- AWS Health 通知を根拠に、計画外の自動アップグレードを避けるための事前対応要件を定義する。

## 背景
- 2026-05-15 受領の AWS Health 通知で、Aurora PostgreSQL `16.4` を含む複数マイナーバージョンが 2026-05-31 に標準サポート終了予定と案内された。
- 現行コード `infra/lib/constructs/todo-aurora-construct.ts` では `rds.AuroraPostgresEngineVersion.VER_16_4` が明示指定されている。
- 17 系へのメジャーアップグレードを試行したところ、`pg_upgrade` 実行時にメモリ不足で失敗したため、まずは同一メジャー 16 系の最新へ更新する方針に変更した。

## 目的
- Aurora PostgreSQL のマイナーバージョン管理を「AWS任せ」ではなく「CDKで明示管理」に戻す。
- 16 系最新への更新理由・根拠・確認方法を明文化し、後続の `plan.md` / `tasks.md` に引き継げる仕様にする。
- 変更範囲を `infra/` に限定し、既存のアプリ構成を崩さず更新する。

## スコープ
- 対象領域: `infra/`（単一領域）
- 対象内容:
  - `infra/lib/constructs/todo-aurora-construct.ts` のエンジンバージョン指定更新
  - 16 系最新採用根拠の明記
  - `cdk synth` / `cdk diff` による差分確認観点の定義
  - 必要に応じた `infra/README.md` / `docs/infra/` 更新要否確認

## 対象外
- Aurora 以外のリソース（VPC/ECS/ALB/Cognito/S3/IAM）の機能変更
- DB スキーマ変更、アプリケーション SQL 修正、JDBC ドライバ差し替え
- 17 系メジャーアップグレード
- Blue/Green 導入や運用体制の全面見直し
- 本仕様策定時点での本番アップグレード実施そのもの

## ユーザーストーリー / 利用シナリオ
- インフラ運用者として、サポート終了前に Aurora 版数を計画的に更新し、AWS の強制アップグレードに依存しない運用にしたい。
- 開発者として、CDK コードと実環境の DB エンジン版数を一致させ、将来の差分調査を簡単にしたい。
- レビュアーとして、`cdk diff` で Aurora 版数変更以外の高リスク差分がないことを確認したい。

## 機能要件
- FR-01 バージョン更新
  - `rds.AuroraPostgresEngineVersion.VER_16_4` を 16 系最新へ更新する。
  - 更新先は「デプロイ先リージョン（ap-northeast-1）で利用可能」かつ「16.4 からの有効アップグレード先」であること。
  - 採用版は 2026-05-15 時点の最新 16 系である `16.13` とする。
  - `aws-cdk-lib` 側に `16.13` 定数が存在しない場合は `AuroraPostgresEngineVersion.of('16.13', '16')` を利用できること。

- FR-02 根拠の明示
  - 更新理由として、AWS Health 通知の期限（2026-05-31）を仕様内に明記する。
  - 更新元/更新先が追跡できるよう、対象コード位置を明記する。

- FR-03 差分検証
  - `npx cdk synth -c env=<dev|stg|prod>` が成功すること。
  - 生成テンプレートまたは `cdk diff` で Aurora `EngineVersion` の更新が確認できること。
  - Aurora 関連以外の不要な広範囲差分が発生していないこと。
  - 適用順序は `dev` / `stg` / `prod` の同時適用を前提とする。

- FR-04 既存構成維持
  - 既存の DB 名、Secret 名、Serverless v2 の容量設定、サブネット/SG 配置方針は本件で変更しない。
  - 既存の stack 構成・construct 分割・命名規則を維持する。

## 非機能要件
- 可読性
  - 背景、根拠、受け入れ条件を日本語で明確に記載し、担当外メンバーでも判断経緯を追えること。
- 運用性
  - 変更後の確認手順（synth/diff）を再実行可能な形で残すこと。
- 安全性
  - 本件でシークレット/IAM/ネットワーク権限の追加・拡張を行わないこと。
- 保守性
  - CDK の既存 L2/L3 construct 前提を維持し、最小変更で対応すること。

## 受け入れ条件
- AC-01 コード上で Aurora バージョン指定が 16.4 から 16.13 へ変更されている。
- AC-02 `specs.md` に、更新理由（AWS通知）とコード根拠（対象ファイル/行）が明記されている。
- AC-03 `npx cdk synth -c env=prod` が成功し、合成結果で `EngineVersion` 更新を確認できる。
- AC-04 `npx cdk diff -c env=prod` で意図した Aurora 関連差分が確認でき、無関係な高リスク差分がない。
- AC-05 変更範囲が `infra/` に限定されている。
- AC-06 本番反映は通常メンテナンスで実施する前提が仕様に明記されている。

## 制約
- `16.13` はリージョン提供状況に依存するため、適用前に利用可能バージョン確認が必要である。
- `aws-cdk-lib` 定数が不足する場合は `of(...)` での明示指定を許容する。
- Aurora バージョン更新はメンテナンス時間帯で再起動や短時間の接続断を伴う可能性がある。
- 本番反映は Blue/Green や ZDP ではなく、通常メンテナンス手順で実施する。
- 適用順序は環境同時適用とし、段階適用（`dev`→`stg`→`prod`）は採用しない。
- 明示依頼なしに本番影響のある他既定値（削除保護、容量、ネットワーク、認証設定）を変更しない。

## 依存関係
- `infra/lib/constructs/todo-aurora-construct.ts`
- `infra/lib/infra-stack.ts`（当該 construct の組み込み確認）
- `infra/README.md`（検証コマンド運用）
- AWS Health 通知メール（2026-05-15 受領）
- AWS 公式情報
  - RDS FAQ（DB エンジンバージョン方針）: https://aws.amazon.com/rds/faqs/#database-engine-versions--yfcwi2
  - Aurora PostgreSQL マイナーアップグレード手順（ZDP）: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_UpgradeDBInstance.PostgreSQL.MinorUpgrade.html#USER_UpgradeDBInstance.PostgreSQL.Minor.zdp
  - RDS Blue/Green デプロイメント解説: https://aws.amazon.com/blogs/aws/new-fully-managed-blue-green-deployments-in-amazon-aurora-and-amazon-rds/
