import React from 'react';

/**
 * Texto com formatação leve, para leitura rápida (POPs):
 *   "## Título"  → subtítulo
 *   "- item"     → lista
 *   "1. passo"   → passo numerado
 *   "**texto**"  → destaque
 *   linha em branco → novo parágrafo
 *
 * Sem HTML nem markdown completo de propósito: o gestor escreve texto comum
 * no formulário, e nada do que ele digita vira código na tela.
 */
function Destaques({ texto }) {
  const partes = String(texto).split(/(\*\*[^*]+\*\*)/g);
  return partes.map((p, i) => (p.startsWith('**') && p.endsWith('**')
    ? <strong key={i} className="font-semibold text-foreground">{p.slice(2, -2)}</strong>
    : <React.Fragment key={i}>{p}</React.Fragment>));
}

export default function TextoFormatado({ texto, className = '' }) {
  if (!texto || !String(texto).trim()) return null;
  const blocos = [];
  let lista = null;

  const fecharLista = () => { if (lista) { blocos.push(lista); lista = null; } };

  String(texto).split('\n').forEach((linha, i) => {
    const t = linha.trim();
    const numerado = /^(\d+)\.\s+(.*)$/.exec(t);
    if (!t) { fecharLista(); return; }
    if (t.startsWith('## ')) {
      fecharLista();
      blocos.push(<h4 key={i} className="mb-1.5 mt-4 text-sm font-semibold text-foreground first:mt-0">{t.slice(3)}</h4>);
    } else if (t.startsWith('- ')) {
      if (lista?.tipo !== 'ul') { fecharLista(); lista = { tipo: 'ul', itens: [] }; }
      lista.itens.push(t.slice(2));
    } else if (numerado) {
      if (lista?.tipo !== 'ol') { fecharLista(); lista = { tipo: 'ol', itens: [], inicio: Number(numerado[1]) }; }
      lista.itens.push(numerado[2]);
    } else {
      fecharLista();
      blocos.push(<p key={i} className="mb-2 last:mb-0"><Destaques texto={t} /></p>);
    }
  });
  fecharLista();

  return (
    <div className={`text-sm leading-relaxed text-foreground/90 ${className}`}>
      {blocos.map((b, i) => {
        if (React.isValidElement(b)) return b;
        if (b.tipo === 'ul') {
          return (
            <ul key={`l${i}`} className="mb-2 list-disc space-y-1 pl-5 marker:text-muted-foreground">
              {b.itens.map((it, j) => <li key={j}><Destaques texto={it} /></li>)}
            </ul>
          );
        }
        return (
          <ol key={`l${i}`} start={b.inicio} className="mb-2 space-y-1.5 pl-0">
            {b.itens.map((it, j) => (
              <li key={j} className="flex gap-2.5">
                <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold tabular-nums text-primary">
                  {b.inicio + j}
                </span>
                <span><Destaques texto={it} /></span>
              </li>
            ))}
          </ol>
        );
      })}
    </div>
  );
}
