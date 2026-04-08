export interface Environment {
  production: boolean;
  telegram: {
    apiId: string; // NOTE: This can be overridden by the github action secrets
    apiHash: string; // NOTE: This can be overridden by the github action secrets
  };
}