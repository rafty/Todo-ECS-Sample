# 前提
- `infra/`にAWS CDKのプロジェクト存在します。
- `backend/`にSpring Bootアプリケーションが存在します。
- `frontend/`にSPAのfrontendとしてReactが存在します。

以下の要件を満たしてください。

# 要件

このモノレポ構成のリポジトリ全体のAWSへのプロビジョニング、ビルド、デプロイの手順を明確にしたいです。
この話は、`frontend/`のローカルビルドの手順ではありません。
このモノレポは、`frontend/`のReactアプリ、`backend/`のSpring Bootアプリ、`infra/`のAWS CDKで構成されています。フロントエンド、バックエンド、AWSリソースを作成する手順を明確にしたいです。

`backend/`のTodoアプリケーションは、imagedeploy.DockerImageDeployment()で、ビルドされてコンテナイメージをECRに登録されます。
s3deploy.BucketDeployment()は、`frontend/`のReactアプリをS3にUpしますが、Reactアプリをビルドしてくれません。

なので、以下のような手順かと思います。
1. `infra/lib/config/environment-config.ts`でaccountIdやregionを設定する。例えばprod。
2. `frontend/`のReactアプリをビルドする。
3. `infra/`のAWS CDKで、cdk deployする。prodのデプロイ。

これで、AWSにTodoアプリケーションが作成されると思います。
この認識で正しいでしょうか。

この手順を、`docs/development/`に記載してください。また、そのリンクをプロジェクトルートディレクトリのReadme.mdにも追加してください。
