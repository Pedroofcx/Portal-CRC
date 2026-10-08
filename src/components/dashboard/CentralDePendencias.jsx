import React, { useMemo, useState } from 'react';
import * as Primitivo from '@radix-ui/react-dialog';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import db from '@/api/db';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import CampoPergunta from '@/components/pesquisas/CampoPergunta';
import { formatDateSP } from '@/components/utils/helpers';
import { filaDePendencias, obrigatoriasSemResposta, montarResposta } from '@/lib/pendencias';
import { agendamentoDa, problemaDoAgendamento, quandoPorExtenso, DIAS_MAX_AGENDAMENTO } from '@/lib/avd';
import { montarParticipacao } from '@/lib/pesquisas';
import { popsParaCiencia } from '@/lib/pops';
import { traduzirErro } from '@/lib/erros';

/**
 * Central de pendências — o que a pessoa precisa ver ao entrar: avisos a
 * confirmar, pesquisas a responder, POPs com versão nova para ler e
 * (agentes) resultados de Hansei novos.
 *
 * Substitui três pop-ups soltos que brigavam entre si e voltavam depois de
 * confirmados. As regras moram em src/lib/pendencias.js (testadas):
 * só o que é para a pessoa, vigente, e publicado DEPOIS do cadastro dela.
 *
 * Uma pendência por vez, com "2 de 5" no topo. Título fixo em cima, ação
 * fixa embaixo (regras-ui-ux.md, seção 9). Aviso e pesquisa não fecham sem
 * resposta; se a gravação falhar, aparece "Deixar para depois" — ninguém
 * fica preso num erro do servidor.
 */

const TIPO_AVISO = {
  urgente: { rotulo: 'Urgente', classe: 'bg-critical-soft text-critical' },
  alerta: { rotulo: 'Alerta', classe: 'bg-warning-soft text-warning' },
  comunicado: { rotulo: 'Comunicado', classe: 'bg-info-soft text-primary' },
  informativo: { rotulo: 'Informativo', classe: 'bg-muted text-muted-foreground' },
};

export default function CentralDePendencias({ colaborador }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const id = colaborador?.id;
  const ehAgente = colaborador?.papel === 'agente';

  const { data: avisos, isSuccess: okAvisos } = useQuery({
    queryKey: ['avisos-ativos'],
    queryFn: () => db.entities.Aviso.filter({ ativo: true }, 'data_publicacao'),
    enabled: Boolean(id),
    staleTime: 60000,
  });
  // Só as confirmações DESTA pessoa — antes vinham as últimas 1000 de todo
  // mundo, e as mais antigas iam sumindo da conta.
  const { data: leituras, isSuccess: okLeituras } = useQuery({
    queryKey: ['aviso-leituras', id],
    queryFn: () => db.entities.AvisoLeitura.filter({ colaborador_id: id }),
    enabled: Boolean(id),
    staleTime: 0,
  });
  const { data: pesquisas, isSuccess: okPesquisas } = useQuery({
    queryKey: ['pesquisas', "filter({ ativa: true }, '-created_date')"],
    queryFn: () => db.entities.Pesquisa.filter({ ativa: true }, '-created_date'),
    enabled: Boolean(id),
    staleTime: 60000,
  });
  // Quem já respondeu vem da participação: em pesquisa anônima a resposta
  // não guarda o nome de ninguém (migration 23).
  const { data: participacoes, isSuccess: okRespostas } = useQuery({
    queryKey: ['pesquisa-participacoes', id],
    queryFn: () => db.entities.PesquisaParticipacao.filter({ colaborador_id: id }),
    enabled: Boolean(id),
    staleTime: 0,
  });
  const { data: hanseis = [] } = useQuery({
    queryKey: ['hansei-nao-visualizados', id],
    queryFn: () => db.entities.HanseiEnvio.filter({ colaborador_id: id, visualizado: false }, '-data_envio'),
    enabled: Boolean(id) && ehAgente,
    staleTime: 60000,
  });

  // POPs com versão nova a confirmar (migration 18).
  const { data: pops = [] } = useQuery({
    queryKey: ['pops', 'ativos'],
    queryFn: () => db.entities.POP.filter({ ativo: true }),
    enabled: Boolean(id),
    staleTime: 60000,
  });
  const { data: leiturasPop = [] } = useQuery({
    queryKey: ['pop-leituras', id],
    queryFn: () => db.entities.PopLeitura.filter({ colaborador_id: id }),
    enabled: Boolean(id),
    staleTime: 0,
  });

  // O que foi tratado nesta sessão sai da fila na hora (regra 4).
  const [tratados, setTratados] = useState(() => new Set());
  const [concluidos, setConcluidos] = useState(0);
  const [adiado, setAdiado] = useState(false);
  const [hanseiAdiado, setHanseiAdiado] = useState(false);
  const [respostasAtuais, setRespostasAtuais] = useState({});
  const [faltando, setFaltando] = useState([]);
  const [falhou, setFalhou] = useState(false);

  // Férias aprovadas: a AVD não cobra quem está fora (mesma chave do sino, uma busca só).
  const { data: ferias = [] } = useQuery({
    queryKey: ['solicitacoes-ferias'],
    queryFn: () => db.entities.SolicitacaoFerias.list('-data_inicio', 500),
    enabled: Boolean(colaborador?.id),
    staleTime: 60000,
  });

  // Horários que a pessoa escolheu para responder a AVD.
  const { data: agendamentos = [] } = useQuery({
    queryKey: ['avd-agendamentos', id],
    queryFn: () => db.entities.AvdAgendamento.filter({ colaborador_id: id }),
    enabled: Boolean(id) && ehAgente,
    staleTime: 0,
  });
  // "Agora" para a fila: avança sozinho quando chega a hora de um agendamento.
  const [agora, setAgora] = useState(() => new Date());
  React.useEffect(() => {
    const proximo = agendamentos
      .map((a) => new Date(a.agendada_para).getTime())
      .filter((t) => t > Date.now())
      .sort((a, b) => a - b)[0];
    if (!proximo) return undefined;
    const espera = Math.min(proximo - Date.now() + 500, 2147483000);
    const timer = setTimeout(() => setAgora(new Date()), espera);
    return () => clearTimeout(timer);
  }, [agendamentos]);

  const [agendando, setAgendando] = useState(false);
  const [diaAgendado, setDiaAgendado] = useState('');
  const [horaAgendada, setHoraAgendada] = useState('');

  const carregado = okAvisos && okLeituras && okPesquisas && okRespostas;
  const fila = useMemo(() => {
    if (!carregado) return [];
    const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const ausente = ferias.some((f) => f.colaborador_id === colaborador?.id && f.status === 'aprovada' && String(f.data_inicio).slice(0, 10) <= hoje && hoje <= String(f.data_fim).slice(0, 10));
    const base = filaDePendencias({ colaborador, avisos, leituras, pesquisas, participacoes, tratados, ausente, agendamentos, agora });
    for (const pop of popsParaCiencia({ pops, leituras: leiturasPop, colaborador, tratados })) base.push({ tipo: 'pop', item: pop });
    if (ehAgente && hanseis.length && !hanseiAdiado) base.push({ tipo: 'hansei', item: hanseis });
    return base;
  }, [carregado, colaborador, avisos, leituras, pesquisas, participacoes, tratados, ehAgente, hanseis, hanseiAdiado, pops, leiturasPop, ferias, agendamentos, agora]);

  const atual = fila[0];
  const total = concluidos + fila.length;

  const concluir = (chave) => {
    setTratados((t) => new Set(t).add(chave));
    setConcluidos((n) => n + 1);
    setRespostasAtuais({});
    setFaltando([]);
    setFalhou(false);
  };

  const confirmar = useMutation({
    mutationFn: (avisoId) => db.entities.AvisoLeitura.create({
      aviso_id: avisoId, colaborador_id: id, data_leitura: new Date().toISOString(), confirmou: true,
    }),
    onSuccess: (_, avisoId) => {
      concluir(avisoId);
      queryClient.invalidateQueries({ queryKey: ['aviso-leituras'] });
      queryClient.invalidateQueries({ queryKey: ['avisoLeituras'] });
    },
    onError: (e) => { setFalhou(true); toast.error(`Não foi possível confirmar: ${traduzirErro(e)}`); },
  });

  const confirmarPop = useMutation({
    mutationFn: (pop) => db.entities.PopLeitura.create({
      pop_id: pop.id, versao: pop.versao, colaborador_id: id, data_leitura: new Date().toISOString(),
    }),
    onSuccess: (_, pop) => {
      concluir(`${pop.id}@${pop.versao}`);
      queryClient.invalidateQueries({ queryKey: ['pop-leituras'] });
    },
    onError: (e) => { setFalhou(true); toast.error(`Não foi possível confirmar: ${traduzirErro(e)}`); },
  });

  const agendar = useMutation({
    mutationFn: ({ pesquisa, quando }) => db.entities.AvdAgendamento.create({
      pesquisa_id: pesquisa.id, colaborador_id: id, colaborador_nome: colaborador.nome_completo, agendada_para: quando.toISOString(),
    }),
    onSuccess: (_, { quando }) => {
      setAgendando(false);
      toast.success(`AVD agendada para ${quandoPorExtenso(quando)}. Nessa hora ela volta e precisa ser respondida.`);
      queryClient.invalidateQueries({ queryKey: ['avd-agendamentos'] });
      setAgora(new Date());
    },
    onError: (e) => toast.error(`Não consegui agendar: ${traduzirErro(e)}`),
  });

  const responder = useMutation({
    mutationFn: async ({ resposta, participacao }) => {
      await db.entities.RespostaPesquisa.create(resposta);
      // A participação é o que tira a pesquisa da fila desta pessoa.
      await db.entities.PesquisaParticipacao.create(participacao);
    },
    onSuccess: (_, { participacao }) => {
      concluir(participacao.pesquisa_id);
      toast.success('Resposta enviada. Obrigado!');
      queryClient.invalidateQueries({ queryKey: ['pesquisa-participacoes'] });
      queryClient.invalidateQueries({ queryKey: ['respostasPesquisa'] });
      queryClient.invalidateQueries({ queryKey: ['pesquisa-participacoes-todas'] });
    },
    onError: (e) => { setFalhou(true); toast.error(`Não foi possível enviar: ${traduzirErro(e)}`); },
  });

  if (!atual || adiado) return null;

  const enviarPesquisa = () => {
    const sem = obrigatoriasSemResposta(atual.item, respostasAtuais);
    setFaltando(sem);
    if (sem.length) {
      document.getElementById(`pergunta-${sem[0]}`)?.scrollIntoView?.({ block: 'center' });
      return;
    }
    responder.mutate({
      resposta: montarResposta(atual.item, respostasAtuais, colaborador),
      participacao: montarParticipacao(atual.item, colaborador),
    });
  };

  let rotulo = 'Aviso';
  let titulo = '';
  let corpo = null;
  let acoes = null;

  if (atual.tipo === 'aviso') {
    const a = atual.item;
    const tipo = TIPO_AVISO[a.tipo] ?? TIPO_AVISO.informativo;
    titulo = a.titulo;
    corpo = (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className={`rounded-full px-2 py-0.5 font-semibold ${tipo.classe}`}>{tipo.rotulo}</span>
          {a.data_publicacao && <span>Publicado em {formatDateSP(a.data_publicacao, 'DD/MM/YYYY')}</span>}
          {a.autor_nome && <span>· por {a.autor_nome}</span>}
        </div>
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{a.conteudo}</p>
      </div>
    );
    acoes = (
      <Button onClick={() => confirmar.mutate(a.id)} disabled={confirmar.isPending}>
        <ClipboardCheck className="mr-2 h-4 w-4" aria-hidden="true" />
        {confirmar.isPending ? 'Confirmando…' : 'Li e compreendi'}
      </Button>
    );
  } else if (atual.tipo === 'pesquisa') {
    const p = atual.item;
    rotulo = 'Pesquisa';
    titulo = p.titulo;
    corpo = (
      <div className="space-y-3">
        {p.descricao && <p className="text-sm text-muted-foreground">{p.descricao}</p>}
        <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
          {p.anonima
            ? 'Esta pesquisa é anônima: fica registrado que você respondeu, mas a resposta não é ligada ao seu nome.'
            : 'Sua resposta fica registrada com o seu nome e é lida pela gestão.'}
        </p>
        {(p.perguntas ?? []).map((q, i) => (
          <CampoPergunta
            key={q.id}
            pergunta={q}
            numero={i + 1}
            valor={respostasAtuais[q.id] ?? ''}
            faltando={faltando.includes(q.id)}
            aoMudar={(v) => {
              setRespostasAtuais((r) => ({ ...r, [q.id]: v }));
              if (faltando.includes(q.id) && String(v).trim()) setFaltando((f) => f.filter((x) => x !== q.id));
            }}
          />
        ))}
      </div>
    );
    // A AVD pode ser agendada uma vez; no horário marcado volta e não dá para agendar de novo.
    const podeAgendar = p.tipo === 'avd' && !agendamentoDa(agendamentos, p.id, id);
    const horaPadrao = () => {
      const d = new Date(Date.now() + 60 * 60 * 1000);
      d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0);
      return d;
    };
    const abrirAgendamento = () => {
      const d = horaPadrao();
      setDiaAgendado(d.toLocaleDateString('en-CA'));
      setHoraAgendada(d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      setAgendando(true);
    };
    const quandoEscolhido = diaAgendado && horaAgendada ? new Date(`${diaAgendado}T${horaAgendada}:00`) : null;
    const problema = quandoEscolhido ? problemaDoAgendamento(quandoEscolhido) : 'Escolha o dia e a hora.';
    const hoje = new Date().toLocaleDateString('en-CA');
    const limite = new Date(Date.now() + DIAS_MAX_AGENDAMENTO * 86400000).toLocaleDateString('en-CA');
    acoes = agendando ? (
      <div className="flex w-full flex-wrap items-end gap-2">
        <div>
          <label htmlFor="avd-dia" className="mb-1 block text-xs text-muted-foreground">Dia</label>
          <input id="avd-dia" type="date" min={hoje} max={limite} value={diaAgendado} onChange={(e) => setDiaAgendado(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
        </div>
        <div>
          <label htmlFor="avd-hora" className="mb-1 block text-xs text-muted-foreground">Hora</label>
          <input id="avd-hora" type="time" value={horaAgendada} onChange={(e) => setHoraAgendada(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm" />
        </div>
        <Button onClick={() => !problema && agendar.mutate({ pesquisa: p, quando: quandoEscolhido })} disabled={agendar.isPending}>
          {agendar.isPending ? 'Agendando…' : 'Agendar'}
        </Button>
        <Button variant="outline" onClick={() => setAgendando(false)}>Voltar</Button>
        <p className={`basis-full text-xs ${problema ? 'text-destructive' : 'text-muted-foreground'}`}>
          {problema ?? `Nessa hora a AVD volta e precisa ser respondida. Só dá para agendar uma vez.`}
        </p>
      </div>
    ) : (
      <>
        {podeAgendar && (
          <Button variant="outline" onClick={abrirAgendamento}>Agendar para mais tarde</Button>
        )}
        <Button onClick={enviarPesquisa} disabled={responder.isPending}>
          {responder.isPending ? 'Enviando…' : 'Enviar resposta'}
        </Button>
      </>
    );
  } else if (atual.tipo === 'pop') {
    const p = atual.item;
    rotulo = p.versao === '1.0' ? 'POP publicado' : `POP — nova versão ${p.versao}`;
    titulo = `${p.codigo} · ${p.titulo}`;
    corpo = (
      <div className="space-y-3">
        {p.o_que_mudou && p.versao !== '1.0' && (
          <div className="rounded-lg border border-info/25 bg-info-soft px-3 py-2 text-sm">
            <span className="font-medium text-foreground">O que mudou: </span>{p.o_que_mudou}
          </div>
        )}
        {p.objetivo && <p className="text-sm leading-relaxed text-foreground/90">{p.objetivo}</p>}
        {(p.prazos ?? []).length > 0 && (
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {p.prazos.map((z, i) => (
              <li key={i} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <span className="block text-xs text-muted-foreground">{z.rotulo}</span>
                <span className="font-semibold text-foreground">{z.valor}</span>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => navigate(`${createPageUrl('POP')}?abrir=${encodeURIComponent(p.codigo)}`)}
          className="text-sm font-medium text-primary hover:underline"
        >
          Abrir o POP completo →
        </button>
      </div>
    );
    acoes = (
      <Button onClick={() => confirmarPop.mutate(p)} disabled={confirmarPop.isPending}>
        <ClipboardCheck className="mr-2 h-4 w-4" aria-hidden="true" />
        {confirmarPop.isPending ? 'Confirmando…' : 'Li e compreendi'}
      </Button>
    );
  } else {
    const envios = atual.item;
    rotulo = 'Hansei';
    titulo = `${envios.length} resultado${envios.length === 1 ? '' : 's'} de desempenho para ver`;
    corpo = (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">O gestor enviou suas métricas consolidadas e um comentário.</p>
        {envios.slice(0, 4).map((e) => (
          <div key={e.id} className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
            <span className="font-medium text-foreground">
              {formatDateSP(e.periodo_inicio, 'DD/MM')} a {formatDateSP(e.periodo_fim, 'DD/MM/YYYY')}
            </span>
            {e.periodicidade && <span className="ml-2 text-xs text-muted-foreground">{e.periodicidade}</span>}
          </div>
        ))}
      </div>
    );
    acoes = (
      <>
        <Button variant="outline" onClick={() => setHanseiAdiado(true)}>Depois</Button>
        <Button onClick={() => { setHanseiAdiado(true); navigate(createPageUrl('Hansei')); }}>Ver agora</Button>
      </>
    );
  }

  // Aviso e pesquisa não fecham sem resposta — exceto se a gravação falhou.
  const podeFechar = atual.tipo === 'hansei' || falhou;

  return (
    <Primitivo.Root open onOpenChange={(aberto) => { if (!aberto && podeFechar) setAdiado(true); }}>
      <Primitivo.Portal>
        <Primitivo.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Primitivo.Content
          onInteractOutside={(e) => { if (!podeFechar) e.preventDefault(); }}
          onEscapeKeyDown={(e) => { if (!podeFechar) e.preventDefault(); }}
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[88vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-lg data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="border-b border-border bg-card px-6 pb-4 pt-5">
            <div className="mb-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wide">Antes de começar</span>
              {total > 1 && <span className="tabular-nums">{concluidos + 1} de {total}</span>}
            </div>
            {total > 1 && (
              <div className="mb-4 flex gap-1" aria-hidden="true">
                {Array.from({ length: total }, (_, i) => (
                  <span key={i} className={`h-1 flex-1 rounded-full ${i < concluidos ? 'bg-primary' : i === concluidos ? 'bg-primary/50' : 'bg-muted'}`} />
                ))}
              </div>
            )}
            <div className="flex items-start gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">{rotulo}</p>
                <Primitivo.Title className="text-lg font-semibold leading-snug text-foreground">{titulo}</Primitivo.Title>
                <Primitivo.Description className="sr-only">{rotulo}: {titulo}</Primitivo.Description>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{corpo}</div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-card px-6 py-3">
            {falhou && atual.tipo !== 'hansei' && (
              <Button variant="ghost" className="mr-auto" onClick={() => setAdiado(true)}>Deixar para depois</Button>
            )}
            {acoes}
          </div>
        </Primitivo.Content>
      </Primitivo.Portal>
    </Primitivo.Root>
  );
}
