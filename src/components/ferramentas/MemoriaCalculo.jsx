import React from 'react';
import { fmtBRL, IMPOSTOS_KEYS, IMPOSTO_LABELS, TIPOS_PLANO, CLASSIFICACAO_PLANO_OPTIONS } from './calculos';

export default function MemoriaCalculo({ resultado, config, valorNota, aplicarMulta, classificacaoPlano }) {
  if (!resultado || !valorNota) return null;
  const v = resultado.valor_nota || 0;
  const uso = resultado.uso_proporcional_detalhe;
  const tipoPlano = TIPOS_PLANO.find(p => p.value === uso?.tipoPlano);
  const classificacaoLabel = CLASSIFICACAO_PLANO_OPTIONS.find(o => o.value === classificacaoPlano)?.label;

  // Validação de divergência: soma dos impostos individuais deve bater com o total
  const somaImpostosIndividuais = IMPOSTOS_KEYS.reduce((acc, k) => acc + (resultado.detalhes_impostos?.[k] ?? 0), 0);
  const divergenciaImpostos = Math.abs(somaImpostosIndividuais - resultado.total_impostos_valor) > 0.01;

  return (
    <div className="bg-slate-900 rounded-xl p-4 font-mono text-xs text-slate-300 space-y-1">
      <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-2">Memória de Cálculo Completa</p>

      {/* Valor base */}
      <div className="flex justify-between">
        <span className="text-slate-400">Valor NF:</span>
        <span className="text-white font-semibold">{fmtBRL(v)}</span>
      </div>

      {/* Classificação do plano (informativa) */}
      {classificacaoLabel && (
        <div className="flex justify-between">
          <span className="text-slate-400">Classificação do Plano:</span>
          <span className="text-blue-300">{classificacaoLabel}</span>
        </div>
      )}

      <div className="border-t border-slate-700 my-1.5" />

      {/* Impostos individuais */}
      <p className="text-slate-500 text-[10px] uppercase tracking-wider">Impostos</p>
      {IMPOSTOS_KEYS.map(k => (
        <div key={k} className="flex justify-between">
          <span className="text-slate-400">{IMPOSTO_LABELS[k]} ({Number(config[k]).toFixed(2)}%):</span>
          <span className="text-red-400">− {fmtBRL(resultado.detalhes_impostos?.[k] ?? 0)}</span>
        </div>
      ))}
      <div className="flex justify-between text-slate-300 mt-0.5">
        <span className="font-semibold">Total Impostos ({resultado.total_impostos_pct?.toFixed(2)}%):</span>
        <span className="text-red-400 font-semibold">− {fmtBRL(resultado.total_impostos_valor)}</span>
      </div>
      {divergenciaImpostos && (
        <div className="text-amber-400 text-[10px]">Divergência de arredondamento nos impostos detectada.</div>
      )}

      <div className="border-t border-slate-700 my-1.5" />

      {/* Comissão */}
      <p className="text-slate-500 text-[10px] uppercase tracking-wider">Outros Descontos</p>
      <div className="flex justify-between">
        <span className="text-slate-400">Comissão Vendedor ({Number(config.comissao_vendedor).toFixed(2)}%):</span>
        <span className="text-amber-400">− {fmtBRL(resultado.comissao_valor)}</span>
      </div>

      {/* Uso proporcional detalhado — base mensal */}
      {uso && uso.valor > 0 && (
        <>
          <div className="border-t border-slate-700 my-1.5" />
          <p className="text-slate-500 text-[10px] uppercase tracking-wider">
            Uso Proporcional — Plano {tipoPlano ? tipoPlano.label : ''} ({uso.mesesContrato} meses)
          </p>

          <div className="flex justify-between text-slate-500">
            <span>Valor mensal ({fmtBRL(v)} ÷ {uso.mesesContrato} meses):</span>
            <span className="text-purple-300">{fmtBRL(uso.valorMensal)}/mês</span>
          </div>

          {uso.diasAdicionais > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Valor diário ({fmtBRL(uso.valorMensal)} ÷ 30 dias):</span>
              <span className="text-purple-300">{fmtBRL(uso.valorDiario)}/dia</span>
            </div>
          )}

          {uso.mesesUsados > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-400">{uso.mesesUsados} {uso.mesesUsados === 1 ? 'mês' : 'meses'} × {fmtBRL(uso.valorMensal)}:</span>
              <span className="text-purple-400">− {fmtBRL(uso.valorMeses)}</span>
            </div>
          )}

          {uso.diasAdicionais > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-400">{uso.diasAdicionais} dias × {fmtBRL(uso.valorDiario)}:</span>
              <span className="text-purple-400">− {fmtBRL(uso.valorDias)}</span>
            </div>
          )}

          <div className="flex justify-between text-purple-300 font-semibold">
            <span>Total uso do sistema:</span>
            <span>− {fmtBRL(uso.valor)}</span>
          </div>

          {uso.excedeuContrato && (
            <div className="text-amber-400 text-[10px] mt-0.5">
              Tempo utilizado excede o contrato — custo limitado ao valor da NF.
            </div>
          )}
        </>
      )}

      <div className="border-t border-slate-700 my-1.5" />

      {/* Custo total */}
      <div className="flex justify-between text-slate-300">
        <span className="font-semibold">Custo total de descontos:</span>
        <span className="text-red-400 font-semibold">− {fmtBRL(resultado.total_descontos_valor)}</span>
      </div>

      <div className="border-t border-slate-700 my-1.5" />

      {/* Cenários */}
      <p className="text-slate-500 text-[10px] uppercase tracking-wider">Cenários de Devolução</p>

      <div className="flex justify-between text-emerald-400">
        <span>✓ Devolução sem multa:</span>
        <span className="font-semibold">{fmtBRL(resultado.valor_final_sem_multa)}</span>
      </div>

      <div className="flex justify-between">
        <span className="text-slate-400">Multa contratual ({Number(config.multa_contratual).toFixed(2)}% sobre {fmtBRL(resultado.valor_sem_multa)}):</span>
        <span className="text-red-400">− {fmtBRL(resultado.valor_multa_calculado)}</span>
      </div>

      <div className="flex justify-between text-red-300">
        <span>✗ Devolução com multa:</span>
        <span className="font-semibold">{fmtBRL(resultado.valor_final_devolucao)}</span>
      </div>

      <div className="border-t border-slate-500 my-1.5" />

      {/* Resultado final selecionado */}
      <div className="flex justify-between font-bold text-sm">
        <span className={aplicarMulta ? 'text-red-300' : 'text-emerald-300'}>
          Valor final ({aplicarMulta ? 'com multa' : 'sem multa'}):
        </span>
        <span className={aplicarMulta ? 'text-red-300' : 'text-emerald-400'}>
          {fmtBRL(aplicarMulta ? resultado.valor_final_devolucao : resultado.valor_final_sem_multa)}
        </span>
      </div>
    </div>
  );
}