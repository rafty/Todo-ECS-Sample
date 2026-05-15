# Plan: 015-ecr-docker-deploy

## 実装方針
- 本 feature は **複数領域（`infra/` + `docs/`）** で実施する。
- 既存の「CDK deploy 内で Docker build / ECR 配布を完結する」運用は維持しつつ、配布実装のみを `cdk-ecr-deployment` v4 系へ置換する。
- ECS が参照する backend イメージタグは `latest` 固定を廃止し、`DockerImageAsset.imageTag` に連動させる。
- `latest` タグを ECS 参照外で併用する運用は採用しない。
- 適用は `prod` 先行ではなく、`dev/stg/prod` を同一方針で同時に実施する。
- 変更は既存 Construct 構成を尊重した最小差分で実施し、VPC/ALB/RDS/IAM など本件と無関係な領域へ波及させない。

## 変更対象
- `infra/package.json`
  - `cdk-docker-image-deployment` を削除し、`cdk-ecr-deployment` v4 系を追加する。
- `infra/package-lock.json`
  - 依存差し替えに伴う lock 更新を反映する。
- `infra/lib/constructs/backend-image-deployment-construct.ts`
  - `DockerImageAsset` + `ECRDeployment` を使う実装へ置換する。
  - 後続 Construct が利用できるよう、少なくとも以下を公開する設計に変更する。
    - 配布に使う `imageTag`
    - 依存設定に使う deployment construct（または同等の依存対象）
- `infra/lib/infra-stack.ts`
  - backend image deployment construct の戻り値（`imageTag`）を ECS 側に渡すよう変更する。
  - ECS サービス作成が image 配布完了に依存するよう、`node.addDependency(...)` を追加する。
  - 既存 ECR リポジトリ名、出力値、他 Construct 連携は維持する。
- `infra/lib/constructs/todo-backend-ecs-service-construct.ts`
  - 受け取りタグの説明コメントを `latest` 前提から実態に合わせて更新する（実装インターフェースは維持）。
- `infra/README.md`
  - `latest` 固定配布・参照の記述を、可変タグ参照へ更新する。
  - ランタイム警告関連の記述を新方式に合わせる。
- `docs/infra/ecr-image-deployment.md`
  - 配布方式（`cdk-ecr-deployment` / `DockerImageAsset`）とタグ方針を更新する。
- `docs/infra/ecs-aurora-runtime-baseline.md`
  - `ECR: todo:latest` 前提図・説明を可変タグ参照に更新する。
  - `cdk-docker-image-deployment` 由来の Node16 警告記述を更新する。

## 変更しないもの
- `backend/` と `frontend/` のコード。
- ECS/ALB/VPC/Aurora/Cognito の機能要件や構成パラメータ。
- ECR リポジトリ名 (`todo`) とリポジトリ作成方式。
- CI フロー（Docker build/push の外出し）は行わない。
- 本件由来ではない既存 `nodejs16.x` 関数の解消（別 feature で対応する）。
- 本件と無関係な大規模リファクタリング、rename、ファイル移動。

## 技術方針
- 既存パターンの再利用方針
  - `infra/lib/constructs/backend-image-deployment-construct.ts` を引き続き「image 配布責務の境界」として利用する。
  - `infra/lib/infra-stack.ts` は各 Construct 組み立て役に留める。
- 新規実装方針
  - `aws-cdk-lib/aws-ecr-assets` の `DockerImageAsset` で backend ディレクトリをビルドする。
  - `cdk-ecr-deployment` の `ECRDeployment` で、asset URI から target ECR (`todo`) の `repositoryUriForTag(imageTag)` へコピーする。
  - ECS コンテナイメージは `fromEcrRepository(repository, imageTag)` を利用し、`imageTag` は build 結果に追従させる。
  - 初回デプロイ失敗を防ぐため、ECS サービスを image 配布リソースに依存させる。
  - backend build が build context 外ファイルに依存している場合でも、その差分を asset hash へ追加反映する対応は行わない。
- 新規依存追加の要否
  - `cdk-ecr-deployment` を追加。
  - `cdk-docker-image-deployment` は除去。
- 既存インフラへの影響
  - ECR リポジトリ自体は再利用し、名称・削除ポリシーは変更しない。
  - 旧カスタムリソース（Node16 Lambda / CodeBuild）は差分上で削除される想定。

## データや契約への影響
- DB スキーマ: 影響なし。
- API 契約: 影響なし。
- イベント契約: 影響なし。
- 環境変数/Secret: 追加・変更なし。
- デプロイ/運用:
  - CloudFormation 差分として image 配布方式の置換が発生する。
  - ECS タスク定義の image tag がデプロイ毎に変化し、運用時の追跡性が向上する。

## リスク
- デプロイ順リスク
  - 依存関係不足だと初回デプロイで ECS が未配布タグを pull して失敗する可能性。
  - 対策: 明示的 `node.addDependency` を設定し、`cdk diff` で依存関係を確認する。
- 差分拡大リスク
  - 置換時に無関係リソースへ波及する可能性。
  - 対策: Construct 境界を維持し、変更対象を image 配布周辺に限定する。
- 運用互換リスク
  - `latest` を前提とした手動運用がある場合に混乱する可能性。
  - 対策: README/docs で「ECS 参照タグ方針」を明確化する。
- 変更検知リスク
  - build context 外ファイルの変更は asset hash に反映されないため、イメージ更新が自動検知されない可能性。
  - 対策: 本件では仕様として許容し、運用上は build context 内変更で管理する。
- サードパーティ依存リスク
  - `cdk-ecr-deployment` は third-party のため将来更新が必要。
  - 対策: v4 系固定方針を明記し、将来アップデート観点を docs に残す。

## 検証方針
- 依存関係確認
  - `npm ls cdk-docker-image-deployment` が未検出であること。
  - `npm ls cdk-ecr-deployment` で導入確認できること。
- 静的確認
  - `cdk-docker-image-deployment` の import / usage が `infra/` から消えていること。
  - ECS 参照が `latest` 固定でないこと。
- ビルド/テスト
  - `npm run build`
  - `npm test -- --runInBand`
- CDK 検証
  - `npx cdk synth -c env=dev`
  - `npx cdk synth -c env=stg`
  - `npx cdk synth -c env=prod`
  - `npx cdk diff -c env=dev`
  - `npx cdk diff -c env=stg`
  - `npx cdk diff -c env=prod`
  - 合成テンプレートで以下を確認する。
    - 本件由来 `Runtime: nodejs16.x` が存在しない
    - `provided.al2023` handler を含む新配布方式が存在する
    - 旧方式の Lambda/CodeBuild/CustomResource が削除差分になっている
    - ECS タスク定義の image tag が `latest` 固定ではない
    - 本件由来以外の `nodejs16.x` が検出された場合は、別 feature 対応として切り分け記録する
- デプロイ後確認（可能な場合）
  - 対象 ECR に新タグが存在すること。
  - ECS Service が stable になること。

## ドキュメント更新方針
- 更新対象
  - `infra/README.md`
  - `docs/infra/ecr-image-deployment.md`
  - `docs/infra/ecs-aurora-runtime-baseline.md`
- 更新内容
  - `latest` 固定前提から可変タグ前提へ変更
  - 配布実装ライブラリ名と構成図の更新
  - Node16 警告の扱いを現行実装に合わせて更新
- ADR 要否
  - 既存方針（CDK deploy で build/copy 実行）の継続であり、原則 ADR 追加は不要。
  - 将来 CI 分離へ方針転換する場合は ADR 化を検討する。

## 実施順序
1. 現状固定
   - 既存 `infra` の image 配布・ECS 参照経路を再確認し、変更対象ファイルを確定する。
2. 依存差し替え
   - `package.json` / lock file を更新し、`npm install` 後に依存整合を確認する。
3. Construct 置換
   - `backend-image-deployment-construct.ts` を `DockerImageAsset + ECRDeployment` へ置換する。
4. Stack 連携変更
   - `infra-stack.ts` で `imageTag` 連携と ECS 依存関係追加を行う。
5. コメント/軽微整合
   - `todo-backend-ecs-service-construct.ts` の説明と実態を揃える。
6. 検証
   - build/test/synth/diff を実行し、受け入れ条件観点を確認する。
7. ドキュメント反映
   - `infra/README.md` と `docs/infra/` の関連文書を更新する。
8. 最終確認
   - 差分が本件範囲に限定されていることを確認し、未確認事項を明記する。
