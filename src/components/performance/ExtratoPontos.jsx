import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatDateSP } from '@/components/utils/helpers';
import ListaResumida from '@/components/ui/ListaResumida';

/**
 * Extrato de pontos do ciclo (src/lib/extratoPontos.js): o que já conta,
 * agrupado, e o que está a caminho, com a condição para contar. Só texto e
 * número, no padrão das linhas rótulo/valor (components/ui/Cartao).
 */
const fmt = (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function Linha({ item, valor, valorFraco }) {
  const titulo = item.tratativa_id
    ? <Link to={`${createPageUrl('TratativaDetalhe')}?id=${item.tratativa_id}`} className="hover:underline">{item.titulo}</Link>
    : item.titulo;
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-sm">
      <span className="min-w-0 text-foreground break-words">
        {titulo}
        <span className="block text-xs text-muted-foreground break-words">
          {item.quando ? `${formatDateSP(item.quando, 'DD/MM/YYYY')} · ` : ''}{item.detalhe}
        </span>
      </span>
      <span className={`shrink-0 font-semibold tabular-nums ${valorFraco ? 'text-muted-foreground' : 'text-foreground'}`}>{valor}</span>
    </div>
  );
}

function Grupo({ titulo, total, children }) {
  return (
    <section aria-label={titulo}>
      <div className="flex items-baseline justify-between border-b border-border pb-1.5">
        <h3 className="text-xs font-medium text-muted-foreground">{titulo}</h3>
        {total !== undefined && <span className="text-sm font-semibold tabular-nums text-foreground">{fmt(total)}</span>}
      </div>
      {children}
    </section>
  );
}

export default function ExtratoPontos({ extrato }) {
  if (!extrato) return null;
  const { grupos, aCaminho, total } = extrato;

  return (
    <div className="space-y-6">
      {grupos.map((g) => (
        <Grupo key={g.chave} titulo={g.titulo} total={g.subtotal}>
          <ListaResumida
            className="divide-y divide-border"
            limite={5}
            rotulo="lançamentos"
            itens={g.itens}
            renderItem={(item, i) => (
              <Linha key={i} item={item} valor={item.pontos > 0 ? `+${fmt(item.pontos)}` : '0'} valorFraco={!(item.pontos > 0)} />
            )}
          />
        </Grupo>
      ))}

      <div className="flex items-baseline justify-between border-t border-border pt-3">
        <span className="text-sm font-semibold text-foreground">Total do ciclo</span>
        <span className="text-xl font-bold tabular-nums text-foreground">{fmt(total)}</span>
      </div>

      {aCaminho.length > 0 && (
        <Grupo titulo="Ainda não conta — o que falta para entrar">
          <ListaResumida
            className="divide-y divide-border"
            limite={5}
            rotulo="itens"
            itens={aCaminho}
            renderItem={(item, i) => (
              <Linha
                key={i}
                item={item}
                valor={item.tom === 'negado' ? 'contestada' : `+${fmt(item.pontos)}`}
                valorFraco
              />
            )}
          />
        </Grupo>
      )}
    </div>
  );
}
