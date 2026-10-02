import db from '@/api/db';
import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ClipboardCheck, FileText, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import PainelLateral from '@/components/ui/PainelLateral';
import POPForm from '@/components/pop/POPForm';
import POPViewer from '@/components/pop/POPViewer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { todaySP } from '@/components/utils/helpers';
import { agruparPorCategoria, fotografia, popsParaCiencia, proximaVersao } from '@/lib/pops';
import { usePermissoes } from '@/hooks/usePermissoes';

/**
 * POP — a biblioteca de procedimentos da Estrutura de Trabalho CRC 2026.
 *
 * Todo mundo lê; só o gestor cria, edita e desativa (o banco garante —
 * migration 18). Cada edição publica uma VERSÃO nova, guardada no histórico,
 * e pode pedir confirmação de leitura da equipe (central de pendências).
 *
 * ?abrir=POP%2004 abre direto num POP — é o que o "Ver POP" da tratativa usa.
 */
export default function POP() {
  const queryClient = useQueryClient();
  const { search } = useLocation();
  const [busca, setBusca] = useState('');
  const [abertoId, setAbertoId] = useState(null);
  const [editando, setEditando] = useState(null); // null | 'novo' | pop
  const [desativando, setDesativando] = useState(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => db.auth.me() });
  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores', "list()"],
    queryFn: () => db.entities.Colaborador.list(),
  });
  const eu = colaboradores.find((c) => c.email?.toLowerCase() === user?.email?.toLowerCase());
  const { temPermissao } = usePermissoes();
  const isGestor = temPermissao('gerenciar_pop');

  const { data: pops = [], isLoading } = useQuery({
    queryKey: ['pops', 'ativos'],
    queryFn: () => db.entities.POP.filter({ ativo: true }),
  });
  const { data: minhasLeituras = [] } = useQuery({
    queryKey: ['pop-leituras', eu?.id],
    queryFn: () => db.entities.PopLeitura.filter({ colaborador_id: eu.id }),
    enabled: Boolean(eu?.id),
  });
  const { data: tiposTratativa = [] } = useQuery({
    queryKey: ['tipos-tratativa', "filter({ ativa: true })"],
    queryFn: () => db.entities.TipoTratativa.filter({ ativa: true }),
    enabled: isGestor,
  });

  // Abrir direto pelo endereço (?abrir=POP 04), uma vez só.
  const [abriuPeloLink, setAbriuPeloLink] = useState(false);
  if (!abriuPeloLink && pops.length) {
    const codigo = new URLSearchParams(search).get('abrir');
    const alvo = codigo && pops.find((p) => p.codigo === codigo);
    setAbriuPeloLink(true);
    if (alvo) setAbertoId(alvo.id);
  }

  const ehNovo = editando === 'novo-pop' || editando === 'novo-ort';
  const aberto = pops.find((p) => p.id === abertoId) ?? null;
  const grupos = useMemo(() => agruparPorCategoria(pops, busca), [pops, busca]);
  const pendentes = useMemo(
    () => new Set(popsParaCiencia({ pops, leituras: minhasLeituras, colaborador: eu }).map((p) => p.id)),
    [pops, minhasLeituras, eu],
  );

  const { data: versoes = [] } = useQuery({
    queryKey: ['pop-versoes', abertoId],
    queryFn: () => db.entities.PopVersao.filter({ pop_id: abertoId }, '-publicado_em'),
    enabled: Boolean(abertoId),
  });
  const { data: leiturasDaVersao = [] } = useQuery({
    queryKey: ['pop-leituras-versao', abertoId, aberto?.versao],
    queryFn: () => db.entities.PopLeitura.filter({ pop_id: abertoId, versao: aberto.versao }),
    enabled: Boolean(isGestor && aberto),
  });
  const leitores = useMemo(() => {
    if (!isGestor || !aberto) return null;
    const equipe = colaboradores.filter((c) => c.ativo !== false && c.papel === 'agente');
    const leram = new Set(leiturasDaVersao.map((l) => l.colaborador_id));
    return { total: equipe.length, leram: equipe.filter((c) => leram.has(c.id)), faltam: equipe.filter((c) => !leram.has(c.id)) };
  }, [isGestor, aberto, colaboradores, leiturasDaVersao]);

  const atualizar = () => {
    queryClient.invalidateQueries({ queryKey: ['pops'] });
    queryClient.invalidateQueries({ queryKey: ['pop-versoes'] });
  };

  const salvar = useMutation({
    mutationFn: async ({ dados, versao: meta }) => {
      const agora = new Date().toISOString();
      const autoria = { publicado_em: agora, publicado_por_nome: eu?.nome_completo ?? null, vigencia: todaySP() };
      let pop;
      if (editando === 'novo-pop' || editando === 'novo-ort') {
        pop = await db.entities.POP.create({
          ...dados, ...autoria, versao: '1.0', ativo: true, exige_ciencia: true,
          data_criacao: agora, o_que_mudou: 'Primeira versão.',
        });
      } else {
        pop = await db.entities.POP.update(editando.id, {
          ...dados, ...autoria,
          versao: proximaVersao(editando.versao, meta.tipoVersao),
          o_que_mudou: meta.o_que_mudou,
          exige_ciencia: meta.exige_ciencia,
        });
      }
      await db.entities.PopVersao.create({
        pop_id: pop.id, versao: pop.versao, snapshot: fotografia(pop), o_que_mudou: pop.o_que_mudou,
        publicado_em: agora, publicado_por_id: eu?.id ?? null, publicado_por_nome: eu?.nome_completo ?? null,
      });
      return pop;
    },
    onSuccess: (pop) => {
      toast.success(`${pop.codigo} publicado — versão ${pop.versao}`);
      atualizar();
      setEditando(null);
      setAbertoId(pop.id);
    },
    onError: () => toast.error('Não consegui publicar. Tente de novo.'),
  });

  const desativar = useMutation({
    mutationFn: (id) => db.entities.POP.update(id, { ativo: false }),
    onSuccess: () => { toast.success('POP desativado'); atualizar(); setDesativando(null); setAbertoId(null); },
    onError: () => toast.error('Não consegui desativar.'),
  });

  const confirmarLeitura = useMutation({
    mutationFn: (pop) => db.entities.PopLeitura.create({
      pop_id: pop.id, versao: pop.versao, colaborador_id: eu.id, data_leitura: new Date().toISOString(),
    }),
    onSuccess: () => {
      toast.success('Leitura confirmada');
      queryClient.invalidateQueries({ queryKey: ['pop-leituras'] });
      queryClient.invalidateQueries({ queryKey: ['pop-leituras-versao'] });
    },
    onError: () => toast.error('Não consegui confirmar a leitura.'),
  });

  if (isLoading) return <LoadingSpinner text="Carregando procedimentos…" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="POP — Procedimentos Operacionais"
        subtitle="Estrutura de Trabalho CRC 2026 · um procedimento por tema"
        icon={FileText}
        actions={isGestor && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditando('novo-ort')}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Novo ORT
            </Button>
            <Button onClick={() => setEditando('novo-pop')}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Novo POP
            </Button>
          </div>
        )}
      />

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          aria-label="Buscar nos POPs"
          placeholder="Buscar em todo o texto: código, tema, prazo, macro…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-10"
        />
      </div>

      {pendentes.size > 0 && (
        <p className="rounded-lg bg-info-soft px-4 py-2.5 text-sm text-foreground">
          <ClipboardCheck className="mr-1.5 inline h-4 w-4 text-primary" aria-hidden="true" />
          {pendentes.size} POP{pendentes.size === 1 ? '' : 's'} com versão nova para você ler e confirmar.
        </p>
      )}

      {grupos.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <FileText className="mx-auto mb-3 h-10 w-10 opacity-30" aria-hidden="true" />
          <p className="font-medium">{busca ? 'Nenhum POP encontrado para essa busca' : 'Nenhum POP publicado'}</p>
        </div>
      ) : grupos.map((g) => (
        <section key={g.categoria}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {g.categoria} <span className="font-normal">· {g.pops.length}</span>
          </h2>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {g.pops.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setAbertoId(p.id)}
                className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <span className="w-16 shrink-0 font-mono text-xs font-semibold text-muted-foreground">{p.codigo}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {p.tipo === 'ort' && <span className="mr-1.5 rounded bg-info-soft px-1.5 py-0.5 text-[10px] font-semibold text-info align-middle">ORT</span>}
                    {p.titulo}
                  </span>
                  {p.prazos?.length > 0 && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {p.prazos.slice(0, 2).map((z) => `${z.rotulo}: ${z.valor}`).join(' · ')}
                    </span>
                  )}
                </span>
                {pendentes.has(p.id)
                  ? <span className="shrink-0 rounded-full bg-info-soft px-2 py-0.5 text-xs font-semibold text-primary">Ler nova versão</span>
                  : <span className="shrink-0 text-xs text-muted-foreground">v{p.versao || '1.0'}</span>}
              </button>
            ))}
          </div>
        </section>
      ))}

      <PainelLateral
        open={Boolean(aberto) && !editando}
        onOpenChange={(v) => { if (!v) setAbertoId(null); }}
        largura="2xl"
        titulo={aberto ? aberto.titulo : ''}
        icone={FileText}
        rodape={aberto && (
          <>
            {isGestor && (
              <>
                <Button variant="ghost" className="mr-auto text-destructive hover:text-destructive" onClick={() => setDesativando(aberto)}>
                  <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" /> Desativar
                </Button>
                <Button variant="outline" onClick={() => setEditando(aberto)}>
                  <Pencil className="mr-1.5 h-4 w-4" aria-hidden="true" /> Editar
                </Button>
              </>
            )}
            {pendentes.has(aberto.id) && (
              <Button onClick={() => confirmarLeitura.mutate(aberto)} disabled={confirmarLeitura.isPending}>
                <ClipboardCheck className="mr-1.5 h-4 w-4" aria-hidden="true" /> Li e compreendi a versão {aberto.versao}
              </Button>
            )}
          </>
        )}
      >
        <POPViewer pop={aberto} versoes={versoes} leitores={leitores} isGestor={isGestor} />
      </PainelLateral>

      <PainelLateral
        open={Boolean(editando)}
        onOpenChange={(v) => { if (!v) setEditando(null); }}
        largura="2xl"
        titulo={editando === 'novo-pop' ? 'Novo POP' : editando === 'novo-ort' ? 'Novo ORT' : editando ? `Editar ${editando.codigo}` : ''}
        descricao={editando && !ehNovo ? `Versão atual ${editando.versao} — salvar publica uma versão nova` : undefined}
      >
        {editando && (
          <POPForm
            key={ehNovo ? editando : editando.id}
            popInicial={ehNovo ? null : editando}
            tipoNovo={editando === 'novo-ort' ? 'ort' : 'pop'}
            tiposTratativa={tiposTratativa}
            isLoading={salvar.isPending}
            onCancel={() => setEditando(null)}
            onSubmit={(dados, versao) => salvar.mutate({ dados, versao })}
          />
        )}
      </PainelLateral>

      <ConfirmDialog
        open={Boolean(desativando)}
        onOpenChange={(v) => { if (!v) setDesativando(null); }}
        title="Desativar este POP?"
        description={desativando ? `${desativando.codigo} — ${desativando.titulo} sai da lista. O histórico de versões fica guardado.` : ''}
        confirmLabel="Desativar"
        onConfirm={() => desativar.mutate(desativando.id)}
      />
    </div>
  );
}
