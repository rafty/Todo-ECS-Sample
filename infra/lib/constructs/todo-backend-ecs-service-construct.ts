import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export type TodoBackendEcsServiceConstructProps = {
  vpc: ec2.IVpc;
  securityGroup: ec2.ISecurityGroup;
  repository: ecr.IRepository;
  imageTag: string;
  databaseSecret: secretsmanager.ISecret;
  containerPort: number;
  desiredCount: number;
};

export class TodoBackendEcsServiceConstruct extends Construct {
  public readonly cluster: ecs.Cluster;
  public readonly taskDefinition: ecs.FargateTaskDefinition;
  public readonly service: ecs.FargateService;

  constructor(scope: Construct, id: string, props: TodoBackendEcsServiceConstructProps) {
    super(scope, id);

    // なぜ必要か: Todoバックエンドの実行先を既存VPC内で管理するECSクラスターを作るため。
    this.cluster = new ecs.Cluster(this, 'TodoBackendCluster', {
      vpc: props.vpc,
      clusterName: 'todo-backend-cluster',
    });

    // なぜ必要か: タスクのCPU/メモリやIAM境界を固定し、実行定義を明確化するため。
    this.taskDefinition = new ecs.FargateTaskDefinition(this, 'TodoBackendTaskDefinition', {
      cpu: 512,
      memoryLimitMiB: 1024,
    });

    // なぜ必要か: アプリログをCloudWatch Logsで集約し、起動/接続トラブルを追跡可能にするため。
    const applicationLogGroup = new logs.LogGroup(this, 'TodoBackendLogGroup', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // なぜ必要か: 既存ECRイメージ(todo:latest)を使ってSpring BootアプリをFargateで実行するため。
    this.taskDefinition.addContainer('TodoBackendContainer', {
      image: ecs.ContainerImage.fromEcrRepository(props.repository, props.imageTag),
      logging: ecs.LogDrivers.awsLogs({
        logGroup: applicationLogGroup,
        streamPrefix: 'todo-backend',
      }),
      portMappings: [
        {
          containerPort: props.containerPort,
          protocol: ecs.Protocol.TCP,
        },
      ],
      environment: {
        // なぜ必要か: 認証導入前でもowner_subject入力方針を段階的に検証できるよう既定値を保持するため。
        TODO_OWNER_SUBJECT_DEFAULT: 'anonymous',
      },
      secrets: {
        // なぜ必要か: DB接続情報を平文環境変数に置かずSecrets Manager経由で渡すため。
        SPRING_DATASOURCE_HOST: ecs.Secret.fromSecretsManager(props.databaseSecret, 'host'),
        SPRING_DATASOURCE_PORT: ecs.Secret.fromSecretsManager(props.databaseSecret, 'port'),
        SPRING_DATASOURCE_DBNAME: ecs.Secret.fromSecretsManager(props.databaseSecret, 'dbname'),
        SPRING_DATASOURCE_USERNAME: ecs.Secret.fromSecretsManager(props.databaseSecret, 'username'),
        SPRING_DATASOURCE_PASSWORD: ecs.Secret.fromSecretsManager(props.databaseSecret, 'password'),
      },
    });

    // なぜ必要か: コンテナ起動時のイメージpullに必要な権限を実行ロールへ限定付与するため。
    if (this.taskDefinition.executionRole) {
      props.repository.grantPull(this.taskDefinition.executionRole);
      props.databaseSecret.grantRead(this.taskDefinition.executionRole);
    }

    // なぜ必要か: アプリ実行時にDBシークレット参照が必要なため、タスクロールにも最小権限を付与する。
    props.databaseSecret.grantRead(this.taskDefinition.taskRole);

    // なぜ必要か: ALB配下で稼働する常駐APIとしてFargateサービスをapplicationサブネットに配置するため。
    this.service = new ecs.FargateService(this, 'TodoBackendService', {
      cluster: this.cluster,
      taskDefinition: this.taskDefinition,
      desiredCount: props.desiredCount,
      assignPublicIp: false,
      securityGroups: [props.securityGroup],
      vpcSubnets: {
        subnetGroupName: 'application',
      },
    });
  }
}
