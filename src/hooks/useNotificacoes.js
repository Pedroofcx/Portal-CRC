import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import db from '@/api/db';
import { montarNotificacoes } from '@/lib/notificacoes';
import { STATUS_FECHADOS } from '@/lib/cicloEquipe';
import { situacaoReplicavel } from '@/components/utils/helpers';
import { usePermissoes } from '@/hooks/usePermissoes';

const CHAVE_VISTAS = (id) => `portal_crc_notif_vistas_${id}`;

function lerVistas(id) {
  try { return new Set(JSON.parse(localStorage.getItem(CHAVE_VISTAS(id)) || '[]')); } catch { return new Set(); }
}

/**
 * Junta o que o sino mostra. As consultas usam as MESMAS chaves da central de
 * pendências do início e das telas de origem, então não buscam duas vezes e
 * recarregam junto quando a pessoa confirma um aviso ou responde uma pesquisa.
 */
export default function useNotificacoes(colaborador) {
  const id = colaborador?.id;
  const ehAgente = colaborador?.papel === 'agente';
  const { permissoes, temPermissao } = usePermissoes();
  const ligado = Boolean(id);
  const [vistas, setVistas] = useState(() => (id ? lerVistas(id) : new Set()));

  const q = (chave, fn, extra = {}) => ({ queryKey: chave, queryFn: fn, enabled: ligado, staleTime: 60000, ...extra });

  const { data: avisos = [] } = useQuery(q(['avisos-ativos'], () => db.entities.Aviso.filter({ ativo: true }, 'data_publicacao')));
  const { data: leituras = [] } = useQuery(q(['aviso-leituras', id], () => db.entities.AvisoLeitura.filter({ colaborador_id: id }), { staleTime: 0 }));
  const { data: pesquisas = [] } = useQuery(q(['pesquisas', "filter({ ativa: true }, '-created_date')"], () => db.entities.Pesquisa.filter({ ativa: true }, '-created_date')));
  const { data: participacoes = [] } = useQuery(q(['pesquisa-participacoes', id], () => db.entities.PesquisaParticipacao.filter({ colaborador_id: id }), { staleTime: 0 }));
  const { data: hanseis = [] } = useQuery(q(['hansei-nao-visualizados', id], () => db.entities.HanseiEnvio.filter({ colaborador_id: id, visualizado: false }, '-data_envio'), { enabled: ligado && ehAgente }));
  const { data: pops = [] } = useQuery(q(['pops', 'ativos'], () => db.entities.POP.filter({ ativo: true })));
  const { data: leiturasPop = [] } = useQuery(q(['pop-leituras', id], () => db.entities.PopLeitura.filter({ colaborador_id: id }), { staleTime: 0 }));
  const { data: atribuicoes = [] } = useQuery(q(['atribuicoes-pendentes', id], () => db.entities.DistribuicaoTratativa.filter({ agente_id: id, confirmado_pelo_agente: false }, '-created_date'), { staleTime: 30000 }));

  // Tratativas abertas: as da pessoa (agente) ou todas (gestão). O prazo muda
  // com o tempo sem ninguém mexer no registro, então recarrega de 5 em 5 minutos.
  const { data: tratativasAbertas = [] } = useQuery(q(
    ['tratativas-abertas-sino', colaborador?.papel, id],
    () => db.entities.Tratativa.filter({ ...(ehAgente ? { agente_responsavel_id: id } : {}), status: { $nin: STATUS_FECHADOS } }),
    { refetchInterval: 300000 },
  ));

  const { data: solicitacoesFerias = [] } = useQuery(q(['solicitacoes-ferias'], () => db.entities.SolicitacaoFerias.list('-data_inicio', 500)));

  const podeAprovarReplicavel = temPermissao('aprovar_solucao_replicavel');
  const { data: replicaveis = [] } = useQuery(q(
    ['replicaveis-sino'],
    () => db.entities.Tratativa.filter({ solucao_replicavel: true }),
    { enabled: ligado && podeAprovarReplicavel, refetchInterval: 300000 },
  ));

  const notificacoes = useMemo(() => montarNotificacoes({
    colaborador,
    permissoes,
    avisos, leituras, pesquisas, participacoes, hanseis, pops, leiturasPop,
    atribuicoes,
    tratativasAbertas,
    solicitacoesFerias,
    replicaveisPendentes: podeAprovarReplicavel ? replicaveis.filter((t) => situacaoReplicavel(t) === 'pendente').length : 0,
    vistas,
  }), [colaborador, permissoes, avisos, leituras, pesquisas, participacoes, hanseis, pops, leiturasPop, atribuicoes, tratativasAbertas, solicitacoesFerias, replicaveis, podeAprovarReplicavel, vistas]);

  const marcarComoVistas = useCallback((ids) => {
    if (!id) return;
    setVistas((atual) => {
      const novo = new Set(atual);
      ids.forEach((i) => novo.add(i));
      try { localStorage.setItem(CHAVE_VISTAS(id), JSON.stringify([...novo].slice(-200))); } catch { /* sem armazenamento: vale só nesta sessão */ }
      return novo;
    });
  }, [id]);

  return { notificacoes, total: notificacoes.length, marcarComoVistas };
}
