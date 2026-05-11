# Tasks: 004-awscdk_docker_image_deployment

## 前提確認
- [x] 1.1 ルート `AGENTS.md`、`backend/AGENTS.md`、`infra/AGENTS.md` を確認し、複数領域変更時の作業ルールを再確認する
- [x] 1.2 ルート `README.md`、`infra/README.md`、`specs/004-awscdk_docker_image_deployment/specs.md`、`specs/004-awscdk_docker_image_deployment/plan.md` を確認し、受け入れ条件と対象外（ECS更新なし）をチェックリスト化する
- [x] 1.3 既存 `infra/lib/infra-stack.ts` と `infra/lib/constructs/` の責務境界を確認し、今回の追加箇所を確定する
- [x] 1.4 Docker 実行前提（ローカル Docker デーモン、AWS 認証）を確認し、検証時の実行可否条件を明確化する

## 実装タスク

### backend
- [x] 2.1 `backend/Dockerfile` を新規作成し、Amazon Corretto ベースイメージを採用する
- [x] 2.2 Dockerfile に JST タイムゾーン設定を追加する
- [x] 2.3 Dockerfile に Spring Boot アプリのビルド・実行に必要な処理（Jar生成、起動コマンド、公開ポート）を実装する
- [x] 2.4 必要な場合のみ `backend/.dockerignore` を追加し、ビルド不要ファイルを除外する

### infra
- [x] 3.1 `infra/package.json` に Docker イメージ配布用の依存を追加し、`package-lock.json` を更新する
- [x] 3.2 `infra/lib/constructs/` に ECR リポジトリ定義（`Todo`、`RemovalPolicy.DESTROY`）を実装する
- [x] 3.3 `infra/lib/constructs/` に `imagedeploy.DockerImageDeployment` を利用したイメージ配布定義を実装する
- [x] 3.4 配布タグを固定 `latest` に設定し、ECS 更新処理を実装しないことをコード上で担保する
- [x] 3.5 `infra/lib/infra-stack.ts` で新規 Construct を組み込み、既存タグ運用（`env/service/version`）と整合させる
- [x] 3.6 必要に応じて `CfnOutput` を追加し、ECR リポジトリ名・URI・配布先確認に必要な情報を出力する
- [x] 3.7 既存ネットワーク実装（VPC/サブネット）に不要な差分が混入していないことを確認する

## テスト / 検証タスク

### backend 検証
- [x] 4.1 `backend/` で `./mvnw test` を実行し、既存テスト回帰がないことを確認する
- [x] 4.2 `backend/` で Docker ビルドを実行し、Dockerfile の成立性（Corretto/JST/起動定義）を確認する

### infra 検証
- [x] 5.1 `infra/` で `npm run build` を実行し、TypeScript コンパイルが通ることを確認する
- [x] 5.2 `infra/` で `npm test -- --runInBand` を実行し、既存テスト回帰がないことを確認する
- [x] 5.3 `infra/` で `npx cdk synth -c env=prod` を実行し、`todo` ECR と image 配布定義が出力されることを確認する
- [x] 5.4 `infra/` で `npx cdk diff -c env=prod` を実行し、追加・変更リソースが意図どおりであることを確認する
- [x] 5.5 検証結果として、`latest` タグ固定・ECS 更新処理なし・ECRポリシー未採用（スキャン/ライフサイクル/タグ不変）を確認する
- [x] 5.6 AWS 認証や Docker 実行環境の都合で未実施項目がある場合は、未確認範囲と理由を記録する

## ドキュメント更新タスク
- [x] 6.1 `infra/README.md` の更新要否を確認し、必要な場合は ECR 配布手順（Docker 必須、実行コマンド、前提権限）を追記する
- [x] 6.2 ルート `README.md` の更新要否を確認し、必要な場合は実装済み範囲に ECR 配布を反映する
- [x] 6.3 `docs/infra/` の更新要否を確認し、必要な場合は責務境界（ECR 配布まで、ECS 更新は対象外）を追記する
- [x] 6.4 `docs/adr/` 更新要否を確認し、恒久的な設計判断追加がない場合は「更新なし」と記録する

## 完了確認
- [x] 7.1 `specs.md` の受け入れ条件を満たしていることをチェックリストで確認する
- [x] 7.2 変更範囲が `backend/` と `infra/` の本 feature 対象に限定されていることを確認する
- [x] 7.3 ECS クラスター/サービス更新、ECR スキャン設定、ライフサイクルポリシー、タグ不変設定が未実装であることを確認する
- [x] 7.4 シークレット、認証情報、state ファイル、不要生成物が差分に含まれていないことを確認する
- [x] 7.5 実行コマンド、結果、未実施理由を作業ログとして整理する

## 並列化の目安
- [x] 8.1 `2.x backend` と `3.x infra` は依存が薄いため並列実施可能（最終統合は `5.x` 以降）
- [x] 8.2 `6.x ドキュメント更新` は `5.x 検証` の結果を待ってから実施する

## 検証結果メモ
- `backend/`
  - `JAVA_HOME=$(/usr/libexec/java_home -v 21) ./mvnw test`: 成功
  - `docker build -t todo-backend-test .`: 失敗（Dockerデーモン未起動）
- `infra/`
  - `npm run build`: 成功
  - `npm test -- --runInBand`: 失敗（`cdk-docker-image-deployment` の内部 Docker build が Dockerデーモン未起動で失敗）
  - `npx cdk synth -c env=prod`: 失敗（Dockerデーモン未起動）
  - `npx cdk diff -c env=prod`: 失敗（Dockerデーモン未起動）
- AWS認証確認
  - `aws sts get-caller-identity`: 成功（`338456725408`）
  - `open -a Docker`: 失敗（アプリケーション `Docker` が見つからずデーモンを起動できない）
- ドキュメント更新
  - `infra/README.md`, ルート `README.md`, `docs/infra/ecr-image-deployment.md` を更新
  - `docs/adr/` は今回更新なし
