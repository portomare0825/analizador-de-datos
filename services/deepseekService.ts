
export interface ChatHistoryEntry {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const queryDeepSeek = async (
  csvData: string,
  question: string,
  history: any[] = [],
  onToolCall?: (name: string, args: any) => Promise<any>,
  modelName: string = 'deepseek-coder'
): Promise<string> => {
  try {
    const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY || '';
    const apiBase = import.meta.env.VITE_DEEPSEEK_API_BASE || 'https://api.deepseek.com/v1';

    if (!apiKey || apiKey === 'tu-api-key-aqui') {
      throw new Error('La clave API de DeepSeek no está configurada en .env.local');
    }

    const systemInstruction = `
    Eres un asistente experto en análisis de datos para LD Hoteles.
    Analiza los datos CSV proporcionados y responde la pregunta del usuario con precisión técnica.
    
    Regla de Oro: Siempre sé preciso con los números y cita las fuentes de los datos.
    
    Los datos locales CSV actuales son:
    ---
    ${csvData.slice(0, 10000)} ... (truncado para eficiencia)
    ---
    `;

    // Convertir historial al formato de OpenAI/DeepSeek
    const messages = [
      { role: 'system', content: systemInstruction },
      ...history.map(h => ({
        role: h.role === 'model' ? 'assistant' : h.role,
        content: h.parts?.[0]?.text || h.text || ''
      })),
      { role: 'user', content: question }
    ];

    const response = await fetch(`${apiBase}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        temperature: 0.2,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `Error de API: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content || "No se pudo generar una respuesta.";

  } catch (error: any) {
    console.error('La llamada a la API de DeepSeek falló:', error);
    return `Error en DeepSeek: ${error.message}`;
  }
};
