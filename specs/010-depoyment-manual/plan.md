# Plan: 010-depoyment-manual

## 実装方針
- 本 feature は **複数領域**（`docs/` とルート `README.md`）で実施する。
- 既存実装（`infra/lib/infra-stack.ts` と `infra/lib/constructs/*`）を事実源として、AWS デプロイ手順を `docs/development/aws-deployment-manual.md` に集約する。
- 手順は `prod` 中心の実行例で記載しつつ、環境切替方式（`-c env=<dev|stg|prod>`）の共通ルールは明示する。
- `imagedeploy.DockerImageDeployment()` 実行前提として、Docker 互換コンテナランタイム（Docker Desktop / Rancher Desktop など）の起動要件を明示する。
- 初回セットアップとして `cdk bootstrap` の簡易説明（目的・最小コマンド例）を含める。

## 変更対象
- `docs/development/aws-deployment-manual.md`（新規）
  - AWS デプロイ手順の主文書として追加する。
  - 記載内容:
    - 対象範囲（ローカル開発手順との切り分け）
    - 前提条件（AWS 認証、Node/npm、CDK、コンテナランタイム）
    - 初回セットアップ（`cdk bootstrap`）
    - `prod` 中心の実行順序（`frontend build` -> `cdk synth/diff` -> `cdk deploy`）
    - `cdk deploy` で同時に行われる処理（ECR 配布 / CloudFormation 更新 / S3 配備）
    - デプロイ後確認（CloudFront / Cognito / `/api/*`）
    - 失敗時の切り分け（`frontend/dist` 未生成、ランタイム未起動、権限不足）
- `docs/README.md`（更新）
  - `development` セクションに `aws-deployment-manual.md` への導線を追加する。
- `README.md`（更新）
  - ルートから `docs/development/aws-deployment-manual.md` に到達できるリンクを追加する。

## 変更しないもの
- `infra/`・`backend/`・`frontend/` のコード実装。
- `infra/lib/config/environment-config.ts` の環境値。
- API 契約、DB スキーマ、認証仕様、CloudFront/ALB/ECS/Aurora の構成。
- CI/CD パイプライン、監視基盤、ADR の新規追加。

## 技術方針
- 既存パターンの再利用方針
  - コマンドと前提は `infra/README.md`、`frontend/README.md`、`docs/infra/ecs-aurora-runtime-baseline.md` の既存記載と整合させる。
  - 手順記述は docs 既存スタイル（日本語、必要に応じた Mermaid）を踏襲する。
- 新規クラスや新規コンポーネントの要否
  - 不要（ドキュメント追加・更新のみ）。
- 新規設定追加の要否
  - 不要（既存設定を説明するのみ）。
- 新規依存追加の要否
  - 不要。
- 既存インフラや既存契約の扱い
  - 参照のみ。infra 構成・契約は変更しない。

## データや契約への影響
- DB スキーマ: 変更なし。
- API 契約: 変更なし。
- イベント契約: 変更なし。
- 環境変数: 変更なし。
- Secret / 設定値: 変更なし。
- デプロイや運用への影響:
  - 手順が標準化され、`prod` デプロイ時の実行順序ミスを減らす。
  - 初回 `cdk bootstrap` の記載により、環境初期化不足による失敗を減らす。

## リスク
- 破壊的変更の可能性
  - コード変更はないため低い。ただし誤った手順記載は運用障害を誘発する。
- 互換性への影響
  - ドキュメントのみのため実行互換性への直接影響はない。
- 運用影響
  - `prod` 中心の例示により、`dev/stg` 利用者がコマンドを誤転用するリスクがあるため、環境切替ルールを明確化する。
- セキュリティ影響
  - 実値情報（認証情報、シークレット）を記載しない運用を徹底する。
- 監視影響
  - 監視設定の変更はない。確認手順として既存出力値のチェック方法を補強する。

## 検証方針
- 文書整合性確認
  - `specs/010-depoyment-manual/specs.md` の FR-DOC-01〜12 を満たす記述有無をチェックする。
  - `prod` 中心のコマンド例、`cdk bootstrap`、コンテナランタイム要件の明記を確認する。
- リンク整合性確認
  - `README.md` -> `docs/development/aws-deployment-manual.md`
  - `docs/README.md` -> `docs/development/aws-deployment-manual.md`
- 既存実装との整合確認
  - `frontend/dist` 必須前提、`imagedeploy.DockerImageDeployment`、`BucketDeployment` の説明が `infra/lib/infra-stack.ts` と矛盾しないことを確認する。
- 実行検証の扱い
  - 本 feature はドキュメント更新のみのため、`cdk deploy` 実行は必須にしない。
  - 必要に応じてコマンド例の構文確認（タイポ確認）を実施する。

## ドキュメント更新方針
- 新規作成
  - `docs/development/aws-deployment-manual.md`
- 更新
  - `docs/README.md`（development 導線追加）
  - `README.md`（ルート導線追加）
- `docs/adr/` の要否
  - 不要（設計判断の追加ではなく、既存運用手順の明文化のため）。

## 実施順序
1. 既存情報の突合
   - `infra/README.md`、`frontend/README.md`、`docs/infra/ecs-aurora-runtime-baseline.md`、`infra/lib/infra-stack.ts` を参照し、手順の事実関係を固定する。
2. 手順書本文の作成
   - `docs/development/aws-deployment-manual.md` を作成し、前提・初回セットアップ・デプロイ・確認・トラブルシュートを記述する。
3. 導線更新
   - `docs/README.md` とルート `README.md` にリンクを追加する。
4. 受け入れ条件チェック
   - FR-DOC-01〜12 の充足確認とリンク確認を行い、差分を最終調整する。

## 未解決事項
- なし（`specs.md` の未確定事項は方針決定済み）。
