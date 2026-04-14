
export interface AIModel {
  id: string;
  name: string;
  provider: 'google' | 'openai-compatible';
  apiBase?: string;
  apiKey?: string;
}

export const GLOBAL_AI_CONFIG = {
  // Modelo por defecto al cargar la app
  defaultModelId: 'deepseek-coder',
  
  // Lista global de modelos disponibles
  availableModels: [
    { 
      id: 'deepseek-coder', 
      name: 'DeepSeek Coder (Global)', 
      provider: 'openai-compatible',
      apiBase: import.meta.env.VITE_DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1',
      apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY
    },
    { 
      id: 'gemini-2.5-flash', 
      name: 'Gemini 2.5 Flash', 
      provider: 'google' 
    },
    { 
      id: 'gemini-2.0-flash-exp', 
      name: 'Gemini 2.0 Flash Exp', 
      provider: 'google' 
    },
    { 
      id: 'gemini-1.5-pro', 
      name: 'Gemini 1.5 Pro', 
      provider: 'google' 
    }
  ] as AIModel[]
};
