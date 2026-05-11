import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as imagedeploy from 'cdk-docker-image-deployment';
import { Construct } from 'constructs';

export type BackendImageDeploymentConstructProps = {
  repository: ecr.IRepository;
  backendDirectoryPath: string;
  imageTag: string;
};

export class BackendImageDeploymentConstruct extends Construct {
  constructor(scope: Construct, id: string, props: BackendImageDeploymentConstructProps) {
    super(scope, id);

    // なぜ必要か: backendディレクトリのDockerfileをビルドし、ECRへ配布する責務を分離するため。
    new imagedeploy.DockerImageDeployment(this, 'BackendDockerImageDeployment', {
      source: imagedeploy.Source.directory(props.backendDirectoryPath),
      destination: imagedeploy.Destination.ecr(props.repository, {
        tag: props.imageTag,
      }),
    });
  }
}
