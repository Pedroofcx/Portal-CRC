import db from '@/api/db';
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { UserCog, Headset } from 'lucide-react';
import { findNextLider, getPosicaoAtual } from '@/components/lider-tecnico/rodizioUtils';
import { findNextN2, getPosicaoAtualN2 } from '@/components/apoio-n2/rodizioN2Utils';

export default function CardRodizioDashboard({ tipo }) {
  const isLider = tipo === 'lider';

  const entityName = isLider ? 'LiderTecnico' : 'AgenteN2';
  const acionamentoName = isLider ? 'AcionamentoLiderTecnico' : 'AcionamentoN2';
  const nomeField = isLider ? 'lider_tecnico_nome' : 'agente_n2_nome';
  const Icon = isLider ? UserCog : Headset;
  const findNext = isLider ? findNextLider : findNextN2;
  const getPosicao = isLider ? getPosicaoAtual : getPosicaoAtualN2;
  const titulo = isLider ? 'Líder Técnico' : 'Apoio N2';
  // Líder Técnico e Apoio N2 são categorias, não níveis — usam a paleta
  // categórica, que distingue sem sugerir que um é melhor que o outro.
  const tom = isLider ? 'bg-chart-5' : 'bg-chart-1';

  const { data: participantes = [] } = useQuery({
    queryKey: [`rodizio-${tipo}-dashboard`],
    queryFn: () => db.entities[entityName].list(),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: acionamentos = [] } = useQuery({
    queryKey: [`acionamentos-${tipo}-dashboard`],
    queryFn: () => db.entities[acionamentoName].list('-data_acionamento', 10),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  const { data: configuracoes = [] } = useQuery({
    queryKey: ['configuracoes'],
    queryFn: () => db.entities.Configuracao.list(),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const proximo = useMemo(() => findNext(participantes, getPosicao(configuracoes)), [participantes, configuracoes]);
  const ultimo = acionamentos?.[0] || null;
  const proximoNome = proximo
    ? (isLider ? proximo.lider?.colaborador_nome : proximo.agente?.colaborador_nome) || '—'
    : '—';
  const ultimoNome = ultimo ? ultimo[nomeField] || '—' : '—';

  return (
    <Link to={createPageUrl('FerramentasOperacionais')}>
      <Card className={`h-full cursor-pointer border-0 shadow-none ${tom} text-white transition-colors`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/90 text-sm font-medium">{titulo}</span>
            <Icon className="w-4 h-4 text-white/80" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-xs">Último:</span>
              <span className="text-white font-semibold text-sm truncate ml-2">{ultimoNome}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-xs">Próximo:</span>
              <span className="text-white font-semibold text-sm truncate ml-2">{proximoNome}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}