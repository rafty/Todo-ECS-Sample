# Tasks: 015-ecr-docker-deploy

## 前提確認
- [x] 1.1 ルート `AGENTS.md` と `infra/AGENTS.md` を確認し、変更範囲を `infra/` + `docs/` の必要箇所に限定する方針を再確認する。
- [x] 1.2 `infra/README.md` と `docs/README.md` を確認し、更新対象ドキュメントと導線更新ルールを再確認する。
- [x] 1.3 `infra/specs/015-ecr-docker-deploy/specs.md` の受け入れ条件をチェックリスト化する。
- [x] 1.4 `infra/specs/015-ecr-docker-deploy/plan.md` の変更対象・非対象を確認し、`backend/`・`frontend/`・CIフローを変更しないことを明確化する。
- [x] 1.5 方針確定事項（`latest` 併用なし、`dev/stg/prod` 同時適用、build context 外は hash 非反映、本件外 Node16 は別 feature）を実装制約として作業メモに固定する。
- [x] 1.6 現行コードで `cdk-docker-image-deployment` 利用箇所、`latest` 固定参照箇所、関連ドキュメント記述箇所を特定する。

## 実装タスク

### 2. 依存関係の差し替え
- [x] 2.1 `infra/package.json` から `cdk-docker-image-deployment` を削除する。
- [x] 2.2 `infra/package.json` に `cdk-ecr-deployment` v4 系を追加する。
- [x] 2.3 lock file（`infra/package-lock.json`）を更新し、依存整合を取る。
- [x] 2.4 `npm ls cdk-docker-image-deployment` / `npm ls cdk-ecr-deployment` で依存状態を確認する。

### 3. backend イメージ配布 Construct の置換
- [x] 3.1 `infra/lib/constructs/backend-image-deployment-construct.ts` を `DockerImageAsset` + `ECRDeployment` 構成へ置換する。
- [x] 3.2 backend build source を既存どおり `backend` ディレクトリに設定する。
- [x] 3.3 配布先を既存 ECR リポジトリ `repositoryUriForTag(imageTag)` で解決する構成にする。
- [x] 3.4 配布タグは `DockerImageAsset.imageTag` を採用し、`latest` 追加コピーは実装しない。
- [x] 3.5 後続 Construct が利用できるよう、`imageTag` と依存設定用の公開プロパティ（deployment construct 等）を定義する。
- [x] 3.6 build context 外ファイルを hash へ反映するための `extraHash` 等は追加しない方針をコードに反映する。

### 4. Stack / ECS 連携の更新
- [x] 4.1 `infra/lib/infra-stack.ts` で backend image deployment construct の `imageTag` を ECS 側へ渡す。
- [x] 4.2 `infra/lib/infra-stack.ts` で ECS サービス（または同等の起動主体）が image 配布リソースへ依存するよう `node.addDependency(...)` を設定する。
- [x] 4.3 `infra/lib/infra-stack.ts` の ECR タグ出力値（`TodoAppEcrImageTag`）を `latest` 固定から動的タグ前提へ整合させる。
- [x] 4.4 `infra/lib/constructs/todo-backend-ecs-service-construct.ts` のコメントを `latest` 前提から実態に合わせて更新する（インターフェースは維持）。
- [x] 4.5 本件と無関係な VPC/ALB/Aurora/Cognito/IAM 設定に変更が混入していないことを確認する。

## テスト / 検証タスク
- [x] 5.1 `infra/` で `npm run build` を実行し、TypeScript コンパイルを確認する。
- [x] 5.2 `infra/` で `npm test -- --runInBand` を実行し、既存テスト回帰がないことを確認する。
- [x] 5.3 `infra/` で `npx cdk synth -c env=dev` を実行する。
- [x] 5.4 `infra/` で `npx cdk synth -c env=stg` を実行する。
- [x] 5.5 `infra/` で `npx cdk synth -c env=prod` を実行する。
- [x] 5.6 `infra/` で `npx cdk diff -c env=dev` を実行する。
- [x] 5.7 `infra/` で `npx cdk diff -c env=stg` を実行する。
- [x] 5.8 `infra/` で `npx cdk diff -c env=prod` を実行する。
- [x] 5.9 合成テンプレートで、本件由来の `Runtime: nodejs16.x` が消えていることを確認する。
- [x] 5.10 合成テンプレートで、新配布方式由来の `provided.al2023` handler が存在することを確認する。
- [x] 5.11 合成テンプレート/差分で、ECS image 参照が `latest` 固定でないことを確認する。
- [x] 5.12 旧方式由来の Lambda / CodeBuild / CustomResource が削除差分になっていることを確認する。
- [x] 5.13 本件由来以外の `nodejs16.x` が残る場合は、別 feature 対応として切り分け記録のみを実施する。
- [x] 5.14 実施不能な検証がある場合、未実施理由・未確認範囲・残リスクを記録する。

## ドキュメント更新タスク
- [x] 6.1 `infra/README.md` の `latest` 固定記述を可変タグ運用へ更新する。
- [x] 6.2 `docs/infra/ecr-image-deployment.md` の配布方式を `cdk-ecr-deployment` + `DockerImageAsset` 前提へ更新する。
- [x] 6.3 `docs/infra/ecr-image-deployment.md` の構成図（Mermaid）を新方式に合わせて更新する。
- [x] 6.4 `docs/infra/ecs-aurora-runtime-baseline.md` の `ECR: todo:latest` 前提記述を更新する。
- [x] 6.5 `docs/infra/ecs-aurora-runtime-baseline.md` の Node16 警告記述を新方式に合わせて更新する。
- [x] 6.6 必要に応じて `docs/README.md` の参照導線更新要否を確認する（必要時のみ更新）。
- [x] 6.7 今回は既存方針の実装更新であるため `docs/adr/` 更新不要であることを確認し、必要なら理由を記録する。

## 完了確認
- [x] 7.1 `specs.md` の受け入れ条件（AC-01〜AC-05）の充足状況を確認し、未確認範囲は実行記録へ明記する。
- [x] 7.2 変更範囲が `infra/` と必要な `docs/` に限定され、対象外変更が混入していないことを確認する。
- [x] 7.3 `latest` 併用なし、`dev/stg/prod` 同時適用方針が実装と検証手順に反映されていることを確認する。
- [x] 7.4 build context 外 hash 非反映方針が実装内容と矛盾していないことを確認する。
- [x] 7.5 シークレット・認証情報・state ファイル・不要生成物が差分に含まれていないことを確認する。
- [x] 7.6 実行コマンド、結果、未実施理由を作業記録として残し、レビュー可能な状態で完了する。

---

並列化の目安:
- `2.x`（依存差し替え）完了後に `3.x`（Construct置換）へ進む。
- `4.x`（Stack/ECS 連携）は `3.x` の公開プロパティ設計確定後に着手する。
- `6.x`（ドキュメント更新）は `4.x` の設計確定後であれば `5.x`（検証）と部分並行可能。
- `5.x` の `synth/diff` は `dev/stg/prod` を同一実装状態で順に実施する。

## 実行記録
- `npm run build`: 成功（TypeScript コンパイル通過）
- `npm test -- --runInBand`: 成功（`test/infra.test.ts` 1件 pass）
- `npx cdk synth -c env=dev`: 失敗（`arn:aws:iam::111111111111:role/cdk-hnb659fds-lookup-role-111111111111-ap-northeast-1` AssumeRole 権限不足）
- `npx cdk synth -c env=stg`: 失敗（`arn:aws:iam::222222222222:role/cdk-hnb659fds-lookup-role-222222222222-ap-northeast-1` AssumeRole 権限不足）
- `npx cdk synth -c env=prod`: 成功（テンプレート生成）
- `npx cdk diff -c env=dev`: 失敗（dev lookup role AssumeRole 権限不足）
- `npx cdk diff -c env=stg`: 失敗（stg lookup role AssumeRole 権限不足）
- `npx cdk diff -c env=prod`: 成功（旧 `cdk-docker-image-deployment` 由来リソース削除 + `Custom::CDKECRDeployment` 追加 + ECSイメージタグ差分確認）
- テンプレート確認:
  - `Runtime: nodejs16.x` は `InfraStack-{dev,stg,prod}.template.json` で未検出
  - `Runtime: provided.al2023` は `InfraStack-{dev,stg,prod}.template.json` で検出
  - `:latest` 固定参照は `InfraStack-{dev,stg,prod}.template.json` で未検出
- 未確認範囲と残リスク:
  - dev/stg は lookup role AssumeRole 権限不足のため、環境実体に対する `cdk diff` の最終検証は未完了
  - AC-05（`cdk deploy` 後の ECS 安定化確認）は本タスク範囲外のため未実施
  - 本件由来以外の `nodejs16.x` 残存有無は AWS アカウント横断の実環境確認が別途必要
