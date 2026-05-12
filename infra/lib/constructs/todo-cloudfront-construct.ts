import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export type TodoCloudFrontConstructProps = {
  loadBalancer: elbv2.IApplicationLoadBalancer;
  staticSiteBucket: s3.IBucket;
};

export class TodoCloudFrontConstruct extends Construct {
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: TodoCloudFrontConstructProps) {
    super(scope, id);

    // なぜ必要か: API通信は既存ALBをオリジンに維持し、backend実装との接続互換を保つため。
    const applicationLoadBalancerOrigin = new origins.LoadBalancerV2Origin(props.loadBalancer, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
    });

    // なぜ必要か: 静的SPA配信をS3に分離し、CloudFront経由のみでオブジェクト配布するため。
    const staticSiteBucketOrigin = origins.S3BucketOrigin.withOriginAccessControl(props.staticSiteBucket);

    // なぜ必要か: 静的配信とAPI配信を1つの公開ドメインに統合し、CORSや配信経路の複雑性を下げるため。
    this.distribution = new cloudfront.Distribution(this, 'TodoApiDistribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: staticSiteBucketOrigin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      additionalBehaviors: {
        // なぜ必要か: 認証付きAPIで誤キャッシュを避け、Authorizationヘッダーをbackendへ確実に転送するため。
        '/api/*': {
          origin: applicationLoadBalancerOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
          compress: true,
        },
      },
      errorResponses: [
        // なぜ必要か: SPAルーティングで直接アクセス時もindex.htmlを返し、画面ルート解決を維持するため。
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
    });
  }
}
