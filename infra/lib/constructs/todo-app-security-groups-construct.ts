import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export type TodoAppSecurityGroupsConstructProps = {
  vpc: ec2.IVpc;
  applicationPort: number;
  databasePort: number;
};

export class TodoAppSecurityGroupsConstruct extends Construct {
  public readonly albSecurityGroup: ec2.SecurityGroup;
  public readonly ecsSecurityGroup: ec2.SecurityGroup;
  public readonly auroraSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props: TodoAppSecurityGroupsConstructProps) {
    super(scope, id);

    // なぜ必要か: ALBからの受信とECSへの送信経路を明示し、公開入口の責務を分離するため。
    this.albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
      vpc: props.vpc,
      allowAllOutbound: false,
      description: 'Security group for Todo ALB',
    });

    // なぜ必要か: ECSタスクの受信元をALBに限定し、最小通信でアプリを保護するため。
    this.ecsSecurityGroup = new ec2.SecurityGroup(this, 'EcsSecurityGroup', {
      vpc: props.vpc,
      allowAllOutbound: false,
      description: 'Security group for Todo ECS service',
    });

    // なぜ必要か: Auroraへのアクセス元をECSのみに制限し、DBの露出を防ぐため。
    this.auroraSecurityGroup = new ec2.SecurityGroup(this, 'AuroraSecurityGroup', {
      vpc: props.vpc,
      allowAllOutbound: false,
      description: 'Security group for Todo Aurora cluster',
    });

    // なぜ必要か: インターネットからALBのHTTP受付を可能にするため。
    this.albSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'Allow HTTP access from internet',
    );

    // なぜ必要か: ALBがECSタスクのアプリポートへ到達できるようにするため。
    this.albSecurityGroup.addEgressRule(
      this.ecsSecurityGroup,
      ec2.Port.tcp(props.applicationPort),
      'Allow ALB to reach ECS application port',
    );

    // なぜ必要か: ECSタスクのアプリ受信をALB経由のみに制限するため。
    this.ecsSecurityGroup.addIngressRule(
      this.albSecurityGroup,
      ec2.Port.tcp(props.applicationPort),
      'Allow application traffic only from ALB',
    );

    // なぜ必要か: アプリケーションからAurora PostgreSQLへの接続を許可するため。
    this.ecsSecurityGroup.addEgressRule(
      this.auroraSecurityGroup,
      ec2.Port.tcp(props.databasePort),
      'Allow ECS to access Aurora PostgreSQL',
    );

    // なぜ必要か: ECR/CloudWatch/SecretsManager などAWS制御プレーンへの通信を確保するため。
    this.ecsSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'Allow ECS to access AWS APIs over HTTPS',
    );

    // なぜ必要か: DBポート受信をECSタスクのみに限定して不正アクセス面を減らすため。
    this.auroraSecurityGroup.addIngressRule(
      this.ecsSecurityGroup,
      ec2.Port.tcp(props.databasePort),
      'Allow PostgreSQL access only from ECS',
    );
  }
}
