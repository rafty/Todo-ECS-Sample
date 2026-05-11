import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'node:path';
import { BackendImageDeploymentConstruct } from './constructs/backend-image-deployment-construct';
import { NetworkVpcConstruct } from './constructs/network-vpc-construct';
import { TodoEcrRepositoryConstruct } from './constructs/todo-ecr-repository-construct';

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

    // なぜ必要か: backendイメージの配布先を固定し、運用時に参照先を統一するため。
    const todoAppEcrRepository = new TodoEcrRepositoryConstruct(this, 'TodoEcrRepositoryConstruct', {
      repositoryName: 'todo',
    });

    // なぜ必要か: ECR配布処理の責務を分離し、ECS更新を含めない仕様をコードで明確化するため。
    new BackendImageDeploymentConstruct(this, 'BackendImageDeploymentConstruct', {
      repository: todoAppEcrRepository.repository,
      backendDirectoryPath: path.join(__dirname, '../../backend'),
      imageTag: 'latest',
    });

    // なぜ必要か: デプロイ後に配布先リポジトリ情報を確認できるようにするため。
    new cdk.CfnOutput(this, 'TodoAppEcrRepositoryName', {
      value: todoAppEcrRepository.repository.repositoryName,
    });

    // なぜ必要か: 他Stackや運用手順から完全修飾URIを参照できるようにするため。
    new cdk.CfnOutput(this, 'TodoAppEcrRepositoryUri', {
      value: todoAppEcrRepository.repository.repositoryUri,
    });

    // なぜ必要か: 配布タグ固定仕様（latest）をテンプレート上でも明示するため。
    new cdk.CfnOutput(this, 'TodoAppEcrImageTag', {
      value: 'latest',
    });

    // なぜ必要か: 全リソースの環境識別・サービス識別・版管理を運用で追跡できるようにする。
    cdk.Tags.of(this).add('env', props.environmentName);
    cdk.Tags.of(this).add('service', props.serviceName);
    cdk.Tags.of(this).add('version', props.version);
  }
}
