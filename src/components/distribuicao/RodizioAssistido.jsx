import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Clock, AlertTriangle, User } from 'lucide-react';
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
    <Card className="border-2 border-primary/25 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            Rodízio Assistido CRC
            <Badge className="bg-info-soft text-primary text-xs">Sugestão Visual</Badge>
          </CardTitle>
          <button onClick={() => setExpandido(e => !e)} className="p-1 hover:bg-muted rounded">
            {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </CardHeader>

      {expandido && (
        <CardContent className="space-y-4">
          {/* Seletor de tipo */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Selecionar canal</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(TIPOS_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setTipoSelecionado(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
                    tipoSelecionado === key
                      ? 'border-primary/40 bg-info-soft text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-border'
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sugestão principal */}
          <div className="p-4 bg-info-soft border-2 border-primary/25 rounded-xl">
            <p className="text-xs text-primary uppercase tracking-wide font-semibold mb-2 flex items-center gap-1">
              <User className="w-3 h-3" /> Próximo agente sugerido — {tipoConfig.label}
            </p>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-primary">{sugerido?.nome_completo || '—'}</p>
                {ultimaAtribuicao ? (
                  <p className="text-xs text-primary mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Última atribuição: Ticket #{ultimaAtribuicao.ticket_id} em {formatarData(ultimaAtribuicao)}
                  </p>
                ) : (
                  <p className="text-xs text-primary mt-0.5">Nunca recebeu uma tratativa deste tipo</p>
                )}
              </div>
              <Badge className="bg-primary text-white text-xs flex-shrink-0">Sugerido</Badge>
            </div>
          </div>

          {/* Ordem do rodízio */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ordem do rodízio — {tipoConfig.label}</p>
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
                        ? 'bg-info-soft border-primary/25 font-medium'
                        : 'bg-card border-border'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        idx === 0 ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                      }`}>
                        {idx + 1}
                      </span>
                      <span className={idx === 0 ? 'text-primary' : 'text-foreground'}>{agente.nome_completo}</span>
                    </div>
                    <div className="text-right text-muted-foreground">
                      {ultimo ? (
                        <span>{ultimo.data_atribuicao}</span>
                      ) : (
                        <span className="text-success font-medium">Nunca recebeu</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-warning-soft border border-warning/25 rounded-lg">
            <p className="text-xs text-warning flex items-start gap-1.5">
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