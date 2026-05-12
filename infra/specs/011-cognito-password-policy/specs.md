# Spec: 011-cognito-password-policy

## 概要
- Distributed Load Testing on AWS で Backend REST API の認証付き負荷試験を継続実行できるよう、Cognito User Pool のユーザー作成方針とパスワード有効期限方針を定義する。
- `tempPasswordValidity` の無期限化はサービス制約上できない前提で、運用負荷を下げる代替方針を要件化する。

## 背景
- 負荷試験では多数の認証済みユーザーが必要であり、管理者がダミーユーザーを大量に準備できる必要がある。
- 現行の `infra/lib/constructs/todo-cognito-construct.ts` では `selfSignUpEnabled: true` で自己登録が有効、CloudFormation 上の `AllowAdminCreateUserOnly` は `false` になっている。
- 現行のパスワードポリシーは `tempPasswordValidity: cdk.Duration.days(7)`（`TemporaryPasswordValidityDays: 7`）で、仮パスワード期限切れ時に再発行運用が必要になる。
- AWS Cognito の `TemporaryPasswordValidityDays` は無期限値を取れないため、「無期限化」要求はそのままでは満たせない。

## 目的
- 負荷試験用ユーザーを管理者主導で安定的に作成・再利用できる状態を作る。
- 仮パスワード期限切れに起因する運用停止を防ぐ。
- 既存のアプリ認証基盤（Hosted UI / OAuth 設定）を壊さずに、変更範囲を `infra/` に限定する。

## スコープ
- 対象領域: `infra/`（単一領域）
- 本仕様で定義する内容:
  - 負荷試験実施環境を `prod` とする前提
  - Cognito User Pool のユーザー作成ポリシー（自己登録/管理者作成）の要件
  - 負荷試験用ダミーユーザーの大量作成・再利用運用要件
  - Distributed Load Testing on AWS 向けの大量ユーザー作成手順を `docs/` に記載する要件
  - 仮パスワード期限の扱いと代替運用要件
  - 変更後に実施すべき `synth` / `diff` を中心とした確認観点

## 対象外
- Distributed Load Testing on AWS 自体（テスト実行基盤、シナリオ、JMeter スクリプト）の構築
- `backend/`・`frontend/` のアプリ実装変更
- 本番ユーザー移行、既存ユーザーの一括パスワードリセット実作業
- Cognito 以外の認証サービス追加や認証方式の全面刷新

## ユーザーストーリー / 利用シナリオ
- 負荷試験担当者として、管理者が用意した多数のダミーユーザーで認証付き API 負荷試験を定期実行したい。
- 運用担当者として、仮パスワード期限切れでテストが止まらないように、再発行依存の低い運用にしたい。
- セキュリティ担当者として、ダミーユーザー作成権限を限定し、意図しないユーザー作成や公開登録を防ぎたい。

## 機能要件
- 現状定義
  - 現行設定（`selfSignUpEnabled: true`、`AllowAdminCreateUserOnly: false`、`TemporaryPasswordValidityDays: 7`）を基準値として明示すること。
- ユーザー作成ポリシー
  - 負荷試験対象環境は `prod` とすること。
  - `prod` では自己登録を無効化せず、管理者作成も可能な状態を維持すること（自己登録可 + 管理者作成可）。
  - 管理者作成・削除操作は、Admin 権限相当で実行できること（`AdminCreateUser`, `AdminSetUserPassword`, `AdminDeleteUser` などを実行可能）。
- 大量ダミーユーザー運用
  - ダミーユーザーをバッチ投入可能な前提（CLI/SDK での `AdminCreateUser` 呼び出し）を満たすこと。
  - バルク作成時に不要な招待メール送信を抑止できる運用を採用できること（`MessageAction=SUPPRESS` 相当）。
  - ダミーユーザー件数のハード上限は設けないが、運用想定は約100ユーザーとすること。
  - ダミーユーザー識別の命名規則として、`0001` のような番号ベース UserID を許容すること。
  - テスト後にダミーユーザーを削除できる運用を持つこと。
  - Distributed Load Testing on AWS で利用する大量ユーザーの作成手順（前提権限、実行コマンド、エラー時の再実行方針、削除手順）を `docs/` 配下の文書として整備すること。
- パスワード期限ポリシー
  - `tempPasswordValidity` の無期限値は採用しないこと（AWS制約）。
  - 仮パスワード期限切れ運用を回避するため、負荷試験用ユーザーには管理者が恒久パスワードを設定できる運用を要件化すること（`AdminSetUserPassword` の `Permanent=true` 相当）。
  - やむを得ず仮パスワードを使う場合は、期限日数の上限・再発行手順を運用要件として明示すること。

## 非機能要件
- セキュリティ
  - 管理者API実行主体は Admin 権限相当で実行可能な IAM プリンシパルとし、監査可能な実行経路（CLI実行ロール等）を用いること。
  - `prod` では自己登録と管理者作成の両経路を許可する前提で、運用上の誤操作を防ぐ手順を持つこと。
- 運用性
  - 定期負荷試験前後の準備手順（ユーザー作成/再生成/削除）を再現可能な手順として持てること。
  - Cognito API のクォータ超過を回避するため、バッチ実行時のレート制御方針を持つこと。
- 保守性
  - 既存 `TodoCognitoConstruct` の責務を維持し、変更は最小限とすること。
  - 環境差分は既存の `-c env=<dev|stg|prod>` 運用に沿って管理しつつ、本仕様の対象は `prod` として扱うこと。

## 受け入れ条件
- `specs.md` 上で、現行値と変更方針（自己登録ポリシー、パスワード運用方針）が矛盾なく定義されている。
- `prod` を負荷試験対象環境とし、自己登録可かつ管理者作成可の方針が明記されている。
- `tempPasswordValidity` を無期限にしない前提と、その代替（恒久パスワード運用または期限付き再発行運用）が明文化されている。
- 負荷試験用ダミーユーザーの大量作成運用要件（約100件想定、番号ベースUserID許容、削除可能）が定義されている。
- バルク作成・削除が Admin 権限相当で実行される前提が明記されている。
- `docs/` 配下に、大量ユーザー作成・削除の運用手順を記載する要件が明記されている。
- 変更対象が `infra/` に限定されること、検証観点（`synth` と必要に応じた `diff`）が明記されている。

## 制約
- AWS Cognito の仕様上、`TemporaryPasswordValidityDays` に無期限設定はできない。
- 既存の CloudFront / Hosted UI / App Client 連携を壊さないこと。
- 依頼範囲外の大規模リファクタリング、ファイル移動、他領域の横断変更は行わないこと。

## 依存関係
- `infra/lib/constructs/todo-cognito-construct.ts`（User Pool / Client / Domain 定義）
- `infra/lib/infra-stack.ts`（Cognito Construct 組み込みと環境別構成）
- `infra/README.md`（主要コマンド、環境切替ルール）
- AWS Cognito の User Pool 管理API（`AdminCreateUser`, `AdminSetUserPassword` など）
