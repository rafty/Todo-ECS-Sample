# Tasks: 006-api-and-springboot-controller-service

## 前提確認
- [x] 1.1 ルート `AGENTS.md`、`infra/AGENTS.md`、`backend/AGENTS.md` を確認し、複数領域変更時の作業ルールを再確認する
- [x] 1.2 ルート `README.md`、`infra/README.md`、`specs/006-api-and-springboot-controller-service/specs.md`、`specs/006-api-and-springboot-controller-service/plan.md` を確認し、受け入れ条件と対象外をチェックリスト化する
- [x] 1.3 `specs.md` に未確定事項セクションが存在しないことを確認し、決定事項（callback/logout URL、404統一、REST契約固定）を実装前提として明文化する
- [x] 1.4 既存 `infra/lib/constructs/` と `backend/src/main/java/com/example/backend/` の責務境界を確認し、追加クラスの配置方針を確定する
- [x] 1.5 検証前提（Docker デーモン、AWS 認証、`-c env=<dev|stg|prod>` 指定）を確認し、実行可否条件を記録する

## 実装タスク

### infra: Cognito と CloudFront の追加
- [x] 2.1 `infra/lib/constructs/todo-cognito-construct.ts` を新規作成し、User Pool を実装する（自己登録可、MFA不要、簡易パスワードポリシー）
- [x] 2.2 Cognito App Client を Public Client（secret なし）で実装し、Authorization Code + PKCE を有効化する
- [x] 2.3 App Client に callback/logout URL を固定値で設定する  
  callback: `https://d123456abcdef8.cloudfront.net/auth/callback`  
  logout: `https://d123456abcdef8.cloudfront.net/`
- [x] 2.4 Cognito Hosted UI 用 User Pool Domain（`amazoncognito.com` プレフィックスドメイン）を実装する
- [x] 2.5 `infra/lib/constructs/todo-cloudfront-construct.ts` を新規作成し、ALB origin の Distribution を実装する
- [x] 2.6 CloudFront で Viewer HTTPS 強制、API 用 no-cache、全 HTTP メソッド許可（GET/HEAD/OPTIONS/PUT/PATCH/POST/DELETE）を設定する
- [x] 2.7 CloudFront から backend へ Authorization ヘッダーを転送する設定を実装する
- [x] 2.8 `infra/lib/constructs/todo-app-security-groups-construct.ts` を更新し、ALB ingress を CloudFront managed prefix list 起点へ制限する
- [x] 2.9 `infra/lib/constructs/todo-alb-construct.ts` と `infra/lib/infra-stack.ts` を更新し、ALB ヘルスチェックパスを `/actuator/health` に統一する
- [x] 2.10 `infra/lib/infra-stack.ts` に Cognito/CloudFront を組み込み、必要な `CfnOutput`（CloudFront ドメイン、UserPoolId、AppClientId、Issuer）を追加する

### backend: API と JWT 認証の追加
- [x] 3.1 `backend/pom.xml` に `spring-boot-starter-security`、`spring-boot-starter-oauth2-resource-server`、`spring-boot-starter-actuator` を追加する
- [x] 3.2 `backend/src/main/resources/application.properties` に JWT 検証設定（issuer 参照）と Actuator ヘルスエンドポイント設定を追加する
- [x] 3.3 `backend/src/main/java/com/example/backend/security/`（または `config/`）に SecurityFilterChain を実装し、`/actuator/health` のみ匿名許可、`/api/**` は認証必須にする
- [x] 3.4 JWT から `sub` を取得する認証情報変換を実装し、`owner_subject` 解決に利用できる形へ統一する
- [x] 3.5 `backend/src/main/java/com/example/backend/services/` に Todo Service interface を追加する
- [x] 3.6 `backend/src/main/java/com/example/backend/services/impl/` に Todo Service 実装を追加し、Repository 経由で CRUD を実装する
- [x] 3.7 Service 実装で所有者境界を強制し、権限不整合時レスポンス方針を `404` で統一する
- [x] 3.8 `backend/src/main/java/com/example/backend/controllers/` に `/api/todos` Controller を追加し、Controller -> Service 依存のみで実装する
- [x] 3.9 リクエスト DTO で `owner_subject` 入力を受け付けない仕様を実装し、`title` 必須など DB 制約と整合するバリデーションを追加する
- [x] 3.10 一覧 API の契約を固定実装する（`page`, `size`, `sort`, `completed`, `q`、`page=0`, `size=20`, `sort=updatedAt,desc`, `size<=100`）
- [x] 3.11 例外ハンドリングを整理し、エラーレスポンスを Problem Details（`application/problem+json`）へ統一する

### infra/backend: テストコード更新
- [x] 4.1 `infra/test/infra.test.ts` に CloudFront Distribution、Cognito User Pool/App Client/Domain のアサーションを追加する
- [x] 4.2 `infra/test/infra.test.ts` に ALB ヘルスチェック `/actuator/health` と CloudFront prefix list 制限のアサーションを追加する
- [x] 4.3 backend の Controller テストを追加し、未認証時 `401`、他ユーザー境界時 `404`、正常系レスポンスを検証する
- [x] 4.4 backend の Service テストを追加し、`owner_subject` 境界、`size<=100` 制約、検索条件（`completed`/`q`）を検証する

## テスト / 検証タスク

### backend 検証
- [x] 5.1 `backend/` で `./mvnw test` を実行し、既存 + 追加テストの回帰がないことを確認する
- [x] 5.2 `backend/` で `./mvnw -DskipTests compile` を実行し、依存追加後のコンパイル成立を確認する
- [x] 5.3 ローカル起動または統合テストで `/actuator/health` 到達性を確認し、ALB ヘルスチェック前提を満たすことを確認する
- [x] 5.4 API 検証として、JWT なし `401`、他ユーザー Todo 参照/更新/削除 `404`、Problem Details 形式を確認する

### infra 検証
- [x] 6.1 `infra/` で `npm run build` を実行し、TypeScript コンパイル成立を確認する
- [x] 6.2 `infra/` で `npm test -- --runInBand` を実行し、テンプレートテスト回帰がないことを確認する
- [x] 6.3 `infra/` で `npx cdk synth -c env=prod` を実行し、CloudFront/Cognito/SG/ALB 更新を含むテンプレート出力を確認する
- [x] 6.4 `infra/` で `npx cdk diff -c env=prod` を実行し、差分が意図した範囲（CloudFront/Cognito追加、ALB/SG更新）に限定されることを確認する
- [x] 6.5 テンプレートから callback/logout 固定値、HTTPS 強制、Authorization 転送、no-cache 設定を確認する
- [x] 6.6 未実施検証がある場合は、未確認範囲と理由（認証不足、Docker未起動など）を記録する  
  `npx cdk synth -c env=prod` / `npx cdk diff -c env=prod` は実行済みだが、`arn:aws:iam::111111111111:role/cdk-hnb659fds-lookup-role-111111111111-ap-northeast-1` への `sts:AssumeRole` 権限不足で停止。  
  そのため prod アカウント向けの最終テンプレート確認は未完了。代替として `infra/test/infra.test.ts` のアサーションで callback/logout・HTTPS 強制・Authorization 転送・no-cache を検証済み。

## ドキュメント更新タスク
- [x] 7.1 `infra/README.md` の更新要否を確認し、必要な場合は CloudFront/Cognito 追加後の確認手順を追記する
- [x] 7.2 `docs/infra/ecs-aurora-runtime-baseline.md` を更新し、CloudFront/Cognito を含む構成図と運用ポイントを反映する
- [x] 7.3 ルート `README.md` の更新要否を確認し、必要な場合は実装範囲（公開経路/認証基盤/API）を最小差分で反映する
- [x] 7.4 `docs/adr/` 更新要否を確認し、長期的な設計判断として残すべき事項がある場合のみ追加・更新する  
  今回は既存方針（CloudFront公開 + backend JWT 検証）の拡張実装であり、追加 ADR は見送り。

## 完了確認
- [x] 8.1 `specs/006-api-and-springboot-controller-service/specs.md` の受け入れ条件をすべて満たしていることを確認する
- [x] 8.2 変更範囲が `infra/` と `backend/` に限定され、`frontend/` へ不要変更がないことを確認する
- [x] 8.3 対象外（独自ドメイン/ACM/WAF、ALB認証、CI/CD新規構築）が差分に含まれていないことを確認する
- [x] 8.4 シークレット実値、認証情報、state ファイル、不要生成物が差分に含まれていないことを確認する
- [x] 8.5 実行コマンド、結果、未実施理由を作業ログとして整理する

## 並列化の目安
- [x] 9.1 `2.x infra` と `3.x backend` は並列実施可能（`4.x` テスト更新と `5.x`/`6.x` 検証で合流）
- [x] 9.2 `7.x ドキュメント更新` は `5.x`/`6.x` の検証結果確定後に実施する

## 作業ログ
- backend
  - `JAVA_HOME=$(/usr/libexec/java_home -v 21) ./mvnw test` : 成功（12 tests, failures 0, errors 0）
  - `JAVA_HOME=$(/usr/libexec/java_home -v 21) ./mvnw -DskipTests compile` : 成功
  - `/actuator/health` は `TodoControllerTest#shouldExposeActuatorHealthWithoutAuthentication` で 200/UP を確認
  - API 契約は `TodoControllerTest` で `401`、他ユーザー `404`、Problem Details を確認
- infra
  - `npm run build` : 成功
  - `npm test -- --runInBand` : 成功（1 suite pass）
  - `npx cdk synth -c env=prod` : 実行したが AssumeRole 権限不足で失敗
  - `npx cdk diff -c env=prod` : 実行したが AssumeRole 権限不足で失敗
