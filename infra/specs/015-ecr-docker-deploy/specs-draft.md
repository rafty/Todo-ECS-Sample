# specks-draft.md

## タイトル

`cdk-docker-image-deployment` から `cdk-ecr-deployment` v4 系へ移行し、ECS が参照する Docker イメージタグを `latest` 固定からイメージごとに変わるタグへ変更する。

## 背景

AWS から、AWS Lambda の Node.js 16 ランタイムがサポート終了済みであるという通知を受け取った。

Lambda コンソール上では、CDK デプロイ時に作成されると思われる `InfraStack-prod-BackendImageDeploymentConstructBac-...` のような関数に `nodejs16.x` のものが存在している。一方で、ほぼ同名の `nodejs22.x` の関数も存在している。

調査したところ、リポジトリ内の AWS CDK コードでは Docker イメージを ECR にデプロイするために `cdk-docker-image-deployment` を利用している可能性が高い。このライブラリの現在の実装では、内部で `onEventHandler` と `isCompleteHandler` という Lambda 関数を作成しており、それらの runtime が `Runtime.NODEJS_16_X` に固定されている。そのため、アプリケーション本体の Lambda ではなく、CDK の Docker イメージデプロイ用カスタムリソース由来で Node.js 16 の Lambda が作られている可能性が高い。

AWS Lambda の Node.js 16 はすでに deprecated であり、将来的には作成・更新がブロックされる。実行が即時停止する問題ではないが、サポート対象外ランタイムがインフラに残り続けるため、放置しない。

また、現在の Docker イメージデプロイが `latest` のような固定タグを ECS タスク定義で参照している場合、イメージの更新と ECS タスク定義・サービス更新の対応関係が分かりにくくなる。ECS はコンテナイメージタグを digest に解決して一貫性を保つ仕組みを持つが、`latest` のような可変タグは運用上の混乱を招きやすい。そのため、ECS が参照するタグは Docker イメージごとに変わるタグにする。

このリファクタリングでは、CDK deploy の中で Docker イメージの build と ECR への copy を完結させる方針は維持する。CI で Docker build / push して CDK は参照だけにする方式には、今回の対応では移行しない。

## 目的

1. `cdk-docker-image-deployment` を利用しない構成にする。
2. `cdk-ecr-deployment` v4 系を利用して、CDK deploy の流れの中で Docker イメージを管理対象 ECR リポジトリへコピーする。
3. ECS タスク定義が参照する Docker イメージタグを `latest` 固定から、イメージ内容に応じて変わるタグへ変更する。
4. CDK synth / deploy 後に、この移行が原因で `nodejs16.x` の Lambda が新規作成されない状態にする。
5. 既存の ECR リポジトリ、ECS サービス、タスク定義、アプリケーション挙動は、必要最小限の変更に留める。

## 非目的

今回のリファクタリングでは、以下は原則として行わない。

- Docker build / push を CI 専用処理へ切り出すこと。
- ECS / VPC / ALB / RDS / IAM など、Docker イメージデプロイと直接関係しないインフラ構成の大幅な変更。
- アプリケーション本体コード、Dockerfile、環境変数、シークレット、ポート番号、ヘルスチェック設定の不要な変更。
- ECR リポジトリ名の変更。
- 既存の本番 ECR イメージの削除。
- `latest` タグ運用を ECS 参照用として継続すること。

## 対象範囲

主な対象は AWS CDK の TypeScript コードと依存パッケージである。

現状の候補ファイル・候補箇所は以下。ただし、実装前に必ずリポジトリ内を検索して正確な場所を確認する。

- `backend-image-deployment-construct.ts`
- `cdk-docker-image-deployment` を import / require している箇所
- `DockerImageDeployment` を new している箇所
- ECS の `TaskDefinition` / `ContainerDefinition` / `ContainerImage` を設定している箇所
- ECR Repository を作成または参照している箇所
- `package.json` / lock file

## 現状調査で確認すること

実装前に、Codex は以下を確認する。

1. `cdk-docker-image-deployment` がどの construct で使われているか。
2. 現在の Docker build context のパス。
3. 現在のコピー先 ECR リポジトリ。
4. 現在のタグ指定が `latest` 固定か、別の固定タグか、source の tag を利用しているか。
5. ECS タスク定義がどの ECR URI / tag を参照しているか。
6. `DockerImageAsset` に移す場合、現在の build args / platform / target / exclude / network mode / cache 設定などを引き継ぐ必要があるか。
7. Docker build がメインの build context 外のファイルに依存していないか。依存している場合は `extraHash` などで変更検知できるようにする必要がある。
8. 既存のテスト・lint・build・cdk synth・cdk diff の実行方法。

## 要件

### 1. 依存関係

- `cdk-docker-image-deployment` への依存を削除する。
- `cdk-ecr-deployment` を追加する。
- `cdk-ecr-deployment` は v4 系を利用する。
- 既存プロジェクトの package manager と lock file に合わせて依存関係を更新する。
- `aws-cdk-lib` や `constructs` は、必要がなければ大きく更新しない。更新が必要な場合は理由を明記する。

### 2. Docker イメージの build

- Docker イメージの build は `aws-cdk-lib/aws-ecr-assets` の `DockerImageAsset` を使う。
- build context、platform、build args、target、exclude、cache、network mode など、既存の `cdk-docker-image-deployment` 相当の設定がある場合は可能な限り維持する。
- Docker build context 外のファイルに依存している場合は、`DockerImageAsset` の asset hash がその変更を検知できるようにする。

### 3. ECR への copy

- `cdk-ecr-deployment` の `ECRDeployment` を使って、`DockerImageAsset.imageUri` から管理対象 ECR リポジトリへコピーする。
- コピー先の tag は、原則として `DockerImageAsset.imageTag` を使う。
- コピー先 URI は、可能であれば `repository.repositoryUriForTag(image.imageTag)` のように、ECR Repository construct から生成する。
- ECS が参照する image URI と、`ECRDeployment` のコピー先 image URI は同じ repository / tag を指すようにする。

### 4. ECS の image tag

- ECS タスク定義が参照する backend コンテナ image は `latest` 固定にしない。
- ECS タスク定義は、`DockerImageAsset.imageTag` など、イメージ更新時に変わる tag を参照する。
- Docker イメージの内容が変わった場合、CDK synth / diff 上で ECS タスク定義の image が変わることを期待する。
- 外部運用上 `latest` タグも必要な場合は、追加の ECRDeployment で `latest` にもコピーしてよい。ただし、ECS タスク定義が参照するタグは `latest` にしない。
- ECR repository の tag immutability が有効な場合、同じ `latest` を繰り返し push する構成は失敗し得るため、`latest` の追加コピーは明示的に必要な場合のみ行う。

### 5. リソース依存関係

- ECS Service または TaskDefinition が、ECRDeployment の完了前に起動しないように依存関係を設定する。
- 例: `service.node.addDependency(imageDeployment)` または構成上より適切な CDK node dependency を追加する。
- 初回デプロイ時に、ECS がまだ存在しない tag を pull しようとして失敗しないことを重視する。

### 6. Node.js 16 Lambda の解消

- 移行後の CDK template に、今回の Docker イメージデプロイ用途由来の `Runtime: nodejs16.x` が残らないようにする。
- `cdk-ecr-deployment` v4 系のカスタムリソース handler は `provided.al2023` runtime を使う想定とする。
- 既存スタックから旧 `cdk-docker-image-deployment` 由来の Lambda / CodeBuild / CustomResource が削除されることを `cdk diff` で確認する。
- もし `nodejs16.x` が他用途で残る場合は、今回の移行とは別問題として明記する。

### 7. 既存リソース保護

- 既存 ECR リポジトリ自体を削除・再作成しない。
- 既存 ECS Service の名前や ALB 連携などを不要に変更しない。
- 本番環境の既存イメージを削除しない。
- CDK logical ID の変更は最小限にする。ただし、`DockerImageDeployment` から `ECRDeployment` への置換に伴う新規 CustomResource 作成は許容する。

## 実装方針のイメージ

実際のコードはリポジトリ構成に合わせて調整する。

```ts
import * as path from 'path';
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';
import * as ecrdeploy from 'cdk-ecr-deployment';
import * as ecs from 'aws-cdk-lib/aws-ecs';

const image = new DockerImageAsset(this, 'BackendDockerImageAsset', {
  directory: path.join(__dirname, '../../backend'),
  // 既存設定がある場合のみ引き継ぐ
  // platform: Platform.LINUX_AMD64,
});

const imageTag = image.imageTag;

const imageDeployment = new ecrdeploy.ECRDeployment(this, 'BackendImageDeployment', {
  src: new ecrdeploy.DockerImageName(image.imageUri),
  dest: new ecrdeploy.DockerImageName(backendRepository.repositoryUriForTag(imageTag)),
});

const containerImage = ecs.ContainerImage.fromEcrRepository(backendRepository, imageTag);

// ECS Service がある場所で、imageDeployment 完了後に service を作成・更新する
// service.node.addDependency(imageDeployment);
```

注意:

- 上記は方針例であり、既存 construct の責務分離に合わせて実装する。
- `latest` は ECS 参照用には使わない。
- 既存の DockerImageDeployment construct ID をそのまま転用すると混乱する場合は、名前を分かりやすく変更してよい。ただし `cdk diff` の差分は必ず確認する。

## 受け入れ条件

### 静的確認

- `package.json` から `cdk-docker-image-deployment` が削除されている。
- `package.json` に `cdk-ecr-deployment` v4 系が追加されている。
- リポジトリ内に `cdk-docker-image-deployment` の import / require / usage が残っていない。
- ECS が参照する backend image tag が `latest` 固定ではない。
- `DockerImageAsset.imageTag` またはそれに準ずる、イメージ内容に連動して変わる tag が ECS 側で使われている。

### CDK synth / diff 確認

- `npx cdk synth` が成功する。
- `cdk.out` または合成 template に、今回の移行対象由来の `nodejs16.x` が存在しない。
- 合成 template に `provided.al2023` の custom resource handler が存在することを確認できる。
- 旧 `cdk-docker-image-deployment` 由来の CodeBuild Project、Node.js 16 Lambda、CustomResource が削除される差分になっている。
- 新しい `ECRDeployment` custom resource が作成される差分になっている。
- ECS TaskDefinition の container image が `:latest` ではなく、イメージごとに変わる tag を参照している。

### 動作確認

- `npm run build`、`npm test`、`npm run lint` など、既存の検証コマンドがある場合は成功する。
- `cdk diff` で意図しない VPC / ALB / DB / IAM の大幅変更がない。
- `cdk deploy` 後、対象 ECR リポジトリに `DockerImageAsset.imageTag` 相当の tag が存在する。
- `cdk deploy` 後、ECS Service が stable になる。
- backend コンテナが新しい ECR tag の image で起動している。
- `aws lambda list-functions` で、対象スタック由来の `nodejs16.x` Lambda が残っていないことを確認する。残る場合は CloudFormation 管理外の孤立リソースか、別用途の Lambda かを切り分ける。

## 検証コマンド例

プロジェクトの実際の package manager と scripts に合わせて調整する。

```bash
# 依存関係の確認
npm ls cdk-docker-image-deployment
npm ls cdk-ecr-deployment

# リポジトリ内の残存利用確認
grep -R "cdk-docker-image-deployment\|DockerImageDeployment" . \
  --exclude-dir=node_modules \
  --exclude-dir=cdk.out \
  --exclude-dir=.git

# CDK synth
npx cdk synth

# nodejs16.x が残っていないか確認
grep -R '"Runtime": "nodejs16.x"' cdk.out || true

# provided.al2023 が含まれるか確認
grep -R '"Runtime": "provided.al2023"' cdk.out || true

# image に latest 固定が残っていないか確認
grep -R ':latest' cdk.out || true

# デプロイ前差分確認
npx cdk diff
```

AWS 上の確認例:

```bash
aws lambda list-functions \
  --region ap-northeast-1 \
  --query "Functions[?Runtime=='nodejs16.x'].[FunctionName,Runtime,LastModified]" \
  --output table

aws ecr describe-images \
  --region ap-northeast-1 \
  --repository-name <backend-repository-name> \
  --query 'imageDetails[*].[imageTags,imageDigest,imagePushedAt]' \
  --output table
```

## リスクと注意点

- `cdk-ecr-deployment` は AWS CDK 公式ドキュメントで紹介されているが、AWS が公式サポートする construct ではなく、third-party construct library と明記されている。利用する場合は v4 系を使い、将来のランタイム廃止や依存更新にも追従する。
- `DockerImageAsset` の tag は asset hash に基づくため、通常は Docker build context の内容変更に追従する。ただし、build context 外のファイル、外部 build context、build args、secret、ネットワーク越し取得物などに依存している場合は、その変更が hash に反映されない可能性がある。
- `latest` タグを ECS が参照し続けると、どのイメージで動いているかの追跡が難しくなる。ECS は tag を digest に解決する仕組みを持つが、CDK 上は tag が変わらないため、タスク定義の変更検知・レビューが分かりにくい。
- 旧 construct の削除により、CloudFormation 上で Lambda / CodeBuild / CustomResource の削除差分が出る。これは期待される差分だが、対象が旧 image deployment 用であることを確認してから deploy する。
- デプロイ後に古い `nodejs16.x` Lambda が残る場合、CloudFormation の削除失敗、別スタック由来、手動作成、公開済みバージョンなどの可能性がある。即時に手動削除せず、管理元を確認する。

## 情報源

参照日: 2026-05-15

1. AWS Lambda runtimes
    - URL: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
    - 根拠: `nodejs16.x` は deprecated runtime であり、Node.js 16 の deprecation date / block function create / block function update が記載されている。`provided.al2023` のサポート期限も記載されている。

2. AWS Compute Blog: Managing AWS Lambda runtime upgrades
    - URL: https://aws.amazon.com/blogs/compute/managing-aws-lambda-runtime-upgrades/
    - 根拠: Lambda runtime deprecation の段階、deprecated runtime でも invocation 自体は直ちにブロックされないこと、runtime upgrade は customer-driven operation であることが説明されている。

3. cdklabs/cdk-docker-image-deployment README
    - URL: https://github.com/cdklabs/cdk-docker-image-deployment
    - 根拠: この construct が Docker image asset を管理対象 ECR repository にコピーする用途のライブラリであること、内部で CodeBuild を使って pull / tag / push することが説明されている。

4. cdklabs/cdk-docker-image-deployment source
    - URL: https://github.com/cdklabs/cdk-docker-image-deployment/blob/main/src/docker-image-deployment.ts
    - 根拠: `onEventHandler` と `isCompleteHandler` の runtime が `Runtime.NODEJS_16_X` になっている。

5. cdklabs/cdk-docker-image-deployment issue #917
    - URL: https://github.com/cdklabs/cdk-docker-image-deployment/issues/917
    - 根拠: Node.js 16 Lambda runtime EOL に関する issue が open で存在している。

6. cdklabs/cdk-docker-image-deployment PR #1021
    - URL: https://github.com/cdklabs/cdk-docker-image-deployment/pull/1021
    - 根拠: Node.js 22 へ runtime 更新する PR が open で存在しているが、現時点では main に取り込まれている前提にしない。

7. AWS CDK DockerImageAsset docs
    - URL: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecr_assets-readme.html
    - 根拠: `DockerImageAsset` は CDK 管理の ECR に publish され、任意の ECR repository name / tag の指定はサポートしないこと、任意 ECR へ publish したい場合は `cdklabs/cdk-ecr-deployment` を検討するよう記載されている。また、`imageUri` と `imageTag` を参照できる。

8. cdklabs/cdk-ecr-deployment README
    - URL: https://github.com/cdklabs/cdk-ecr-deployment
    - 根拠: single docker image を registry 間で同期する construct であること、latest version の v4 を使うべきで古い version はサポート外であること、`DockerImageAsset.imageUri` から ECR へコピーする例がある。

9. cdklabs/cdk-ecr-deployment source
    - URL: https://github.com/cdklabs/cdk-ecr-deployment/blob/main/src/index.ts
    - 根拠: `ECRDeployment` の custom resource handler が `provided.al2023` runtime を使っている。

10. Amazon ECS software version consistency blog / API docs
    - URL: https://aws.amazon.com/jp/blogs/news/announcing-software-version-consistency-for-amazon-ecs-services/
    - URL: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerImage.html
    - 根拠: ECS が image tag を digest に解決して deployment 内のイメージ一貫性を保つこと、可変 tag の運用には注意が必要であることが説明されている。

## Codex への作業指示メモ

- まずリポジトリ内を調査し、この draft の仮定が実コードと合っているか確認する。
- 実コードと違う点があれば、実コードを優先し、差分を説明する。
- 変更は小さく分け、依存関係更新、construct 移行、ECS image tag 変更、検証の順で進める。
- 不明点があっても、推測で大きな構成変更をしない。
- `latest` を ECS 参照用 image tag として残さない。
- `cdk synth` と `cdk diff` の結果を必ず確認し、想定外の差分があれば実装を止めて報告する。
