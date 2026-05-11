import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';

export type TodoAppEcrRepositoryConstructProps = {
  repositoryName: string;
};

export class TodoEcrRepositoryConstruct extends Construct {
  public readonly repository: ecr.Repository;

  constructor(scope: Construct, id: string, props: TodoAppEcrRepositoryConstructProps) {
    super(scope, id);

    // なぜ必要か: CDK管理下でbackendコンテナイメージの配布先を一意に確保するため。
    this.repository = new ecr.Repository(this, 'TodoAppRepository', {
      repositoryName: props.repositoryName,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      // なぜ必要か: サンプル環境でStack削除時にイメージ残存で失敗しないようにするため。
      emptyOnDelete: true,
    });
  }
}
