# Tasks: 009-frontend-js-to-ts

## 前提確認
- [x] 1.1 ルート `AGENTS.md`、`frontend/AGENTS.md`、`docs/AGENTS.md` を確認し、変更範囲と文書更新ルールを再確認する
- [x] 1.2 `frontend/specs/009-frontend-js-to-ts/specs.md` を確認し、受け入れ条件（`lint + typecheck + build`、設定ファイル TS 化、AWS 互換要件）をチェックリスト化する
- [x] 1.3 `frontend/specs/009-frontend-js-to-ts/plan.md` を確認し、変更対象（`frontend/` と `docs/`）と非対象（`backend/`・`infra/`）を固定する
- [x] 1.4 `frontend/package.json` の現行 scripts/依存を確認し、`typecheck` 追加と TypeScript 依存追加の差分方針を確定する
- [x] 1.5 `infra/lib/infra-stack.ts` と `docs/infra/ecs-aurora-runtime-baseline.md` を参照し、`frontend/dist`・`runtime-config.json`・`/api`・`/auth/callback` の運用契約を実装前に再確認する

## 実装タスク

### frontend / TypeScript 基盤整備
- [x] 2.1 `frontend/package.json` に `typecheck` script を追加し、既存 `lint` / `build` / `dev` スクリプトは互換維持する
- [x] 2.2 `typescript` を追加し、必要最小限の TypeScript 関連依存（例: `@types/node`、ESLint の TS 対応依存）を導入する
- [x] 2.3 `frontend/` に `tsconfig` 系ファイルを新規作成し、`src` と設定ファイルの TypeScript コンパイル対象を定義する
- [x] 2.4 TypeScript 厳格度を「最終的に `strict: true`」へ収束させる方針で設定し、移行初期の緩和が必要な場合は緩和範囲を最小化する

### frontend / 型定義の導入
- [x] 3.1 `runtime-config` 用の型（キー契約・正規化後構造）を定義する
- [x] 3.2 Todo API 用の型（一覧レスポンス、入力 payload、Problem Details、エラー構造）を定義する
- [x] 3.3 認証用の型（token response、PKCE トランザクション、token store 状態）を定義する
- [x] 3.4 型定義の配置を整理し、既存モジュールから再利用可能な構成にする

### frontend / 実装ファイル移行（src）
- [x] 4.1 `src/config/runtime-config.js` を `.ts` 化し、`runtime-config.json` キー契約を維持した型付けを行う
- [x] 4.2 `src/auth/pkce.js` を `.ts` 化し、PKCE 生成・state 検証・有効期限判定の処理順序を維持する
- [x] 4.3 `src/auth/token-store.js` を `.ts` 化し、メモリ保持/`sessionStorage` 保持の既存方針を維持する
- [x] 4.4 `src/auth/oauth-client.js` を `.ts` 化し、Hosted UI login/callback/logout と refresh 処理の契約を維持する
- [x] 4.5 `src/api/todo-api-client.js` を `.ts` 化し、Authorization 付与・401 処理・Problem Details 解析を維持する
- [x] 4.6 `src/main.jsx` を `.tsx` 化し、`BrowserRouter` 起動構成を維持する
- [x] 4.7 `src/App.jsx` を `.tsx` 化し、認証状態遷移・Todo CRUD・ルーティング挙動（`/auth/callback`）を維持する
- [x] 4.8 `src/` 配下の import/export を拡張子変更に合わせて整理し、解決不能 import を解消する
- [x] 4.9 `frontend/src/` 配下に `.js` / `.jsx` 実装ファイルが残らないことを確認する（アセット除く）

### frontend / 設定ファイルの TypeScript 化
- [x] 5.1 `vite.config.js` を `vite.config.ts` へ移行し、既存ビルド挙動を維持する
- [x] 5.2 `eslint.config.js` を `eslint.config.ts` へ移行し、TS/TSX 解析対象を有効化する
- [x] 5.3 ESLint の対象拡張子・ignore 設定を見直し、`dist` 除外と `src`/設定ファイル検査を両立する

### frontend / 型不足時の対応
- [x] 6.1 ライブラリ型不足がある場合、公式型定義または `@types/*` での解決を優先する
- [x] 6.2 公式型で解決できない場合、影響範囲を限定した型定義ファイル追加で補完する
- [x] 6.3 やむを得ず局所的型アサーションや `any` を使う場合、理由をコードコメントまたはレビュー記録へ明示する

## テスト / 検証タスク
- [x] 7.1 `frontend/` で `npm run lint` を実行し、静的解析エラーがないことを確認する
- [x] 7.2 `frontend/` で `npm run typecheck` を実行し、型エラーがないことを確認する
- [x] 7.3 `frontend/` で `npm run build` を実行し、ビルド成功と `frontend/dist` 生成を確認する
- [x] 7.4 `frontend/package.json` に test script が存在する場合のみ追加実行し、存在しない場合は「新規導入はスコープ外」として記録する
- [x] 7.5 `runtime-config` 契約（キー名、`apiBasePath='/api'`、`callbackPath='/auth/callback'`）が維持されていることをコード上で確認する
- [x] 7.6 認証・API 契約の回帰確認として、未認証時導線、401 時セッション破棄、Todo API 呼び出しの主要フローが型整合していることを確認する
- [x] 7.7 未実施の検証がある場合は、未確認範囲と理由を作業記録へ明記する

## ドキュメント更新タスク
- [x] 8.1 `frontend/README.md` を更新し、TypeScript 移行後の主要コマンド（`typecheck` 含む）と運用前提を反映する
- [x] 8.2 `docs/frontend/README.md` を更新し、開発時確認手順に `lint` / `typecheck` / `build` を反映する
- [x] 8.3 `docs/README.md` の更新要否を判定し、新規導線が不要な場合は更新しない判断理由を記録する
- [x] 8.4 `docs/adr/` の更新要否を判定し、既存判断の範囲内であれば更新不要理由を記録する
- [x] 8.5 変更した README/docs の相互リンク整合（リンク切れ・参照先不一致）を確認する

## 完了確認
- [x] 9.1 `specs.md` の受け入れ条件を満たしていることを確認する（設定ファイル TS 化、必須検証成功、AWS 契約維持）
- [x] 9.2 変更が `frontend/` と必要最小限の `docs/` に限定され、`backend/`・`infra/` に不要差分がないことを確認する
- [x] 9.3 `runtime-config.json` キー契約、`frontend/dist` 契約、CloudFront 経路前提を壊していないことを確認する
- [x] 9.4 シークレット実値、認証情報、不要生成物、無関係な大規模整形差分が含まれていないことを確認する
- [x] 9.5 `tasks.md` のチェック状態と実施結果を同期し、未完了タスクを明確化する

## 作業ログ
- 検証実行:
  - `frontend/` で `npm run lint` / `npm run typecheck` / `npm run build` を実行し、すべて成功。
  - `npm run dev -- --host 127.0.0.1 --port 4173` でローカル起動確認。
- 未実施検証:
  - 有効な Cognito 設定値を使った実ログイン / 実 401 応答の疎通確認は、ローカルに対象環境 `runtime-config.json` がないため未実施。
- テストスクリプト判定:
  - `frontend/package.json` に `test` script は未定義のため、追加自動テスト実装はスコープ外として未実施。
- `runtime-config` / AWS 契約確認:
  - `callbackPath='/auth/callback'`、`apiBasePath='/api'`、`persistRefreshToken` が frontend 実装と `infra/lib/infra-stack.ts` で整合していることを確認。
- ドキュメント更新判定:
  - `docs/README.md` は新規文書追加なしのため更新不要。
  - `docs/adr/` は新規の設計意思決定がないため更新不要。
