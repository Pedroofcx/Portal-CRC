import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, Trash2 } from 'lucide-react';

import db, { supabase } from '@/api/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Cartao } from '@/components/ui/Cartao';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import PainelLateral, { RodapeFixo } from '@/components/ui/PainelLateral';
import { traduzirErro } from '@/lib/erros';
import { RECURSOS } from '../../../supabase/functions/api/politica.js';

const SENTIDOS = {
  entrada: 'Entrada (o outro sistema chama o Portal)',
  saida: 'Saída (o Portal chama o outro sistema)',
  ambos: 'Os dois',
};

const ROTULO_ACAO = { ler: 'Consultar', gravar: 'Gravar', atualizar: 'Atualizar', excluir: 'Excluir' };
const seletor = 'mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm';
const dataHora = (v) => (v ? new Date(v).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '—');

/**
 * Configurações > Integrações. Tudo que um sistema de fora pode fazer no
 * Portal se liga e desliga aqui: a chave geral, cada integração, cada recurso
 * (lendo e gravando separadamente) e cada chave. A API que obedece a isto é a
 * Edge Function "api" (supabase/functions/api).
 */
export default function PainelIntegracoes() {
  const queryClient = useQueryClient();
  const [nova, setNova] = useState(false);
  const [formNova, setFormNova] = useState({ nome: '', descricao: '', sentido: 'entrada', limite_por_minuto: 60 });
  const [chaveDe, setChaveDe] = useState(null);       // integração que vai ganhar chave
  const [formChave, setFormChave] = useState({ nome: '', expira_em: '' });
  const [chaveCriada, setChaveCriada] = useState(null); // texto da chave, mostrado uma vez
  const [apagar, setApagar] = useState(null);           // { tipo: 'integracao' | 'chave', item }
  const [filtroLog, setFiltroLog] = useState({ integracao: '', resultado: '' });

  const recarregar = () => queryClient.invalidateQueries({ queryKey: ['integracoes'] });

  const { data: geral } = useQuery({
    queryKey: ['integracoes', 'geral'],
    queryFn: async () => (await db.entities.IntegracaoGeral.list())[0] ?? null,
  });
  const { data: integracoes = [] } = useQuery({
    queryKey: ['integracoes', 'lista'],
    queryFn: () => db.entities.Integracao.list('nome'),
  });
  const { data: chaves = [] } = useQuery({
    queryKey: ['integracoes', 'chaves'],
    queryFn: () => db.entities.IntegracaoChave.list('-created_date'),
  });
  const { data: log = [], refetch: recarregarLog, isFetching: carregandoLog } = useQuery({
    queryKey: ['integracoes', 'log'],
    queryFn: () => db.entities.IntegracaoLog.list('-created_date', 100),
    staleTime: 10000,
  });

  const falhou = (acao) => (e) => toast.error(`Não consegui ${acao}: ${traduzirErro(e)}`);

  const alternarGeral = useMutation({
    mutationFn: (habilitada) => db.entities.IntegracaoGeral.update(1, { habilitada }),
    onSuccess: (_, habilitada) => {
      recarregar();
      toast.success(habilitada ? 'Integrações ligadas.' : 'Integrações desligadas. Nada de fora entra.');
    },
    onError: falhou('mudar a chave geral'),
  });

  const salvarIntegracao = useMutation({
    mutationFn: ({ id, dados }) => db.entities.Integracao.update(id, dados),
    onSuccess: recarregar,
    onError: falhou('salvar a integração'),
  });

  const criarIntegracao = useMutation({
    mutationFn: (dados) => db.entities.Integracao.create({ ...dados, ativa: false, recursos: {} }),
    onSuccess: () => {
      recarregar();
      setNova(false);
      setFormNova({ nome: '', descricao: '', sentido: 'entrada', limite_por_minuto: 60 });
      toast.success('Integração criada, desligada. Escolha o que ela acessa e crie uma chave.');
    },
    onError: falhou('criar a integração'),
  });

  const criarChave = useMutation({
    mutationFn: async ({ integracao, nome, expira_em }) => {
      const { data, error } = await supabase.rpc('criar_chave_integracao', {
        p_integracao: integracao.id,
        p_nome: nome,
        p_expira_em: expira_em ? new Date(`${expira_em}T23:59:59-03:00`).toISOString() : null,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      recarregar();
      setChaveDe(null);
      setFormChave({ nome: '', expira_em: '' });
      setChaveCriada(data);
    },
    onError: falhou('criar a chave'),
  });

  const alternarChave = useMutation({
    mutationFn: ({ id, ativa }) => db.entities.IntegracaoChave.update(id, { ativa }),
    onSuccess: recarregar,
    onError: falhou('mudar a chave'),
  });

  const remover = useMutation({
    mutationFn: ({ tipo, item }) => (tipo === 'integracao' ? db.entities.Integracao.delete(item.id) : db.entities.IntegracaoChave.delete(item.id)),
    onSuccess: () => { recarregar(); setApagar(null); toast.success('Removido.'); },
    onError: falhou('remover'),
  });

  const alternarRecurso = (integracao, recurso, acao, valor) => {
    const atual = integracao.recursos?.[recurso] ?? {};
    const recursos = { ...(integracao.recursos ?? {}), [recurso]: { ...atual, [acao]: valor } };
    salvarIntegracao.mutate({ id: integracao.id, dados: { recursos } });
  };

  const logFiltrado = useMemo(
    () => log.filter((l) => (!filtroLog.integracao || l.integracao_id === filtroLog.integracao)
      && (!filtroLog.resultado || l.resultado === filtroLog.resultado)),
    [log, filtroLog],
  );

  const urlBase = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/functions/v1/api/v1`;
  const ligada = geral?.habilitada === true;

  const copiar = async (texto) => {
    try { await navigator.clipboard.writeText(texto); toast.success('Copiado.'); } catch { toast.error('Não consegui copiar. Selecione e copie à mão.'); }
  };

  return (
    <div className="space-y-6">
      {/* CHAVE GERAL */}
      <Cartao titulo="Chave geral">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="max-w-xl text-sm text-muted-foreground">
            Liga e desliga <strong className="text-foreground">toda</strong> a API de uma vez. Desligada, nenhum sistema de fora
            consegue consultar nem gravar, não importa o que esteja liberado abaixo. Use como botão de emergência.
          </p>
          <label className="flex items-center gap-3 text-sm font-medium text-foreground">
            <span className={ligada ? 'text-success' : 'text-muted-foreground'}>{ligada ? 'Ligada' : 'Desligada'}</span>
            <Switch checked={ligada} disabled={!geral || alternarGeral.isPending} onCheckedChange={(v) => alternarGeral.mutate(v)} aria-label="Chave geral das integrações" />
          </label>
        </div>
      </Cartao>

      {/* COMO CONECTAR */}
      <Cartao titulo="Como um sistema se conecta">
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">Endereço base da API:</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1.5 text-xs text-foreground">{urlBase}</code>
            <Button size="sm" variant="outline" onClick={() => copiar(urlBase)}><Copy className="mr-1 h-3.5 w-3.5" /> Copiar</Button>
          </div>
          <p className="text-muted-foreground">A chave vai no cabeçalho <code className="text-foreground">Authorization: Bearer &lt;chave&gt;</code> (ou <code className="text-foreground">x-api-key</code>). Para testar:</p>
          <code className="block overflow-x-auto whitespace-pre rounded bg-muted px-2 py-1.5 text-xs text-foreground">{`curl ${urlBase}/ping \\\n  -H "Authorization: Bearer <sua chave>"`}</code>
          <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
            <li><code className="text-foreground">GET /ping</code>: confere se a chave funciona</li>
            <li><code className="text-foreground">GET /tratativas</code>, <code className="text-foreground">GET /tratativas/TRT-0123</code> (ou pelo número do ticket), <code className="text-foreground">POST /tratativas</code> e <code className="text-foreground">PATCH /tratativas/TRT-0123</code></li>
            <li><code className="text-foreground">GET /acompanhamento/TRT-0123?cnpj=...</code> (ou pelo ticket): só a situação e o resumo que o cliente pode ver, mediante o CNPJ do cliente, para o WhatsApp</li>
            <li><code className="text-foreground">DELETE /tratativas/TRT-0123</code> (exclusão lógica de tratativa em aberto, com justificativa)</li>
            <li><code className="text-foreground">POST /apuracao</code> (linhas brutas: o Portal classifica e calcula) e <code className="text-foreground">DELETE /apuracao/{'{lote}'}</code> (desfaz um lote enviado pela própria integração)</li>
            <li><code className="text-foreground">GET /apuracao</code>, <code className="text-foreground">GET /jornada/etapas</code>, <code className="text-foreground">GET /jornada/motivos</code> e <code className="text-foreground">GET /jornada/resumo</code></li>
            <li><code className="text-foreground">GET /colaboradores</code> e <code className="text-foreground">GET /ciclos</code></li>
          </ul>
        </div>
      </Cartao>

      {/* INTEGRAÇÕES */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-foreground">Integrações ({integracoes.length})</h2>
          <Button size="sm" onClick={() => setNova(true)}>Nova integração</Button>
        </div>

        {integracoes.length === 0 && (
          <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Nenhuma integração cadastrada. Crie uma para cada sistema que vai se conectar.
          </p>
        )}

        {integracoes.map((i) => {
          const minhasChaves = chaves.filter((c) => c.integracao_id === i.id);
          return (
            <Cartao key={i.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-foreground">{i.nome}</h3>
                  <p className="text-xs text-muted-foreground">{SENTIDOS[i.sentido]} · até {i.limite_por_minuto} chamadas por minuto</p>
                  {i.descricao && <p className="mt-1 text-sm text-muted-foreground">{i.descricao}</p>}
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <span className={i.ativa ? 'text-success' : 'text-muted-foreground'}>{i.ativa ? 'Ligada' : 'Desligada'}</span>
                    <Switch checked={i.ativa} onCheckedChange={(v) => salvarIntegracao.mutate({ id: i.id, dados: { ativa: v } })} aria-label={`Ligar ${i.nome}`} />
                  </label>
                  <button type="button" aria-label={`Remover ${i.nome}`} className="text-destructive" onClick={() => setApagar({ tipo: 'integracao', item: i })}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* O QUE ELA ACESSA */}
              <div className="mt-4 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">O que pode acessar</th>
                      <th className="px-3 py-2 text-center font-medium">Consultar</th>
                      <th className="px-3 py-2 text-center font-medium">Gravar</th>
                      <th className="px-3 py-2 text-center font-medium">Atualizar</th>
                      <th className="px-3 py-2 text-center font-medium">Excluir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(RECURSOS).map(([chave, r]) => (
                      <tr key={chave} className="border-t border-border">
                        <td className="px-3 py-2 text-foreground">
                          {r.rotulo}
                          <span className="block text-xs text-muted-foreground">{Object.values(r.acoes).join(' · ')}</span>
                        </td>
                        {['ler', 'gravar', 'atualizar', 'excluir'].map((acao) => (
                          <td key={acao} className="px-3 py-2 text-center">
                            {r.acoes[acao] ? (
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={i.recursos?.[chave]?.[acao] === true}
                                onChange={(e) => alternarRecurso(i, chave, acao, e.target.checked)}
                                aria-label={`${ROTULO_ACAO[acao]} ${r.rotulo} em ${i.nome}`}
                              />
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* CHAVES */}
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-foreground">Chaves ({minhasChaves.length})</h4>
                  <Button size="sm" variant="outline" onClick={() => setChaveDe(i)}>Nova chave</Button>
                </div>
                {minhasChaves.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">Sem chaves: este sistema ainda não consegue entrar.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
                    {minhasChaves.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{c.nome} <code className="ml-1 text-xs font-normal text-muted-foreground">{c.prefixo}…</code></p>
                          <p className="text-xs text-muted-foreground">
                            Criada em {dataHora(c.created_date)}{c.criada_por_nome ? ` por ${c.criada_por_nome}` : ''}
                            {' · '}último uso: {dataHora(c.ultimo_uso)}
                            {c.expira_em ? ` · vence em ${dataHora(c.expira_em)}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-xs text-foreground">
                            {c.ativa ? 'Ativa' : 'Desativada'}
                            <Switch checked={c.ativa} onCheckedChange={(v) => alternarChave.mutate({ id: c.id, ativa: v })} aria-label={`Ativar chave ${c.nome}`} />
                          </label>
                          <button type="button" aria-label={`Apagar chave ${c.nome}`} className="text-destructive" onClick={() => setApagar({ tipo: 'chave', item: c })}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Cartao>
          );
        })}
      </div>

      {/* REGISTRO DE USO */}
      <Cartao
        titulo="Registro de uso"
        extra={<Button size="sm" variant="outline" onClick={() => recarregarLog()} disabled={carregandoLog}>{carregandoLog ? 'Atualizando…' : 'Atualizar'}</Button>}
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <select aria-label="Integração" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={filtroLog.integracao} onChange={(e) => setFiltroLog({ ...filtroLog, integracao: e.target.value })}>
            <option value="">Todas as integrações</option>
            {integracoes.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
          </select>
          <select aria-label="Resultado" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={filtroLog.resultado} onChange={(e) => setFiltroLog({ ...filtroLog, resultado: e.target.value })}>
            <option value="">Aceitas e recusadas</option>
            <option value="aceita">Só aceitas</option>
            <option value="recusada">Só recusadas</option>
          </select>
        </div>
        {logFiltrado.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma chamada registrada ainda.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Quando</th>
                  <th className="px-3 py-2 font-medium">Integração</th>
                  <th className="px-3 py-2 font-medium">Chamada</th>
                  <th className="px-3 py-2 font-medium">Resultado</th>
                  <th className="px-3 py-2 text-right font-medium">Tempo</th>
                </tr>
              </thead>
              <tbody>
                {logFiltrado.map((l) => (
                  <tr key={l.id} className="border-t border-border align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{dataHora(l.created_date)}</td>
                    <td className="px-3 py-2 text-foreground">{l.integracao_nome ?? '—'}</td>
                    <td className="px-3 py-2 text-foreground"><code className="text-xs">{l.metodo} {l.caminho}</code></td>
                    <td className={`px-3 py-2 ${l.resultado === 'aceita' ? 'text-foreground' : 'text-warning'}`}>
                      {l.resultado === 'aceita' ? `Aceita (${l.status_http})` : `Recusada (${l.status_http}${l.motivo ? `: ${l.motivo}` : ''})`}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{l.duracao_ms != null ? `${l.duracao_ms} ms` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Mostra as 100 chamadas mais recentes. Chamadas sem chave válida não são registradas.</p>
      </Cartao>

      {/* NOVA INTEGRAÇÃO */}
      <PainelLateral open={nova} onOpenChange={(v) => { if (!v) setNova(false); }} largura="md" titulo="Nova integração">
        <div className="mt-2 space-y-4">
          <div>
            <Label className="text-xs">Nome do sistema <span className="text-destructive">*</span></Label>
            <Input className="mt-1" value={formNova.nome} onChange={(e) => setFormNova({ ...formNova, nome: e.target.value })} placeholder="Ex: Zendesk" />
          </div>
          <div>
            <Label className="text-xs">Para que serve</Label>
            <Textarea rows={2} className="mt-1" value={formNova.descricao} onChange={(e) => setFormNova({ ...formNova, descricao: e.target.value })} placeholder="Opcional" />
          </div>
          <div>
            <Label className="text-xs">Quem inicia a conversa</Label>
            <select className={seletor} value={formNova.sentido} onChange={(e) => setFormNova({ ...formNova, sentido: e.target.value })}>
              {Object.entries(SENTIDOS).map(([k, r]) => <option key={k} value={k}>{r}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs">Limite de chamadas por minuto</Label>
            <Input type="number" min={1} max={6000} className="mt-1" value={formNova.limite_por_minuto} onChange={(e) => setFormNova({ ...formNova, limite_por_minuto: Number(e.target.value) })} />
          </div>
          <p className="text-xs text-muted-foreground">A integração nasce desligada e sem acesso a nada. Você escolhe o que ela acessa depois.</p>
          <RodapeFixo>
            <Button variant="outline" onClick={() => setNova(false)}>Cancelar</Button>
            <Button disabled={!formNova.nome.trim() || criarIntegracao.isPending} onClick={() => criarIntegracao.mutate({ ...formNova, nome: formNova.nome.trim() })}>
              {criarIntegracao.isPending ? 'Criando…' : 'Criar'}
            </Button>
          </RodapeFixo>
        </div>
      </PainelLateral>

      {/* NOVA CHAVE */}
      <PainelLateral open={!!chaveDe} onOpenChange={(v) => { if (!v) setChaveDe(null); }} largura="md" titulo={`Nova chave — ${chaveDe?.nome ?? ''}`}>
        <div className="mt-2 space-y-4">
          <div>
            <Label className="text-xs">Nome da chave <span className="text-destructive">*</span></Label>
            <Input className="mt-1" value={formChave.nome} onChange={(e) => setFormChave({ ...formChave, nome: e.target.value })} placeholder="Ex: Produção, Teste do João" />
          </div>
          <div>
            <Label className="text-xs">Vence em (opcional)</Label>
            <Input type="date" className="mt-1" value={formChave.expira_em} onChange={(e) => setFormChave({ ...formChave, expira_em: e.target.value })} />
          </div>
          <p className="text-xs text-muted-foreground">O texto da chave aparece uma única vez, logo depois de criada. O Portal guarda só um resumo dela: não tem como mostrá-la de novo.</p>
          <RodapeFixo>
            <Button variant="outline" onClick={() => setChaveDe(null)}>Cancelar</Button>
            <Button disabled={!formChave.nome.trim() || criarChave.isPending} onClick={() => criarChave.mutate({ integracao: chaveDe, ...formChave })}>
              {criarChave.isPending ? 'Criando…' : 'Criar chave'}
            </Button>
          </RodapeFixo>
        </div>
      </PainelLateral>

      {/* CHAVE CRIADA (vista uma vez) */}
      <PainelLateral open={!!chaveCriada} onOpenChange={(v) => { if (!v) setChaveCriada(null); }} largura="md" titulo="Copie a chave agora">
        <div className="mt-2 space-y-4">
          <p className="text-sm text-muted-foreground">Esta é a única vez que a chave aparece. Guarde num cofre de senhas e entregue só a quem vai configurar o outro sistema.</p>
          <code className="block break-all rounded-lg border border-border bg-muted p-3 text-sm text-foreground">{chaveCriada?.chave}</code>
          <Button onClick={() => copiar(chaveCriada?.chave ?? '')}><Copy className="mr-1 h-4 w-4" /> Copiar chave</Button>
          <RodapeFixo>
            <Button variant="outline" onClick={() => setChaveCriada(null)}>Já copiei, fechar</Button>
          </RodapeFixo>
        </div>
      </PainelLateral>

      <ConfirmDialog
        open={!!apagar}
        onOpenChange={(v) => { if (!v) setApagar(null); }}
        title={apagar?.tipo === 'integracao' ? `Remover a integração "${apagar?.item?.nome}"?` : `Apagar a chave "${apagar?.item?.nome}"?`}
        description={apagar?.tipo === 'integracao'
          ? 'As chaves dela também serão apagadas, e o sistema deixa de conseguir entrar. O registro de uso é mantido.'
          : 'O sistema que usa esta chave deixa de conseguir entrar. Para só pausar, desative em vez de apagar.'}
        confirmLabel="Remover"
        onConfirm={() => remover.mutate(apagar)}
      />
    </div>
  );
}
