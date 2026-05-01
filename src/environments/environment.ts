import { Environment } from "./environment.interface";

export const environment: Environment = {
  production: false,
  telegram: {
    apiId: '38979621', // NOTE: This can be overridden by the github action secrets
    apiHash: '7f75c11436b21aa29c8c2d346a6d026d', // NOTE: This can be overridden by the github action secrets
  },
};
