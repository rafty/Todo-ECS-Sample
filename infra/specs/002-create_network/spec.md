# Spec: 002-create_network

## 概要
- AWS CDK（TypeScript）で、`prod` 環境向けの新規VPCと3層サブネット（`front` / `application` / `datastore`）を定義し、将来的に `dev` / `stg` へ展開可能な環境切替前提のネットワーク基盤仕様を定義する。

## 背景
- 本リポジトリは ECS on Fargate を実行基盤とする Todo アプリケーションを想定しており、ALB・ECS・Aurora を安全に配置できる標準的なネットワーク基盤が必要である。
- デフォルトVPCの利用では環境差分管理やセキュリティ境界の明確化が難しいため、CDKで明示的にVPC構成を管理する必要がある。
- 環境（dev/stg/prod）ごとにAWSアカウント・リージョンが異なりうるため、環境変数ファイルで切替可能な構成が必要である。

## 目的
- `prod`（AWS Account: `111111111111`、Region: `ap-northeast-1`）で利用するネットワーク要件を明文化する。
- 同一実装方針で `dev` / `stg` へ横展開できる環境切替ルールを定義する。
- ALB・アプリケーション・データストアの責務分離と最小権限の通信制御を満たす。

## スコープ
- 対象領域: `infra/`（AWS CDK TypeScript）
- 以下を要件として定義する。
  - 環境別設定ファイル（`dev` / `stg` / `prod`）の構成方針
  - CDKコマンド実行時の環境指定による設定読込方針
  - 新規VPCの作成（デフォルトVPCは不使用）
  - 2AZ・3層サブネット構成（`front` / `application` / `datastore`）
  - `front` 層にALBを配置する前提のネットワーク設計
  - `datastore` 層にAurora PostgreSQL Serverless v2を配置する前提のネットワーク設計
  - Regional NAT Gatewayを採用する前提
  - Security Group最小権限方針、NACL非採用方針
  - 全AWSリソースへの共通タグ付与方針（`env` / `service` / `version`）

## 対象外
- ECSクラスター、ECSサービス、タスク定義などアプリケーション実行基盤の構築
- S3 / CloudFront / Cognito / Secrets Manager などネットワーク以外の各サービス実装
- Auroraクラスタ自体の詳細パラメータ設計（インスタンスクラス、バックアップ保持期間、パラメータグループ等）
- CI/CDパイプライン、デプロイ運用フローの詳細設計

## ユーザーストーリー / 利用シナリオ
- インフラ担当者として、CDKコマンド実行時に環境（`dev` / `stg` / `prod`）を指定するだけで、対象環境のアカウント・リージョンに適切なネットワーク基盤を作成したい。
- アプリケーション担当者として、`front` / `application` / `datastore` の責務分離されたサブネットを前提に、ALB・ECS・Auroraの配置先を明確にしたい。
- セキュリティ担当者として、通信制御はSecurity Group中心で最小権限とし、不要なネットワーク要素（NACL追加管理）を増やさずに運用したい。

## 機能要件
- 環境設定
  - 環境別の変数ファイルを `dev` / `stg` / `prod` の3種類で持てる構成であること。
  - 各環境変数ファイルには少なくとも `accountId` と `region` を含むこと。
  - CDK実行時オプションで環境名を指定すると、該当環境の変数ファイルが読み込まれること。
  - 初期対象は `prod` であり、`prod` は `111111111111` / `ap-northeast-1` を使用すること。
- VPC / サブネット
  - デフォルトVPCを利用せず、新規VPCを作成すること。
  - 2つのAZを利用するマルチAZ構成とすること。
  - サブネットは3層（`front` / `application` / `datastore`）で分離すること。
  - `front` 層はALBを配置可能なネットワーク属性を持つこと。
  - `datastore` 層はAurora PostgreSQL Serverless v2を配置可能なネットワーク属性を持つこと。
- 外向き通信
  - NAT方式はRegional NAT Gatewayを採用すること。
- セキュリティ制御
  - Security Groupは最小権限（必要最小限の許可）で設計すること。
  - ステートフルなSecurity Groupで要件を満たす前提とし、Network ACLは追加しないこと。
- タグ
  - 作成するAWSリソースに共通タグを付与すること。
  - `env`: `prod`
  - `service`: `Todo`
  - `version`: `backend/src/main` のソースコードハッシュ

## 非機能要件
- 保守性
  - 環境差分は環境変数ファイルに閉じ込め、CDKコード本体の分岐を最小化すること。
  - `prod` 以外（`dev` / `stg`）へ横展開時に、同一構造で設定値のみ差し替え可能であること。
- セキュリティ
  - ネットワーク境界（3層分離）を明確化し、通信許可は明示的に管理すること。
  - セキュリティ制御はSecurity Group中心で実施し、過剰許可を避けること。
- 可用性
  - 2AZ配置を前提とし、単一AZ障害時の影響を低減する構成であること。
- 運用性
  - 環境識別（`env`）、サービス識別（`service`）、バージョントレース（`version`）がタグで追跡できること。

## 受け入れ条件
- `prod` 環境指定でCDK実行した際に、`111111111111` / `ap-northeast-1` 向けの新規VPCが作成される。
- VPC内に2AZ・3層（`front` / `application` / `datastore`）のサブネット構成が作成される。
- デフォルトVPCを参照しない。
- Security Groupベースで必要最小限の通信設計方針が反映され、NACL追加が行われていない。
- 共通タグ（`env=prod`, `service=Todo`, `version=<backend/src/main hash>`）が対象リソースへ適用される。
- 環境指定による設定読込（`dev` / `stg` / `prod`）の拡張可能性が設計上担保される。

## 制約
- 実装対象は `infra/` のAWS CDK TypeScriptに限定する。
- 今回の実作成対象環境は `prod` のみとする。
- 既存のリポジトリ構成・命名規則・実装方針を尊重し、不要な横断変更は行わない。
- NAT Gatewayの配置要件はAWS標準仕様との整合性を要確認とする。

## 依存関係
- `infra/` のCDK実装基盤（スタック/コンストラクト構成、環境設定読込方式）
- 想定利用先
  - ALB（`front` 層）
  - ECS（`application` 層）
  - Aurora PostgreSQL Serverless v2（`datastore` 層）
- `backend/src/main` のソースコードハッシュ生成方式（`version` タグ計算に利用）

## 未確定事項 / 要確認事項
- `version` タグの「`backend/src/main` のソースコードハッシュ」の算出ルール。
  - ハッシュアルゴリズム、対象ファイル範囲、改行差分の扱い、デプロイ時の算出タイミングを確定する必要がある。
- Security Groupの具体的な許可ポート/通信方向。
  - 本仕様は最小権限方針までを定義し、具体値は後続の実装設計で確定する。
- `dev` / `stg` のAWSアカウントID・リージョン。
  - ファイル構成は本仕様で定義するが、値自体は未提供のため別途確定が必要。