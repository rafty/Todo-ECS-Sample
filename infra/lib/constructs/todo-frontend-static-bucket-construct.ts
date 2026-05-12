import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class TodoFrontendStaticBucketConstruct extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // なぜ必要か: SPA配信用オブジェクトを安全に保持し、公開をCloudFront経由へ限定するため。
    this.bucket = new s3.Bucket(this, 'TodoFrontendStaticBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: false,
    });
  }
}
