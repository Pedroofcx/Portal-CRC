import db, { supabase } from '@/api/db';
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AcessoRestrito from '@/components/ui/AcessoRestrito';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Cartao } from '@/components/ui/Cartao';
import { Shield, Search, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useEu } from '@/hooks/useGestor';

/**
 * Permissões granulares (migration 35+). Por colaborador, não por módulo —
 * o caso de uso real é "ajustar o acesso desta pessoa" (ex: um substituto
 * que gerencia mas não vê salário), não "configurar o sistema inteiro de
 * uma vez". Cada card é um colaborador; cada linha, uma permissão, com o
 * padrão do papel dele e um jeito de sobrescrever.
 *
 * O controle de verdade é o banco (tem_permissao(), que as views mascaradas
 * chamam direto) — esta tela só grava/apaga linhas em colaborador_permissao.
 * Sem exceção aqui, ninguém muda de comportamento.
 */
export default function ConfigPermissoes() {
  const { eu, isGestor, carregando: carregandoEu } = useEu();
  const [busca, setBusca] = useState('');
  const [selecionadoId, setSelecionadoId] = useState(null);
  const queryClient = useQueryClient();

  const { data: colaboradores = [], isLoading: carregandoColaboradores } = useQuery({
    queryKey: ['colaboradores', "list()"],
    queryFn: () => db.entities.Colaborador.list(),
  });

  const { data: catalogo = [], isLoading: carregandoCatalogo } = useQuery({
    queryKey: ['permissao-catalogo'],
    queryFn: () => db.entities.Permissao.list(),
  });

  const { data: excecoes = [], isLoading: carregandoExcecoes } = useQuery({
    queryKey: ['colaborador-permissao'],
    queryFn: () => db.entities.ColaboradorPermissao.list(),
  });

  const salvarExcecao = useMutation({
    mutationFn: async ({ colaboradorId, chave, concedida, existente }) => {
      if (existente) {
        await db.entities.ColaboradorPermissao.update(existente.id, { concedida });
      } else {
        const { error } = await supabase.from('colaborador_permissao').insert({
          colaborador_id: colaboradorId,
          permissao_chave: chave,
          concedida,
          concedido_por_id: eu?.id,
          concedido_por_nome: eu?.nome_completo,
        });
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaborador-permissao'] });
      queryClient.invalidateQueries({ queryKey: ['minhas-permissoes'] });
      toast.success('Permissão atualizada');
    },
    onError: () => toast.error('Não consegui salvar essa permissão.'),
  });

  const restaurarPadrao = useMutation({
    mutationFn: (excecaoId) => db.entities.ColaboradorPermissao.delete(excecaoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaborador-permissao'] });
      queryClient.invalidateQueries({ queryKey: ['minhas-permissoes'] });
      toast.success('Voltou ao padrão do papel');
    },
    onError: () => toast.error('Não consegui restaurar o padrão.'),
  });

  const ativos = useMemo(
    () => colaboradores.filter((c) => c.ativo !== false).sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || '')),
    [colaboradores]
  );
  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return ativos;
    return ativos.filter((c) => c.nome_completo?.toLowerCase().includes(termo) || c.email?.toLowerCase().includes(termo));
  }, [ativos, busca]);

  const selecionado = ativos.find((c) => c.id === selecionadoId) || filtrados[0] || null;

  const porModulo = useMemo(() => {
    const grupos = new Map();
    for (const p of [...catalogo].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))) {
      if (!grupos.has(p.modulo)) grupos.set(p.modulo, []);
      grupos.get(p.modulo).push(p);
    }
    return [...grupos.entries()];
  }, [catalogo]);

  const excecoesDoSelecionado = useMemo(
    () => (selecionado ? excecoes.filter((e) => e.colaborador_id === selecionado.id) : []),
    [excecoes, selecionado]
  );

  if (carregandoEu) return <LoadingSpinner text="Carregando..." />;
  if (!isGestor) return <AcessoRestrito mensagem="Só a gestão configura permissões." />;

  const carregando = carregandoColaboradores || carregandoCatalogo || carregandoExcecoes;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permissões"
        subtitle="O que cada pessoa pode ver e fazer, módulo por módulo"
        icon={Shield}
        backTo="Configuracoes"
      />

      {carregando ? (
        <LoadingSpinner text="Carregando permissões..." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <Cartao titulo="Colaboradores">
            <div className="relative mb-3">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input placeholder="Buscar..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-8" />
            </div>
            <div className="max-h-[60vh] space-y-1 overflow-y-auto">
              {filtrados.map((c) => {
                const temExcecao = excecoes.some((e) => e.colaborador_id === c.id);
                const ativo2 = selecionado?.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelecionadoId(c.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg p-2 text-left text-sm transition-colors ${
                      ativo2 ? 'bg-info-soft text-primary' : 'hover:bg-muted'
                    }`}
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={c.foto_url} />
                      <AvatarFallback className="bg-muted text-xs">{c.nome_completo?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate">{c.nome_completo}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{c.papel === 'gestor' ? 'gestor' : 'agente'}</span>
                    {temExcecao && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" title="Tem exceção" />}
                  </button>
                );
              })}
              {filtrados.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Ninguém encontrado.</p>}
            </div>
          </Cartao>

          {!selecionado ? (
            <Cartao><p className="text-sm text-muted-foreground">Selecione um colaborador.</p></Cartao>
          ) : (
            <div className="space-y-4">
              <Cartao>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={selecionado.foto_url} />
                    <AvatarFallback className="bg-muted">{selecionado.nome_completo?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{selecionado.nome_completo}</p>
                    <p className="text-sm text-muted-foreground">
                      Papel: <strong>{selecionado.papel === 'gestor' ? 'Gestor' : 'Agente'}</strong>
                      {' '}— {selecionado.papel === 'gestor' ? 'tem tudo abaixo por padrão' : 'não tem nada abaixo por padrão'}, exceto o que for marcado aqui.
                    </p>
                  </div>
                </div>
              </Cartao>

              {porModulo.map(([modulo, permissoesDoModulo]) => (
                <Cartao key={modulo} titulo={modulo}>
                  <div className="divide-y divide-border">
                    {permissoesDoModulo.map((p) => {
                      const existente = excecoesDoSelecionado.find((e) => e.permissao_chave === p.chave);
                      const padrao = selecionado.papel === 'gestor';
                      const efetivo = existente ? existente.concedida : padrao;
                      const sobrescrita = !!existente;
                      return (
                        <div key={p.chave} className="flex items-center justify-between gap-3 py-2.5">
                          <div className="min-w-0">
                            <p className="text-sm text-foreground">{p.rotulo}</p>
                            {p.descricao && <p className="text-xs text-muted-foreground">{p.descricao}</p>}
                            {sobrescrita && (
                              <button
                                type="button"
                                onClick={() => restaurarPadrao.mutate(existente.id)}
                                className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-warning hover:underline"
                              >
                                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                                Exceção — restaurar padrão ({padrao ? 'teria' : 'não teria'})
                              </button>
                            )}
                          </div>
                          <Switch
                            checked={efetivo}
                            onCheckedChange={(novoValor) =>
                              salvarExcecao.mutate({
                                colaboradorId: selecionado.id,
                                chave: p.chave,
                                concedida: novoValor,
                                existente,
                              })
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </Cartao>
              ))}

              {porModulo.length === 0 && (
                <Cartao>
                  <p className="text-sm text-muted-foreground">Nenhuma permissão cadastrada no catálogo ainda.</p>
                </Cartao>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
