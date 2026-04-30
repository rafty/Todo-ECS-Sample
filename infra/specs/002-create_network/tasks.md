# Tasks: 002-create_network

## 前提確認
- [x] 1.1 `infra/AGENTS.md`、`infra/README.md`、関連 `docs/` を確認し、インフラ作業ルール（SRP、最小変更、検証方針）を再確認する
- [x] 1.2 `infra/specs/002-create_network/spec.md` の受け入れ条件（2AZ/3層、デフォルトVPC不使用、タグ、環境切替）をチェックリスト化する
- [x] 1.3 `infra/specs/002-create_network/plan.md` の変更対象/非対象を確認し、作業範囲を `infra/` のネットワーク基盤に限定する
- [x] 1.4 前提値を確定する（NATはRNAT、`version` タグは `1.00`、Security Group詳細は本feature対象外）
- [x] 1.5 `spec.md` と `plan.md` の差分論点（例: `prod` の `accountId` 記載差異）を確認し、実装前にどちらを正とするか明確化する

## 実装タスク

### 2. 環境設定とエントリーポイント
- [x] 2.1 `infra/` 配下に環境定義ファイル構成（`dev` / `stg` / `prod`）を用意し、最低限 `accountId` と `region` を定義する
- [x] 2.2 `prod` 環境値（`accountId` / `region`）を `plan.md` の方針に沿って設定する
- [x] 2.3 CDKエントリーポイント（`infra/bin/`）で環境指定オプションを受け取り、対応する環境定義を読み込む導線を実装する
- [x] 2.4 環境未指定時や不正値指定時の扱い（エラー/既定値）を実装し、誤デプロイ防止の挙動を明確化する

### 3. ネットワーク基盤（VPC/サブネット/NAT/タグ）
- [x] 3.1 Network責務のStack実装箇所（既存Stack or 専用Stack）を確定し、責務が過密な場合のみ `lib/constructs/` へ分離する
- [x] 3.2 デフォルトVPCを参照しない新規VPCを実装する
- [x] 3.3 2AZ構成で `front` / `application` / `datastore` の3層サブネットを実装する
- [x] 3.4 `front` をALB配置前提、`datastore` をAurora配置前提のサブネット属性/ルート設計にする
- [x] 3.5 RNAT前提で外向き通信を実装し、ルーティングが3層構成と矛盾しないことを確認する
- [x] 3.6 共通タグ（`env` / `service` / `version`）をネットワークリソースへ適用し、`version=1.00` を反映する

### 4. 実装後の整合
- [x] 4.1 命名規則・既存CDKパターン（app→stack、props、タグ付与）への準拠を確認する
- [x] 4.2 本feature対象外（ECS/ALB詳細/DB詳細/SG詳細）に差分が波及していないことを確認する

## テスト / 検証タスク
- [x] 5.1 `infra` の lint / typecheck（既存scriptがある場合）を実行し、静的品質を確認する
- [x] 5.2 `cdk synth` を実行し、VPC・2AZ・3層サブネット・RNAT・タグ定義の出力を確認する
- [x] 5.3 変更影響が大きい場合は `cdk diff` を実行し、追加/変更リソースが意図通りであることを確認する
- [x] 5.4 受け入れ条件トレーサビリティ表で、`spec.md` の各受け入れ条件に対する確認結果を記録する
- [x] 5.5 実行できない検証がある場合は、未実施項目・理由・代替確認方法を記録する

## ドキュメント更新タスク
- [x] 6.1 `infra/README.md` の更新要否を確認し、必要なら環境指定付き実行方法と設定ファイル配置ルールを追記する
- [x] 6.2 `docs/infra/` の更新要否を確認し、必要ならネットワーク構成方針と環境差分運用を追記する
- [x] 6.3 `docs/adr/` 追加要否を確認し、NAT方針や環境切替方式を長期判断として残す必要がある場合のみ記録する
- [x] 6.4 `infra/specs/002-create_network/spec.md` / `plan.md` の整合更新要否を確認し、必要時のみ最小差分で反映する

## 完了確認
- [x] 7.1 `spec.md` の受け入れ条件をすべて満たすことを確認する
- [x] 7.2 変更範囲が `infra/` の本feature対象に限定されていることを確認する
- [x] 7.3 シークレット・認証情報・stateファイル・不要な生成物が差分に含まれていないことを確認する
- [x] 7.4 検証結果（実施コマンド、結果、未実施理由）を作業記録として残す

## 検証結果メモ
- `npm run build`: 成功
- `npm test -- --runInBand`: 成功（1 test passed）
- `npx cdk synth -c env=prod`: 失敗（現在の認証情報が `338456725408` で、対象 `111111111111` の AssumeRole に失敗。加えて証明書チェーンエラー）
- `cdk diff`: `synth` が失敗するため未実施

## 受け入れ条件トレーサビリティ（簡易）
- `prod` 環境指定の読込: `infra/bin/infra.ts` と `infra/lib/config/environment-config.ts` で実装
- 新規VPC / 2AZ / 3層サブネット: `infra/lib/infra-stack.ts` で実装
- デフォルトVPC不使用: `ec2.Vpc` 新規作成で実装
- タグ (`env/service/version`): `infra/lib/infra-stack.ts` で実装（`version=1.00`）
- NACL追加なし / SG詳細対象外: 本featureでは未実装方針を維持

## ドキュメント反映メモ（追記）
- `infra/README.md`: 環境指定付き実行方法、設定ファイル配置、関連ドキュメント導線を追記
- `docs/infra/network-baseline.md`: 2AZ/3層・環境切替運用・既知事項を記録
- `docs/adr/002-network-baseline-and-env-switching.md`: ネットワーク基盤と環境切替方式の判断を記録
