import React from 'react';
import { useRankingCiclo } from '@/hooks/useRankingCiclo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Trophy, Medal, Star } from 'lucide-react';

function getMedalIcon(pos) {
  if (pos === 0) return <Trophy className="w-5 h-5 text-warning" />;
  if (pos === 1) return <Medal className="w-5 h-5 text-muted-foreground" />;
  if (pos === 2) return <Medal className="w-5 h-5 text-warning" />;
  return <span className="w-5 h-5 flex items-center justify-center text-muted-foreground font-bold text-sm">{pos + 1}º</span>;
}

function getMedalBg(pos) {
  if (pos === 0) return 'bg-warning-soft border-warning/25';
  if (pos === 1) return 'bg-muted border-border';
  if (pos === 2) return 'bg-warning-soft border-warning/25';
  return 'bg-card border-border';
}

export default function RankingTrimestral({ colaboradorAtualId, visivel = true }) {
  // A conta mora em useRankingCiclo: a tela inicial do operador usa a mesma.
  const { ranking, cicloAtivo, isLoading: loadingTratativas } = useRankingCiclo();

  if (!visivel) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-10 text-center">
          <Award className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground font-medium">Ranking oculto pelo gestor</p>
          <p className="text-xs text-muted-foreground mt-1">O ranking está temporariamente desativado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          Ranking do Trimestre
          {cicloAtivo && (
            <Badge className="bg-info-soft text-primary border-info/25 text-xs ml-auto">{cicloAtivo.nome}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loadingTratativas ? (
          <p className="text-center text-muted-foreground py-6 text-sm">Calculando pontuações...</p>
        ) : ranking.length === 0 ? (
          <p className="text-center text-muted-foreground py-6 text-sm">Nenhum agente no ranking</p>
        ) : (
          ranking.slice(0, 10).map((agente, idx) => {
            const isMe = agente.id === colaboradorAtualId;
            return (
              <div
                key={agente.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all
                  ${getMedalBg(idx)}
                  ${isMe ? 'ring-2 ring-ring ring-offset-1' : ''}
                `}
              >
                <div className="flex items-center justify-center w-6 flex-shrink-0">
                  {getMedalIcon(idx)}
                </div>
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {agente.foto ? (
                    <img src={agente.foto} alt={agente.nome} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">{agente.nome?.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isMe ? 'text-primary' : 'text-foreground'}`}>
                    {agente.nome} {isMe && <span className="text-xs font-normal text-primary">(você)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{agente.tratativasEncerradas} tratativas encerradas</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Star className="w-3.5 h-3.5 text-warning" />
                  <span className="font-bold text-warning text-sm">{agente.totalPontos.toFixed(1)}</span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}