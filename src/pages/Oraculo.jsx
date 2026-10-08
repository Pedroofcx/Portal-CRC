import db from '@/api/db';
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye } from 'lucide-react';

import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/input';
import CartaoColaboradorOraculo from '@/components/oraculo/CartaoColaboradorOraculo';
import Visao360 from '@/components/oraculo/Visao360';

import { leiturasDoColaborador, mediaDasCompetencias } from '@/lib/competencias';
import { contextoDoColaborador } from '@/lib/contextoColaborador';
import { totalNoCiclo } from '@/lib/hanseiDados';
import { tratativaNosCiclo, reaberturaDe } from '@/lib/pontuacaoCiclo';
import { situacaoReplicavel } from '@/components/utils/helpers';
import { usePermissoes } from '@/hooks/usePermissoes';

/**
 * ORÁCULO CRC — a visão 360º de cada pessoa.
 *
 * Desde 23/09/2026 o Oráculo não registra mais nada: a leitura é feita em
 * Observações (tipo 'leitura'), e aqui ela encontra os números do ciclo. De
 * um lado o que o gestor vê na pessoa, do outro o que a operação mostra.
 * Tela exclusiva da gestão.
 */
export default function OraculoPage() {
  const [selecionado, setSelecionado] = useState(null);
  const [busca, setBusca] = useState('');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => db.auth.me() });

  const { data: colaboradores = [], isLoading: carregandoColabs } = useQuery({
    queryKey: ['colaboradores', "list()"],
    queryFn: () => db.entities.Colaborador.list(),
  });

  const { data: observacoes = [], isLoading: carregandoObs } = useQuery({
    queryKey: ['observacoes', "list('-created_date', 2000)"],
    queryFn: () => db.entities.Observacao.list('-created_date', 2000),
    staleTime: 60000,
  });

  const { data: pdis = [] } = useQuery({
    queryKey: ['pdis', "list('-created_date', 500)"],
    queryFn: () => db.entities.PDI.list('-created_date', 500),
    staleTime: 120000,
  });

  const { data: ciclos = [] } = useQuery({
    queryKey: ['ciclos-trimestrais', "list()"],
    queryFn: () => db.entities.CicloTrimestral.list(),
    staleTime: 600000,
  });

  const { data: tratativas = [] } = useQuery({
    queryKey: ['tratativas', "list('-created_date')"],
    queryFn: () => db.entities.Tratativa.list('-created_date'),
    staleTime: 120000,
  });

  const { data: apuracoes = [] } = useQuery({
    queryKey: ['apuracoes-equipe'],
    queryFn: () => db.entities.Apuracao.list('-periodo_fim'),
    staleTime: 120000,
  });

  const { data: bonus = [] } = useQuery({
    queryKey: ['bonus-manual'],
    queryFn: () => db.entities.Pontuacao.filter({ tipo: 'bonus_manual' }, '-created_date'),
    staleTime: 120000,
  });

  const { data: hanseis = [] } = useQuery({
    queryKey: ['hansei-envios', "list('-data_envio')"],
    queryFn: () => db.entities.HanseiEnvio.list('-data_envio'),
    staleTime: 120000,
  });

  const eu = colaboradores.find((c) => c.email === user?.email);
  const { temPermissao } = usePermissoes();
  const isGestor = temPermissao('acessar_oraculo');
  const cicloAtivo = useMemo(() => ciclos.find((c) => c.ativo) ?? null, [ciclos]);

  // Os agentes ativos liberam (ou não) cada canal da pontuação: a mesma equipe do ranking.
  const equipe = useMemo(() => colaboradores.filter((c) => c.papel === 'agente' && c.ativo !== false).map((c) => c.id), [colaboradores]);

  const agentes = useMemo(() => colaboradores
    .filter((c) => c.papel === 'agente')
    .sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || '')), [colaboradores]);

  /** Média da equipe: todas as leituras de todos os agentes, para comparar. */
  const mediasEquipe = useMemo(() => {
    const idsAgentes = new Set(agentes.map((a) => a.id));
    const todas = observacoes.filter((o) => o.tipo === 'leitura' && (o.colaboradores_ids || []).some((id) => idsAgentes.has(id)));
    return mediaDasCompetencias(todas);
  }, [observacoes, agentes]);

  const porPessoa = useMemo(() => new Map(agentes.map((c) => {
    const leituras = leiturasDoColaborador(observacoes, c.id);
    return [c.id, {
      leituras,
      medias: mediaDasCompetencias(leituras),
      pontos: cicloAtivo ? totalNoCiclo({ tratativas, apuracoes, bonus, ciclo: cicloAtivo, colaboradorId: c.id, equipe }) : null,
    }];
  })), [agentes, observacoes, tratativas, apuracoes, bonus, cicloAtivo, equipe]);

  const dadosDoSelecionado = useMemo(() => {
    if (!selecionado) return null;
    const contexto = contextoDoColaborador({
      colaboradorId: selecionado.id, ciclo: cicloAtivo, tratativas, apuracoes, bonus, equipe,
    });
    const minhas = tratativas.filter((t) => !t.excluida
      && t.agente_responsavel_id === selecionado.id
      && cicloAtivo && tratativaNosCiclo(t, cicloAtivo));
    const encerradas = minhas.filter((t) => ['encerrada', 'aguardando_confirmacao_reabertura'].includes(t.status));
    const reaberturas = encerradas.filter((t) => reaberturaDe(t, tratativas).situacao === 'reabriu').length;
    const replicaveis = minhas.map((t) => situacaoReplicavel(t)).filter(Boolean);

    const minhasObs = observacoes.filter((o) => (o.colaboradores_ids || []).includes(selecionado.id));
    const meusHanseis = hanseis.filter((h) => h.colaborador_id === selecionado.id);

    return {
      leituras: porPessoa.get(selecionado.id)?.leituras ?? [],
      processo: {
        ciclo: cicloAtivo?.nome ?? null,
        pontos: contexto.pontos_trimestre,
        csat: contexto.csat_recente,
        performance: contexto.performance,
        cx: contexto.cx,
        tratativas: encerradas.length,
        noPrazo: contexto.tratativas_no_prazo,
        reaberturas,
        replicaveisAprovadas: replicaveis.filter((s) => s === 'aprovada').length,
        replicaveisPendentes: replicaveis.filter((s) => s === 'pendente').length,
      },
      acompanhamento: {
        pdisAtivos: pdis.filter((p) => p.colaborador_id === selecionado.id && p.status === 'em_andamento').length,
        feedbacks: minhasObs.filter((o) => String(o.tipo || '').toLowerCase().includes('feedback')).length,
        positivos: minhasObs.filter((o) => String(o.tipo || '').toLowerCase().includes('positivo')).length,
        negativos: minhasObs.filter((o) => String(o.tipo || '').toLowerCase().includes('negativo')).length,
        ultimoHansei: meusHanseis[0]?.periodo_fim ?? null,
        hanseiLido: !!meusHanseis[0]?.visualizado,
      },
    };
  }, [selecionado, cicloAtivo, tratativas, apuracoes, bonus, observacoes, pdis, hanseis, porPessoa]);

  if (!isGestor) {
    return (
      <EmptyState icon={Eye} title="Acesso restrito" description="O Oráculo CRC é exclusivo da gestão." />
    );
  }

  if (carregandoColabs || carregandoObs) return <LoadingSpinner text="Carregando o Oráculo CRC..." />;

  if (selecionado && dadosDoSelecionado) {
    return (
      <>
        <PageHeader title="Oráculo CRC" subtitle={selecionado.nome_completo} icon={Eye} />
        <Visao360
          colaborador={selecionado}
          leituras={dadosDoSelecionado.leituras}
          mediasEquipe={mediasEquipe}
          processo={dadosDoSelecionado.processo}
          acompanhamento={dadosDoSelecionado.acompanhamento}
          onVoltar={() => setSelecionado(null)}
        />
      </>
    );
  }

  const filtrados = agentes.filter((c) => c.nome_completo?.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Oráculo CRC"
        subtitle="A visão 360º de cada pessoa — o que as leituras dizem e o que os números mostram"
        icon={Eye}
      />

      <Input placeholder="Buscar colaborador..." value={busca} onChange={(e) => setBusca(e.target.value)} />

      {filtrados.length === 0 ? (
        <EmptyState icon={Eye} title="Nenhum colaborador encontrado" description="Ajuste a busca." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((c) => {
            const d = porPessoa.get(c.id);
            return (
              <CartaoColaboradorOraculo
                key={c.id}
                colaborador={c}
                leituras={d.leituras}
                medias={d.medias}
                pontos={d.pontos}
                onClick={() => setSelecionado(c)}
              />
            );
          })}
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        As leituras são registradas em Observações. Aqui elas se juntam aos números do ciclo.
      </p>
    </div>
  );
}
