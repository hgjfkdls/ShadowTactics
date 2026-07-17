import type { AIModel, AIModelConfig } from './types';

const models = new Map<string, AIModel>();

export function registerModel(model: AIModel): void {
  models.set(model.config.id, model);
}

export function getModel(id: string): AIModel | undefined {
  return models.get(id);
}

export function listModels(): AIModelConfig[] {
  return [...models.values()].map(m => m.config);
}
