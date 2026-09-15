import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, ChevronDown, ChevronUp, Clock, AlertTriangle, User } from 'lucide-react';
import { TIPOS_CONFIG, sugerirProximoAgente } from './distribuicaoUtils';

export default function RodizioAssistido({ agentesAtivos, distribuicoes }) {
  const [expandido, setExpandido] = useState(true);
  const [tipoSelecionado, setTipoSelecionado] = useState('reclamacao_interna');

  // Memoizar sugestão — sugerirProximoAgente itera sobre todos os agentes/distribuições
  const sugestao = useMemo(
    () => sugerirProximoAgente(tipoSelecionado, agentesAtivos, distribuicoes),
    [tipoSelecionado, agentesAtivos, distribuicoes]
  );
  if (!sugestao) return null;

  const { sugerido, ultimaAtribuicao, ordenados } = sugestao;
  const tipoConfig = TIPOS_CONFIG[tipoSelecionado];

  const formatarData = (d) => {
    if (!d) return '—';
    return `${d.data_atribuicao} às ${d.horario_atribuicao || '—'}`;
  };

  return (
    <Card className="border-2 border-indigo-100 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-indigo-600" />
            Rodízio Assistido CRC
            <Badge className="bg-indigo-100 text-indigo-700 text-xs">Sugestão Visual</Badge>
          </CardTitle>
          <button onClick={() => setExpandido(e => !e)} className="p-1 hover:bg-slate-100 rounded">
            {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </CardHeader>

      {expandido && (
        <CardContent className="space-y-4">
          {/* Seletor de tipo */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Selecionar canal</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(TIPOS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setTipoSelecionado(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
                    tipoSelecionado === key
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sugestão principal */}
          <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl">
            <p className="text-xs text-indigo-500 uppercase tracking-wide font-semibold mb-2 flex items-center gap-1">
              <User className="w-3 h-3" /> Próximo agente sugerido — {tipoConfig.label}
            </p>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-indigo-900">{sugerido?.nome_completo || '—'}</p>
                {ultimaAtribuicao ? (
                  <p className="text-xs text-indigo-600 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Última atribuição: Ticket #{ultimaAtribuicao.ticket_id} em {formatarData(ultimaAtribuicao)}
                  </p>
                ) : (
                  <p className="text-xs text-indigo-600 mt-0.5">Nunca recebeu uma tratativa deste tipo</p>
                )}
              </div>
              <Badge className="bg-indigo-600 text-white text-xs flex-shrink-0">Sugerido</Badge>
            </div>
          </div>

          {/* Ordem do rodízio */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Ordem do rodízio — {tipoConfig.label}</p>
            <div className="space-y-1.5">
              {ordenados.map((agente, idx) => {
                const doTipo = distribuicoes.filter(d => d.agente_id === agente.id && d.tipo_tratativa === tipoSelecionado);
                const ultimo = [...doTipo].sort((a, b) => {
                  const da = `${a.data_atribuicao} ${a.horario_atribuicao || ''}`;
                  const db = `${b.data_atribuicao} ${b.horario_atribuicao || ''}`;
                  return db.localeCompare(da);
                })[0];

                return (
                  <div
                    key={agente.id}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all ${
                      idx === 0
                        ? 'bg-indigo-50 border-indigo-300 font-medium'
                        : 'bg-white border-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        idx === 0 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className={idx === 0 ? 'text-indigo-900' : 'text-slate-700'}>{agente.nome_completo}</span>
                    </div>
                    <div className="text-right text-slate-400">
                      {ultimo ? (
                        <span>{ultimo.data_atribuicao}</span>
                      ) : (
                        <span className="text-green-600 font-medium">Nunca recebeu</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Rodízio Assistido</strong> — apenas orientação visual. A decisão final de atribuição é sempre da liderança.
                Registre a distribuição no botão "Nova Atribuição" para manter o histórico atualizado.
              </span>
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}