const db = globalThis.__B44_DB__ || { auth:{ isAuthenticated: async()=>false, me: async()=>null }, entities:new Proxy({}, { get:()=>({ filter:async()=>[], get:async()=>null, create:async()=>({}), update:async()=>({}), delete:async()=>({}) }) }), integrations:{ Core:{ UploadFile:async()=>({ file_url:'' }) } } };

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { calculateTratativaPoints } from '@/components/utils/helpers';
import { tratativaNosCiclo } from '@/hooks/usePontuacaoAgente';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Trophy, Medal, Star } from 'lucide-react';

function getMedalIcon(pos) {
  if (pos === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
  if (pos === 1) return <Medal className="w-5 h-5 text-slate-400" />;
  if (pos === 2) return <Medal className="w-5 h-5 text-amber-600" />;
  return <span className="w-5 h-5 flex items-center justify-center text-slate-500 font-bold text-sm">{pos + 1}º</span>;
}

function getMedalBg(pos) {
  if (pos === 0) return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200';
  if (pos === 1) return 'bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200';
  if (pos === 2) return 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200';
  return 'bg-white border-slate-100';
}

export default function RankingTrimestral({ colaboradorAtualId, visivel = true }) {
  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => db.entities.Colaborador.list(),
    staleTime: 120000,
  });

  // Ciclo ativo — fonte de verdade do período
  const { data: ciclos = [] } = useQuery({
    queryKey: ['ciclos-trimestrais'],
    queryFn: () => db.entities.CicloTrimestral.list(),
    staleTime: 300000,
  });
  const cicloAtivo = useMemo(() => ciclos.find(c => c.ativo) || null, [ciclos]);

  const { data: pontuacoes = [] } = useQuery({
    queryKey: ['pontuacoes'],
    queryFn: () => db.entities.Pontuacao.list('-created_date', 200),
    staleTime: 60000,
  });

  // Busca todas as tratativas encerradas — filtradas pelo ciclo ativo no useMemo
  const { data: todasTratativas = [], isLoading: loadingTratativas } = useQuery({
    queryKey: ['tratativas-encerradas-ranking'],
    queryFn: () =>
      db.entities.Tratativa.filter(
        {},
        '-data_encerramento',
        1000
      ),
    staleTime: 120000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    select: (data) =>
      data.filter(
        (t) =>
          (t.status === 'encerrada' || t.status === 'aguardando_confirmacao_reabertura') &&
          !!t.agente_responsavel_id &&
          !t.excluida
      ),
  });

  const ranking = useMemo(() => {
    if (!cicloAtivo) return [];
    const agentes = colaboradores.filter(c => c.papel === 'agente' && c.ativo !== false);

    return agentes.map(agente => {
      // Apenas tratativas dentro do ciclo ativo
      const minhasTratativas = todasTratativas.filter(
        t => t.agente_responsavel_id === agente.id && tratativaNosCiclo(t, cicloAtivo)
      );
      let pontosCalculados = 0;
      minhasTratativas.forEach(t => {
        const { pontos } = calculateTratativaPoints(t);
        pontosCalculados += pontos;
      });

      // Bonus manual do gestor (somente tipo bonus_manual, vinculado ao ciclo)
      const bonus = pontuacoes
        .filter(p => p.colaborador_id === agente.id && p.ciclo_id === cicloAtivo.id && p.tipo === 'bonus_manual')
        .reduce((acc, p) => acc + (p.total_pontos || 0), 0);

      const totalPontos = pontosCalculados + bonus;

      return {
        id: agente.id,
        nome: agente.nome_completo,
        foto: agente.foto_url,
        totalPontos,
        tratativasEncerradas: minhasTratativas.length,
      };
    }).sort((a, b) => b.totalPontos - a.totalPontos);
  }, [colaboradores, pontuacoes, todasTratativas, cicloAtivo]);

  if (!visivel) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-10 text-center">
          <Award className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 font-medium">Ranking oculto pelo gestor</p>
          <p className="text-xs text-slate-400 mt-1">O ranking está temporariamente desativado</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Ranking do Trimestre
          {cicloAtivo && (
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs ml-auto">{cicloAtivo.nome}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loadingTratativas ? (
          <p className="text-center text-slate-400 py-6 text-sm">Calculando pontuações...</p>
        ) : ranking.length === 0 ? (
          <p className="text-center text-slate-500 py-6 text-sm">Nenhum agente no ranking</p>
        ) : (
          ranking.slice(0, 10).map((agente, idx) => {
            const isMe = agente.id === colaboradorAtualId;
            return (
              <div
                key={agente.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all
                  ${getMedalBg(idx)}
                  ${isMe ? 'ring-2 ring-blue-400 ring-offset-1' : ''}
                `}
              >
                <div className="flex items-center justify-center w-6 flex-shrink-0">
                  {getMedalIcon(idx)}
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {agente.foto ? (
                    <img src={agente.foto} alt={agente.nome} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-slate-600">{agente.nome?.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${isMe ? 'text-blue-700' : 'text-slate-800'}`}>
                    {agente.nome} {isMe && <span className="text-xs font-normal text-blue-500">(você)</span>}
                  </p>
                  <p className="text-xs text-slate-400">{agente.tratativasEncerradas} tratativas encerradas</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-bold text-amber-700 text-sm">{agente.totalPontos.toFixed(1)}</span>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}