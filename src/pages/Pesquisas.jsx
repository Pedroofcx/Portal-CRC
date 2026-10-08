import db from '@/api/db';
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClipboardCheck } from 'lucide-react';

import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Cartao, Linha } from '@/components/ui/Cartao';
import PainelLateral, { RodapeFixo } from '@/components/ui/PainelLateral';
import CampoPergunta from '@/components/pesquisas/CampoPergunta';
import CartaoPesquisa from '@/components/pesquisas/CartaoPesquisa';
import PainelResultados from '@/components/pesquisas/PainelResultados';
import FormularioPesquisa from '@/components/pesquisas/FormularioPesquisa';

import { formatDateSP } from '@/components/utils/helpers';
import { obrigatoriasSemResposta, montarResposta, pesquisasVisiveis, pesquisaEhPara } from '@/lib/pendencias';
import { PERGUNTAS_AVD, competenciaDoEnvio, tituloDaAvd } from '@/lib/avd';
import { montarParticipacao, quemRespondeu, situacaoDaPesquisa, SITUACOES } from '@/lib/pesquisas';
import { usePermissoes } from '@/hooks/usePermissoes';

/**
 * PESQUISAS — a lista de pesquisas e o resultado de cada uma.
 *
 * Desde 24/09/2026 o sistema guarda quem respondeu (PesquisaParticipacao) e,
 * quando a pesquisa é anônima, guarda só isso: a resposta não fica ligada ao
 * nome de ninguém. O gestor vê quem falta responder sem saber quem disse o
 * quê.
 */
const ABAS = [
  { chave: 'no_ar', rotulo: 'No ar' },
  { chave: 'encerrada', rotulo: 'Encerradas' },
  { chave: 'arquivada', rotulo: 'Arquivadas' },
];

export default function Pesquisas() {
  const [selecionada, setSelecionada] = useState(null);
  const [aba, setAba] = useState('no_ar');
  const [busca, setBusca] = useState('');
  const [formAberto, setFormAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [respondendo, setRespondendo] = useState(null);
  const [respostasAtuais, setRespostasAtuais] = useState({});
  const [faltando, setFaltando] = useState([]);
  const [arquivar, setArquivar] = useState(null);

  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => db.auth.me() });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores', "list()"],
    queryFn: () => db.entities.Colaborador.list(),
  });

  const { data: pesquisas = [], isLoading } = useQuery({
    queryKey: ['pesquisas', "list('-created_date')"],
    queryFn: () => db.entities.Pesquisa.list('-created_date', 500),
    staleTime: 30000,
  });

  const { data: participacoes = [] } = useQuery({
    queryKey: ['pesquisa-participacoes-todas'],
    queryFn: () => db.entities.PesquisaParticipacao.list('-respondida_em', 2000),
    staleTime: 30000,
  });

  const { data: respostas = [] } = useQuery({
    queryKey: ['respostasPesquisa'],
    queryFn: () => db.entities.RespostaPesquisa.list('-data_resposta', 2000),
    staleTime: 30000,
  });

  const eu = colaboradores.find((c) => c.email === user?.email);
  const { temPermissao } = usePermissoes();
  const isGestor = temPermissao('gerenciar_pesquisas');

  /** Quem entra na conta de "quem respondeu": colaborador ativo. */
  const pessoas = useMemo(() => colaboradores
    .filter((c) => c.ativo !== false)
    .sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || '')), [colaboradores]);

  const participacaoDe = useMemo(() => {
    const mapa = new Map();
    // A AVD é só dos agentes: a conta de quem falta não inclui a gestão.
    pesquisas.forEach((p) => mapa.set(p.id, quemRespondeu({ pesquisa: p, participacoes, pessoas: pessoas.filter((c) => pesquisaEhPara(p, c)) })));
    return mapa;
  }, [pesquisas, participacoes, pessoas]);

  const jaRespondi = (pesquisaId) => participacoes
    .some((p) => p.pesquisa_id === pesquisaId && p.colaborador_id === eu?.id);

  // ── Gravações ─────────────────────────────────────────────────────────
  const salvarPesquisa = useMutation({
    mutationFn: (dados) => (editando
      ? db.entities.Pesquisa.update(editando.id, dados)
      : db.entities.Pesquisa.create({ ...dados, ativa: true, criado_por_id: eu?.id, criado_por_nome: eu?.nome_completo })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pesquisas'] });
      toast.success(editando ? 'Pesquisa atualizada.' : 'Pesquisa criada.');
      setFormAberto(false);
      setEditando(null);
    },
    onError: () => toast.error('Não consegui salvar a pesquisa.'),
  });

  // A AVD do mês: um clique cria a pesquisa com as perguntas de sempre. O mês
  // de referência é o do trabalho avaliado (até o dia 15, o mês que passou).
  const competenciaDaRodada = competenciaDoEnvio(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }));
  const avdJaAberta = pesquisas.some((p) => p.tipo === 'avd' && p.competencia === competenciaDaRodada);
  // Quem agendou a AVD e para quando (a gestão vê todos; cada agente, o próprio).
  const { data: agendamentosAvd = [] } = useQuery({
    queryKey: ['avd-agendamentos', 'todos'],
    queryFn: () => db.entities.AvdAgendamento.list('-created_date', 500),
    staleTime: 30000,
  });

  const abrirAvd = useMutation({
    mutationFn: () => db.entities.Pesquisa.create({
      titulo: tituloDaAvd(competenciaDaRodada),
      descricao: 'Autoavaliação mensal do setor. Leva uns minutos; só a gestão lê as respostas.',
      tipo: 'avd', categoria: 'interna', competencia: competenciaDaRodada,
      perguntas: PERGUNTAS_AVD, anonima: false, requer_confirmacao_leitura: false,
      ativa: true, publicada: true, data_publicacao: new Date().toISOString(),
      criado_por_id: eu?.id, criado_por_nome: eu?.nome_completo,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pesquisas'] });
      toast.success('AVD aberta. Os agentes recebem o aviso no sino e no início.');
    },
    onError: () => toast.error('Não consegui abrir a AVD.'),
  });

  const duplicar = useMutation({
    mutationFn: (pesquisa) => db.entities.Pesquisa.create({
      titulo: `${pesquisa.titulo} (cópia)`,
      descricao: pesquisa.descricao,
      tipo: pesquisa.tipo,
      categoria: pesquisa.categoria,
      perguntas: pesquisa.perguntas,
      anonima: !!pesquisa.anonima,
      requer_confirmacao_leitura: true,
      ativa: true,
      criado_por_id: eu?.id,
      criado_por_nome: eu?.nome_completo,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pesquisas'] });
      toast.success('Cópia criada, sem período e sem respostas.');
    },
    onError: () => toast.error('Não consegui duplicar.'),
  });

  const reenviar = useMutation({
    mutationFn: (pesquisa) => {
      Object.keys(sessionStorage)
        .filter((k) => k.includes(`pesquisa_shown_timestamp_${pesquisa.id}`) || k.includes('pesquisa_popup_shown_'))
        .forEach((k) => sessionStorage.removeItem(k));
      return db.entities.Pesquisa.update(pesquisa.id, { reenviar_timestamp: new Date().toISOString() });
    },
    onSuccess: (_r, pesquisa) => {
      queryClient.invalidateQueries({ queryKey: ['pesquisas'] });
      const faltam = participacaoDe.get(pesquisa.id)?.faltam.length ?? 0;
      toast.success(`A pesquisa vai aparecer de novo para ${faltam} pessoa(s).`);
    },
    onError: () => toast.error('Não consegui reenviar.'),
  });

  const arquivarPesquisa = useMutation({
    mutationFn: (pesquisa) => db.entities.Pesquisa.update(pesquisa.id, { ativa: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pesquisas'] });
      toast.success('Pesquisa arquivada. As respostas continuam guardadas.');
      setArquivar(null);
      setSelecionada(null);
    },
    onError: () => toast.error('Não consegui arquivar.'),
  });

  const responder = useMutation({
    mutationFn: async ({ resposta, participacao }) => {
      await db.entities.RespostaPesquisa.create(resposta);
      await db.entities.PesquisaParticipacao.create(participacao);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pesquisa-participacoes-todas'] });
      queryClient.invalidateQueries({ queryKey: ['pesquisa-participacoes'] });
      queryClient.invalidateQueries({ queryKey: ['respostasPesquisa'] });
      toast.success('Resposta enviada. Obrigado!');
      setRespondendo(null);
      setRespostasAtuais({});
    },
    onError: () => toast.error('Não consegui enviar a resposta.'),
  });

  const enviarResposta = () => {
    const sem = obrigatoriasSemResposta(respondendo, respostasAtuais);
    setFaltando(sem);
    if (sem.length) {
      document.getElementById(`pergunta-${sem[0]}`)?.scrollIntoView?.({ block: 'center' });
      return;
    }
    responder.mutate({
      resposta: montarResposta(respondendo, respostasAtuais, eu),
      participacao: montarParticipacao(respondendo, eu),
    });
  };

  if (isLoading) return <LoadingSpinner text="Carregando as pesquisas..." />;

  // ── Tela do agente ────────────────────────────────────────────────────
  if (!isGestor) {
    const minhas = pesquisasVisiveis(pesquisas, eu)
      .filter((p) => p.ativa !== false && situacaoDaPesquisa(p) === 'no_ar');
    const pendentes = minhas.filter((p) => !jaRespondi(p.id));
    const respondidas = minhas.filter((p) => jaRespondi(p.id));

    return (
      <div className="space-y-6">
        <PageHeader title="Pesquisas" subtitle="O que a gestão quer ouvir de você" icon={ClipboardCheck} />

        <Cartao titulo="A responder">
          {pendentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada pendente. Obrigado!</p>
          ) : (
            <div className="divide-y divide-border">
              {pendentes.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{p.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {(p.perguntas || []).length} pergunta(s){p.anonima ? ' · anônima' : ''}
                      {p.data_fim ? ` · até ${formatDateSP(p.data_fim, 'DD/MM/YYYY')}` : ''}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => { setRespondendo(p); setRespostasAtuais({}); setFaltando([]); }}>Responder</Button>
                </div>
              ))}
            </div>
          )}
        </Cartao>

        <Cartao titulo="Já respondidas">
          {respondidas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma ainda.</p>
          ) : (
            <div className="divide-y divide-border">
              {respondidas.map((p) => (
                <Linha key={p.id} rotulo={p.titulo} detalhe={p.anonima ? 'anônima' : null} valor="respondida" />
              ))}
            </div>
          )}
        </Cartao>

        <PainelResponder
          pesquisa={respondendo}
          respostas={respostasAtuais}
          faltando={faltando}
          enviando={responder.isPending}
          onMudar={(id, v) => {
            setRespostasAtuais((r) => ({ ...r, [id]: v }));
            if (faltando.includes(id) && String(v).trim()) setFaltando((f) => f.filter((x) => x !== id));
          }}
          onFechar={() => setRespondendo(null)}
          onEnviar={enviarResposta}
        />
      </div>
    );
  }

  // ── Tela do gestor ────────────────────────────────────────────────────
  if (selecionada) {
    const atual = pesquisas.find((p) => p.id === selecionada) ?? null;
    if (atual) {
      return (
        <>
          <PageHeader title="Pesquisas" subtitle={atual.titulo} icon={ClipboardCheck} />
          <PainelResultados
            pesquisa={atual}
            respostas={respostas}
            participacao={participacaoDe.get(atual.id) ?? { responderam: [], faltam: [], deDesligados: [], total: 0, taxa: null }}
            agendamentos={agendamentosAvd.filter((a) => a.pesquisa_id === atual.id)}
            podeEditar={isGestor}
            ocupado={duplicar.isPending || reenviar.isPending || arquivarPesquisa.isPending}
            onVoltar={() => setSelecionada(null)}
            onEditar={() => { setEditando(atual); setFormAberto(true); }}
            onDuplicar={() => duplicar.mutate(atual)}
            onReenviar={() => reenviar.mutate(atual)}
            onArquivar={() => setArquivar(atual)}
          />
          <FormularioPesquisa
            open={formAberto}
            onOpenChange={(v) => { setFormAberto(v); if (!v) setEditando(null); }}
            pesquisa={editando}
            salvando={salvarPesquisa.isPending}
            onSalvar={(dados) => salvarPesquisa.mutate(dados)}
          />
          <ConfirmDialog
            open={!!arquivar}
            onOpenChange={() => setArquivar(null)}
            title="Arquivar pesquisa"
            description="Ela sai da lista da equipe. As respostas já dadas continuam guardadas."
            confirmLabel="Arquivar"
            onConfirm={() => arquivarPesquisa.mutate(arquivar)}
            variant="danger"
          />
        </>
      );
    }
  }

  const filtradas = pesquisas
    .filter((p) => situacaoDaPesquisa(p) === aba)
    .filter((p) => p.titulo?.toLowerCase().includes(busca.toLowerCase()));

  // O gestor também responde (o Kaizen da semana é de todo mundo).
  const minhasPendentes = pesquisas
    .filter((p) => situacaoDaPesquisa(p) === 'no_ar' && !jaRespondi(p.id) && pesquisaEhPara(p, eu));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pesquisas"
        subtitle="O que a equipe respondeu — e quem ainda falta responder"
        icon={ClipboardCheck}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            {isGestor && (
              <Button variant="outline" onClick={() => abrirAvd.mutate()} disabled={avdJaAberta || abrirAvd.isPending}>
                {avdJaAberta ? `${tituloDaAvd(competenciaDaRodada)} já aberta` : `Abrir ${tituloDaAvd(competenciaDaRodada)}`}
              </Button>
            )}
            <Button onClick={() => { setEditando(null); setFormAberto(true); }}>Nova pesquisa</Button>
          </div>
        )}
      />

      <div className="flex flex-wrap items-center gap-2">
        {ABAS.map((a) => (
          <Button key={a.chave} size="sm" variant={aba === a.chave ? 'default' : 'outline'} onClick={() => setAba(a.chave)}>
            {a.rotulo} ({pesquisas.filter((p) => situacaoDaPesquisa(p) === a.chave).length})
          </Button>
        ))}
        <Input className="max-w-xs" placeholder="Buscar pelo título..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>

      {minhasPendentes.length > 0 && (
        <Cartao titulo="Esperando a sua resposta" extra={<span className="text-xs text-muted-foreground">{minhasPendentes.length} pesquisa(s)</span>}>
          <div className="divide-y divide-border">
            {minhasPendentes.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{p.titulo}</p>
                  <p className="text-xs text-muted-foreground">
                    {(p.perguntas || []).length} pergunta(s){p.anonima ? ' · anônima' : ''}
                    {p.data_fim ? ` · até ${formatDateSP(p.data_fim, 'DD/MM/YYYY')}` : ''}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => { setRespondendo(p); setRespostasAtuais({}); setFaltando([]); }}>Responder</Button>
              </div>
            ))}
          </div>
        </Cartao>
      )}

      {filtradas.length === 0 ? (
        <Cartao>
          <p className="text-sm text-muted-foreground">Nenhuma pesquisa {SITUACOES[aba]?.toLowerCase()} por aqui.</p>
        </Cartao>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtradas.map((p) => (
            <CartaoPesquisa
              key={p.id}
              pesquisa={p}
              participacao={participacaoDe.get(p.id) ?? { responderam: [], faltam: [], deDesligados: [], total: 0, taxa: null }}
              onClick={() => setSelecionada(p.id)}
            />
          ))}
        </div>
      )}

      <FormularioPesquisa
        open={formAberto}
        onOpenChange={(v) => { setFormAberto(v); if (!v) setEditando(null); }}
        pesquisa={editando}
        salvando={salvarPesquisa.isPending}
        onSalvar={(dados) => salvarPesquisa.mutate(dados)}
      />

      <PainelResponder
        pesquisa={respondendo}
        respostas={respostasAtuais}
        faltando={faltando}
        enviando={responder.isPending}
        onMudar={(id, v) => {
          setRespostasAtuais((r) => ({ ...r, [id]: v }));
          if (faltando.includes(id) && String(v).trim()) setFaltando((f) => f.filter((x) => x !== id));
        }}
        onFechar={() => setRespondendo(null)}
        onEnviar={enviarResposta}
      />
    </div>
  );
}

/** O painel em que o agente responde. */
function PainelResponder({ pesquisa, respostas, faltando, enviando, onMudar, onFechar, onEnviar }) {
  return (
    <PainelLateral open={!!pesquisa} onOpenChange={(v) => { if (!v) onFechar(); }} largura="xl" titulo={pesquisa?.titulo ?? ''}>
      {pesquisa && (
        <div className="mt-2 space-y-4">
          {pesquisa.descricao && <p className="text-sm text-muted-foreground">{pesquisa.descricao}</p>}
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            {pesquisa.anonima
              ? 'Esta pesquisa é anônima: fica registrado que você respondeu, mas a resposta não é ligada ao seu nome.'
              : 'Sua resposta fica registrada com o seu nome e é lida pela gestão.'}
          </p>
          {(pesquisa.perguntas ?? []).map((q, i) => (
            <CampoPergunta
              key={q.id}
              pergunta={q}
              numero={i + 1}
              valor={respostas[q.id] ?? ''}
              faltando={faltando.includes(q.id)}
              aoMudar={(v) => onMudar(q.id, v)}
            />
          ))}
          <RodapeFixo>
            <Button variant="outline" onClick={onFechar}>Fechar</Button>
            <Button onClick={onEnviar} disabled={enviando}>{enviando ? 'Enviando...' : 'Enviar resposta'}</Button>
          </RodapeFixo>
        </div>
      )}
    </PainelLateral>
  );
}
