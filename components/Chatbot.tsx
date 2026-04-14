
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { GLOBAL_AI_CONFIG } from '../services/aiProviders';
import { queryAI } from '../services/aiService';
import type { ChatMessage } from '../types';
import { ChatIcon } from './icons/ChatIcon';
import { CloseIcon } from './icons/CloseIcon';
import { SendIcon } from './icons/SendIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { SimpleMarkdown } from './SimpleMarkdown';

export const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedModel, setSelectedModel] = useState(GLOBAL_AI_CONFIG.defaultModelId);
    const chatRef = useRef<Chat | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const availableModels = GLOBAL_AI_CONFIG.availableModels;

    useEffect(() => {
        if (isOpen) {
            try {
                const apiKey = process.env.API_KEY;

                if (!apiKey) {
                    setError("La clave API de Gemini no está configurada.");
                    return;
                }

                const ai = new GoogleGenAI({ apiKey: apiKey });
                chatRef.current = ai.chats.create({
                    model: selectedModel,
                    config: {
                        systemInstruction: 'Eres un asistente de IA amigable y útil. Responde a las preguntas de los usuarios de forma concisa y clara. Puedes ayudar a los usuarios a comprender los datos que han cargado en la aplicación, pero no tienes acceso directo a esos datos. Los usuarios pueden hacerte preguntas generales o sobre análisis de datos.',
                    },
                });
                setMessages([{ role: 'model', text: `¡Hola! Soy tu asistente de IA usando ${availableModels.find(m => m.id === selectedModel)?.name}. ¿Cómo puedo ayudarte hoy?` }]);
            } catch (e) {
                console.error("Failed to initialize chat:", e);
                setError("No se pudo iniciar el chat. Verifica la configuración de la API o el entorno de ejecución.");
            }
        } else {
            chatRef.current = null;
        }
    }, [isOpen, selectedModel]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !chatRef.current) return;

        const userMessage: ChatMessage = { role: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        setError(null);

        try {
            // Usamos queryAI para manejar globalmente tanto Gemini como DeepSeek
            const responseText = await queryAI("", input, messages, undefined, selectedModel);
            
            const modelMessage: ChatMessage = { role: 'model', text: responseText };
            setMessages(prev => [...prev, modelMessage]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Ocurrió un error desconocido.';
            setError(`Error al obtener respuesta: ${errorMessage}`);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    return (
        <>
            {/* FAB */}
            <button
                onClick={toggleChat}
                className="fixed bottom-6 right-6 bg-brand-600 text-white p-4 rounded-full shadow-lg hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-opacity-50 transform hover:scale-110 transition-all duration-300 z-50"
                aria-label="Abrir chat de IA"
            >
                {isOpen ? <CloseIcon className="w-6 h-6" /> : <ChatIcon className="w-6 h-6" />}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-[90vw] max-w-md h-[70vh] max-h-[600px] bg-brand-900 border border-brand-800 rounded-2xl shadow-2xl flex flex-col z-50 animate-fade-in-up">
                    {/* Header */}
                    <header className="flex items-center justify-between p-4 border-b border-brand-800 bg-brand-900/80 backdrop-blur-sm rounded-t-2xl">
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                                <SparklesIcon className="w-5 h-5 text-brand-400" />
                                <h2 className="text-md font-bold text-white">Asistente AI</h2>
                            </div>
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value)}
                                className="bg-brand-800 text-brand-200 text-[10px] px-2 py-0.5 rounded border border-brand-700 focus:outline-none focus:border-brand-500"
                            >
                                {availableModels.map(model => (
                                    <option key={model.id} value={model.id}>{model.name}</option>
                                ))}
                            </select>
                        </div>
                        <button onClick={toggleChat} className="text-brand-300 hover:text-white">
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </header>

                    {/* Messages */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs md:max-w-sm px-4 py-2 rounded-xl ${msg.role === 'user' ? 'bg-brand-600 text-white' : 'bg-brand-800 text-brand-100'}`}>
                                    <SimpleMarkdown text={msg.text} />
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="max-w-xs md:max-w-sm px-4 py-2 rounded-xl bg-brand-800 text-brand-100">
                                    <div className="flex items-center space-x-1">
                                        <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                                        <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                                        <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        {error && (
                            <div className="flex justify-start">
                                <div className="max-w-xs md:max-w-sm px-4 py-2 rounded-xl bg-red-900/50 border border-red-500 text-red-300">
                                    {error}
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSendMessage} className="p-4 border-t border-brand-800">
                        <div className="flex items-center bg-brand-800 rounded-lg">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Escribe tu pregunta..."
                                disabled={isLoading}
                                className="flex-1 w-full bg-transparent p-3 text-white placeholder-brand-400 focus:outline-none"
                                aria-label="Entrada de chat"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="p-3 text-brand-400 hover:text-white disabled:text-brand-500 disabled:cursor-not-allowed"
                                aria-label="Enviar mensaje"
                            >
                                <SendIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
};
