import React from 'react';
import { formatDateSP } from '@/components/utils/helpers';
import { Cartao, Linha } from '@/components/ui/Cartao';

/**
 * Um colaborador na entrada do Hansei — o mesmo padrão de Observações: a
 * pessoa primeiro, o histórico dentro (decisão de Pedro, 22/09/2026: "eu
 * tenho que ficar descendo a tela para localizar informações").
 */
const pct = (v) => (v === null || v === undefined ? '—' : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);

export default function CartaoColaboradorHansei({ colaborador, envios, onClick }) {
  const meus = envios.filter((e) => e.colaborador_id === colaborador.id);
  const ultimo = meus[0] ?? null;
  const naoLidos = meus.filter((e) => !e.visualizado).length;
  const d = ultimo?.dados_consolidados ?? {};

  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      <Cartao className="transition-colors hover:bg-muted/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-foreground">{colaborador.nome_completo}</p>
            <p className="text-xs text-muted-foreground">{colaborador.cargo_atual || 'Agente'}</p>
          </div>
          {naoLidos > 0 && (
            <span className="shrink-0 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">
              {naoLidos} não lido{naoLidos === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div className="mt-3 divide-y divide-border border-t border-border">
          <Linha rotulo="Hanseis enviados" valor={meus.length} />
          {ultimo ? (
            <>
              <Linha
                rotulo="Último período"
                detalhe={`enviado em ${formatDateSP(ultimo.data_envio, 'DD/MM/YYYY')}`}
                valor={`${formatDateSP(ultimo.periodo_inicio, 'DD/MM')} a ${formatDateSP(ultimo.periodo_fim, 'DD/MM')}`}
              />
              <Linha rotulo="CSAT no último" valor={pct(d.csat_individual)} />
              <Linha rotulo="Performance no último" valor={pct(d.performance_percentual)} />
            </>
          ) : (
            <p className="py-2 text-sm text-muted-foreground">Nenhum Hansei enviado ainda.</p>
          )}
        </div>
      </Cartao>
    </button>
  );
}
