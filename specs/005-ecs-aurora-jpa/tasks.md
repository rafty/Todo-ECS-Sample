# Tasks: 005-ecs-aurora-jpa

## 前提確認
- [x] 1.1 ルート `AGENTS.md`、`infra/AGENTS.md`、`backend/AGENTS.md` を確認し、複数領域変更時の作業ルールを再確認する
- [x] 1.2 ルート `README.md`、`infra/README.md`、`specs/005-ecs-aurora-jpa/specs.md`、`specs/005-ecs-aurora-jpa/plan.md` を確認し、受け入れ条件と対象外をチェックリスト化する
- [x] 1.3 既存 `infra/lib/infra-stack.ts` と `infra/lib/constructs/` の責務境界を確認し、Construct 分割方針（ALB/ECS/DB/Secret/SG）を確定する
- [x] 1.4 既存 `backend` の最小構成（依存・パッケージ構成・設定）を確認し、追加対象（Entity/Repository/Flyway）を確定する
- [x] 1.5 未解決事項のうち実装に必須な判断項目（ALB ヘルスチェックパス、Aurora ACU 初期値、ECS desiredCount 初期値）を要確認として明示する
- [x] 1.6 検証前提（Docker デーモン、AWS 認証、`-c env=<dev|stg|prod>` 指定）を確認し、実行可否条件を記録する

## 実装タスク

### infra: セキュリティ境界と DB 基盤
- [x] 2.1 ALB/ECS/Aurora 用 Security Group を作成し、`ALB -> ECS -> Aurora` の最小通信のみ許可する
- [x] 2.2 Aurora 用 DB 認証情報を Secrets Manager で生成・管理する定義を追加する
- [x] 2.3 Aurora Serverless v2(PostgreSQL) を `datastore` サブネット配置で作成する
- [x] 2.4 Aurora の配置が 2AZ 前提を満たすよう、サブネット選択と関連設定を反映する
- [x] 2.5 ECS タスクロールへ Secrets Manager 読み取り権限を最小権限で付与する

### infra: ECS/ALB 実行基盤
- [x] 3.1 ECS Cluster を既存 VPC 上に追加する
- [x] 3.2 Fargate TaskDefinition を追加し、ECR `todo:latest` を参照するコンテナ定義を設定する
- [x] 3.3 コンテナ定義に CloudWatch Logs 出力設定を追加する
- [x] 3.4 DB 接続情報を Secret 注入でコンテナへ渡す設定を追加する（平文ハードコード禁止）
- [x] 3.5 Fargate Service を `application` サブネットに配置し、必要なネットワーク設定を適用する
- [x] 3.6 ALB を `front` サブネットに作成し、Listener/Target Group を追加する
- [x] 3.7 ALB ヘルスチェック設定（パス/成功コード/間隔）を明示し、ECS サービスと接続する
- [x] 3.8 既存共通タグ（`env` / `service` / `version`）運用を新規リソースにも適用する

### infra: Stack 組み込みとテスト更新
- [x] 4.1 `infra/lib/constructs/` に追加した Construct を `infra/lib/infra-stack.ts` へ組み込む
- [x] 4.2 Stack の責務を「構成の組み立て」に限定し、リソース詳細を Construct 側へ維持する
- [x] 4.3 必要に応じて `CfnOutput`（ALB DNS 名など運用確認に必要な情報）を追加する
- [x] 4.4 `infra/test/infra.test.ts` に ALB/ECS/RDS/Secret/SG の主要アサーションを追加する
- [x] 4.5 `infra/test/infra.test.ts` に最小通信ルール（ALB->ECS->Aurora）を担保する検証観点を追加する

### backend: 永続化層追加
- [x] 5.1 `backend/pom.xml` に `spring-boot-starter-data-jpa`、`flyway-core`、`postgresql` を追加する
- [x] 5.2 `backend/src/main/resources/application.properties` に DB 接続/JPA/Flyway の環境変数参照設定を追加する
- [x] 5.3 `backend/src/main/java/com/example/backend/model/Todo.java` を追加し、`todos` テーブルとのマッピングを実装する
- [x] 5.4 `Todo` エンティティに `owner_subject` 必須、`completed` 初期値、監査項目（`created_at`/`updated_at`）を反映する
- [x] 5.5 `backend/src/main/java/com/example/backend/repository/TodoRepository.java` を追加し、所有者条件を前提とした取得メソッドを定義する
- [x] 5.6 必要に応じて `repository/specification/TodoSpecifications.java` を追加し、`owner_subject` 条件を常に合成可能にする
- [x] 5.7 `backend/src/main/resources/db/migration/V1__create_todos_table.sql` を追加し、`todos` テーブル DDL を定義する
- [x] 5.8 `V1` に `owner_subject` 先頭インデックスと `updated_at` 自動更新トリガーを実装する
- [x] 5.9 `users` テーブルを追加しないこと、Cognito/REST API 実装を含めないことを差分で確認する

## テスト / 検証タスク

### backend 検証
- [x] 6.1 `backend/` で `./mvnw test` を実行し、既存テスト回帰がないことを確認する
- [x] 6.2 `backend/` で `./mvnw -DskipTests compile` を実行し、依存追加後のコンパイル成立を確認する
- [x] 6.3 （検証環境がある場合）Flyway 実行で `todos` テーブル、インデックス、トリガーが適用されることを確認する

### infra 検証
- [x] 7.1 `infra/` で `npm run build` を実行し、TypeScript コンパイル成立を確認する
- [x] 7.2 `infra/` で `npm test -- --runInBand` を実行し、CDK テスト回帰がないことを確認する
- [x] 7.3 `infra/` で `npx cdk synth -c env=prod` を実行し、ALB/ECS/Aurora/Secret/SG が出力されることを確認する
- [x] 7.4 `infra/` で `npx cdk diff -c env=prod` を実行し、差分が意図したリソース追加に限定されることを確認する
- [x] 7.5 テンプレート出力から、ECS タスク定義の `todo:latest` 参照と Secret 注入設定を確認する
- [x] 7.6 テンプレート出力から、Aurora 非公開配置と最小 SG ルールを確認する
- [x] 7.7 未実施検証がある場合は、未確認範囲と理由（認証不足、Docker 未起動等）を記録する

## ドキュメント更新タスク
- [x] 8.1 `infra/README.md` の更新要否を確認し、必要な場合は ECS/Aurora 追加後の実行・確認手順を追記する
- [x] 8.2 `docs/infra/` の更新要否を確認し、必要な場合は実行基盤構成（ALB/ECS/Aurora/Secret）を追記する
- [x] 8.3 ルート `README.md` の更新要否を確認し、必要な場合は実装済み範囲を最小差分で反映する
- [x] 8.4 `docs/adr/` 追加要否を確認し、未解決事項を実装中に確定した場合のみ ADR を追加・更新する

## 完了確認
- [x] 9.1 `specs/005-ecs-aurora-jpa/specs.md` の受け入れ条件をすべて満たしていることを確認する
- [x] 9.2 変更範囲が `infra/` と `backend/` に限定され、`frontend/` へ不要変更がないことを確認する
- [x] 9.3 対象外（Cognito、REST API、Route53/ACM/WAF、CI/CD）が差分に含まれていないことを確認する
- [x] 9.4 シークレット実値、認証情報、state ファイル、不要生成物が差分に含まれていないことを確認する
- [x] 9.5 実行コマンド、確認結果、未実施理由を作業ログとして整理する

## 並列化の目安
- [x] 10.1 `2.x infra(DB/SG)` と `5.x backend` は直接依存が薄いため並列実施可能（`3.x` で統合）
- [x] 10.2 `4.x infraテスト更新` は `2.x` `3.x` の実装完了後に着手する
- [x] 10.3 `8.x ドキュメント更新` は `6.x` `7.x` の検証結果確定後に実施する

## 検証結果メモ
- `backend/`
  - `JAVA_HOME=$(/usr/libexec/java_home -v 21) ./mvnw test`: 成功
  - `JAVA_HOME=$(/usr/libexec/java_home -v 21) ./mvnw -DskipTests compile`: 成功
  - Flywayの実DB適用確認は未実施（ローカルに接続先Auroraが未デプロイのため）
- `infra/`
  - `npm run build`: 成功
  - `npm test -- --runInBand`: 成功（`test/infra.test.ts`）
  - `npx cdk synth -c env=prod`: 失敗（`111111111111` の CDK lookup role AssumeRole 権限不足）
  - `npx cdk diff -c env=prod`: 失敗（同上）
- AWS認証確認
  - `aws sts get-caller-identity`: 成功（実行主体は `338456725408`）
