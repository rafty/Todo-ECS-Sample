# Plan: 009-frontend-js-to-ts

## 実装方針
- 本 feature は **複数領域**（`frontend/` と `docs/`）で実施する。`infra/` は参照のみで変更しない。
- 目的は UI 機能追加ではなく、既存挙動（Cognito 認証、`/api/todos` 連携、`runtime-config.json` 読み込み）を維持したまま TypeScript 化すること。
- 変更は「基盤整備 -> 下位モジュール移行 -> 画面層移行 -> 設定ファイル移行 -> 検証/文書更新」の順で段階的に進め、影響範囲を局所化する。
- AWS 運用観点では、`frontend/dist` 成果物契約と CloudFront/S3/Cognito 連携契約を壊さないことを最優先とする。
- TypeScript 厳格度は最終的に `strict: true` を目標とし、移行初期に限って限定的な緩和を許容する。

## 変更対象
- `frontend/src/`（JS/JSX -> TS/TSX）
  - `main.jsx` / `App.jsx`
  - `api/todo-api-client.js`
  - `auth/oauth-client.js`
  - `auth/pkce.js`
  - `auth/token-store.js`
  - `config/runtime-config.js`
- `frontend/` 設定・依存
  - `package.json`（`typecheck` script 追加、必要依存追加）
  - `package-lock.json`（依存変更に伴う更新）
  - `tsconfig` 系ファイル（新規追加）
  - `vite.config.js` -> `vite.config.ts`
  - `eslint.config.js` -> `eslint.config.ts`
- 必要に応じた型定義ファイル
  - 例: `frontend/src/types/*.ts`（RuntimeConfig、Todo API 契約、認証トークン契約など）
- ドキュメント
  - `frontend/README.md`（コマンド/開発手順更新）
  - `docs/frontend/README.md`（検証手順や移行後の開発前提更新）

## 変更しないもの
- `backend/` の API 契約・認証仕様・DB スキーマ。
- `infra/` の CDK 実装、CloudFront/ALB/S3/Cognito/Aurora の構成。
- `runtime-config.json` のキー契約と意味。
- UI の情報設計や画面仕様（見た目刷新・機能追加）は実施しない。
- 新規の自動テスト基盤・新規自動テストケース導入は実施しない。

## 技術方針
- 既存パターンの再利用方針
  - 関数コンポーネント + Hooks、`fetch` ベース API クライアント、認証状態管理（メモリ中心 + optional `sessionStorage`）の既存構造を維持する。
  - 既存のエラークラス（`UnauthorizedApiError` / `TodoApiError`）と Problem Details ハンドリングを維持する。
- 新規クラスや新規コンポーネントの要否
  - UI コンポーネント追加は不要。必要最小限の型定義追加のみ行う。
- 新規設定追加の要否
  - TypeScript コンパイル設定を追加し、`lint` と `build` とは独立した `typecheck` を実行可能にする。
  - 設定ファイルを TypeScript 化したうえで、既存 script で読み込めることを確認する。
- 新規依存追加の要否
  - `typescript` は必須追加。
  - Node 側設定ファイルの型解決に必要なら `@types/node` を追加。
  - ESLint で TS/TSX を解析するため、必要最小限の TypeScript 対応依存（parser/plugin）を追加する。
- 既存インフラや既存契約との関係
  - `infra` は **参照のみで変更しない**。
  - `frontend/dist` 出力先・`runtime-config.json` キー・`/api` パス契約を固定し、CloudFront の配備前提を維持する。

## データや契約への影響
- DB スキーマ: 変更なし。
- API 契約: 変更なし（`/api/todos` のリクエスト/レスポンス形式維持）。
- イベント契約: なし。
- 環境変数: 追加なし。
- Secret / 設定値: 追加なし（Cognito/Token/Runtime 設定の意味は現状維持）。
- デプロイや運用への影響:
  - `frontend/dist` を生成する運用フローは維持。
  - `infra/lib/infra-stack.ts` の `frontend/dist` 存在チェック前提を維持。
  - CloudFront で配信する SPA ルーティング（`/` と `/auth/callback`）の整合性を維持。

## リスク
- 型厳格化により既存コードで大量の型エラーが発生し、移行工数が増えるリスク。
  - 対策: 共通型を先に定義し、下位モジュールから段階移行する。
- `eslint.config.ts` / `vite.config.ts` 化時にツール読み込み互換が崩れるリスク。
  - 対策: 設定ファイル移行は後段に実施し、`lint` / `build` の即時検証を行う。
- 認証フロー（PKCE, state, token refresh）の暗黙型変換が変わるリスク。
  - 対策: 認証モジュールは処理順序を固定し、型付けは非機能変更に限定する。
- `any` 多用によって TypeScript 化の価値が低下するリスク。
  - 対策: `any` は局所利用に限定し、理由をコメントまたはレビュー記録に明示する。
- AWS 運用リスク（成果物/設定契約の破壊）。
  - 対策: `build` 後の `dist` 出力確認と `runtime-config` 契約維持チェックを受け入れ条件に含める。

## 検証方針
- 必須検証（`frontend/` 配下）
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
- 既存自動テストの扱い
  - `package.json` に test script が存在する場合は追加実行する。
  - 現状 `frontend/package.json` に test script は未定義のため、新規テスト導入は行わない。
- 回帰確認（最小限）
  - `runtime-config` 未設定時の起動可否（初期化エラーと未認証導線が破綻しないこと）。
  - `/auth/callback` ルート遷移が成立すること（ルーティング破綻がないこと）。
  - Todo 一覧/作成/更新/削除の API クライアント呼び出しコードが型整合していること。
- AWS 配備前提の整合確認
  - `npm run build` 後に `frontend/dist` が生成されること。
  - `runtime-config.json` のキー名が仕様どおりであること。
  - `apiBasePath='/api'` と認証ヘッダー付与の実装契約が維持されること。

## ドキュメント更新方針
- `frontend/README.md`
  - TypeScript 移行後の主要コマンド（`typecheck` 追加）と開発前提を更新する。
- `docs/frontend/README.md`
  - 開発時確認手順に TypeScript 前提（lint/typecheck/build）を反映する。
- `docs/README.md`
  - 新規文書を追加しないため、原則更新不要。
- `docs/adr/`
  - 既存技術選定（Vite/React/Cognito）から逸脱しないため、原則更新不要。
  - ただし strict 段階移行ルールを組織的に固定する必要が出た場合のみ追加検討する。

## 実施順序
1. 事前整理
   - `specs.md` の受け入れ条件を検証項目へ分解し、必須成果（TS化対象、必須コマンド、ドキュメント更新対象）を固定する。
2. TypeScript 基盤整備
   - `tsconfig` 系ファイルを追加し、`package.json` に `typecheck` script を追加する。
   - 必要最小限の TypeScript 関連依存を追加する。
3. ドメイン型定義の導入
   - RuntimeConfig、Todo API 入出力、Problem Details、認証トークン応答の型を定義する。
4. 下位モジュール移行
   - `config/` -> `auth/` -> `api/` の順で `.js` を `.ts` へ移行し、外部境界（fetch/storage/url/jwt）に型を付与する。
5. 画面層移行
   - `App.jsx` と `main.jsx` を `.tsx` へ移行し、state/event handler/router props の型を明示する。
6. 設定ファイル移行
   - `vite.config.ts`、`eslint.config.ts` へ変換し、TS/TSX 対応 lint 設定を有効化する。
7. 検証実行
   - `lint` / `typecheck` / `build` を実行し、必要に応じて型設定を段階調整する。
8. ドキュメント更新と最終確認
   - `frontend/README.md` と `docs/frontend/README.md` の更新要否を反映し、受け入れ条件の満足を確認する。

## 未解決事項
- `eslint.config.ts` の実行方式を、現行 ESLint バージョンで追加ローダーなしに運用できるかの最終確認。
- `strict: true` へ到達するまでに一時緩和が必要となった場合、どの compiler option をどの順で再厳格化するかの具体的基準。
