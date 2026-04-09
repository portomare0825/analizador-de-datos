
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, ".env.local") });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey || apiKey === "PLACEHOLDER_API_KEY") {
        console.error("Error: No se encontró una clave API válida en .env.local");
        return;
    }

    try {
        const ai = new GoogleGenAI({ apiKey });
        console.log("Intentando listar modelos...");

        // Asumiendo que el SDK tiene un método para listar modelos
        // Si no, probaremos con fetch directo
        if (ai.models && typeof ai.models.list === 'function') {
            const models = await ai.models.list();
            console.log("Modelos disponibles:");
            console.log(JSON.stringify(models, null, 2));
        } else {
            console.log("ai.models.list no está disponible, probando fetch directo a v1beta...");
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const data = await response.json();
            console.log("Respuesta de API (ListModels):");
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error("Error diagnosticando modelos:", error);
    }
}

listModels();
