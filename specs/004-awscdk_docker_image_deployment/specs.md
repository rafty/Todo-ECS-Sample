# Spec: 004-awscdk_docker_image_deployment

## 概要
- `infra/` の AWS CDK で Amazon ECR リポジトリ（`todo`）を作成し、`backend/` の Spring Boot アプリケーションを Docker ビルドして ECR に配置できるようにする。
- 併せて、ECS で当該イメージを利用するためのデプロイ連携要件を明確化する。

## 背景
- 現在のリポジトリは `infra/` にネットワーク基盤（VPC）が実装済みであり、アプリケーション実行基盤（ECS）へ進む前段として、コンテナイメージの標準的な配布先（ECR）が必要である。
- `backend/` には Spring Boot アプリケーションの最小構成が存在するため、コンテナ化可能な前提がある。
- Docker イメージ生成と配布を CDK 管理に統合することで、環境差分を抑えた再現可能なデプロイ基盤を整える必要がある。

## 目的
- ECR リポジトリ作成と Docker イメージ配布を IaC（CDK）で一元管理する。
- `backend/` のビルド成果物を Amazon Corretto ベースのコンテナとして生成可能にする。
- ECS 側で利用可能なイメージ参照（タグまたは digest）を安定運用できる状態にする。

## スコープ
- 変更対象領域は **複数領域**（`infra/` と `backend/`）。
- `infra/`:
  - `todo` ECR リポジトリ作成。
  - `removalPolicy: RemovalPolicy.DESTROY` の適用。
  - CDK から `backend/` を Docker ビルドし、ECR へ image push する仕組みの実装。
- `backend/`:
  - CDK の Docker ビルドに利用する `Dockerfile` を新規作成。
  - ベースイメージに Amazon Corretto を利用。
  - コンテナ内タイムゾーンを JST に設定。

## 対象外
- 新規 ECS クラスター／サービス／ALB の構築。
- アプリケーションコードの業務機能追加。
- CI/CD パイプライン（CodePipeline/GitHub Actions 等）の新規構築。
- 本番運用向けの ECR ライフサイクルポリシー最適化、脆弱性運用フローの詳細設計。

## ユーザーストーリー / 利用シナリオ
- インフラ担当者として、`cdk deploy -c env=<env>` 実行時に ECR リポジトリとアプリケーションイメージ配布を同時に管理したい。
- アプリ担当者として、`backend/` のコード変更後に同一手順で Docker イメージを再生成し、ECS が参照可能な形で ECR に格納したい。
- 運用担当者として、環境タグとイメージ識別情報により、どの環境にどのイメージが配布されたか追跡したい。

## 機能要件
- ECR
  - リポジトリ名 `todo` の ECR リポジトリを作成すること。
  - 当該リポジトリの `removalPolicy` は `RemovalPolicy.DESTROY` とすること。
  - 本 feature では ECR のイメージスキャン設定、ライフサイクルポリシー、タグ不変設定は採用しないこと。
- Docker ビルド
  - `backend/` に Dockerfile を配置し、CDK 実行時にビルド可能であること。
  - Dockerfile は Amazon Corretto ベースイメージを利用すること。
  - Dockerfile はコンテナのタイムゾーンを JST に設定すること。
  - Spring Boot アプリケーションの実行に必要なランタイム設定（ポート公開、起動コマンド等）を含むこと。
- イメージ配布
  - `infra/` の CDK から `backend/` のビルドコンテキストを参照し、ECR へイメージを push できること。
  - ECR へ push するイメージタグは固定で `latest` を使用すること。
  - 配布後に ECS 側が参照可能なイメージ情報（タグまたは digest）を取得・参照できること。
- ECS 連携
  - `imagedeploy.DockerImageDeployment` は ECR への配布のみを担当すること。
  - ECS サービス更新（タスク定義更新・サービス再デプロイ）は本 feature の対象外とすること。

## 非機能要件
- 再現性
  - ローカル差分に依存せず、同一ソースから同一手順でイメージを生成可能であること。
- セキュリティ
  - ECR への push に必要な IAM 権限は最小権限とすること。
  - 実行イメージは不要なツールを含めず、攻撃面を最小化すること（マルチステージビルド等を検討）。
- 運用性
  - 環境識別タグ（`env` / `service` / `version`）の既存運用と整合すること。
  - デプロイ失敗時に、失敗箇所（ビルド・push・ECS反映）を切り分けできるログが残ること。
- 保守性
  - `infra/AGENTS.md` の SRP 方針に従い、Stack と Construct の責務を過密化しないこと。

## 受け入れ条件
- `infra` の CDK 定義に `todo` ECR リポジトリが追加され、`RemovalPolicy.DESTROY` が設定されている。
- `backend/` の Dockerfile で Amazon Corretto と JST 設定が確認できる。
- CDK 実行により `backend/` 由来の Docker イメージが ECR に push される。
- ECR へ push されるイメージタグが `latest` であることを確認できる。
- `imagedeploy.DockerImageDeployment` の責務が ECR 配布のみに限定され、ECS 反映は対象外であることが仕様内で明確である。
- ECR のイメージスキャン設定、ライフサイクルポリシー、タグ不変設定が本 feature で未採用であることが仕様内で明確である。

## 制約
- 既存の環境切替ルール（`-c env=<dev|stg|prod>`）を維持すること。
- 既存の `infra/` 実装方針（L2/L3 Construct 優先、最小変更、コメント方針）を維持すること。
- 本 feature で本番影響の大きい既定値変更を行わないこと（明示依頼がない限り）。
- サンプル実装のため、`RemovalPolicy.DESTROY` は `prod` を含む全対象環境に適用すること。

## 依存関係
- `infra/` の AWS CDK 実装基盤（`bin/infra.ts`, `lib/infra-stack.ts`, `lib/config/environment-config.ts`）。
- `backend/` のビルド可能性（Maven Wrapper, Spring Boot 実行可能 Jar 生成）。
- AWS アカウント認証状態（CDK 実行ロール、ECR への push 権限）。
- 将来の ECS サービス実装（イメージ更新を消費するデプロイ先）。

## 未確定事項 / 要確認事項
- 現時点で本 feature 内の未確定事項はなし。
