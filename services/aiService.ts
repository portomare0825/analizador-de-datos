
import { queryData as queryGemini } from './geminiService';
import { queryDeepSeek } from './deepseekService';
import { GLOBAL_AI_CONFIG } from './aiProviders';

export const queryAI = async (
  csvData: string,
  question: string,
  history: any[] = [],
  onToolCall?: (name: string, args: any) => Promise<any>,
  modelId: string = GLOBAL_AI_CONFIG.defaultModelId
): Promise<string> => {
  const modelConfig = GLOBAL_AI_CONFIG.availableModels.find(m => m.id === modelId);

  if (!modelConfig) {
    throw new Error(`Modelo no encontrado: ${modelId}`);
  }

  if (modelConfig.provider === 'openai-compatible' || modelId.includes('deepseek')) {
    return await queryDeepSeek(csvData, question, history, onToolCall, modelId);
  } else {
    return await queryGemini(csvData, question, history, onToolCall, modelId);
  }
};
