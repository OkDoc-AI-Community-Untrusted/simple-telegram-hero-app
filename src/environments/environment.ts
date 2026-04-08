import { Environment } from "./environment.interface";

export const environment: Environment = {
  production: false,
  telegram: {
    apiId: 'TELEGRAM_API_ID_PLACEHOLDER', // NOTE: This can be overridden by the github action secrets
    apiHash: 'TELEGRAM_API_HASH_PLACEHOLDER', // NOTE: This can be overridden by the github action secrets
  },
};
