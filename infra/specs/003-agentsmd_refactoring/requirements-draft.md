# 前提
- `infra/`にAWS CDKのプロジェクト存在します。
- 以下の要件を満たすAWSリソースをAWS CDK TypeScriptで作成してください。

# 要件
以前の要件で、infra/配下のAWS CDKプロジェクトで、VPCなどのネットワーク構成を作成してもらいました。
しかし、Junieは, .../Todo-ECS-Sample/AGENTS.mdや.../Todo-ECS-Sample/infra/AGENTS.mdのガイドラインを認識してないようなので、ガイドラインに沿っていないコードを作成してました。
このコードをガイドラインの内容に従って、リファクタリングしたいです。

# ガイドラインの修正
- Junie settingsのguideline pathをAGENTS.mdに変更しました。
- AGENTS.mdに 「## サブプロジェクト別 AGENTS.md の適用ルール」を追加し、infra/AGENTS.mdのガイドラインも認識するように修正しました。

