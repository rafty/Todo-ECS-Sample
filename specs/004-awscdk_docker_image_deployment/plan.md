# Plan: 004-awscdk_docker_image_deployment

## 実装方針
- 本 feature は **複数領域**（`infra/` と `backend/`）で実施する。
- `infra/` では、既存の `InfraStack` に ECR リポジトリ（`todo`）と Docker イメージ配布処理を追加する。
- `backend/` では、CDK からビルド可能な `Dockerfile` を追加し、Amazon Corretto + JST 設定 + Spring Boot 実行に必要な起動定義を行う。
- `imagedeploy.DockerImageDeployment` の責務は ECR 配布のみに限定し、ECS サービス更新は実装しない。
- イメージタグは固定で `latest` を使用する。

## 変更対象
- `infra/package.json` / `infra/package-lock.json`
  - Docker イメージ配布に必要な依存（`imagedeploy` 利用ライブラリ）を追加する。
- `infra/lib/infra-stack.ts`
  - ECR リポジトリ作成、配布 Construct 呼び出し、必要な Output 追加を実施する。
- `infra/lib/constructs/` 配下（新規）
  - ECR リポジトリ定義 Construct（必要に応じて）。
  - Docker イメージ配布定義 Construct（必要に応じて）。
- `backend/Dockerfile`（新規）
  - Amazon Corretto ベース、JST 設定、Spring Boot 起動定義を実装する。
- `backend/.dockerignore`（必要時）
  - 不要ファイルをビルドコンテキストから除外し、ビルド再現性と速度を維持する。

## 変更しないもの
- ECS クラスター、ECS サービス、タスク定義、ALB など実行基盤リソースの追加・変更。
- `frontend/` 配下のコード。
- `backend/` の業務ロジック、API 契約、DB アクセス実装。
- ECR のイメージスキャン設定、ライフサイクルポリシー、タグ不変設定（本 feature では未採用）。

## 技術方針
- 既存パターンの再利用方針
  - `infra` の既存方針（`bin -> stack -> constructs`、`env` context、共通タグ付与）を維持する。
  - Stack 側は組み立て責務に限定し、リソース定義は必要に応じて `constructs` に分離する。
- 新規クラスや新規コンポーネント
  - `NetworkVpcConstruct` と同様に、ECR とイメージ配布は Construct 化して責務分離する方針を優先する。
- 新規設定追加の要否
  - 追加の環境変数・Secrets は導入しない。
  - イメージタグはコード上で `latest` を明示する。
- 新規依存追加の要否
  - `imagedeploy.DockerImageDeployment` 利用に必要なライブラリのみ追加する。
  - 追加依存は最小限に留め、既存の CDK/L2-L3 中心方針に合わせる。
- 既存インフラや既存契約への影響
  - 既存ネットワーク実装（VPC など）は変更しない。
  - 既存の `-c env=<dev|stg|prod>` 運用と `env/service/version` タグ運用を維持する。
  - `RemovalPolicy.DESTROY` は仕様に従い `prod` 含む全対象環境で適用する。

## データや契約への影響
- DB スキーマ: 変更なし。
- API 契約: 変更なし。
- イベント契約: 変更なし。
- 環境変数: 原則追加なし。
- Secret / 設定値: 追加なし（認証は既存 AWS 実行権限を利用）。
- デプロイや運用への影響:
  - `cdk deploy` 実行時に Docker デーモン利用が必須となる。
  - ECR リポジトリが `RemovalPolicy.DESTROY` のため、Stack 削除時にイメージが削除される。
  - `latest` 固定運用のため、履歴トレースやロールバックは別途運用で補う必要がある。

## リスク
- 破壊的変更の可能性
  - `RemovalPolicy.DESTROY` により、誤って Stack 削除した場合に ECR イメージが消失する。
- 互換性への影響
  - `latest` 固定タグは過去イメージ識別が弱く、将来の ECS 反映時に再現性課題を生む可能性がある。
- 運用影響
  - ローカル/CI 環境で Docker が利用不可の場合、CDK 配布処理が失敗する。
  - AWS 認証状態（ECR push 権限不足）で deploy が失敗する。
- セキュリティ影響
  - コンテナイメージ最小化が不十分な場合、不要パッケージ由来の攻撃面が増える。
- 監視影響
  - 本 feature は監視設定を追加しないため、配布失敗時は CDK/CloudFormation ログに依存する。

## 検証方針
- `backend/`
  - `./mvnw test`（既存テスト回帰の最小確認）
  - `docker build`（Dockerfile 単体ビルド確認、起動コマンド整合確認）
- `infra/`
  - `npm run build`（TypeScript コンパイル）
  - `npm test -- --runInBand`（既存 CDK テスト回帰）
  - `npx cdk synth -c env=prod`（ECR リソースと配布処理のテンプレート確認）
  - `npx cdk diff -c env=prod`（追加/変更リソースの影響確認）
- 確認観点
  - ECR リポジトリ名が `todo` であること。
  - `RemovalPolicy.DESTROY` が適用されること。
  - イメージタグ `latest` で push される実装になっていること。
  - ECS 更新処理が実装されていないこと（対象外担保）。

## ドキュメント更新方針
- `infra/README.md`
  - ECR 配布前提（Docker 必須、実行コマンド、権限前提）を追記する。
- `docs/infra/`
  - 必要に応じて、ECR 配布フローと責務境界（ECR 配布まで、ECS 更新は対象外）を追記する。
- `README.md`（ルート）
  - 必要に応じて、現状の実装範囲に ECR 配布が含まれることを反映する。
- `docs/adr/`
  - 今回はサンプル要件に沿った実装であり、恒久的な設計判断の追加がなければ更新しない。

## 実施順序
1. 事前確認
   - `specs.md` の受け入れ条件をチェックリスト化し、対象外（ECS 更新なし）を明確化する。
   - `infra` / `backend` の既存構成を再確認し、変更箇所を確定する。
2. `backend` 側実装
   - `Dockerfile`（必要なら `.dockerignore`）を作成し、Corretto/JST/起動定義を実装する。
   - ローカル Docker ビルドで成立性を先に確認する。
3. `infra` 側実装
   - 必要依存を追加し、ECR リポジトリとイメージ配布処理を Stack/Construct に実装する。
   - タグ固定 `latest`、`RemovalPolicy.DESTROY`、既存タグ運用を反映する。
4. 検証
   - `backend` と `infra` のテスト/ビルド/synth/diff を実施する。
   - 失敗時は認証・Docker 実行環境・権限を切り分ける。
5. 仕上げ
   - README/docs 更新要否を判定し、必要な最小差分のみ更新する。
   - 受け入れ条件の満足を最終確認する。

## 未解決事項
- 現時点で本 feature の未解決事項はなし。
- 実装時にライブラリ API 名（`imagedeploy.DockerImageDeployment` の import 形式）が異なる場合は、同等機能で最小差分に調整する。
