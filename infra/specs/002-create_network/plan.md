# Plan: 002-create_network

## 実装方針
- 本 feature は **単一領域（`infra/`）** の変更として実施し、AWS CDK（TypeScript）でネットワーク基盤（VPC・サブネット・NAT・タグ付与・環境切替）を段階的に実装する。
- `spec.md` の受け入れ条件を満たすことを最優先とし、NATはRegional NAT Gateway（RNAT）前提、タグ `version` は現時点で固定値 `1.00` として実装する。
- 既存のCDKスタック構成と命名規則を踏襲し、Stackの責務をネットワーク領域に限定する（SRPを維持）。

## 変更対象
- `infra/bin/`:
  - CDKエントリーポイントの環境指定オプション受け取り（`dev` / `stg` / `prod`）と設定読込の導線。
- `infra/lib/`:
  - Network用Stack（または既存Stack内のNetwork責務部分）の実装。
  - 必要に応じて `lib/constructs/` にVPC関連Construct（サブネット・タグ適用補助）を追加。
- `infra/` 配下の環境設定ファイル群:
  - `dev` / `stg` / `prod` の環境定義ファイル構成（最低限 `accountId`, `region`）。
  - 初期値として `prod = 338456725408 / ap-northeast-1` を設定。
  - 初期値として `dev = 111111111111 / ap-northeast-1` を設定。
  - 初期値として `stg = 222222222222 / ap-northeast-1` を設定。

- `infra/specs/002-create_network/`:
  - 実装決定事項の反映（必要に応じた `spec.md`/`plan.md` の整合更新）。

## 変更しないもの
- `backend/` と `frontend/` のアプリケーションコード。
- ECSサービス、タスク定義、ALB詳細設定、Auroraクラスタ詳細パラメータ。
- CI/CDパイプライン、認証（Cognito/Spring Security）実装。
- S3/CloudFront/Secrets Manager等のネットワーク以外のAWSリソース実装。

## 技術方針
- 既存パターンの再利用方針:
  - 既存のCDK app -> stack初期化フロー、props受け渡し、命名・タグ付与パターンを優先再利用する。
- 新規クラスや新規コンポーネント:
  - Network責務が既存Stackに過密化する場合のみ、`lib/constructs/` にVPC関連Constructを分離する。
- 新規設定追加:
  - 環境ごとの差分は設定ファイルへ集約し、CDKコード側の条件分岐を最小化する。
- 新規依存追加:
  - 原則不要（AWS CDK標準機能で実現）。外部依存が必要な場合は理由を明示して最小限とする。
- 既存インフラや既存契約への扱い:
  - 既存契約を尊重し、今回の主変更はネットワーク基盤のみ。アプリ/API契約には影響を与えない方針。

## データや契約への影響
- DBスキーマ: 影響なし。
- API契約: 影響なし。
- イベント契約: 影響なし。
- 環境変数/設定値:
  - `infra` 側に環境識別子（`dev` / `stg` / `prod`）と対応する `accountId`, `region` の管理を追加。
- Secret/機密情報:
  - 新規Secretの導入なし。機密情報は本featureで扱わない。
- デプロイ/運用:
  - CDK実行時に環境指定を必須化（または規定値明確化）し、誤デプロイ防止の運用ルールを定義する。

## リスク
- 破壊的変更の可能性:
  - 既存ネットワーク資産への置換・再作成が発生すると影響が大きいため、新規作成前提と差分確認を徹底する。
- 互換性への影響:
  - サブネット種別/命名が後続Stack（ECS/DB）の参照前提と不一致だと統合時に不整合が起きる。
- 運用影響:
  - NAT Gateway構成はコストと可用性に直結するため、RNAT採用時の運用設計（IP割当方式、ルーティング、監視観点）を事前に確認する。
- セキュリティ影響:
  - 本featureではSecurity Groupの具体ルールを扱わないため、後続のBackend/CloudFront/ALB/ECS/Database実装時に最小権限設計が徹底されない場合のリスクがある。
- 監視影響:
  - 本feature単体で監視実装は対象外だが、後続でFlow Logsや監視連携が必要になる可能性がある。

## 検証方針
- 静的/構成検証:
  - `infra` のlint/typecheck（既存scriptがある場合）を実施。
  - `cdk synth` でテンプレート生成可否とVPC/サブネット/NAT/タグ定義を確認。
- 変更影響検証:
  - 影響が大きい場合は `cdk diff` で追加・変更リソースを確認。
- 要件適合確認（specトレーサビリティ）:
  - 受け入れ条件（2AZ/3層、デフォルトVPC不使用、タグ、環境切替拡張性）に対してチェックリストで照合。
- 実施不可時の扱い:
  - AWS資格情報や環境未整備で実行できない検証は、未確認項目と理由を明記する。

## ドキュメント更新方針
- `infra/README.md`:
  - 環境指定付きCDK実行方法、設定ファイル配置ルール、確認コマンド（synth/diff）の更新要否を確認。
- `docs/`:
  - `docs/infra/` にネットワーク構成方針や環境差分運用の追記要否を確認。
- `docs/adr/`:
  - NAT方針や環境切替方式が長期的な設計判断になる場合はADR追加を検討。

## 実施順序
1. 仕様確定・前提合意
   - `spec.md` の前提として、NATはRNATを採用し、タグ `version` は `1.00` 固定値とする方針を反映する。
2. 設計反映
   - 環境設定ファイル構成とCDKエントリーポイントの環境読込設計を決定する。
   - VPC/サブネット（2AZ・3層）とタグ適用方針をCDK設計へ落とし込む。
3. 実装
   - `infra/bin` と `infra/lib`（必要なら `lib/constructs`）に最小差分で実装する。
4. 検証
   - lint/typecheck/synth（必要に応じてdiff）を実行し、受け入れ条件との整合を確認する。
5. ドキュメント整備
   - 必要なREADME/docs/ADRの更新要否を判定し、必要分のみ更新する。

## 未解決事項
- なし（Security Groupの具体的な許可ポート・通信方向は、本featureではなく後続のBackend/CloudFront/ALB/ECS/Database作成時に各リソースと合わせて設計・実装する）。
