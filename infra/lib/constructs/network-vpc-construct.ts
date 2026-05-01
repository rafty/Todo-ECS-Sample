import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export type NetworkVpcConstructProps = {
  vpcName: string;
};

export class NetworkVpcConstruct extends Construct {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props: NetworkVpcConstructProps) {
    super(scope, id);

    // なぜ必要か: ALB/ECS/Aurora を責務分離して配置するため、3層サブネットのVPCを新規作成する。
    this.vpc = new ec2.Vpc(this, props.vpcName, {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'front',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'application',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'datastore',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });
  }
}