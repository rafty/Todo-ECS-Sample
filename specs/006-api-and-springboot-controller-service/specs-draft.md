# 前提
- `infra/`にAWS CDKのプロジェクト存在します。
- `backend/`にSpring Bootアプリケーションが存在します。

以下の要件を満たしてください。

# 要件

## 概要 (AWS CDK)
- infra/のAWS CDKでAmazon CloudFront → ALB → Amazon ECS(Fargate) 上の Spring Boot APIの経路と
  Amazon Cognito User Poolによる認証基盤を作成する。

## 詳細 (AWS CDK)
- 公開経路: CloudFront → ALB → ECS(Fargate) 上の Spring Boot API
- 認証基盤: Amazon Cognito User Pool
- フロントエンド認証: ReactフロントエンドからCognito Hosted UIを利用してログイン (本要件では実装しない)
- バックエンド認証: Spring Security の OAuth2 Resource Server / JWT Resource Server により、Cognito発行のJWTを検証。Spring Bootアプリケーションで標準的なJWT検証方式であり、Cognitoとの親和性が高いため。 ALBのCognito/OIDC認証機能は採用しない: ALBでも認証は可能だが、今回はフロントエンドでログインし、バックエンドでJWTを検証する構成とすることで、アプリケーションレイヤで認証状態を明確に扱いやすいため。
- TLS公開: CloudFrontのデフォルトドメイン（`*.cloudfront.net`）およびCloudFront標準証明書を利用 し独自ドメインは採用しない。Todoアプリはサンプルアプリケーションであり、DNS管理や証明書発行の追加コストを避けるため。


## 概要 (Spring Bootアプリケーション)
- backend/のTodoアプリケーションにRestful APIエンドポイントを作成します。

## 詳細 (Spring Bootアプリケーション)
- `controllers` パッケージ内に、Todo エンティティ用の新しい Spring MVC コントローラを作成してください。
- `services` パッケージ内に サービスインターフェース と 実装クラス を作成してください。
- Spring Data リポジトリを使用してコントローラの操作をサポートするために、Todoアプリケーションに必要なメソッドを追加してください。
- コントローラはサービス層のみを利用し、サービス層は Spring Data JPA リポジトリを使用して永続化処理を行います。
