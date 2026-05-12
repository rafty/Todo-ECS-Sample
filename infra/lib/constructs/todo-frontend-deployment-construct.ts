import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export type TodoFrontendDeploymentConstructProps = {
  destinationBucket: s3.IBucket;
  distribution: cloudfront.IDistribution;
  frontendBuildDirectoryPath: string;
  runtimeConfig: Record<string, unknown>;
};

export class TodoFrontendDeploymentConstruct extends Construct {
  public readonly deployment: s3deploy.BucketDeployment;

  constructor(scope: Construct, id: string, props: TodoFrontendDeploymentConstructProps) {
    super(scope, id);

    // なぜ必要か: frontend/dist の成果物と実行時設定を同一デプロイで配置し、環境差分管理を単純化するため。
    this.deployment = new s3deploy.BucketDeployment(this, 'TodoFrontendBucketDeployment', {
      destinationBucket: props.destinationBucket,
      sources: [
        s3deploy.Source.asset(props.frontendBuildDirectoryPath),
        s3deploy.Source.jsonData('runtime-config.json', props.runtimeConfig),
      ],
      // なぜ必要か: 新バージョン反映直後の古いキャッシュ参照を避けるため。
      distribution: props.distribution,
      distributionPaths: ['/*'],
      waitForDistributionInvalidation: true,
      prune: true,
    });
  }
}
