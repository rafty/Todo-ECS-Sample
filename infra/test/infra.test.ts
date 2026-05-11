import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { InfraStack } from '../lib/infra-stack';

test('Network VPC resources are defined', () => {
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

  // なぜ必要か: ECRリポジトリ名と削除ポリシーが仕様どおりであることを担保するため。
  template.hasResourceProperties('AWS::ECR::Repository', {
    RepositoryName: 'todo',
  });
  template.hasResource('AWS::ECR::Repository', {
    DeletionPolicy: 'Delete',
    UpdateReplacePolicy: 'Delete',
  });

  template.hasResourceProperties('AWS::EC2::VPC', {
    Tags: Match.arrayWith([
      { Key: 'env', Value: 'prod' },
      { Key: 'service', Value: 'Todo' },
      { Key: 'version', Value: '1.00' },
    ]),
  });
});
