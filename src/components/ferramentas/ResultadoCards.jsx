import React from 'react';
import { fmtBRL } from './calculos';
import { DollarSign, Percent, TrendingDown, CheckCircle, Minus, Clock } from 'lucide-react';

function MiniCard({ label, value, colorClass, icon: Icon, negative = false }) {
  return (
    <div className={`rounded-xl border p-3 space-y-1 ${colorClass}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide opacity-60 leading-tight">{label}</span>
        {Icon && <Icon className="w-3.5 h-3.5 opacity-40 flex-shrink-0" />}
      </div>
      <p className="font-bold text-base">
        {negative && value > 0 ? '− ' : ''}{fmtBRL(value)}
      </p>
    </div>
  );
}

function BigCard({ label, value, colorClass, icon: Icon, sublabel }) {
  return (
    <div className={`rounded-xl border p-4 col-span-2 ${colorClass}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</span>
        {Icon && <Icon className="w-5 h-5 opacity-50" />}
      </div>
      <p className="font-bold text-2xl">{fmtBRL(value)}</p>
      {sublabel && <p className="text-xs opacity-60 mt-1">{sublabel}</p>}
    </div>
  );
}

export default function ResultadoCards({ resultado, valorNota, aplicarMulta, onToggleMulta }) {
  if (!resultado) return null;

  const diferenca = resultado.valor_final_sem_multa - resultado.valor_final_devolucao;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resultado em Tempo Real</p>

      <div className="grid grid-cols-2 gap-2">
        <MiniCard label="Valor NF" value={valorNota} colorClass="bg-muted border-border text-foreground" icon={DollarSign} />
        <MiniCard label="Total Impostos" value={resultado.total_impostos_valor} colorClass="bg-destructive/10 border-destructive/25 text-destructive" icon={Percent} negative />
        <MiniCard label="Comissão Vendedor" value={resultado.comissao_valor} colorClass="bg-warning-soft border-warning/25 text-warning" icon={TrendingDown} negative />
        {resultado.uso_proporcional_valor > 0 && (
          <MiniCard label="Uso Proporcional" value={resultado.uso_proporcional_valor} colorClass="bg-info-soft border-info/25 text-primary" icon={Clock} negative />
        )}
        <MiniCard
          label="Total Descontos"
          value={resultado.total_descontos_valor}
          colorClass="bg-critical-soft border-critical/25 text-critical"
          icon={Minus}
          negative
        />
      </div>

      {/* Toggle de multa */}
      <div className="rounded-xl border-2 border-border overflow-hidden">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-3 pt-3 pb-2">Multa Contratual</p>
        <div className="grid grid-cols-2 gap-px bg-muted">
          <button
            onClick={() => onToggleMulta(true)}
            className={`px-3 py-2.5 text-sm font-medium transition-all ${
              aplicarMulta
                ? 'bg-destructive text-white'
                : 'bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            ◉ Aplicar multa de {resultado.valor_multa > 0 ? fmtBRL(resultado.valor_multa) : '10%'}
          </button>
          <button
            onClick={() => onToggleMulta(false)}
            className={`px-3 py-2.5 text-sm font-medium transition-all ${
              !aplicarMulta
                ? 'bg-success text-white'
                : 'bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            ◉ Sem multa
          </button>
        </div>
      </div>

      {/* Resultados finais — ambos os cenários */}
      <div className="grid grid-cols-2 gap-2">
        <div className={`rounded-xl border-2 p-3 ${!aplicarMulta ? 'border-success/40 bg-success-soft' : 'border-border bg-muted'}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Sem Multa</p>
          <p className={`font-bold text-xl ${!aplicarMulta ? 'text-success' : 'text-muted-foreground'}`}>
            {fmtBRL(resultado.valor_final_sem_multa)}
          </p>
        </div>
        <div className={`rounded-xl border-2 p-3 ${aplicarMulta ? 'border-destructive/40 bg-destructive/10' : 'border-border bg-muted'}`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Com Multa</p>
          <p className={`font-bold text-xl ${aplicarMulta ? 'text-destructive' : 'text-muted-foreground'}`}>
            {fmtBRL(resultado.valor_final_devolucao)}
          </p>
        </div>
      </div>

      {/* Destaque final */}
      <div className={`rounded-xl border-2 p-4 ${aplicarMulta ? 'bg-destructive/10 border-destructive/30' : 'bg-success-soft border-success/25'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
              Valor Final de Devolução {aplicarMulta ? '(com multa)' : '(sem multa)'}
            </p>
            <p className={`font-bold text-2xl mt-1 ${aplicarMulta ? 'text-destructive' : 'text-success'}`}>
              {fmtBRL(aplicarMulta ? resultado.valor_final_devolucao : resultado.valor_final_sem_multa)}
            </p>
          </div>
          <CheckCircle className={`w-8 h-8 opacity-40 ${aplicarMulta ? 'text-destructive' : 'text-success'}`} />
        </div>
        {diferenca > 0 && (
          <p className="text-xs mt-2 opacity-60">
            Diferença entre cenários: {fmtBRL(diferenca)}
          </p>
        )}
      </div>
    </div>
  );
}