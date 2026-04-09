
import React from 'react';

// A simple but effective Markdown-like parser for this specific use case
export const SimpleMarkdown: React.FC<{ text: string }> = ({ text }) => {
  const createMarkup = (text: string) => {
    let html = text;
    // Bold: **text**
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italics: *text*
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Line breaks
    html = html.replace(/\n/g, '<br />');
    // Unordered lists: * item
    html = html.replace(/^\* (.*$)/gim, '<ul class="list-disc list-inside ml-4"><li>$1</li></ul>');
    // Consolidate UL tags
    html = html.replace(/<\/ul><br \/>\s?<ul.*?>/g, '');

    // Headers: ## Header
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold text-brand-400 mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-brand-300 mt-6 mb-3 border-b border-brand-600 pb-2">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-brand-200 mt-8 mb-4">$1</h1>');
    
    return { __html: html };
  };

  return <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={createMarkup(text)} />;
};