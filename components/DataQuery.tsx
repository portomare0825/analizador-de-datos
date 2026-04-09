
import React, { useState, useRef, useEffect } from 'react';
import { SimpleMarkdown } from './SimpleMarkdown';
import { SendIcon } from './icons/SendIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import type { ChatMessage } from '../types';

interface DataQueryProps {
  onQuery: (query: string, modelName: string) => void;
  history: ChatMessage[];
  isQuerying: boolean;
}

export const DataQuery: React.FC<DataQueryProps> = ({ onQuery, history, isQuerying }) => {
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const availableModels = [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash Exp' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, isQuerying]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isQuerying) return;
    onQuery(input, selectedModel);
    setInput('');
  };

  return (
    <div className="animate-fade-in space-y-6 mt-8">
      {/* Header */}
      <div className="text-center flex flex-col items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center justify-center gap-2">
            <SparklesIcon className="w-7 h-7 text-brand-400" />
            <span>Pregúntale a tus Datos</span>
          </h2>
          <p className="text-brand-300 mt-1">Interactúa con un analista de IA para explorar tus datos.</p>
        </div>

        <div className="flex items-center gap-2 bg-brand-900 px-4 py-2 rounded-xl border border-brand-800">
          <span className="text-xs text-brand-400 font-medium">Modelo:</span>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-transparent text-brand-100 text-sm focus:outline-none cursor-pointer"
          >
            {availableModels.map(model => (
              <option key={model.id} value={model.id} className="bg-brand-900 text-white">{model.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Chat window */}
      <div className="bg-brand-950/70 p-4 sm:p-6 rounded-lg border border-brand-800 h-[60vh] max-h-[500px] flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {history.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs md:max-w-lg px-4 py-2 rounded-xl ${msg.role === 'user' ? 'bg-brand-600 text-white' : 'bg-brand-800 text-brand-100'}`}>
                <SimpleMarkdown text={msg.text} />
              </div>
            </div>
          ))}
          {isQuerying && (
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
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="pt-4 mt-4 border-t border-brand-800">
          <div className="flex items-center bg-brand-800 rounded-lg">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ej: ¿Cuántas reservas de Booking.com hay?"
              disabled={isQuerying}
              className="flex-1 w-full bg-transparent p-3 text-white placeholder-brand-400 focus:outline-none"
              aria-label="Haz una pregunta sobre tus datos"
            />
            <button
              type="submit"
              disabled={!input.trim() || isQuerying}
              className="p-3 text-brand-400 hover:text-white disabled:text-brand-500 disabled:cursor-not-allowed transition-colors"
              aria-label="Enviar pregunta"
            >
              <SendIcon className="w-6 h-6" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};