export type EnvironmentName = 'dev' | 'stg' | 'prod';

export type EnvironmentConfig = {
  environmentName: EnvironmentName;
  accountId: string;
  region: string;
};

const environmentConfigs: Record<EnvironmentName, EnvironmentConfig> = {
  // なぜ必要か: 将来の環境追加時に同じ構成で横展開できるよう、環境設定を明示しておく。
  dev: {
    environmentName: 'dev',
    accountId: '111111111111',
    region: 'ap-northeast-1',
  },
  stg: {
    environmentName: 'stg',
    accountId: '222222222222',
    region: 'ap-northeast-1',
  },
  // なぜ必要か: 本featureで実際に対象とする本番環境のデプロイ先を固定する。
  prod: {
    environmentName: 'prod',
    accountId: '288742313204',
    region: 'ap-northeast-1',
  },
};

export function getEnvironmentConfig(targetEnvironment: string): EnvironmentConfig {
  if (targetEnvironment in environmentConfigs) {
    return environmentConfigs[targetEnvironment as EnvironmentName];
  }

  // なぜ必要か: 不正な環境名で意図しないアカウントにデプロイされる事故を防止する。
  throw new Error(`未対応の環境指定です: ${targetEnvironment}. 利用可能: dev, stg, prod`);
}
