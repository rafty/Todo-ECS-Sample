# 前提
- `infra/`にAWS CDKのプロジェクト存在します。
- `backend/`にSpring Bootアプリケーションが存在します。

以下の要件を満たしてください。

# 要件

## 概要
- infra/のAWS CDKではbackend/のSpring Bootのアプリケーションをビルドして、AWS ECRにコンテナイメージをPushしたいです。

## 詳細
- infra/のAWS CDKで、Todoというリポジトリ名で、ECRにリポジトリを作成したい。
- リポジトリはRemovalPolicy.DESTROYでremovalPolicyを設定する
- infra/のAWS CDKで、imagedeploy.DockerImageDeploymentでbackend/のアプリケーションのビルドと ECS へのデプロイを実行したい。
- imagedeploy.DockerImageDeploymentでビルドできるようにbackend/にDockerfileを作成したい。
- Dockerfileでは、amazoncorrettoを使ってください。
- Dockerfileでは、タイムゾーンをJSTにしてください。
- 他に適切な処理を追加してください。