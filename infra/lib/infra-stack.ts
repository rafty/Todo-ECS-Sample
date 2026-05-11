import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'node:path';
import { TodoAlbConstruct } from './constructs/todo-alb-construct';
import { TodoAppSecurityGroupsConstruct } from './constructs/todo-app-security-groups-construct';
import { TodoAuroraConstruct } from './constructs/todo-aurora-construct';
import { TodoBackendEcsServiceConstruct } from './constructs/todo-backend-ecs-service-construct';
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

    // なぜ必要か: ALB/ECS/Auroraで利用する共通ポート/名称を集中管理し、設定不整合を防ぐため。
    const applicationPort = 8080;
    const databasePort = 5432;
    const databaseName = 'todoapp';
    // TODO: 人間に確認が必要: ヘルスチェックパスを `/` から `/actuator/health` へ統一するか。
    const healthCheckPath = '/';

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

    // なぜ必要か: ALB/ECS/Aurora間の通信境界を最小権限で管理するため。
    const todoAppSecurityGroups = new TodoAppSecurityGroupsConstruct(this, 'TodoAppSecurityGroupsConstruct', {
      vpc: networkVpc.vpc,
      applicationPort,
      databasePort,
    });

    // なぜ必要か: Todoアプリ永続化基盤としてAurora PostgreSQLとDBシークレットを用意するため。
    const todoAuroraDatabase = new TodoAuroraConstruct(this, 'TodoAuroraConstruct', {
      vpc: networkVpc.vpc,
      securityGroup: todoAppSecurityGroups.auroraSecurityGroup,
      databaseName,
      secretName: `/todo/${props.environmentName}/backend/database`,
    });

    // なぜ必要か: ECRイメージとDB接続設定を使ってFargateサービスを稼働させるため。
    const todoBackendEcsService = new TodoBackendEcsServiceConstruct(this, 'TodoBackendEcsServiceConstruct', {
      vpc: networkVpc.vpc,
      securityGroup: todoAppSecurityGroups.ecsSecurityGroup,
      repository: todoAppEcrRepository.repository,
      imageTag: 'latest',
      databaseSecret: todoAuroraDatabase.databaseSecret,
      containerPort: applicationPort,
      desiredCount: 2,
    });

    // なぜ必要か: インターネット入口としてALBを配置し、ECSサービスへルーティングするため。
    const todoApplicationAlb = new TodoAlbConstruct(this, 'TodoAlbConstruct', {
      vpc: networkVpc.vpc,
      securityGroup: todoAppSecurityGroups.albSecurityGroup,
      service: todoBackendEcsService.service,
      containerPort: applicationPort,
      healthCheckPath,
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

    // なぜ必要か: ALBのアクセス先をデプロイ後に即時確認できるようにするため。
    new cdk.CfnOutput(this, 'TodoAppAlbDnsName', {
      value: todoApplicationAlb.loadBalancer.loadBalancerDnsName,
    });

    // なぜ必要か: アプリ接続先のDBエンドポイントを運用確認しやすくするため。
    new cdk.CfnOutput(this, 'TodoAppAuroraEndpointAddress', {
      value: todoAuroraDatabase.cluster.clusterEndpoint.hostname,
    });

    // なぜ必要か: タスク定義のSecret注入先ARNを運用で参照できるようにするため。
    new cdk.CfnOutput(this, 'TodoAppDatabaseSecretArn', {
      value: todoAuroraDatabase.databaseSecret.secretArn,
    });

    // なぜ必要か: 全リソースの環境識別・サービス識別・版管理を運用で追跡できるようにする。
    cdk.Tags.of(this).add('env', props.environmentName);
    cdk.Tags.of(this).add('service', props.serviceName);
    cdk.Tags.of(this).add('version', props.version);
  }
}
