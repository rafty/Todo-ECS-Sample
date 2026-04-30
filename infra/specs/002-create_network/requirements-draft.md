- `infra/`にAWS CDKのプロジェクト存在します。
- 以下の要件を満たすAWSリソースをAWS CDK TypeScriptで作成してください。

# 環境変数ファイル
- 環境はアカウント毎に異なるため環境毎の変数ファイルを作成するようにしてください。環境はdev、stg、prodの3つです。
- 今回はprod環境のみ作成しますが、他の環境も作成できるようにenvを切り替えるファイル構成にシてください。
- 環境毎の変数ファイルにはAWSアカウントIDとリージョンを含めるようにしてください。 
- cdkコマンドのオプションで、環境(dev、stg、prod)を指定すると環境の変数ファイルから読み取ってAWSリソースを作成します。

# VPC
- デフォルトVPCではなく、新規にVPCを作成してください。 
- Subnetは、`front`、`application`、`datastore`のThree-tier-architectureにします。
- frontにはALBを配置します。
- datastore 層には、Aurora PostgreSQL Serverless v2を配置します。
- Nat GatewayはRegional NAT Gatewayを使用し、Public Subnetには配置しません。
- Security Groupの設定は必要最低限にします。
- ステートフルなSecurity Groupで十分に要件を満たせるためNetwork ACLは不要です。
- ２つのAZを使用するマルチAZ構成にしてください。

## 想定アプリケーションシステム構成
- 想定アプリケーションシステムは以下のような構成ですが、今回の要件では作成しません。ネットワークを作成する際の参考情報として記載します。
### アプリケーション構成 
- アプリケーションはAWS ECS Clusterに配置します。
- ECSにはSPAのバックエンドを配置します
- バックエンドはSpring Bootで作られ、Restful APIを提供します。
- フロントエンドはReactでS3に配置します。
- フロントエンドはCloudFront経由でバックエンドのALBにアクセスします。
- ２つのAZを使用するマルチAZ構成にしてください。
- バックエンド認証はSpring Securityにより、Cognito発行のJWTを検証します。
- アプリケーションがAurora PostgreSQL Serverless v2にアクセスする際、SecretManagerを利用して認証しアクセスします。

# 前提

- 今回の要件では、`prod`環境で、 AWS Accountは`111111111111`で、Regionは`ap-northeast-1`を使用します。 
- AWS CDKでAWSリソース全てにタグを設定します。
  - タグ
    - env: 環境 (dev/stg/prod)、 今回は`prod`
    - service: サービス名、 今回は`Todo`
    - version: ソースコードハッシュを設定する。今回は`backend/src/main`のソースコードハッシュを設定する。
