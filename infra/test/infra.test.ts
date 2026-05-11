import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { InfraStack } from '../lib/infra-stack';

test('Network, ECS, ALB and Aurora resources are defined', () => {
  const app = new cdk.App();
  const stack = new InfraStack(app, 'MyTestStack', {
    env: { account: '111111111111', region: 'ap-northeast-1' },
    environmentName: 'prod',
    serviceName: 'Todo',
    version: '1.00',
  });

  const template = Template.fromStack(stack);

  template.resourceCountIs('AWS::EC2::VPC', 1);
  template.resourceCountIs('AWS::EC2::Subnet', 6);
  template.resourceCountIs('AWS::EC2::NatGateway', 1);
  template.resourceCountIs('AWS::ECR::Repository', 1);
  template.resourceCountIs('AWS::ECS::Cluster', 1);
  template.resourceCountIs('AWS::ECS::Service', 1);
  template.resourceCountIs('AWS::ECS::TaskDefinition', 1);
  template.resourceCountIs('AWS::ElasticLoadBalancingV2::LoadBalancer', 1);
  template.resourceCountIs('AWS::ElasticLoadBalancingV2::TargetGroup', 1);
  template.resourceCountIs('AWS::RDS::DBCluster', 1);
  template.resourceCountIs('AWS::RDS::DBInstance', 1);
  template.resourceCountIs('AWS::SecretsManager::Secret', 1);

  // なぜ必要か: ECRリポジトリ名と削除ポリシーが仕様どおりであることを担保するため。
  template.hasResourceProperties('AWS::ECR::Repository', {
    RepositoryName: 'todo',
  });
  template.hasResource('AWS::ECR::Repository', {
    DeletionPolicy: 'Delete',
    UpdateReplacePolicy: 'Delete',
  });

  // なぜ必要か: ECSがtodo:latestを参照し、DB接続情報をシークレット経由で受け取ることを担保するため。
  template.hasResourceProperties('AWS::ECS::TaskDefinition', {
    ContainerDefinitions: Match.arrayWith([
      Match.objectLike({
        PortMappings: Match.arrayWith([
          Match.objectLike({
            ContainerPort: 8080,
          }),
        ]),
        Secrets: Match.arrayWith([
          Match.objectLike({
            Name: 'SPRING_DATASOURCE_USERNAME',
          }),
          Match.objectLike({
            Name: 'SPRING_DATASOURCE_PASSWORD',
          }),
        ]),
      }),
    ]),
  });
  expect(JSON.stringify(template.toJSON())).toContain(':latest');

  // なぜ必要か: AuroraがPostgreSQLエンジンで作成され、todos用途のDB名を保持することを担保するため。
  template.hasResourceProperties('AWS::RDS::DBCluster', {
    Engine: 'aurora-postgresql',
    DatabaseName: 'todoapp',
  });

  // なぜ必要か: ALB経由のヘルスチェックパスが明示され、ECSターゲットへ転送されることを担保するため。
  template.hasResourceProperties('AWS::ElasticLoadBalancingV2::TargetGroup', {
    Port: 8080,
    Protocol: 'HTTP',
    HealthCheckPath: '/',
  });

  // なぜ必要か: 最小通信ルールとしてALB -> ECS -> Aurora の導線が形成されることを担保するため。
  template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
    FromPort: 8080,
    ToPort: 8080,
    IpProtocol: 'tcp',
  });
  template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
    FromPort: 5432,
    ToPort: 5432,
    IpProtocol: 'tcp',
  });
  template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
    FromPort: 5432,
    ToPort: 5432,
    IpProtocol: 'tcp',
  });

  template.hasResourceProperties('AWS::EC2::VPC', {
    Tags: Match.arrayWith([
      { Key: 'env', Value: 'prod' },
      { Key: 'service', Value: 'Todo' },
      { Key: 'version', Value: '1.00' },
    ]),
  });
});
