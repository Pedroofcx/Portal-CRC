import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/**
 * Uma pergunta de pesquisa e o campo de resposta dela, conforme o tipo:
 * texto, escala 1–5, escala 0–10, sim/não, escolha única ou múltipla.
 *
 * A resposta é sempre texto (como sempre foi gravado): escalas viram "4",
 * múltipla escolha múltipla vira "a,b".
 */
function Opcao({ ativa, onClick, children, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativa}
      className={cn(
        'rounded-lg border text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        ativa ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5',
        className,
      )}
    >
      {children}
    </button>
  );
}

export default function CampoPergunta({ pergunta, numero, valor = '', aoMudar, faltando = false }) {
  const id = `pergunta-${pergunta.id}`;
  const lista = String(valor).split(',').filter(Boolean);

  return (
    <fieldset
      className={cn('rounded-xl border bg-card p-4', faltando ? 'border-destructive/50' : 'border-border')}
      aria-describedby={faltando ? `${id}-erro` : undefined}
    >
      <legend className="sr-only">{pergunta.texto}</legend>
      <p className="mb-3 whitespace-pre-line text-sm font-medium text-foreground">
        <span className="mr-1.5 text-muted-foreground tabular-nums">{numero}.</span>
        {pergunta.texto}
        {pergunta.obrigatoria && <span className="ml-0.5 text-destructive" aria-label="obrigatória">*</span>}
      </p>

      {pergunta.tipo_resposta === 'texto' && (
        <Textarea id={id} rows={3} value={valor} onChange={(e) => aoMudar(e.target.value)} aria-label={pergunta.texto} />
      )}

      {pergunta.tipo_resposta === 'escala_1_5' && (
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <Opcao key={n} ativa={valor === String(n)} onClick={() => aoMudar(String(n))} className="h-11 text-base">{n}</Opcao>
          ))}
        </div>
      )}

      {pergunta.tipo_resposta === 'escala_0_10' && (
        <div>
          <div className="grid grid-cols-11 gap-1">
            {Array.from({ length: 11 }, (_, n) => (
              <Opcao key={n} ativa={valor === String(n)} onClick={() => aoMudar(String(n))} className="h-10">{n}</Opcao>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
            <span>Muito insatisfeito</span>
            <span>Muito satisfeito</span>
          </div>
        </div>
      )}

      {pergunta.tipo_resposta === 'sim_nao' && (
        <div className="grid grid-cols-2 gap-2">
          <Opcao ativa={valor === 'sim'} onClick={() => aoMudar('sim')} className="h-10">Sim</Opcao>
          <Opcao ativa={valor === 'nao'} onClick={() => aoMudar('nao')} className="h-10">Não</Opcao>
        </div>
      )}

      {pergunta.tipo_resposta === 'multipla_escolha' && (
        <div className="grid gap-2 sm:grid-cols-2">
          {(pergunta.opcoes ?? []).map((op) => (
            <Opcao key={op} ativa={valor === op} onClick={() => aoMudar(op)} className="px-3 py-2 text-left font-normal">{op}</Opcao>
          ))}
        </div>
      )}

      {pergunta.tipo_resposta === 'multipla_escolha_multipla' && (
        <div className="grid gap-2 sm:grid-cols-2">
          {(pergunta.opcoes ?? []).map((op) => (
            <label key={op} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted/60">
              <input
                type="checkbox"
                className="h-4 w-4 rounded accent-[hsl(var(--primary))]"
                checked={lista.includes(op)}
                onChange={(e) => aoMudar((e.target.checked ? [...lista, op] : lista.filter((v) => v !== op)).join(','))}
              />
              <span>{op}</span>
            </label>
          ))}
        </div>
      )}

      {faltando && (
        <p id={`${id}-erro`} className="mt-2 text-xs font-medium text-destructive">Esta pergunta é obrigatória.</p>
      )}
    </fieldset>
  );
}
