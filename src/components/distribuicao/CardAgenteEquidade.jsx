import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, AlertTriangle, Info, TrendingUp, Zap } from 'lucide-react';
import {
  TIPOS_CONFIG, calcularSaturacao, getStatusOperacional,
  calcularPesoOperacional, calcularPontuacaoEstimada, gerarAlertas
} from './distribuicaoUtils';

export default function CardAgenteEquidade({ agente, distribuicoes, todas }) {
  const [expandido, setExpandido] = useState(false);

  // Memoizar todos os cálculos pesados para evitar re-renders desnecessários
  const minhas = useMemo(
    () => distribuicoes.filter(d => d.agente_id === agente.id),
    [distribuicoes, agente.id]
  );

  const saturacao = useMemo(
    () => calcularSaturacao(agente.id, distribuicoes, []),
    [agente.id, distribuicoes]
  );

  const status = useMemo(() => getStatusOperacional(saturacao), [saturacao]);

  const pesoOp = useMemo(() => calcularPesoOperacional(minhas).toFixed(1), [minhas]);
  const pontosEst = useMemo(() => calcularPontuacaoEstimada(minhas).toFixed(1), [minhas]);
  const alertas = useMemo(() => gerarAlertas(agente.id, distribuicoes, saturacao), [agente.id, distribuicoes, saturacao]);

  const countsPorTipo = useMemo(() => {
    const counts = {};
    Object.keys(TIPOS_CONFIG).forEach(k => { counts[k] = 0; });
    minhas.forEach(d => { if (counts[d.tipo_tratativa] !== undefined) counts[d.tipo_tratativa]++; });
    return counts;
  }, [minhas]);

  const participacao = useMemo(
    () => Math.round((minhas.length / (todas.length || 1)) * 100),
    [minhas.length, todas.length]
  );

  const alertasCriticos = useMemo(() => alertas.filter(a => a.tipo === 'critico'), [alertas]);
  const alertasAtencao = useMemo(() => alertas.filter(a => a.tipo === 'atencao'), [alertas]);

  return (
    <div className={`border rounded-xl p-4 transition-all ${status.bg} hover:shadow-sm`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800 text-sm truncate">{agente.nome_completo}</span>
            <span className="text-base">{status.icon}</span>
            <span className={`text-xs font-medium ${status.class}`}>{status.label}</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{agente.cargo_atual || 'Agente'}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge className="bg-slate-700 text-white text-xs">{minhas.length} tickets</Badge>
          <button onClick={() => setExpandido(e => !e)} className="p-1 hover:bg-white/60 rounded transition-colors">
            {expandido ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Barra de saturação */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-500 flex items-center gap-1"><Zap className="w-3 h-3" /> Saturação Operacional</span>
          <span className={`font-bold ${status.class}`}>{saturacao}%</span>
        </div>
        <div className="h-2.5 bg-white/70 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              saturacao >= 85 ? 'bg-red-500' : saturacao >= 60 ? 'bg-amber-500' : 'bg-green-500'
            }`}
            style={{ width: `${saturacao}%` }}
          />
        </div>
      </div>

      {/* Métricas resumidas */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-white/60 rounded-lg p-2 text-center">
          <p className="text-xs text-slate-400">Participação</p>
          <p className="text-sm font-bold text-slate-800">{participacao}%</p>
        </div>
        <div className="bg-white/60 rounded-lg p-2 text-center">
          <p className="text-xs text-slate-400">Peso Op.</p>
          <p className="text-sm font-bold text-slate-800">{pesoOp}</p>
        </div>
        <div className="bg-white/60 rounded-lg p-2 text-center">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-0.5"><TrendingUp className="w-3 h-3" /> Pts Est.</p>
          <p className="text-sm font-bold text-amber-700">{pontosEst}</p>
        </div>
      </div>

      {/* Distribuição por categoria */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {Object.entries(TIPOS_CONFIG).map(([key, cfg]) => {
          const qty = countsPorTipo[key] || 0;
          if (qty === 0) return (
            <span key={key} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-white/40 text-slate-400 border border-slate-200 border-dashed">
              {cfg.label.split(' ')[0]}: —
            </span>
          );
          const pct = Math.round((qty / (minhas.length || 1)) * 100);
          const concentrado = pct > 60;
          return (
            <span key={key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color} ${concentrado ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}>
              {cfg.label.split(' ')[0]}: {qty}
              {concentrado && <AlertTriangle className="w-3 h-3 text-amber-500" />}
            </span>
          );
        })}
      </div>

      {/* Alertas compactos */}
      {alertas.length > 0 && (
        <div className="space-y-1">
          {alertasCriticos.map((a, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 rounded p-1.5">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span>{a.msg}</span>
            </div>
          ))}
          {alertasAtencao.map((a, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 rounded p-1.5">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              <span>{a.msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* Expandido: histórico recente */}
      {expandido && (
        <div className="mt-3 pt-3 border-t border-white/40">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Últimas atribuições</p>
          {minhas.length === 0 ? (
            <p className="text-xs text-slate-400 italic">Nenhuma distribuição registrada.</p>
          ) : (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {[...minhas].sort((a, b) => {
                const da = `${a.data_atribuicao} ${a.horario_atribuicao || ''}`;
                const db = `${b.data_atribuicao} ${b.horario_atribuicao || ''}`;
                return db.localeCompare(da);
              }).slice(0, 5).map((d, i) => (
                <div key={d.id || i} className="flex items-center justify-between text-xs bg-white/50 rounded p-1.5">
                  <span className={`px-1.5 py-0.5 rounded-full font-medium ${TIPOS_CONFIG[d.tipo_tratativa]?.color || 'bg-slate-100 text-slate-600'}`}>
                    {TIPOS_CONFIG[d.tipo_tratativa]?.label?.split(' ')[0] || d.tipo_tratativa}
                  </span>
                  <span className="text-slate-400 font-mono">#{d.ticket_id}</span>
                  <span className="text-slate-400">{d.data_atribuicao} {d.horario_atribuicao || ''}</span>
                </div>
              ))}
            </div>
          )}

          {/* Diversidade operacional */}
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Diversidade Operacional</p>
            <div className="space-y-1">
              {Object.entries(TIPOS_CONFIG).map(([key, cfg]) => {
                const ultimos30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
                const temRecente = minhas.filter(d => d.tipo_tratativa === key && d.data_atribuicao >= ultimos30).length > 0;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">{cfg.label}</span>
                    {temRecente ? (
                      <span className="text-xs text-green-600 font-medium">✓ Ativo</span>
                    ) : (
                      <span className="text-xs text-amber-600 font-medium flex items-center gap-0.5">
                        <Info className="w-3 h-3" /> Baixa exposição
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}