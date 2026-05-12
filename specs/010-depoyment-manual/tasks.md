# Tasks: 010-depoyment-manual

## 前提確認
- [x] 1.1 ルート `AGENTS.md` と `docs/AGENTS.md` を確認し、ドキュメント更新時の配置・記述ルールを再確認する
- [x] 1.2 ルート `README.md`、`docs/README.md`、`infra/README.md`、`frontend/README.md`、`docs/infra/ecs-aurora-runtime-baseline.md` を確認し、既存の手順記載と導線を把握する
- [x] 1.3 `specs/010-depoyment-manual/specs.md` と `specs/010-depoyment-manual/plan.md` を確認し、FR-DOC-01〜12 と受け入れ条件をチェックリスト化する
- [x] 1.4 変更対象（`docs/` とルート `README.md`）と非対象（`infra/`・`backend/`・`frontend/` のコード変更なし）を確定する
- [x] 1.5 `infra/lib/infra-stack.ts` と関連 Construct を確認し、手順書に記載する事実（`frontend/dist` 必須、`imagedeploy`、`BucketDeployment`）を固定する

## 実装タスク

### docs/development: AWS デプロイ手順書の新規作成
- [x] 2.1 `docs/development/aws-deployment-manual.md` を新規作成し、対象が「AWS へのプロビジョニング/ビルド/デプロイ」であることを明記する
- [x] 2.2 手順書を `結論 -> 背景 -> 詳細` の順で構成し、必要に応じて Mermaid の構成図を追加する
- [x] 2.3 前提条件として AWS 認証、Node/npm、AWS CDK、`-c env=<dev|stg|prod>` 運用、Docker 互換コンテナランタイム起動要件（Docker Desktop / Rancher Desktop 例示）を記載する
- [x] 2.4 初回セットアップとして `cdk bootstrap` の目的と最小実行例（`prod` 中心）を簡潔に記載する
- [x] 2.5 実行順序を `frontend build -> cdk synth/diff（推奨）-> cdk deploy` で記載し、コマンド例は `prod` 中心（`-c env=prod`）で統一する
- [x] 2.6 `cdk deploy` 実行時に同時に行われる処理（backend イメージ ECR 配布、CloudFormation 更新、frontend 成果物 S3 配備）を明確に説明する
- [x] 2.7 デプロイ後確認として CloudFront ドメイン、Cognito 関連出力値、`/api/*` 疎通確認の手順を記載する
- [x] 2.8 代表的な失敗ケース（`frontend/dist` 未生成、コンテナランタイム未起動、AWS 権限不足）と切り分け手順を記載する

## テスト / 検証タスク
- [x] 3.1 手順書記載のコマンド・パス・設定名が実在することを、既存コード/README と照合して確認する
- [x] 3.2 手順書の記載が `specs/010-depoyment-manual/specs.md` の FR-DOC-01〜12 を満たすことを確認する
- [x] 3.3 `README.md` と `docs/README.md` から新規手順書へのリンク到達性を確認する
- [x] 3.4 実行していない検証（例: 実際の `cdk deploy`）がある場合は、未実施理由と影響範囲を記録する

## ドキュメント更新タスク
- [x] 4.1 `docs/README.md` の `development` セクションに `aws-deployment-manual.md` へのリンクを追加する
- [x] 4.2 ルート `README.md` に `docs/development/aws-deployment-manual.md` へのリンクを追加する
- [x] 4.3 `docs/adr/` の更新要否を確認し、今回不要であることを記録する（設計判断の新規追加なし）

## 完了確認
- [x] 5.1 `specs/010-depoyment-manual/specs.md` の受け入れ条件をすべて満たしていることを確認する
- [x] 5.2 変更範囲が `docs/` とルート `README.md` に限定されていることを確認する
- [x] 5.3 シークレット、認証情報、不要生成物が差分に含まれていないことを確認する
- [x] 5.4 最終差分で、`prod` 中心の例示、`cdk bootstrap`、コンテナランタイム要件が明記されていることを確認する

## 並列化の目安
- [x] 6.1 `2.1` と `4.1/4.2` は並列で着手可能だが、最終的なリンク文言は `2.x` の見出し確定後に揃える
- [x] 6.2 `3.x` の検証は `2.x` と `4.x` 完了後に集約して実施する

## 未実施メモ
- 実際の `npx cdk deploy -c env=prod` は本タスクで未実施です。
  - 理由: 本 feature はドキュメント整備が対象であり、インフラ変更を伴う実デプロイはスコープ外です。
  - 影響範囲: 手順の再現性は既存コード・既存ドキュメントとの整合確認で担保し、実環境反映の成否は別途デプロイ時に確認が必要です。
