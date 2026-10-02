import React from 'react';
import { Cartao, Linha } from '@/components/ui/Cartao';
import { formatDateSP } from '@/components/utils/helpers';

/**
 * Uma pessoa na entrada do Oráculo — mesmo padrão de Observações e do Hansei:
 * a pessoa primeiro, o 360º dentro.
 */
const nota = (v) => (v === null || v === undefined ? '—' : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}/5`);

export default function CartaoColaboradorOraculo({ colaborador, leituras, medias, pontos, onClick }) {
  const ultima = leituras[0] ?? null;

  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      <Cartao className="transition-colors hover:bg-muted/40">
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{colaborador.nome_completo}</p>
          <p className="text-xs text-muted-foreground">{colaborador.cargo_atual || 'Agente'}</p>
        </div>

        <div className="mt-3 divide-y divide-border border-t border-border">
          <Linha
            rotulo="Leituras registradas"
            detalhe={ultima ? `última em ${formatDateSP(ultima.data_registro || ultima.created_date, 'DD/MM/YYYY')}` : 'nenhuma ainda'}
            valor={leituras.length}
          />
          <Linha rotulo="Visão humana" valor={nota(medias.humanas_geral)} />
          <Linha rotulo="Visão de processo" valor={nota(medias.tecnicas_geral)} />
          <Linha rotulo="Pontos no ciclo" valor={pontos === null || pontos === undefined ? '—' : Number(pontos).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} />
        </div>
      </Cartao>
    </button>
  );
}
