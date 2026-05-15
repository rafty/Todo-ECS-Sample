# specks-draft.md

## タイトル

Aurora PostgreSQL のマイナーバージョン固定値（16.4）を、16 系の最新安定版へ計画的に更新する。

## 背景（なぜこのリファクタリングが必要になったか）

2026-05-15 に AWS から、Aurora PostgreSQL の一部マイナーバージョン（14.13 / 14.15 / 15.8 / 16.4 / 16.6）が 2026-05-31 に標準サポート終了予定である通知を受領した。

本リポジトリの CDK コードを確認した結果、Aurora エンジンバージョンが `16.4` に固定されていることを確認した。

- `infra/lib/constructs/todo-aurora-construct.ts:28`
  - `rds.AuroraPostgresEngineVersion.VER_16_4`

このまま運用すると、期限以降に AWS 側の自動マイナーアップグレードが発生し、計画外のタイミングで変更が入る可能性がある。  
そのため、事前に CDK 側を更新し、意図したバージョン・手順でデプロイできる状態にする。

## 目的

1. `infra/` の CDK 定義で、Aurora PostgreSQL バージョン固定値を 16 系の最新安定版へ更新する。
2. 変更理由と根拠をドキュメントとして明文化し、後続の `specs.md` / `plan.md` / `tasks.md` に一貫して引き継ぐ。
3. AWS からの通知内容と実コードの差分を、人が追跡しやすい形で整理する。

## 非目的

- Aurora 以外（VPC / ECS / ALB / Cognito / S3 など）の構成変更。
- 17 系メジャーバージョンアップに伴うアプリケーション SQL 互換性対応の実装（必要なら別タスク化）。
- 本番即時切替の手順確定（実施手順は `plan.md` で段階化する）。

## 対象範囲

- `infra/lib/constructs/todo-aurora-construct.ts`
- 必要に応じて関連する `infra` のテスト/確認手順ドキュメント

## 要件（ドラフト）

### 1. バージョン更新要件

- Aurora PostgreSQL のエンジン指定を `VER_16_4` から 16 系最新へ変更する。
- 変更先は「AWS が利用可能としている 16 系マイナーバージョン」のうち、作業時点で妥当なものを採用する。
- 採用する具体的な 16 系マイナーバージョンは、`specs.md` 作成時に一次情報で最終確定する。

### 2. 根拠明示要件

- なぜ 16.4 から更新する必要があるかを、AWS 通知と実コードの両面で記載する。
- 「どの情報を根拠に、どの版へ上げるか」を文書内で追跡可能にする。

### 3. 可読性要件

- インフラ担当者以外が読んでも判断経緯を追える構成（背景 → 目的 → 要件 → 受け入れ条件）にする。
- 専門用語は必要最小限にし、必要な場合は文中で意味を補足する。

### 4. 影響確認要件

- `npx cdk synth -c env=<dev|stg|prod>` でテンプレート生成が成功すること。
- 生成テンプレートまたは `cdk diff` で、Aurora エンジンバージョンの変更が確認できること。
- 変更が Aurora 関連に限定され、不要な広範囲差分がないことを確認する。

## 受け入れ条件（ドラフト）

1. `todo-aurora-construct.ts` のバージョン指定が 16 系最新に更新されている。
2. 変更理由（AWS 通知）と変更根拠（実コード位置、公式情報）が文書化されている。
3. `infra` の既存実行フローに沿って synth/diff で差分確認できる。
4. 16 系更新に伴う注意点（ダウンタイム可能性）が `specs.md` で明記される見通しがある。

## 想定リスク（ドラフト）

- マイナー更新でもメンテナンス時間中に再起動や接続断が発生する可能性がある。
- 将来の Aurora リリース更新により、採用候補マイナーバージョンが変わる可能性がある。
- アプリケーション依存機能（拡張、SQL 方言、JDBC 挙動）に影響が出る可能性があるため、事前検証が必要。

## 情報源（一次情報を優先）

参照日: 2026-05-15

1. AWS Health 通知メール（本件問い合わせ本文）
   - 件名: `[Action Required] Amazon Aurora PostgreSQL minor versions deprecating on May 31, 2026`
   - 根拠: 16.4 を含む対象版のサポート終了予定、および推奨アップグレード先（16.11 以上）が明記されている。

2. リポジトリ実コード
   - `infra/lib/constructs/todo-aurora-construct.ts:28`
   - 根拠: `VER_16_4` が CDK 定義で明示指定されている。

3. AWS 公式ドキュメント（通知メール記載リンク）
   - RDS FAQ（エンジンバージョンサポート方針）  
     https://aws.amazon.com/rds/faqs/#database-engine-versions--yfcwi2
   - Aurora PostgreSQL マイナーアップグレード手順（ZDP 含む）  
     https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_UpgradeDBInstance.PostgreSQL.MinorUpgrade.html#USER_UpgradeDBInstance.PostgreSQL.Minor.zdp
   - Blue/Green デプロイメント（ダウンタイム低減手段）  
     https://aws.amazon.com/blogs/aws/new-fully-managed-blue-green-deployments-in-amazon-aurora-and-amazon-rds/
