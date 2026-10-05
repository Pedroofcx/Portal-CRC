import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import db from '@/api/db';
import { precisaSincronizar } from '@/lib/sincronizacao';
import { sincronizarFeriasGestaoClick } from '@/lib/chamarSincronizacao';
import { usePermissoes } from '@/hooks/usePermissoes';

const CHAVE_SESSAO = 'portal_crc_sync_ferias_tentada';

/** As consultas que mostram férias: recarregam depois de uma sincronização. */
export const CHAVES_DE_FERIAS = ['ciclos-ferias', 'solicitacoes-ferias', 'ferias-aprovadas', 'ciclos-ferias-colaborador', 'conector', 'conector-execucoes'];

export const invalidarFerias = (queryClient) => CHAVES_DE_FERIAS.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));

/** A linha do conector de férias (qualquer colaborador ativo lê). */
export function useConectorDeFerias() {
  return useQuery({
    queryKey: ['conector', 'gestaoclick_ferias'],
    queryFn: async () => (await db.entities.Conector.filter({ chave: 'gestaoclick_ferias' }))[0] ?? null,
    staleTime: 60000,
  });
}

/**
 * Mantém as férias em dia sem ninguém lembrar: quando alguém da gestão abre o
 * Portal e os dados do Gestão Click têm mais de 6 horas, sincroniza em
 * segundo plano. Uma tentativa por abertura do navegador (sessionStorage): se
 * falhar, não fica tentando em laço; o erro aparece em Configurações >
 * Integrações.
 */
export default function useSincronizacaoAutomatica(colaborador) {
  const queryClient = useQueryClient();
  const { temPermissao } = usePermissoes();
  const pode = Boolean(colaborador?.id) && (temPermissao('gerenciar_integracoes') || temPermissao('aprovar_ferias'));
  const { data: conector } = useConectorDeFerias();

  useEffect(() => {
    if (!pode || !conector || !precisaSincronizar(conector)) return;
    try {
      if (sessionStorage.getItem(CHAVE_SESSAO)) return;
      sessionStorage.setItem(CHAVE_SESSAO, String(Date.now()));
    } catch { /* sem sessionStorage: tenta mesmo assim, uma vez por montagem */ }
    sincronizarFeriasGestaoClick()
      .catch(() => { /* o resultado (e o erro) ficam registrados no conector */ })
      .finally(() => invalidarFerias(queryClient));
  }, [pode, conector, queryClient]);
}
