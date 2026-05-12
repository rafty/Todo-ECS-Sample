# 前提
- `infra/`にAWS CDKのプロジェクト存在します。
- `backend/`にSpring Bootアプリケーションが存在します。
- `frontend/`にSPAのfrontendとしてReactが存在します。

以下の要件を満たしてください。

# 要件

## 概要
- TodoアプリケーションのSPAフロントエンドとして、Reactアプリケーションを完成させたい。
- ビルドしたReactアプリケーションをS3に置き、CloudFrontからアクセスさせる。
- 認証は、Cognito User Poolを使用する。

## 詳細
- 現在`frontend/`のReactプロジェクトがJavaScript前提の場合、可能ならTypeScriptに変更したい。
- `backend/`のTodoアプリケーションをバックエンドとしたSPAのフロントエンド(React)として、Todoアプリケーション機能を実現する。
- フロントエンドはモダンなUIにする。
- フロントエンド認証は、ReactフロントエンドからCognito Hosted UIを利用してログインする。ただし、関連リソース（User Pool / App Client / Domain）は、`/infra`で作成されるようになっています。また、フロントエンドでログインし、バックエンドでJWT検証を行う構成を採用しています。

- ビルドされたフロントエンドは、AWS CDKのs3deploy.BucketDeploymentによりS3に配置する。
- S3におかれたコンテンツにはCloudFront経由でアクセスします。
- フロントエンドのビルド方法について、ドキュメントに記載してください。

他に必要な要件があれば、specs.mdに記載してください。

