import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export type TodoCloudFrontConstructProps = {
  loadBalancer: elbv2.IApplicationLoadBalancer;
};

export class TodoCloudFrontConstruct extends Construct {
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: TodoCloudFrontConstructProps) {
    super(scope, id);

    // なぜ必要か: CloudFrontを公開入口に統一し、ALB直公開ではなくCDN経由の到達経路へ集約するため。
    const applicationLoadBalancerOrigin = new origins.LoadBalancerV2Origin(props.loadBalancer, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
    });

    // なぜ必要か: 認証付きAPIで誤キャッシュを避けつつHTTPSで公開し、Authorizationヘッダーをbackendへ確実に転送するため。
    this.distribution = new cloudfront.Distribution(this, 'TodoApiDistribution', {
      defaultBehavior: {
        origin: applicationLoadBalancerOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      },
    });
  }
}
