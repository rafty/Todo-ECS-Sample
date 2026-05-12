# Tasks: 011-cognito-password-policy

## 前提確認
- [x] 1.1 ルート `AGENTS.md` と `infra/AGENTS.md` を確認し、変更範囲と検証方針を再確認する
- [x] 1.2 `infra/README.md` と `docs/README.md` を確認し、更新導線ルール（`docs/` 追加時のREADME反映）を確認する
- [x] 1.3 `infra/specs/011-cognito-password-policy/specs.md` の受け入れ条件をチェックリスト化する
- [x] 1.4 `infra/specs/011-cognito-password-policy/plan.md` の変更対象/非対象を確認し、`infra/` + `docs/` 以外へ波及しないことを明確化する
- [x] 1.5 現行 `infra/lib/constructs/todo-cognito-construct.ts` と `infra/test/infra.test.ts` の Cognito 設定を確認し、仕様との差分有無を確定する

## 実装タスク

### 2. `docs/infra/` 手順書作成
- [x] 2.1 大量ユーザー作成・削除手順の章立てを確定する（前提権限、対象環境、作成、再実行、削除、注意事項）
- [x] 2.2 対象環境を `prod` に固定した手順を記載する
- [x] 2.3 テスト用ドメイン（非実在）を使うユーザー命名規則を記載する（例: `loadtest-0001@test.local`）
- [x] 2.4 `AdminCreateUser` + `MessageAction=SUPPRESS` の作成手順を記載する
- [x] 2.5 `AdminSetUserPassword --permanent` による恒久パスワード化手順を記載する
- [x] 2.6 固定パスワード運用（全ユーザー共通、追加保管方式なし）を記載する
- [x] 2.7 削除手順（`AdminDeleteUser`）と後片付け手順を記載する
- [x] 2.8 API制限対策として 1秒あたり約100件上限・再試行方針を記載する
- [x] 2.9 失敗時の再実行方法（途中再開・既存ユーザー衝突時の扱い）を記載する

### 3. `docs/` 導線更新
- [x] 3.1 `docs/README.md` の infra セクションに新規手順書へのリンクを追加する
- [x] 3.2 必要に応じて `infra/README.md` の関連ドキュメント節に手順書リンクを追加する

### 4. `infra` 設定整合（必要時のみ）
- [x] 4.1 `todo-cognito-construct.ts` の自己登録可（`selfSignUpEnabled: true`）・管理者作成可（`AllowAdminCreateUserOnly: false`）が仕様と一致することを確認する
- [x] 4.2 `tempPasswordValidity` が無期限化されていないことを確認し、差分があれば最小修正する
- [x] 4.3 `infra/test/infra.test.ts` の Cognito 検証観点が不足していれば、最小差分でアサーションを追加する

## テスト / 検証タスク
- [x] 5.1 ドキュメントレビューを実施し、手順に `prod` / テスト用ドメイン / 固定パスワード / 100req/s上限が反映されていることを確認する
- [x] 5.2 `infra/` で `npm run build` を実行する（IaC差分がある場合）
- [x] 5.3 `infra/` で `npm test -- --runInBand` を実行する（IaC差分がある場合）
- [x] 5.4 `infra/` で `npx cdk synth -c env=prod` を実行する（IaC差分がある場合）
- [x] 5.5 影響がある場合は `npx cdk diff -c env=prod` を実行し、破壊的差分がないことを確認する
- [x] 5.6 実施できない検証がある場合は、未実施理由・未確認範囲・残リスクを記録する

## ドキュメント更新タスク
- [x] 6.1 `docs/infra/` の新規手順書本文を日本語で記載する
- [x] 6.2 必要に応じて処理フローを Mermaid 図で補足する
- [x] 6.3 `docs/README.md` のリンク整合（名称・相対パス）を確認する
- [x] 6.4 `infra/README.md` の更新有無を確定し、未更新の場合は「不要理由」を記録する
- [x] 6.5 今回は運用具体化であるため `docs/adr/` 追加不要であることを確認し、必要なら理由を記録する

## 完了確認
- [x] 7.1 `specs.md` の受け入れ条件をすべて満たしていることを確認する
- [x] 7.2 変更範囲が `infra/` と `docs/` の必要箇所に限定されていることを確認する
- [x] 7.3 `backend/` / `frontend/` / 負荷試験基盤本体に不要な差分が混入していないことを確認する
- [x] 7.4 シークレット・認証情報・state ファイル・不要生成物が差分に含まれていないことを確認する
- [x] 7.5 検証結果（実行コマンド、結果、未実施理由）をタスク末尾または作業メモに記録する

---

並列化の目安:
- `2.x`（手順本文作成）と `3.x`（README導線更新）は並行可能。
- `4.x`（IaC整合）は `2.x` の仕様反映内容を確定後に着手する。
- `5.x`（検証）は `2.x`〜`4.x` 完了後に実施する。

実施メモ:
- 追加ドキュメント: `docs/infra/cognito-load-test-user-operations.md`
- README導線更新: `docs/README.md`, `infra/README.md`
- テスト補強: `infra/test/infra.test.ts` に `TemporaryPasswordValidityDays: 7` のアサーションを追加
- `npm run build`: 成功
- `npm test -- --runInBand`: 成功（1 test passed）
- `npx cdk synth -c env=prod`: 実行したが失敗（`arn:aws:iam::111111111111:role/cdk-hnb659fds-lookup-role-111111111111-ap-northeast-1` への `sts:AssumeRole` 権限不足）
- `npx cdk diff -c env=prod`: 実行したが失敗（上記と同一理由）
- `docs/adr/` 更新: 不要（既存方針の運用具体化のみ）
