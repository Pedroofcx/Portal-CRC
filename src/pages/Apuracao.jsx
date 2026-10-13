import db from '@/api/db';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search } from 'lucide-react';

import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ImportarApuracao from '@/components/apuracao/ImportarApuracao';
import HistoricoImportacoes from '@/components/apuracao/HistoricoImportacoes';
import OuvidoriaChat from '@/components/apuracao/OuvidoriaChat';
import AuditoriaTelefone from '@/components/apuracao/AuditoriaTelefone';
import RelatoriosApuracao from './RelatoriosApuracao';
import { calculoDaFonte } from '@/components/apuracao/calculosApuracao';
import { registrosDaImportacao } from '../../supabase/functions/api/apuracao/registros.js';
import { classificarTicket } from '@/lib/apuracao/ouvidoriaChat';
import { revisarLigacao } from '@/lib/apuracao/revisaoTelefone';
import { usePermissoes } from '@/hooks/usePermissoes';

/**
 * APURAÇÃO — de onde vêm o CSAT, a performance e a avaliação CX.
 *
 * Reescrita em 24/09/2026 (Fase 1 do documentacao/plano-apuracao.md): o
 * assistente de cinco passos virou uma tela só, o CSV passou a ser lido de
 * verdade (aspas, ; e ,), o período sai do arquivo, o de-para de colunas e de
 * nomes fica guardado por fonte, e cada importação vira um lote que pode ser
 * desfeito.
 */

export default function Apuracao() {
  const queryClient = useQueryClient();
  const [desfazer, setDesfazer] = useState(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => db.auth.me() });
  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores', "list()"],
    queryFn: () => db.entities.Colaborador.list(),
  });
  const { data: apuracoes = [], isLoading } = useQuery({
    queryKey: ['apuracoes-equipe'],
    queryFn: () => db.entities.Apuracao.list('-periodo_fim'),
    staleTime: 30000,
  });
  const { data: mapeamentos = [] } = useQuery({
    queryKey: ['apuracao-mapeamentos'],
    queryFn: () => db.entities.ApuracaoMapeamento.list(),
    staleTime: 300000,
  });

  const eu = colaboradores.find((c) => c.email === user?.email);
  const { temPermissao } = usePermissoes();
  const isGestor = temPermissao('gerenciar_apuracao');

  const salvarImportacao = useMutation({
    mutationFn: async ({ arquivo, fonte, tipo, mapeamento, vinculos, leitura, conferencia }) => {
      const resultados = calculoDaFonte(fonte, tipo)(leitura.linhas, mapeamento);
      const importacaoId = `imp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      const registros = registrosDaImportacao({
        resultados, tipo, fonte, vinculos, colaboradores, arquivo, conferencia, quem: eu, importacaoId,
      }).filter((r) => r.colaborador_id);

      if (registros.length === 0) throw new Error('Nenhuma pessoa ligada nesta importação.');
      await db.entities.Apuracao.bulkCreate(registros);

      // Guarda o de-para para a próxima importação desta fonte.
      const existente = mapeamentos.find((m) => m.fonte === fonte);
      const dados = {
        fonte,
        tipo_apuracao: tipo,
        colunas: mapeamento,
        agentes: { ...(existente?.agentes ?? {}), ...vinculos },
        atualizado_por_nome: eu?.nome_completo ?? null,
      };
      if (existente) await db.entities.ApuracaoMapeamento.update(existente.id, dados);
      else await db.entities.ApuracaoMapeamento.create(dados);

      return registros.length;
    },
    onSuccess: (quantidade, _v, contexto) => {
      queryClient.invalidateQueries({ queryKey: ['apuracoes-equipe'] });
      queryClient.invalidateQueries({ queryKey: ['apuracoes'] });
      queryClient.invalidateQueries({ queryKey: ['apuracao-mapeamentos'] });
      toast.success(`${quantidade} pessoa(s) gravadas. O de-para ficou guardado para a próxima.`);
      contexto?.();
    },
    onError: (e) => toast.error(e?.message || 'Não consegui salvar a importação.'),
  });

  const desfazerImportacao = useMutation({
    mutationFn: async (lote) => {
      for (const id of lote.ids) await db.entities.Apuracao.delete(id);
      return lote.ids.length;
    },
    onSuccess: (quantidade) => {
      queryClient.invalidateQueries({ queryKey: ['apuracoes-equipe'] });
      queryClient.invalidateQueries({ queryKey: ['apuracoes'] });
      toast.success(`Importação desfeita — ${quantidade} registro(s) removidos.`);
      setDesfazer(null);
    },
    onError: () => toast.error('Não consegui desfazer esta importação.'),
  });

  // Ouvidoria: classifica UM ticket por vez, direto em cima da apuração já
  // salva. Recalcula os campos de comparativo (nunca o CSAT oficial).
  const classificar = useMutation({
    mutationFn: async ({ linha, nota }) => {
      const apuracao = apuracoes.find((a) => a.id === linha.apuracaoId);
      if (!apuracao) throw new Error('Apuração não encontrada.');
      const patch = classificarTicket(apuracao, linha.ticket, nota);
      await db.entities.Apuracao.update(linha.apuracaoId, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apuracoes-equipe'] });
      queryClient.invalidateQueries({ queryKey: ['apuracoes'] });
    },
    onError: () => toast.error('Não consegui salvar a classificação deste ticket.'),
  });

  // Auditoria do telefone: confirma ou remove UMA negativa por vez. Remover
  // MUDA o CSAT oficial (a ligação sai do cálculo) — diferente da ouvidoria
  // do chat, que nunca toca no número oficial.
  const revisarNegativa = useMutation({
    mutationFn: async ({ linha, decisao, motivo }) => {
      const apuracao = apuracoes.find((a) => a.id === linha.apuracaoId);
      if (!apuracao) throw new Error('Apuração não encontrada.');
      const patch = revisarLigacao(apuracao, linha.indice, decisao, motivo, eu);
      await db.entities.Apuracao.update(linha.apuracaoId, patch);
    },
    onSuccess: (_r, { decisao }) => {
      queryClient.invalidateQueries({ queryKey: ['apuracoes-equipe'] });
      queryClient.invalidateQueries({ queryKey: ['apuracoes'] });
      if (decisao === 'removido') toast.success('Negativa removida — o CSAT foi recalculado.');
      else if (decisao === 'confirmado') toast.success('Negativa confirmada.');
      else toast.success('Revisão desfeita.');
    },
    onError: (e) => toast.error(e?.message || 'Não consegui salvar a revisão desta ligação.'),
  });

  if (isLoading) return <LoadingSpinner text="Carregando a apuração..." />;

  if (!isGestor) {
    return (
      <div className="py-16 text-center">
        <h2 className="mb-2 text-xl font-semibold">Acesso restrito</h2>
        <p className="text-muted-foreground">A apuração é feita pela gestão.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Apuração"
        subtitle="De onde vêm o CSAT, a performance e a avaliação CX"
        icon={Search}
      />

      <Tabs defaultValue="importar">
        <TabsList>
          <TabsTrigger value="importar">Importar</TabsTrigger>
          <TabsTrigger value="historico">Importações</TabsTrigger>
          <TabsTrigger value="ouvidoria">Ouvidoria</TabsTrigger>
          <TabsTrigger value="analise">Análise</TabsTrigger>
        </TabsList>

        <TabsContent value="importar" className="pt-4">
          <ImportarApuracao
            colaboradores={colaboradores}
            mapeamentos={mapeamentos}
            apuracoes={apuracoes}
            salvando={salvarImportacao.isPending}
            onSalvar={(dados, aoTerminar) => salvarImportacao.mutate(dados, { onSuccess: () => aoTerminar?.() })}
          />
        </TabsContent>

        <TabsContent value="historico" className="pt-4">
          <HistoricoImportacoes
            apuracoes={apuracoes}
            desfazendo={desfazerImportacao.isPending}
            onDesfazer={setDesfazer}
          />
        </TabsContent>

        <TabsContent value="ouvidoria" className="space-y-4 pt-4">
          <Tabs defaultValue="chat">
            <TabsList>
              <TabsTrigger value="chat">Chat — classificar</TabsTrigger>
              <TabsTrigger value="telefone">Telefone — auditoria</TabsTrigger>
            </TabsList>
            <TabsContent value="chat" className="pt-4">
              <p className="mb-4 text-sm text-muted-foreground">
                O Zendesk não manda nota no arquivo, só "satisfação boa/ruim" — por isso cada ticket "ruim" precisa
                ser revisado à mão pra dizer se é negativo de verdade (1 ou 2) ou neutro (3).
              </p>
              <OuvidoriaChat
                apuracoes={apuracoes}
                classificando={classificar.isPending}
                onClassificar={(linha, nota) => classificar.mutate({ linha, nota })}
              />
            </TabsContent>
            <TabsContent value="telefone" className="pt-4">
              <p className="mb-4 text-sm text-muted-foreground">
                O 55PBX já vem com FCR e CSAT no arquivo — a classificação é automática. Não há nada pra decidir
                aqui, só conferir se bateu certo.
              </p>
              <AuditoriaTelefone
                apuracoes={apuracoes}
                revisando={revisarNegativa.isPending}
                onRevisar={(linha, decisao, motivo) => revisarNegativa.mutate({ linha, decisao, motivo })}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="analise" className="pt-4">
          <RelatoriosApuracao />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!desfazer}
        onOpenChange={() => setDesfazer(null)}
        title="Desfazer esta importação"
        description={desfazer
          ? `Remove ${desfazer.pessoas} registro(s) de ${desfazer.arquivo || 'arquivo sem nome'}, do período ${String(desfazer.inicio).split('-').reverse().join('/')} a ${String(desfazer.fim).split('-').reverse().join('/')}. Os números voltam a ser os da importação anterior daqueles dias.`
          : ''}
        confirmLabel="Desfazer"
        onConfirm={() => desfazerImportacao.mutate(desfazer)}
        variant="danger"
      />
    </div>
  );
}
