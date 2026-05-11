# Plan: 005-ecs-aurora-jpa

## 実装方針
- 本 feature は **複数領域**（`infra/` と `backend/`）で実施する。
- `infra/` は既存の VPC/ECR を前提に、ALB・ECS(Fargate)・Aurora Serverless v2・Secrets Manager・Security Group を追加し、実行基盤を整備する。
- `backend/` は JPA/Flyway/PostgreSQL の永続化基盤を追加し、`Todo` 永続化モデルを先行整備する。
- 認証(Cognito)・REST API は対象外として実装境界を維持し、将来拡張に備えた最小構成で完了させる。

## 変更対象
- `infra/lib/infra-stack.ts`
  - 既存 Construct の組み立てに加えて、ALB/ECS/DB/Secret 関連 Construct の呼び出しを追加する。
- `infra/lib/constructs/` 配下（新規追加想定）
  - ECS 実行基盤（Cluster / TaskDefinition / FargateService / LogGroup）を扱う Construct。
  - ALB と Target Group / Listener を扱う Construct。
  - Aurora Serverless v2(PostgreSQL) と DB Secret を扱う Construct。
  - SG の依存関係を組み立てる Construct（または上記 Construct 内で責務分離）。
- `infra/test/infra.test.ts`
  - ALB/ECS/RDS/Secret/SG の主要リソースと最小通信ルールを検証するアサーションを追加する。
- `backend/pom.xml`
  - JPA/Flyway/PostgreSQL 関連依存の追加。
- `backend/src/main/resources/application.properties`
  - DB 接続、JPA、Flyway の基本設定（環境変数参照前提）を追加。
- `backend/src/main/java/com/example/backend/...`（新規追加想定）
  - `model/Todo.java`
  - `repository/TodoRepository.java`
  - `repository/specification/TodoSpecifications.java`（条件合成を担保する場合）
- `backend/src/main/resources/db/migration/`（新規追加想定）
  - `V1__create_todos_table.sql`

## 変更しないもの
- `frontend/` の実装全体。
- Cognito User Pool の作成・JWT 検証・認可制御。
- Todo REST API（Controller / Service の業務ロジック）。
- Route53/ACM/WAF など公開系の本番強化。
- CI/CD パイプライン新規構築（CodePipeline / GitHub Actions 等）。

## 技術方針
- 既存パターンの再利用方針
  - `infra` は既存方針（`bin -> stack -> constructs`、環境切替、共通タグ）を維持する。
  - CDK は L2/L3 Construct を優先し、L1 は原則不採用とする。
  - `backend` は既存の Spring Boot 構成を維持し、永続化層のみを追加する。
- 新規クラス/コンポーネント方針
  - Stack の肥大化を避けるため、ALB/ECS/DB/Secret は責務単位で Construct 分割する。
  - `Todo` 永続化は Entity + Repository + Migration を分離し、後続 API から再利用可能な構成にする。
- 新規設定追加の要否
  - `SPRING_DATASOURCE_*`、`SPRING_JPA_*`、`SPRING_FLYWAY_*` の環境変数参照を追加する。
  - ECS タスク定義には Secret 注入を用い、平文設定を避ける。
- 新規依存追加の要否
  - `backend` のみ `spring-boot-starter-data-jpa`、`flyway-core`、`postgresql` を追加する。
  - `infra` は既存依存（`aws-cdk-lib`, `constructs`）内で完結することを優先し、追加依存は原則行わない。
- 既存インフラ/既存契約への変更方針
  - 既存 VPC と ECR `todo:latest` を参照し、新規 VPC と新しい配布フローは導入しない。
  - 既存の `-c env=<dev|stg|prod>` 運用を維持する。

## データや契約への影響
- DB スキーマ
  - `todos` テーブルを Flyway `V1` で追加する。
  - `owner_subject` 必須、`completed` デフォルト `false`、`updated_at` 自動更新トリガーを導入する。
  - `owner_subject` 先頭の複合インデックスを追加する。
- API 契約
  - 本 feature では API 契約の追加・変更なし。
- イベント契約
  - なし。
- 環境変数
  - ECS タスクに DB 接続情報を注入するための環境変数/Secret 参照を追加する。
- Secret / 設定値
  - DB 認証情報は Secrets Manager に集約し、ECS タスクロールへ最小参照権限を付与する。
- デプロイ/運用影響
  - `cdk synth/diff/deploy` 時に ALB/ECS/RDS 追加差分が発生する。
  - ECS 側ヘルスチェックと DB 接続失敗時の切り分けが運用上の主要確認ポイントとなる。

## リスク
- 破壊的変更の可能性
  - RDS/ECS の追加はリソース数・コスト増に直結するため、環境指定誤りの影響が大きい。
- 互換性への影響
  - `backend` 依存追加により起動要件が DB 前提へ変化する。ローカル起動方法に注意が必要。
- 運用影響
  - ヘルスチェックパスや DB 接続設定が不整合の場合、ECS タスクが安定稼働しない。
- セキュリティ影響
  - SG/IAM を広く設定すると不要な通信経路や過剰権限が残る。
- 監視影響
  - 本 feature では詳細監視（メトリクス/アラーム）は最小化するため、一次切り分けは CloudWatch Logs と ECS/RDS の標準メトリクスに依存する。

## 検証方針
- `backend/`
  - `./mvnw test`: 既存テスト回帰確認。
  - `./mvnw -DskipTests compile`: JPA/Flyway 追加後のコンパイル成立確認。
  - （必要時）`./mvnw spring-boot:run` + ローカル/検証DB で Flyway 実行成立確認。
- `infra/`
  - `npm run build`: TypeScript コンパイル確認。
  - `npm test -- --runInBand`: CDK テンプレートテスト確認。
  - `npx cdk synth -c env=prod`: 追加リソース・参照関係・SG ルールのテンプレート確認。
  - `npx cdk diff -c env=prod`: 既存との差分が意図どおりか確認。
- 確認観点
  - ALB -> ECS -> Aurora の最小通信のみが許可されていること。
  - ECS タスク定義が `todo:latest` を参照し、Secret 注入が定義されていること。
  - `todos` テーブル定義/インデックス/トリガーが仕様どおりであること。

## ドキュメント更新方針
- `infra/README.md`
  - ECS/Aurora 追加後の主要コマンド、前提権限、確認手順の更新要否を確認する。
- `docs/infra/`
  - 既存 `network-baseline.md` は参照関係のみ維持し、必要に応じて ECS/Aurora 実行基盤の説明を追加する。
- `README.md`（ルート）
  - 実装済み範囲の説明が変わる場合のみ最小更新する。
- `docs/adr/`
  - 未確定事項（HTTPS、Aurora ACU、AutoScaling 方針）を実装中に確定させる場合は ADR 追加を検討する。

## 実施順序
1. 事前整理
   - `specs.md` の受け入れ条件を `infra`/`backend` の実装タスクに分解し、対象外を固定する。
   - 未確定事項のうち実装に必須な判断（ヘルスチェックパス、Aurora ACU 初期値）を要確認として明示する。
2. `infra` 基盤実装
   - Aurora + Secret + SG を先に実装し、DB 接続情報の受け渡し境界を確定する。
   - ECS Cluster/Task/FargateService と ALB を実装し、ECR `todo:latest` と Secret 注入を接続する。
   - Stack は Construct の組み立てのみに留める。
3. `backend` 永続化実装
   - 依存追加、`Todo` Entity、Repository、Flyway `V1` を実装する。
   - DB 接続設定を Secret 注入前提で整備し、平文値を排除する。
4. テスト・検証
   - `backend` -> `infra` の順でローカル検証を実施する。
   - `cdk synth/diff` でリソース差分と接続経路を最終確認する。
5. ドキュメント反映
   - 変更内容に応じて `infra/README.md` と `docs/infra/` の更新要否を判断し、必要分のみ反映する。

## 未解決事項
- ALB を初期段階で HTTP のみにするか、HTTPS(ACM)まで含めるか。
- ECS desiredCount と Auto Scaling を全環境固定で開始するか、環境別差分を導入するか。
- Aurora Serverless v2 の最小/最大 ACU 初期値。
- ALB ヘルスチェックパスを `/actuator/health` に統一するか、専用ヘルスエンドポイントを設けるか。
- Cognito 未導入期間における `owner_subject` の取り扱い（検証用固定値の可否）。
