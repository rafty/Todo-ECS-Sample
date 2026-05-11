# 1. specs-draft.md -> specs.md

`specs/004-awscdk_docker_image_deployment/specs-draft.md`に要件のドラフト版を記載しました。

AWSのプロフェッショナルな視点で、これを分析し、
`SddTemplates/spec-template.md` を参考に,
要件`specs/004-awscdk_docker_image_deployment/specs.md` を作ってください。


## 1.1. specs-draft.mdの改善: => specs.md
> 期待する要件定義書が作成されない場合

`specs/004-awscdk_docker_image_deployment/specs.md`の結果から、`specs-draft.md`を見直しました。
再度、ファイル`specs/004-awscdk_docker_image_deployment/specs-draft.md`を分析し、
本プロジェクトを検査してください。
AWSのプロフェッショナルな視点で、`specs-draft.md`のドラフト要件を再検討し`specs/004-awscdk_docker_image_deployment/specs.md`を改善してください。

## 1.2 未確定事項 / 要確認事項
`specs/004-awscdk_docker_image_deployment/specs.md`に
```
## 未確定事項 / 要確認事項
- `imagedeploy.DockerImageDeployment` の採用範囲:
  - ECR への配布のみを担当させるか、
  - ECS サービス更新まで同一 feature に含めるか（後者は追加要件が必要）。
- イメージタグ戦略:
  - 固定タグ、Git SHA タグ、digest pinning のどれを標準とするか。
- ECR リポジトリの運用ポリシー:
  - イメージスキャン設定、ライフサイクルポリシー、タグ不変設定の採用有無。
- `RemovalPolicy.DESTROY` の適用範囲:
  - `prod` を含めるか、非本番環境のみに限定するか。
```
とありますが、

今回の要件では、
- ECR への配布のみを担当
- イメージタグ戦略は、固定タグ(`latest`)を使用
- ECR リポジトリの運用ポリシーで、イメージスキャン設定、ライフサイクルポリシー、タグ不変設定の採用は無しです。
- `RemovalPolicy.DESTROY` の適用範囲は、サンプルのため本番でもRemovalPolicy.DESTROYにする。

の仕様でお願いします。
これに従って、`specs/004-awscdk_docker_image_deployment/specs.md`を修正してください。

# 2. specs.md -> plan.md

`specs/004-awscdk_docker_image_deployment/specs.md`を分析し、このプロジェクトの改善のための詳細な計画を作成してください。
計画を `SddTemplates/plan-template.md`を参考に,AWSのプロフェッショナルな視点で
`specs/004-awscdk_docker_image_deployment/plan.md`に記述してください。


# 3. Tasks 作成 : tasks.md

`specs/004-awscdk_docker_image_deployment/plan.md` に記載されている計画に従って、詳細な列挙型タスクリストを作成してください。
`SddTemplates/tasks-template.md`を参考に、AWSのプロフェッショナルな視点で、
タスクリストを `specs/004-awscdk_docker_image_deployment/tasks.md` に記述してください。


# 4. タスク実行 : tasks.md

タスクリスト `specs/004-awscdk_docker_image_deployment/tasks.md` を完了してください。
`specs/004-awscdk_docker_image_deployment/spec.md`、
`specs/004-awscdk_docker_image_deployment/plan.md`、
`specs/004-awscdk_docker_image_deployment/tasks.md`を参照し、
すべてのコンテキストを考慮してタスクリスト内のタスクを実装してください。
タスクを順番に完了することに集中してください。
タスクが完了したら、[x] を使用して完了マークを付けてください。
各ステップが完了したら、タスクリストのマークとタスクの完了マーク [x] を更新することが非常に重要です。

AWSのプロフェッショナルな視点で実装してください。

## 4.1 タスク実行の継続

タスクリスト`specs/004-awscdk_docker_image_deployment/tasks.md`に完了マークがついていないタスクがあります。
続けてタスク実行を実施してください。


# 5. コミットメッセージの作成

`004-docker-image-deployment`ブランチで行った変更のコミットメッセージを作成してください。
