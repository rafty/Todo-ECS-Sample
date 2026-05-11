# 前提
- `infra/`にAWS CDKのプロジェクト存在します。
- `backend/`にSpring Bootアプリケーションが存在します。

以下の要件を満たしてください。

# 要件

## 概要
- `backend/`のTodoアプリ(Spring Boot)をAmazon ECS上で動かすためのECSクラスタとALBを作成し、Todoアプリケーションが使用するDatabaseとしてAuroraを作成し、TodoアプリケーションがAuroraにセキュアにアクセスできるようにします。

## 詳細
- infra/のAWS CDKで、ALB、Amazon ECS クラスタ (Fargate)、Aurora Serverless v2(PostgreSQL)を作成します。
- TodoアプリケーションがAuroraにアクセスする際、Secret Managerで作成したデータベースシークレットを使用します。
- ALB，ECS，Auroraに適切なSecurity Groupを作成します。
- このアプリケーションは、2つのAZで動作します。
- `TodoアプリケーションのJPAエンティティとデータベースマイグレーション設計`に従ってTodoアプリとデータベースを構築したいです。
- `TodoアプリケーションのJPAエンティティとデータベースマイグレーション設計`は`specs/005-ecs-aurora-jpa/specs-draft-JPA-DB.md`にあります。
- `TodoアプリケーションのJPAエンティティとデータベースマイグレーション設計`にはCognito等の記載がありますが、RESTful APIやCognito認証などの対応は、後ほど別要件で指示します。
