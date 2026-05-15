import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecrassets from 'aws-cdk-lib/aws-ecr-assets';
import * as ecrdeploy from 'cdk-ecr-deployment';
import { Construct } from 'constructs';

export type BackendImageDeploymentConstructProps = {
  repository: ecr.IRepository;
  backendDirectoryPath: string;
};

export class BackendImageDeploymentConstruct extends Construct {
  public readonly imageTag: string;
  public readonly imageDeployment: ecrdeploy.ECRDeployment;

  constructor(scope: Construct, id: string, props: BackendImageDeploymentConstructProps) {
    super(scope, id);

    // なぜ必要か: backendディレクトリをDocker buildして、内容に連動したタグを生成するため。
    // 注意: build context外ファイルの変更はasset hashに反映しない運用方針とする。
    const backendDockerImageAsset = new ecrassets.DockerImageAsset(this, 'BackendDockerImageAsset', {
      directory: props.backendDirectoryPath,
    });
    this.imageTag = backendDockerImageAsset.imageTag;

    // なぜ必要か: CDK管理のasset ECRから、アプリが参照するECRリポジトリへ同一タグで配布するため。
    this.imageDeployment = new ecrdeploy.ECRDeployment(this, 'BackendEcrImageDeployment', {
      src: new ecrdeploy.DockerImageName(backendDockerImageAsset.imageUri),
      dest: new ecrdeploy.DockerImageName(props.repository.repositoryUriForTag(this.imageTag)),
    });
  }
}
