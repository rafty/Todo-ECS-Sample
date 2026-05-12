# backend 開発手順

## 前提

- Java 21
- Maven Wrapper（`backend/mvnw`）
- （ローカル起動時）PostgreSQL 互換 DB

## 作業ディレクトリ

```bash
cd backend
```

## 基本コマンド

```bash
./mvnw test
./mvnw -DskipTests compile
./mvnw spring-boot:run
```

## 動作確認

アプリ起動後、ヘルスチェックを確認します。

```bash
curl -i http://localhost:8080/actuator/health
```

補足:
- `/actuator/health` は認証不要です。
- `/api/todos` は JWT 認証必須です（Authorization ヘッダー未指定時は `401`）。

## 環境変数

- DB 接続:
  - `SPRING_DATASOURCE_URL`
  - `SPRING_DATASOURCE_HOST`
  - `SPRING_DATASOURCE_PORT`
  - `SPRING_DATASOURCE_DBNAME`
  - `SPRING_DATASOURCE_USERNAME`
  - `SPRING_DATASOURCE_PASSWORD`
- JWT issuer:
  - `SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI`

## テスト環境と実行環境の差分

- テスト（`src/test/resources/application.properties`）
  - H2（PostgreSQL 互換モード）を使用
  - Flyway は無効（`spring.flyway.enabled=false`）
  - `ddl-auto=create-drop`
- 実行環境（`src/main/resources/application.properties`）
  - PostgreSQL を使用
  - Flyway は有効
  - `ddl-auto=validate`

## AWS 実行時の注意

- ECS 実行時は Secrets Manager から `SPRING_DATASOURCE_*` が注入されます。
- 公開経路は `CloudFront -> ALB -> ECS` です。
- 認証は Cognito issuer を前提に JWT 検証します。

関連:
- [backend 入口 README](../../backend/README.md)
- [infra 実行基盤ドキュメント](../infra/ecs-aurora-runtime-baseline.md)
