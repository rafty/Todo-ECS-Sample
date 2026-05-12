# Plan: 007-create-backend-documents

## 実装方針
- 本 feature は **複数領域**（`backend/` と `docs/`）で実施する。
- 目的は機能追加ではなく、既存バックエンド実装の仕様・運用前提を文書化することに限定する。
- AWS 観点では、`CloudFront -> ALB -> ECS -> Aurora` の実行経路と、Cognito JWT 検証・Secrets 注入の接続点を backend 文書側で追跡可能にする。
- `docs/README.md` を新設し、`docs/` 全体の入口を明示する。
- `docs/backend/` は単一文書に集約せず、API・設計/セキュリティ・データモデルの分割構成で作成する。
- ER 図は現行実装に合わせて `todos` 単体を対象に記載する。
- ADR は新規判断または重要判断の明文化が必要な場合に更新する。
- 既存コードを根拠に記述し、推測が必要な内容は「要確認」に明示して断定を避ける。

## 変更対象
- `backend/README.md`（新規作成）
  - backend の責務、前提、主要コマンド、環境変数、関連文書リンクを記載する。
- `docs/README.md`（新規作成）
  - `docs/` 配下の文書カテゴリと参照順序を示す入口文書を作成する。
- `docs/backend/`（新規作成）
  - API 仕様文書（`/api/todos`、ページング/ソート/エラー契約）
  - 設計/セキュリティ仕様文書（Controller/Service/Repository、JWT 検証、`owner_subject` 境界）
  - データモデル仕様文書（`todos` テーブル、制約、インデックス、トリガー、ER 図）
- `docs/development/`（新規作成または既存更新）
  - backend のローカル実行/検証手順、H2 と PostgreSQL/Aurora 差分の注意点を記載する。
- `docs/adr/`（条件付き）
  - 重要な設計判断の新規定義または明文化が必要な場合のみ追加/更新する。
- 文書導線を持つ README（ルート `README.md` または `backend/README.md`）
  - 追加文書に辿れるリンクを整備する。

## 変更しないもの
- `backend/src/` のアプリケーションコード（Controller/Service/Repository/Security/Entity/SQL）は変更しない。
- `infra/` の CDK 実装は変更しない（参照のみ）。
- `frontend/` の実装は変更しない。
- DB スキーマ、API 挙動、環境変数定義値そのものは変更しない。

## 技術方針
- 既存パターンの再利用方針
  - 入口情報は README、詳細は `docs/`、意思決定理由は `docs/adr/` に置く既存ルールを維持する。
  - `docs/infra/` と `specs/005,006` の記述粒度に合わせ、バックエンド文書を同程度の粒度で整える。
  - `docs/backend/` は責務別（API / 設計・セキュリティ / データモデル）に分割し、変更影響を局所化する。
- 新規クラス/新規コンポーネントの要否
  - コード追加は不要。文書ファイルのみ新規作成/更新する。
- 新規設定追加の要否
  - 追加しない。既存設定（`SPRING_DATASOURCE_*`、`SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI` など）を説明対象として参照する。
- 新規依存追加の要否
  - 追加しない。
- 既存インフラや既存契約との関係
  - `infra` は **参照のみで変更しない**。
  - backend 文書では infra 側の公開経路・認証前提を参照し、運用接点を明示する。

## データや契約への影響
- DB スキーマ: 変更なし（`todos` テーブルの既存仕様を文書化）。
- API 契約: 変更なし（既存 `/api/todos` 契約を明文化）。
- イベント契約: なし。
- 環境変数: 追加なし（既存値の用途説明のみ）。
- Secret / 設定値: 追加なし（Secrets Manager 注入前提の説明のみ）。
- デプロイ/運用への影響:
  - 実行系への直接影響はない。
  - ただし運用手順・確認手順の標準化により、障害時の一次切り分け速度向上を狙う。

## リスク
- 破壊的変更の可能性
  - コード変更なしのため低いが、文書誤記が運用誤判断を誘発するリスクがある。
- 互換性への影響
  - API/設定の説明を誤ると、利用側認識と実装の乖離が生じる。
- 運用影響
  - AWS 前提（CloudFront 経由公開、ALB health check、Cognito issuer）の記述漏れがあると運用手順が不完全になる。
- セキュリティ影響
  - 認証/Secret 取り扱いを不正確に記載すると、誤運用につながる可能性がある。
- 監視影響
  - 監視経路（`/actuator/health`、認証失敗時のエラー種別）の記述不足で、アラート解釈が揺れる可能性がある。

## 検証方針
- 文書整合性検証（必須）
  - `backend/src/main/resources/application.properties`
  - `backend/src/main/java/com/example/backend/security/SecurityConfig.java`
  - `backend/src/main/java/com/example/backend/controllers/TodoController.java`
  - `backend/src/main/resources/db/migration/V1__create_todos_table.sql`
  - 上記との突合で、パス/環境変数/契約記述が一致することを確認する。
- 文書構造検証（必須）
  - `docs/README.md`、`backend/README.md`、必要な README から `docs/backend/`・`docs/development/` へ辿れることを確認する。
  - Mermaid 構文（ER 図含む）が破綻していないことを確認する。
  - ER 図が `todos` 単体の範囲で記載されていることを確認する。
- 実行確認（任意）
  - 文書で示したコマンドが実行可能かを確認するため、必要に応じて `backend` で `./mvnw test` を実行する。
  - 実行しない場合は未実施理由を明示する。

## ドキュメント更新方針
- `docs/README.md`
  - 必ず新規作成し、docs 全体の入口として各カテゴリ（backend/infra/adr/development）への導線を持たせる。
- `backend/README.md`
  - 必ず新規作成し、backend 文書の入口にする。
- `docs/backend/`
  - 必ず新規作成し、API・設計/セキュリティ・データモデル（ER 図含む）を**分割文書**で整理する。
  - ER 図は `todos` 単体を対象に記載する。
- `docs/development/`
  - backend 開発向け手順を新規作成または追記する。
- `README.md`（ルート）
  - backend 文書導線が不足する場合のみ最小限追記する。
- `docs/adr/`
  - 既存判断の追認だけで足りる場合は更新不要。
  - 新たな判断を仕様として固定する場合のみ追加/更新する。

## 実施順序
1. 事前分析
   - `specs.md` の受け入れ条件を文書単位に分解し、必須成果物（ER 図含む）を固定する。
   - backend 実装・infra 文書から、記載すべき事実（API 契約、認証前提、DB 仕様）を抽出する。
2. 入口文書の整備
   - `docs/README.md` を作成し、docs 全体の文書導線を定義する。
   - `backend/README.md` を作成し、開発者向け最短導線（起動/検証/設定/詳細リンク）を定義する。
3. 詳細文書の整備
   - `docs/backend/` に API 仕様、設計/セキュリティ仕様、データモデル仕様を分割して作成する。
   - データモデル仕様に `todos` 単体の Todo ER 図（Mermaid）を追加する。
4. 開発手順文書の整備
   - `docs/development/` に backend の検証手順と環境差分の注意点を記載する。
5. 仕上げと整合確認
   - README 導線、Mermaid 表示、実装との整合を最終確認する。
   - ADR 要否を判定し、必要時のみ `docs/adr/` を更新する。
