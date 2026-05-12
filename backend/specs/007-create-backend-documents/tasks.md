# Tasks: 007-create-backend-documents

## 前提確認
- [x] 1.1 ルート `AGENTS.md`、`backend/AGENTS.md`、`docs/AGENTS.md` を確認し、文書作成時の配置・記述ルールを再確認する
- [x] 1.2 ルート `README.md`、`backend/specs/007-create-backend-documents/specs.md`、`backend/specs/007-create-backend-documents/plan.md` を確認し、受け入れ条件と対象外をチェックリスト化する
- [x] 1.3 既存実装の根拠ファイル（`application.properties`、`SecurityConfig.java`、`TodoController.java`、`V1__create_todos_table.sql`）を確認し、文書化対象の事実を抽出する
- [x] 1.4 変更対象が `backend/` と `docs/` の文書のみであることを確認し、`backend/src/`・`infra/`・`frontend/` 非変更方針を固定する
- [x] 1.5 `docs/backend/` は API・設計/セキュリティ・データモデルの分割文書で作成し、ER 図は `todos` 単体に限定する方針を実装前に明文化する

## 実装タスク

### docs 全体導線の整備
- [x] 2.1 `docs/README.md` を新規作成し、`docs/backend/`・`docs/infra/`・`docs/adr/`・`docs/development/` への入口を定義する
- [x] 2.2 `backend/README.md` を新規作成し、backend 概要、前提、主要コマンド、環境変数、関連文書リンクを記載する
- [x] 2.3 必要な場合のみルート `README.md` を最小更新し、backend 文書群への導線を補強する

### docs/backend 分割文書の作成
- [x] 3.1 `docs/backend/README.md` を新規作成し、分割した backend 文書（API / 設計・セキュリティ / データモデル）へのナビゲーションを定義する
- [x] 3.2 API 仕様文書を新規作成し、`/api/todos` CRUD、`page/size/sort/completed/q`、レスポンス形式、Problem Details エラー契約を記載する
- [x] 3.3 設計/セキュリティ仕様文書を新規作成し、Controller -> Service -> Repository 境界、JWT issuer 検証、`token_use=access`、`owner_subject` 方針を記載する
- [x] 3.4 データモデル仕様文書を新規作成し、`todos` テーブルのカラム・制約・インデックス・`updated_at` トリガーを記載する
- [x] 3.5 データモデル仕様文書に Mermaid ER 図を追加し、対象範囲を `todos` 単体に限定する

### docs/development の整備
- [x] 4.1 `docs/development/` 配下に backend 開発手順文書を新規作成または追記し、ローカル起動・検証手順を記載する
- [x] 4.2 backend 開発手順文書に `./mvnw test` を含む検証コマンドと、H2（テスト）/PostgreSQL・Aurora（実行環境）の差分注意を記載する

### ADR 判定と反映
- [x] 5.1 認証境界・所有者境界・運用前提について、`docs/adr/` 更新が必要な新規判断があるかを判定する
- [x] 5.2 ADR 更新が必要な場合のみ `docs/adr/` を追加または更新し、不要な場合は「更新不要理由」を作業記録へ残す

## テスト / 検証タスク
- [x] 6.1 文書内容と実装の突合を実施し、パス・環境変数・認証条件・DB仕様の整合を確認する
- [x] 6.2 README 導線検証を実施し、`docs/README.md`・`backend/README.md`・必要な README から各文書へ辿れることを確認する
- [x] 6.3 Mermaid 構文検証を実施し、構文破綻がないこと、ER 図が `todos` 単体のみを対象としていることを確認する
- [x] 6.4 必要に応じて `backend/` で `./mvnw test` を実行し、文書に記載した検証コマンドの実行可能性を確認する
- [x] 6.5 未実施検証がある場合は、未確認範囲と理由を作業記録へ明記する

## ドキュメント更新タスク
- [x] 7.1 `backend/README.md`、`docs/README.md`、`docs/backend/`、`docs/development/` の更新内容が重複せず役割分担されていることを確認する
- [x] 7.2 文書内の相互リンク（相対パス）を確認し、リンク切れを修正する
- [x] 7.3 `docs/infra/` の既存文書と矛盾しないことを確認し、必要な参照リンクのみ追加する
- [x] 7.4 ADR 更新を行った場合、`docs/README.md` から該当 ADR へ辿れることを確認する

## 完了確認
- [x] 8.1 `backend/specs/007-create-backend-documents/specs.md` の受け入れ条件を満たしていることを確認する
- [x] 8.2 変更が文書領域に限定され、`backend/src/`・`infra/`・`frontend/` に不要差分がないことを確認する
- [x] 8.3 シークレット実値、認証情報、state ファイル、不要生成物が差分に含まれていないことを確認する
- [x] 8.4 `tasks.md` のチェック状態と実施結果を同期し、未完了タスクを明確化する

## 作業ログ
- ADR 判定:
  - 今回は既存実装の文書化が目的であり、新規の設計判断追加はないため `docs/adr/` 更新は見送り。
- リンク検証:
  - 主要ドキュメントの Markdown 相互リンクを確認し、リンク切れがないことを確認。
- 実行検証:
  - `backend/` で `./mvnw test` を実行したが、実行環境の Java が release 21 をサポートせず失敗。
  - エラー: `リリース・バージョン21はサポートされていません`
  - そのためテスト実行の最終確認は未完了（Java 21 環境で再実行が必要）。
