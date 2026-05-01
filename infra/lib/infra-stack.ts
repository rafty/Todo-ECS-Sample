import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NetworkVpcConstruct } from './constructs/network-vpc-construct';

export type InfraStackProps = cdk.StackProps & {
  environmentName: string;
  serviceName: string;
  version: string;
};

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    // なぜ必要か: Stack の責務を「構成の組み立て」に限定し、ネットワーク定義を Construct に分離して保守性を高める。
    const networkVpc = new NetworkVpcConstruct(this, 'NetworkVpcConstruct', {
      vpcName: 'NetworkVpc',
    });

    // なぜ必要か: デバッグや後続Stack連携時に対象VPCを一意に参照できるようにする。
    new cdk.CfnOutput(this, 'VpcId', {
      value: networkVpc.vpc.vpcId,
    });

    // なぜ必要か: 全リソースの環境識別・サービス識別・版管理を運用で追跡できるようにする。
    cdk.Tags.of(this).add('env', props.environmentName);
    cdk.Tags.of(this).add('service', props.serviceName);
    cdk.Tags.of(this).add('version', props.version);
  }
}
