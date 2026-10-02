import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, Lightbulb, XCircle } from 'lucide-react';
import db from '@/api/db';
import { createPageUrl } from '@/utils';
import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateSP, situacaoReplicavel } from '@/components/utils/helpers';
import { tratativaNosCiclo } from '@/hooks/usePontuacaoAgente';
import { ciclosEmOrdem, STATUS_ENCERRADOS } from '@/lib/bonusManual';
import { usePermissoes } from '@/hooks/usePermissoes';

/**
 * Soluções replicáveis — o gestor aprova ou contesta, uma por uma.
 *
 * Do Ciclo 2 em diante, o +0,5 da solução replicável só entra na pontuação
 * depois da aprovação (decisão de 22/09/2026). Contestar pede o parecer, que
 * o agente vê na tratativa. Aprovar ou contestar de novo troca a decisão.
 */

const CAUSAS = {
  processo: 'Processo',
  produto_sistema: 'Produto / Sistema',
  comunicacao: 'Comunicação',
  expectativa_cliente: 'Expectativa do cliente',
  operacao_interna: 'Operação interna',
  terceiro: 'Terceiro',
};

const FILTROS = [
  { valor: 'pendente', rotulo: 'Pendentes' },
  { valor: 'aprovada', rotulo: 'Aprovadas' },
  { valor: 'contestada', rotulo: 'Contestadas' },
];

const MAX_PARECER = 500;

function Campo({ rotulo, children }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <div className="mt-0.5 text-sm text-foreground break-words">{children || '—'}</div>
    </div>
  );
}

export default function SolucoesReplicaveis() {
  const queryClient = useQueryClient();
  const [filtro, setFiltro] = useState('pendente');
  const [cicloId, setCicloId] = useState('');
  const [indice, setIndice] = useState(0);
  const [parecer, setParecer] = useState('');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => db.auth.me() });
  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores', "list()"],
    queryFn: () => db.entities.Colaborador.list(),
  });
  const { data: ciclos = [] } = useQuery({
    queryKey: ['ciclos-trimestrais', "list()"],
    queryFn: () => db.entities.CicloTrimestral.list(),
  });
  const { data: tratativas = [], isLoading } = useQuery({
    queryKey: ['tratativas', "list('-created_date')"],
    queryFn: () => db.entities.Tratativa.list('-created_date'),
    staleTime: 60000,
  });

  const eu = colaboradores.find((c) => c.email?.toLowerCase() === user?.email?.toLowerCase());
  const { temPermissao } = usePermissoes();
  const ehGestor = temPermissao('aprovar_solucao_replicavel');

  // Só ciclos em que a aprovação vale (do Ciclo 2 em diante).
  const ciclosComAprovacao = useMemo(
    () => ciclosEmOrdem(ciclos).filter((c) => c.data_fim >= '2026-06-16'),
    [ciclos],
  );
  useEffect(() => {
    if (!cicloId && ciclosComAprovacao.length) setCicloId((ciclosComAprovacao.find((c) => c.ativo) ?? ciclosComAprovacao[0]).id);
  }, [cicloId, ciclosComAprovacao]);
  const ciclo = ciclosComAprovacao.find((c) => c.id === cicloId) ?? null;

  const doCiclo = useMemo(() => tratativas
    .filter((t) => !t.excluida && STATUS_ENCERRADOS.includes(t.status) && situacaoReplicavel(t) && (cicloId === 'todos' || tratativaNosCiclo(t, ciclo)))
    // mais antigas primeiro: a fila anda na ordem em que foram encerradas
    .sort((a, b) => String(a.data_encerramento).localeCompare(String(b.data_encerramento))),
  [tratativas, ciclo, cicloId]);

  const contagem = useMemo(() => Object.fromEntries(FILTROS.map((f) => [f.valor, doCiclo.filter((t) => situacaoReplicavel(t) === f.valor).length])), [doCiclo]);
  const lista = useMemo(() => doCiclo.filter((t) => situacaoReplicavel(t) === filtro), [doCiclo, filtro]);

  const posicao = Math.min(indice, Math.max(0, lista.length - 1));
  const atual = lista[posicao] ?? null;

  // Trocar de caso começa com o parecer que já existe (ou vazio).
  useEffect(() => { setParecer(atual?.solucao_replicavel_parecer ?? ''); }, [atual?.id]);
  useEffect(() => { setIndice(0); }, [filtro, cicloId]);

  const decidir = useMutation({
    mutationFn: ({ id, aprovar }) => db.entities.Tratativa.update(id, {
      solucao_replicavel_auditada: true,
      solucao_replicavel_valida: aprovar,
      solucao_replicavel_parecer: parecer.trim() || null,
      solucao_replicavel_auditada_por_nome: eu?.nome_completo ?? null,
      solucao_replicavel_auditada_em: new Date().toISOString(),
    }),
    onSuccess: (_, { id, aprovar }) => {
      // A lista se atualiza na hora: o caso decidido sai dos pendentes e o
      // próximo ocupa o lugar dele.
      queryClient.setQueryData(['tratativas', "list('-created_date')"], (antigas = []) => antigas.map((t) => (t.id === id
        ? { ...t, solucao_replicavel_auditada: true, solucao_replicavel_valida: aprovar, solucao_replicavel_parecer: parecer.trim() || null }
        : t)));
      queryClient.invalidateQueries({ queryKey: ['tratativas'] });
      queryClient.invalidateQueries({ queryKey: ['tratativa', id] });
      toast.success(aprovar ? 'Aprovada: +0,5 ponto para o agente.' : 'Contestada: o meio ponto não conta.');
    },
    onError: (e) => toast.error(`Não foi possível gravar: ${e.message}`),
  });

  if (isLoading || !user) return <LoadingSpinner text="Carregando soluções..." />;
  if (!ehGestor) {
    return <p className="text-sm text-muted-foreground">Esta tela é do gestor.</p>;
  }

  const contestar = () => {
    if (!parecer.trim()) { toast.error('Para contestar, escreva o parecer: o agente precisa saber o que faltou.'); return; }
    decidir.mutate({ id: atual.id, aprovar: false });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Soluções replicáveis"
        subtitle="Aprove ou conteste cada solução marcada como replicável. O +0,5 só conta depois da aprovação."
        icon={Lightbulb}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Situação">
          {FILTROS.map((f) => (
            <Button key={f.valor} size="sm" variant={filtro === f.valor ? 'default' : 'outline'} onClick={() => setFiltro(f.valor)}>
              {f.rotulo} · {contagem[f.valor] ?? 0}
            </Button>
          ))}
        </div>
        <Select value={cicloId} onValueChange={setCicloId}>
          <SelectTrigger className="w-56" aria-label="Ciclo"><SelectValue placeholder="Ciclo" /></SelectTrigger>
          <SelectContent>
            {ciclosComAprovacao.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            <SelectItem value="todos">Todos os ciclos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {!atual ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {filtro === 'pendente' ? 'Nenhuma solução esperando a sua análise neste ciclo.' : 'Nada por aqui neste ciclo.'}
        </div>
      ) : (
        <section className="rounded-xl border border-border bg-card p-5" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {posicao + 1} de {lista.length}
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setIndice(posicao - 1)} disabled={posicao === 0}>
                <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" /> Anterior
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIndice(posicao + 1)} disabled={posicao >= lista.length - 1}>
                Próxima <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-foreground">
              {atual.id_interno || `#${atual.id.slice(0, 8)}`} · {atual.nome_cliente || 'Cliente sem nome'}
            </h2>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link className="inline-flex items-center gap-1 text-primary hover:underline" to={`${createPageUrl('TratativaDetalhe')}?id=${atual.id}`}>
                Abrir tratativa <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              {atual.link_zendesk && (
                <a className="inline-flex items-center gap-1 text-primary hover:underline" href={atual.link_zendesk} target="_blank" rel="noreferrer">
                  Zendesk <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Campo rotulo="Agente">{atual.agente_responsavel_nome}</Campo>
            <Campo rotulo="Encerrada em">{formatDateSP(atual.data_encerramento, 'DD/MM/YYYY')}</Campo>
            <Campo rotulo="Motivo">
              {atual.motivo_nome}{atual.submotivos?.length ? ` — ${atual.submotivos.join(', ')}` : ''}
            </Campo>
            <Campo rotulo="Causa primária">{CAUSAS[atual.causa_primaria] ?? atual.causa_primaria}</Campo>
          </div>
          {atual.etapa_jornada_nome && (
            <div className="mt-4"><Campo rotulo="Etapa da jornada">{atual.etapa_jornada_nome}</Campo></div>
          )}

          <div className="mt-5 rounded-lg bg-muted p-4">
            <p className="text-xs font-medium text-muted-foreground">Solução registrada pelo agente</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{atual.descricao_solucao || 'O agente não descreveu a solução.'}</p>
          </div>

          {atual.solucao_replicavel_auditada && (
            <p className="mt-3 text-xs text-muted-foreground">
              {situacaoReplicavel(atual) === 'aprovada' ? 'Aprovada' : 'Contestada'}
              {atual.solucao_replicavel_auditada_por_nome ? ` por ${atual.solucao_replicavel_auditada_por_nome}` : ''}
              {atual.solucao_replicavel_auditada_em ? ` em ${formatDateSP(atual.solucao_replicavel_auditada_em, 'DD/MM/YYYY HH:mm')}` : ''}.
              {' '}Você pode mudar a decisão.
            </p>
          )}

          <div className="mt-5 space-y-1.5">
            <Label htmlFor="parecer">Parecer <span className="font-normal text-muted-foreground">(obrigatório para contestar)</span></Label>
            <Textarea
              id="parecer"
              rows={3}
              maxLength={MAX_PARECER}
              value={parecer}
              onChange={(e) => setParecer(e.target.value)}
              placeholder="Ex.: falta a causa raiz — diga o que provocou o problema, não só o que foi feito."
            />
            <p className="text-xs text-muted-foreground">{parecer.length}/{MAX_PARECER} · o agente vê o parecer na tratativa</p>
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" onClick={contestar} disabled={decidir.isPending}>
              <XCircle className="mr-2 h-4 w-4" aria-hidden="true" /> Contestar
            </Button>
            <Button className="bg-success hover:bg-success/90" onClick={() => decidir.mutate({ id: atual.id, aprovar: true })} disabled={decidir.isPending}>
              <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" /> Aprovar (+0,5)
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
