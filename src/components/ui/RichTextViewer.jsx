import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Componente para visualização de texto formatado
 * - Quebra automática de linhas
 * - Scrollbar quando necessário
 * - Preserva formatação (parágrafos, espaços)
 */
export default function RichTextViewer({ 
  content, 
  maxHeight = '400px',
  className = '' 
}) {
  if (!content) {
    return <p className="text-muted-foreground text-sm">-</p>;
  }

  return (
    <div 
      className={cn(
        "w-full overflow-y-auto rounded-lg bg-card p-4 border border-border",
        className
      )}
      style={{ maxHeight }}
    >
      <div 
        className="prose prose-slate max-w-none text-foreground break-words"
        style={{ lineHeight: '1.7' }}
        dangerouslySetInnerHTML={{ __html: content }}
      />
      <style>{`
        .prose h1 { font-size: 1.4rem; font-weight: 700; margin: 0.75rem 0 0.5rem; }
        .prose h2 { font-size: 1.15rem; font-weight: 600; margin: 0.6rem 0 0.4rem; }
        .prose h3 { font-size: 1rem; font-weight: 600; margin: 0.5rem 0 0.3rem; }
        .prose ul { list-style: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
        .prose ol { list-style: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
        .prose li { margin-bottom: 4px; }
        .prose a { color: #2563eb; text-decoration: underline; }
        .prose strong { font-weight: 700; }
        .prose em { font-style: italic; }
        .prose p { margin: 0.4rem 0; }
      `}</style>
    </div>
  );
}