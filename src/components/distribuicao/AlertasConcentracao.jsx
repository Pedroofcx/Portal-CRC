import React, { useMemo } from 'react';
import { AlertTriangle, Info, TrendingDown } from 'lucide-react';
import { TIPOS_CONFIG, calcularSaturacao } from './distribuicaoUtils';

export default function AlertasConcentracao({ agentes, distribuicoes }) {
  // Memoizar cálculo O(n²) — evita reprocessar em cada render
  const alertasGlobais = useMemo(() => {
    const resultado = [];

    // Pré-computar volumes uma única vez (evita filter repetido)
    const volumes = agentes.map(a => ({
      agente: a,
      total: distribuicoes.filter(d => d.agente_id === a.id).length,
    }));

    if (volumes.length >= 2) {
      const max = Math.max(...volumes.map(v => v.total));
      const min = Math.min(...volumes.map(v => v.total));
      if (max > 0 && (max - min) / max > 0.5) {
        const maximo = volumes.find(v => v.total === max);
        const minimo = volumes.find(v => v.total === min);
        resultado.push({
          tipo: 'atencao',
          icon: TrendingDown,
          titulo: 'Desequilíbrio de volume',
          msg: `${maximo?.agente.nome_completo} (${max}) tem ${Math.round((max - min)/max*100)}% mais tickets que ${minimo?.agente.nome_completo} (${min})`,
        });
      }
    }

    const ultimos90 = new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0];
    const tiposConfig = Object.keys(TIPOS_CONFIG);

    agentes.forEach(a => {
      const minhas = distribuicoes.filter(d => d.agente_id === a.id);
      if (!minhas.length) return; // sem histórico, sem alerta de baixa exposição

      const minhas90 = minhas.filter(d => d.data_atribuicao >= ultimos90);
      // Pré-computar set dos tipos recentes para lookup O(1)
      const tiposRecentes = new Set(minhas90.map(d => d.tipo_tratativa));

      tiposConfig.forEach(tipo => {
        if (!tiposRecentes.has(tipo)) {
          resultado.push({
            tipo: 'info',
            icon: Info,
            titulo: 'Baixa exposição operacional',
            msg: `${a.nome_completo} sem receber ${TIPOS_CONFIG[tipo].label} nos últimos 90 dias`,
          });
        }
      });

      const sat = calcularSaturacao(a.id, distribuicoes, []);
      if (sat >= 85) {
        resultado.push({
          tipo: 'critico',
          icon: AlertTriangle,
          titulo: 'Sobrecarga operacional',
          msg: `${a.nome_completo} com saturação em ${sat}% — risco de impacto na premiação`,
        });
      }
    });

    return resultado;
  }, [agentes, distribuicoes]);

  if (alertasGlobais.length === 0) return (
    <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700">
      <span>✅</span>
      <span>Nenhum alerta de concentração operacional identificado.</span>
    </div>
  );

  return (
    <div className="space-y-2">
      {alertasGlobais.map((al, i) => {
        const Icon = al.icon;
        const colors = {
          critico: 'bg-red-50 border-red-200 text-red-800',
          atencao: 'bg-amber-50 border-amber-200 text-amber-800',
          info: 'bg-blue-50 border-blue-200 text-blue-800',
        };
        const iconColors = {
          critico: 'text-red-500',
          atencao: 'text-amber-500',
          info: 'text-blue-500',
        };
        return (
          <div key={i} className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${colors[al.tipo]}`}>
            <Icon className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${iconColors[al.tipo]}`} />
            <div>
              <span className="font-semibold">{al.titulo}: </span>
              <span>{al.msg}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}