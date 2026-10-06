import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import db from '@/api/db';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Cartao, Linha } from '@/components/ui/Cartao';
import { traduzirErro } from '@/lib/erros';
import { sincronizarFeriasGestaoClick } from '@/lib/chamarSincronizacao';
import { invalidarFerias, useConectorDeFerias } from '@/hooks/useSincronizacaoAutomatica';

const quando = (v) => (v ? new Date(v).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '—');

const ROTULO = { ok: 'Deu certo', erro: 'Falhou', rodando: 'Rodando' };

const LINHAS_DO_RESUMO = [
  ['colaboradores_ligados', 'Pessoas ligadas pelo e-mail'],
  ['periodos_recebidos', 'Períodos aquisitivos recebidos'],
  ['ciclos_criados', 'Períodos criados no Portal'],
  ['ciclos_atualizados', 'Períodos atualizados'],
  ['ferias_criadas', 'Férias futuras que passaram a travar a Escala e o rodízio'],
  ['escala_criadas', 'Parcelas de férias lançadas na Escala de Trabalho'],
  ['ferias_canceladas', 'Férias canceladas (sumiram do Gestão Click)'],
];

/**
 * Conectores: o Portal buscando dados em outro sistema (o sentido contrário das
 * integrações de entrada, que ficam logo abaixo). Hoje há um: as férias do
 * Gestão Click. Só leitura; o token fica como segredo da Edge Function.
 */
export default function PainelConectores() {
  const queryClient = useQueryClient();
  const { data: conector } = useConectorDeFerias();
  const { data: execucoes = [] } = useQuery({
    queryKey: ['conector-execucoes', 'gestaoclick_ferias'],
    queryFn: () => db.entities.ConectorExecucao.filter({ conector_chave: 'gestaoclick_ferias' }, '-iniciada_em', 6),
    staleTime: 15000,
  });

  const alternar = useMutation({
    mutationFn: (ativo) => db.entities.Conector.update(conector.id, { ativo }),
    onSuccess: (_, ativo) => {
      invalidarFerias(queryClient);
      toast.success(ativo ? 'Conector ligado.' : 'Conector desligado.');
    },
    onError: (e) => toast.error(`Não consegui mudar o conector: ${traduzirErro(e)}`),
  });

  const sincronizar = useMutation({
    mutationFn: sincronizarFeriasGestaoClick,
    onSuccess: (r) => {
      invalidarFerias(queryClient);
      const n = r?.resumo;
      toast.success(`Sincronizado: ${n?.ciclos_criados ?? 0} período(s) novo(s), ${n?.ciclos_atualizados ?? 0} atualizado(s).`);
    },
    onError: (e) => { invalidarFerias(queryClient); toast.error(e.message || 'A sincronização falhou.'); },
  });

  if (!conector) return null;
  const resumo = conector.ultimo_resumo;
  const avisos = execucoes[0]?.avisos ?? [];

  return (
    <Cartao titulo="Conectores (o Portal busca em outros sistemas)">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">{conector.nome}</h3>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {conector.descricao} Só leitura: o Portal nunca escreve no Gestão Click. O que sobra de saldo e período é o de lá.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <span className={conector.ativo ? 'text-success' : 'text-muted-foreground'}>{conector.ativo ? 'Ligado' : 'Desligado'}</span>
            <Switch checked={conector.ativo} disabled={alternar.isPending} onCheckedChange={(v) => alternar.mutate(v)} aria-label="Ligar o conector de férias do Gestão Click" />
          </label>
        </div>

        <div className="divide-y divide-border rounded-lg border border-border px-3">
          <Linha rotulo="Última atualização com sucesso" valor={quando(conector.ultimo_sucesso_em)} />
          <Linha
            rotulo="Última tentativa"
            detalhe={conector.ultimo_resultado === 'erro' ? conector.ultimo_erro : null}
            valor={conector.ultimo_resultado ? `${ROTULO[conector.ultimo_resultado]} · ${quando(conector.ultima_execucao_em)}` : 'Nunca rodou'}
          />
          {resumo && LINHAS_DO_RESUMO.map(([k, rotulo]) => <Linha key={k} rotulo={rotulo} valor={resumo[k] ?? 0} />)}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => sincronizar.mutate()} disabled={!conector.ativo || sincronizar.isPending}>
            {sincronizar.isPending ? 'Sincronizando…' : 'Sincronizar agora'}
          </Button>
          <p className="text-xs text-muted-foreground">
            {conector.ativo
              ? 'Roda sozinho quando os dados passam de 6 horas e alguém da gestão abre o Portal.'
              : 'Ligue o conector para sincronizar.'}
          </p>
        </div>

        {avisos.length > 0 && (
          <div className="rounded-lg border border-border bg-muted p-3 text-sm">
            <p className="font-medium text-foreground">Avisos da última sincronização ({avisos.length})</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
              {avisos.slice(0, 8).map((a, i) => <li key={i}>{a.mensagem}</li>)}
            </ul>
            {avisos.length > 8 && <p className="mt-1 text-xs text-muted-foreground">e mais {avisos.length - 8}.</p>}
          </div>
        )}

        {execucoes.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">Últimas execuções</summary>
            <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
              {execucoes.map((e) => (
                <li key={e.id} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                  <span className="text-foreground">{quando(e.iniciada_em)} · {e.disparada_por ?? 'sistema'}</span>
                  <span className={e.resultado === 'erro' ? 'text-warning' : 'text-muted-foreground'}>{ROTULO[e.resultado]}{e.erro ? `: ${e.erro}` : ''}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </Cartao>
  );
}
