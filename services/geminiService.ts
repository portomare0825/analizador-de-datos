import { GoogleGenAI } from "@google/genai";

// Definición de las herramientas (tools) que Gemini puede usar
const databaseTools = [
  {
    function_declarations: [
      {
        name: "list_database_tables",
        description: "Devuelve una lista de todas las tablas de base de datos disponibles para consulta.",
        parameters: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "execute_database_query",
        description: "Ejecuta una consulta SELECT a una tabla de la base de datos de Supabase usando sintaxis de Postgrest.",
        parameters: {
          type: "object",
          properties: {
            table_name: {
              type: "string",
              description: "Nombre de la tabla a consultar (ej: 'reservas', 'transacciones_plus', 'notas_de_cuentas')."
            },
            select: {
              type: "string",
              description: "Columnas a seleccionar separadas por comas (ej: '*', 'id,nombre,monto'). Omite espacios extra."
            },
            filter: {
              type: "string",
              description: "Filtros opcionales en formato Postgrest (ej: 'id=eq.123', 'monto=gt.100', 'created_at=gte.2025-01-01')."
            },
            limit: {
              type: "number",
              description: "Máximo de registros a devolver (default: 100)."
            },
            order: {
              type: "string",
              description: "Ordenamiento (ej: 'created_at.desc')."
            }
          },
          required: ["table_name", "select"]
        }
      }
    ]
  }
];

export interface ChatHistoryEntry {
  role: 'user' | 'model' | 'function';
  parts: { text?: string; functionCall?: any; functionResponse?: any }[];
}

export const queryData = async (
  csvData: string,
  question: string,
  history: ChatHistoryEntry[] = [],
  onToolCall?: (name: string, args: any) => Promise<any>,
  modelName: string = 'gemini-2.5-flash'
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

    // Prompt de sistema implícito
    const systemInstruction = `
    Eres un asistente experto en análisis de datos para LD Hoteles.
    Tienes acceso a varias tablas de base de datos en Supabase.
    
    Tablas Disponibles y su Propósito:
    - 'reservas': Reservas del hotel Plus.
    - 'reservaspalm': Reservas del hotel Palm.
    - 'transacciones_plus': Movimientos financieros detallados de Plus.
    - 'transacciones_palm': Movimientos financieros detallados de Palm.
    - 'notas_de_cuentas': Notas y ajustes manuales hechos por auditores.
    - 'factura': Datos de facturación cerrada.
    - 'tasas_cambiarias': Histórico de tasas de cambio (Bs/$).

    Si el usuario te da datos locales (CSV), úsalos prioritariamente si la pregunta se refiere a "estos datos".
    Si la pregunta es general sobre la base de datos o sobre algo que no está en el CSV, usa las herramientas (tools) para consultar Supabase.
    
    Regla de Oro: Siempre sé preciso con los números y cita de qué tabla obtuviste la información.
    Los datos locales CSV actuales son:
    ---
    ${csvData.slice(0, 10000)} ... (truncado para eficiencia)
    ---
    `;

    const contents: any[] = [
      ...history.map(h => ({
        role: h.role === 'function' ? 'model' : h.role,
        parts: h.parts
      })),
      { role: 'user', parts: [{ text: `${systemInstruction}\n\nPregunta: ${question}` }] }
    ];

    // Usamos casting a any para evitar errores de lint si el SDK tiene tipos incompletos
    let response = await (ai.models as any).generateContent({
      model: modelName,
      contents,
      tools: databaseTools
    });

    // Bucle para manejar llamadas a funciones
    let iterations = 0;
    const MAX_ITERATIONS = 5;

    while (iterations < MAX_ITERATIONS) {
      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      const functionCalls = parts.filter((p: any) => p.functionCall);

      if (functionCalls.length === 0) break;

      // Añadimos el mensaje del modelo con las llamadas a funciones al historial local
      if (candidate) {
        contents.push(candidate.content);
      }

      const toolResponses = [];
      for (const part of functionCalls) {
        const { name, args } = part.functionCall;
        console.log(`Ejecutando herramienta: ${name}`, args);

        if (onToolCall) {
          const toolResult = await onToolCall(name, args);
          toolResponses.push({
            functionResponse: {
              name,
              response: { result: toolResult }
            }
          });
        }
      }

      // Añadimos las respuestas de las funciones
      if (toolResponses.length > 0) {
        contents.push({ role: 'function', parts: toolResponses });

        // Volvemos a llamar a la API
        response = await (ai.models as any).generateContent({
          model: modelName,
          contents,
          tools: databaseTools
        });
      } else {
        break;
      }

      iterations++;
    }

    return response.text || "No se pudo generar una respuesta.";

  } catch (error: any) {
    console.error('La llamada a la API de Gemini falló:', error);
    if (error && typeof error === 'object' && error.message) {
      if (error.message.includes('API key not valid')) {
        throw new Error('La clave API de Gemini configurada no es válida. Por favor, revisa tu configuración.');
      }
      return `Error: ${error.message}`;
    }
    return `Error desconocido en Gemini: ${JSON.stringify(error)}`;
  }
};
