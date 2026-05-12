# 前提
- `infra/`にAWS CDKのプロジェクト存在します。

以下の要件を満たすAWSリソースをAWS CDK TypeScriptで作成してください。

# 要件

Distributed Load Testing on AWSでBackendのREST APIの負荷テストを実施したいです。
Distributed Load Testing on AWSで負荷テストができるようにCognito User Poolで大量のダミーUserを管理者が作成できる必要があります。
現状のCognitoはそうなっているますか？

また、大量のUserのパスワード更新があると大変なので、Cognitoのパスワードポリシーの期限を無制限にしたいです。(tempPasswordValidity: cdk.Duration.days(7)を無期限にできますか？)
