import React from 'react';
import { Cartao, Linha } from '@/components/ui/Cartao';
import { formatDateSP } from '@/components/utils/helpers';
import { SITUACOES, situacaoDaPesquisa } from '@/lib/pesquisas';

/**
 * Uma pesquisa na lista do gestor: o que interessa de longe é quantos já
 * responderam e quantos faltam.
 */
const TIPOS = { csat: 'CSAT', nps: 'NPS', ces: 'CES', clima_organizacional: 'Clima', personalizada: 'Personalizada', avd: 'AVD', kaizen: 'Kaizen' };

export default function CartaoPesquisa({ pesquisa, participacao, onClick }) {
  const situacao = situacaoDaPesquisa(pesquisa);
  const periodo = pesquisa.data_inicio || pesquisa.data_fim
    ? `${pesquisa.data_inicio ? formatDateSP(pesquisa.data_inicio, 'DD/MM/YY') : '—'} a ${pesquisa.data_fim ? formatDateSP(pesquisa.data_fim, 'DD/MM/YY') : '—'}`
    : 'sem prazo';

  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      <Cartao className="transition-colors hover:bg-muted/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{pesquisa.titulo}</p>
            <p className="text-xs text-muted-foreground">
              {TIPOS[pesquisa.tipo] || pesquisa.tipo} · {(pesquisa.perguntas || []).length} pergunta(s)
              {pesquisa.anonima ? ' · anônima' : ''}
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">{SITUACOES[situacao]}</span>
        </div>

        <div className="mt-3 divide-y divide-border border-t border-border">
          <Linha
            rotulo="Responderam"
            detalhe={participacao.total ? `${participacao.faltam.length} ainda falta(m)` : 'ninguém na lista'}
            valor={`${participacao.responderam.length} de ${participacao.total}`}
          />
          <Linha rotulo="Período" valor={periodo} />
        </div>
      </Cartao>
    </button>
  );
}
