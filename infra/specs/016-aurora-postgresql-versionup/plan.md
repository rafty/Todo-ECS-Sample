# Plan: 016-aurora-postgresql-versionup

## 実装方針
- 本 feature は **単一領域（`infra/`）** で実施する。
- 変更の中心は Aurora エンジンバージョン指定のみとし、既存の Stack/Construct 構成を維持した最小差分で実装する。
- `specs.md` で確定した方針（16 系最新、環境同時適用、通常メンテナンス適用）をそのままコードと検証手順へ落とし込む。
- 最終採用版は `ap-northeast-1` で 16.4 から有効なアップグレード先として確認できる `16.13` とする。

## 変更対象
- `infra/lib/constructs/todo-aurora-construct.ts`
  - `rds.AuroraPostgresEngineVersion.VER_16_4` を 16.13 へ変更する。
  - 変更理由を示す日本語コメント（保守上必要な最小限）を追記する。
- `infra/lib/constructs/todo-aurora-construct.js`
  - TypeScript ビルド結果として、対応する定数変更を反映する。
- `infra/test/infra.test.ts`（必要な場合のみ）
  - `AWS::RDS::DBCluster` の `EngineVersion` が期待値になっていることを検証するアサーションを追加する。
- `infra/test/infra.test.js` / `infra/test/infra.test.d.ts`（必要な場合のみ）
  - TypeScript ビルド結果として反映する。

## 変更しないもの
- `backend/`、`frontend/`、`docs/` の機能実装。
- Aurora 以外のインフラ設定（VPC、ECS、ALB、Cognito、S3、IAM、Secrets Manager）。
- DB 名、サブネット配置、Serverless v2 容量、削除保護/RemovalPolicy など既存 Aurora 周辺設定。
- Blue/Green や ZDP の導入（今回は通常メンテナンス前提）。

## 技術方針
- 既存パターンの再利用方針
  - 既存の `TodoAuroraConstruct` に対するピンポイント変更で対応し、新規 Construct は作成しない。
  - L2 Construct（`DatabaseClusterEngine.auroraPostgres`）を継続利用する。
- 新規設定追加の要否
  - 原則なし。エンジンバージョン定数の差し替えのみ。
- 新規依存追加の要否
  - 追加依存はなし。
  - ただし `aws-cdk-lib` 2.215.0 には `VER_16_13` がないため、`AuroraPostgresEngineVersion.of('16.13', '16')` を利用する。
- 既存インフラ/既存契約への扱い
  - 既存リソース名・契約は維持し、CloudFormation 上の主差分を `EngineVersion` 変更に限定する。

## データや契約への影響
- DB スキーマ: 変更なし。
- API 契約: 変更なし。
- イベント契約: 変更なし。
- 環境変数/Secret: 変更なし。
- デプロイ/運用:
  - Aurora エンジン更新に伴い、メンテナンス時間帯で再起動や短時間接続断が発生する可能性がある。
  - 適用は `dev/stg/prod` 同時実施を前提とする。

## リスク
- 依存更新リスク
  - CDK 依存更新が必要になった場合、関連テンプレート差分が想定より増える可能性。
  - 対策: `cdk diff` で差分を精査し、Aurora 以外の高リスク差分が出た場合は原因を切り分ける。
- 運用リスク
  - 通常メンテナンスでの更新時に短時間ダウンタイムが発生する可能性。
  - 対策: 実施時間帯をメンテナンスウィンドウに合わせ、事前に接続影響を周知する。
- 互換性リスク
  - 16 系内の更新でも、パッチ差分による実行計画や拡張挙動の差異が顕在化する可能性。
  - 対策: 本件では IaC 変更に限定し、アプリ動作確認は既存疎通観点で最小限実施する。

## 検証方針
- 事前確認
  - `ap-northeast-1` で `16.13` が `16.4` からの有効アップグレード先であることを確認する。
  - `aws-cdk-lib` 2.215.0 環境で `of('16.13', '16')` 指定が利用可能であることを確認する。
- ビルド/テスト
  - `npm run build`
  - `npm test -- --runInBand`
- CDK 検証
  - `npx cdk synth -c env=dev`
  - `npx cdk synth -c env=stg`
  - `npx cdk synth -c env=prod`
  - `npx cdk diff -c env=dev`
  - `npx cdk diff -c env=stg`
  - `npx cdk diff -c env=prod`
- 合成結果確認
  - `AWS::RDS::DBCluster` の `EngineVersion` が `16.13` になっていること。
  - 本件と無関係な高リスク差分（VPC/ECS/ALB/IAM など）が発生していないこと。

## ドキュメント更新方針
- `infra/README.md` と `docs/infra/` は、Aurora の固定マイナーバージョンを明示していないため、原則更新不要。
- ただし、版数を明記している箇所が見つかった場合のみ、最小差分で更新する。
- ADR 追加は不要（既存方針内のバージョン更新であり、構成方針の変更ではないため）。

## 実施順序
1. 現状確認
   - `specs.md` の確定条件と現行 CDK 定数の対応可否を確認する。
2. 版数方針確定
   - `16.4` からの有効アップグレード先として `16.13` を確認し、同一メジャー更新方針を固定する。
3. コード変更
   - `todo-aurora-construct.ts` のエンジン定数を変更し、必要に応じて関連コメントを整える。
4. テスト補強
   - 必要に応じて `infra.test.ts` に `EngineVersion` の期待値検証を追加する。
5. ビルド反映
   - `npm run build` で JS/DTS 生成物を同期する。
6. 検証
   - `test` / `synth` / `diff` を実行し、想定差分と受け入れ条件を確認する。
7. ドキュメント要否確認
   - `README/docs` の更新要否を最終確認し、必要時のみ更新する。

## 未解決事項
- なし（`specs.md` で方針確定済み）。
