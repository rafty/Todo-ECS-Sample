# 1. Requirements draft -> specs.md

まず、本プロジェクトを検査してください。
`infra/specs/002-create_network/requirements-draft.md`に要件のドラフト版を記載しました。
`infra/specs/002-create_network/requirements-draft.md`を分析し、
`SddTemplates/spec-template.md` を参考に,
AWSのプロフェッショナルな視点で、要件`infra/specs/002-create_network/spec.md` を作ってください。


## 1.1. requirements-draftの改善: requirements-draft.md => requirements.md
> 期待する要件定義書が作成されない場合

`requirements/requirements.md`の結果から、`requirements-draft.md`を見直しました。
再度、ファイル`requirements/requirements-draft.md`を分析し、
本プロジェクトを検査してください。
AWSのプロフェッショナルな視点で、`requirements-draft.md`のドラフト要件を再検討し`requirements/requirements.md`を改善してください。


# 2. specs.md -> plan.md

`infra/specs/002-create_network/spec.md`を分析し、このプロジェクトの改善のための詳細な計画を作成してください。
計画を `SddTemplates/plan-template.md`を参考に,AWSのプロフェッショナルな視点で
`infra/specs/002-create_network/plan.md`に記述してください。


## 2.1 planの修正

```text
現在の`infra/specs/002-create_network/plan.md`には、「NAT要件解釈」、「versionタグのハッシュ算出ルール」とありますが、
  以下の内容を元に、現在の`infra/specs/002-create_network/plan.md`を見直して修正してください。

# NAT要件の見直し
「NAT要件解釈」とありますが、
https://aws.amazon.com/jp/blogs/networking-and-content-delivery/introducing-amazon-vpc-regional-nat-gateway/にあるように、
AZやPublic Subnetに依存しないRNATが作成できます。

# version タグのルールの見直し
現在はハッシュ算出が難しいので、現時点ではversionを1.00としてください。
```

## 2.2 planの修正

```text
「## 未解決事項
- Security Groupの具体的な許可ポート・通信方向（ALB->ECS、ECS->DBなど）。」

とありますが、Security Groupに関しては、この要件ではなく、BackendやCloudFront、ALB、ECS、Databaseなどを作成する際に一緒にSecurity Groupを作成するようにします。

現時点のinfra/specs/002-create_network/plan.mdをこの内容に合わせて、全体を修正してください。
```

# 3. Tasks 作成
```text
`infra/specs/002-create_network/plan.md` に記載されている計画に従って、詳細な列挙型タスクリストを作成してください。
`SddTemplates/tasks-template.md`を参考に、AWSのプロフェッショナルな視点で、
タスクリストを `infra/specs/002-create_network/tasks.md` に記述してください。
```

# 4. タスク実行 : tasks.md
```text
タスクリスト `infra/specs/002-create_network/tasks.md` を完了してください。
`infra/specs/002-create_network/spec.md`、`infra/specs/002-create_network/plan.md`、`infra/specs/002-create_network/tasks.md`を参照し、
すべてのコンテキストを考慮してタスクリスト内のタスクを実装してください。
タスクを順番に完了することに集中してください。
タスクが完了したら、[x] を使用して完了マークを付けてください。
各ステップが完了したら、タスクリストのマークとタスクの完了マーク [x] を更新することが非常に重要です。

AWSのプロフェッショナルな視点で、現行の`infra/`のCDKプロジェクトに修正を加え、実装してください。
```

## 4.1 タスク実行の継続
```text
タスクリスト`infra/specs/002-create_network/tasks.md`に完了マークがついていないタスクがあります。
続けてタスク実行を実施してください。
```

# 5. コミットメッセージの作成

```text
`002-create-network`ブランチで行った変更のコミットメッセージを作成してください。
```