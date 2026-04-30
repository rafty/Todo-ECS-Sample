import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export type InfraStackProps = cdk.StackProps & {
  environmentName: string;
  serviceName: string;
  version: string;
};

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    // なぜ必要か: ALB/ECS/Aurora を責務分離して配置するため、3層サブネットのVPCを新規作成する。
    const vpc = new ec2.Vpc(this, 'NetworkVpc', {
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

    // なぜ必要か: デバッグや後続Stack連携時に対象VPCを一意に参照できるようにする。
    new cdk.CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
    });

    // なぜ必要か: 全リソースの環境識別・サービス識別・版管理を運用で追跡できるようにする。
    cdk.Tags.of(this).add('env', props.environmentName);
    cdk.Tags.of(this).add('service', props.serviceName);
    cdk.Tags.of(this).add('version', props.version);
  }
}
