import db from '@/api/db';
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Calendar } from 'lucide-react';

import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GradeTrabalho from '@/components/escalas/GradeTrabalho';
import GradeTurno from '@/components/escalas/GradeTurno';
import RelatorioProdutividadeTurnos from '@/components/turnos/RelatorioProdutividadeTurnos';

import {
  ATENDENDO_POR_TURNO, TRABALHANDO, diasDaSemana, segundaDaSemana, semanaDeReferencia, somarDias,
  trabalhoDaSemana, trabalhoDe, montarSemanaDeTrabalho, montarTurnosDaSemana, historicoDeHomeOffice,
} from '@/lib/escalas';

/**
 * ESCALAS — a escala de trabalho (presencial x home office) e a escala de
 * turno (quem atende e quem analisa tickets) na mesma tela, semana a semana.
 *
 * Juntar as duas foi decisão de Pedro (23/09/2026): eram dois módulos que
 * falavam da mesma semana e nunca batiam. Não existe visão de mês — a semana
 * é a unidade de trabalho do CRC.
 */
const hojeSP = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

export default function Escalas() {
  const [semanaOffset, setSemanaOffset] = useState(0);
  const queryClient = useQueryClient();

  const segunda = useMemo(() => segundaDaSemana(somarDias(hojeSP(), semanaOffset * 7)), [semanaOffset]);
  const dias = useMemo(() => diasDaSemana(segunda), [segunda]);
  const semanaRef = useMemo(() => semanaDeReferencia(segunda), [segunda]);
  const segundaAnterior = useMemo(() => somarDias(segunda, -7), [segunda]);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => db.auth.me() });

  const { data: colaboradores = [], isLoading: carregandoPessoas } = useQuery({
    queryKey: ['colaboradores', "list()"],
    queryFn: () => db.entities.Colaborador.list(),
  });

  const { data: atribuicoes = [], isLoading: carregandoTrabalho } = useQuery({
    queryKey: ['escalaAtribuicoes', "list('-created_date')"],
    queryFn: () => db.entities.EscalaAtribuicao.list('-created_date', 2000),
    staleTime: 60000,
  });

  const { data: escalasTurno = [] } = useQuery({
    queryKey: ['escalas-turno', "filter({ ativa: true }, '-created_date', 60)"],
    queryFn: () => db.entities.EscalaTurno.filter({ ativa: true }, '-created_date', 60),
    staleTime: 60000,
  });

  const { data: ferias = [] } = useQuery({
    queryKey: ['ferias-aprovadas'],
    queryFn: () => db.entities.SolicitacaoFerias.filter({ status: 'aprovada' }, '-data_inicio', 200),
    staleTime: 300000,
  });

  const { data: tratativas = [] } = useQuery({
    queryKey: ['tratativas', "list('-created_date')"],
    queryFn: () => db.entities.Tratativa.list('-created_date'),
    staleTime: 120000,
  });

  const eu = colaboradores.find((c) => c.email === user?.email);
  const isGestor = eu?.papel === 'gestor';

  const pessoas = useMemo(() => colaboradores
    .filter((c) => c.ativo !== false && c.papel === 'agente')
    .sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || '')), [colaboradores]);

  const mapa = useMemo(() => trabalhoDaSemana(atribuicoes, dias), [atribuicoes, dias]);

  /** Férias aprovadas travam o dia: não dá para marcar presencial nem home. */
  const indisponiveis = useMemo(() => {
    const m = new Map();
    ferias.forEach((f) => dias.forEach(({ data }) => {
      if (data >= String(f.data_inicio).slice(0, 10) && data <= String(f.data_fim).slice(0, 10)) {
        m.set(`${f.colaborador_id}|${data}`, 'ferias');
      }
    }));
    dias.forEach(({ data }) => pessoas.forEach((p) => {
      const tipo = trabalhoDe(mapa, p.id, data);
      if (tipo && !TRABALHANDO.has(tipo)) m.set(`${p.id}|${data}`, tipo);
    }));
    return m;
  }, [ferias, dias, pessoas, mapa]);

  /**
   * Quem está de pé em cada dia, para a escala de turno. Sem escala de
   * trabalho montada, considera a equipe inteira — assim dá para montar o
   * turno mesmo em semana que ninguém marcou ainda.
   */
  const presentesPorDia = useMemo(() => {
    const m = new Map();
    dias.forEach(({ data }) => {
      const marcados = pessoas.filter((p) => TRABALHANDO.has(trabalhoDe(mapa, p.id, data)));
      const semNadaMarcado = pessoas.every((p) => !trabalhoDe(mapa, p.id, data));
      const doDia = semNadaMarcado
        ? pessoas.filter((p) => !indisponiveis.get(`${p.id}|${data}`))
        : marcados;
      m.set(data, doDia.map((p) => ({ colaborador_id: p.id, colaborador_nome: p.nome_completo })));
    });
    return m;
  }, [dias, pessoas, mapa, indisponiveis]);

  const escalaDaSemana = useMemo(() => escalasTurno.find((e) => e.semana_referencia === semanaRef) ?? null, [escalasTurno, semanaRef]);
  const turnos = escalaDaSemana?.turnos ?? [];

  // ── Escala de trabalho ────────────────────────────────────────────────
  const salvarTrabalho = useMutation({
    mutationFn: async (marcacoes) => {
      for (const { pessoa, data, tipo } of marcacoes) {
        const existente = atribuicoes.find((a) => a.colaborador_id === pessoa.id
          && String(a.data_inicio).slice(0, 10) === data
          && String(a.data_fim || a.data_inicio).slice(0, 10) === data);
        if (!tipo) {
          if (existente) await db.entities.EscalaAtribuicao.delete(existente.id);
        } else if (existente) {
          if (existente.tipo_evento !== tipo) await db.entities.EscalaAtribuicao.update(existente.id, { tipo_evento: tipo, ativa: true });
        } else {
          await db.entities.EscalaAtribuicao.create({
            escala_id: 'direct',
            escala_nome: 'Escala de Trabalho',
            colaborador_id: pessoa.id,
            colaborador_nome: pessoa.nome_completo,
            data_inicio: data,
            data_fim: data,
            tipo_evento: tipo,
            ativa: true,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalaAtribuicoes'] });
      toast.success('Escala de trabalho salva.');
    },
    onError: () => toast.error('Não consegui salvar a escala de trabalho.'),
  });

  const marcarTrabalho = (pessoa, data, tipo) => {
    if (indisponiveis.get(`${pessoa.id}|${data}`) === 'ferias' && tipo && TRABALHANDO.has(tipo)) {
      toast.error(`${pessoa.nome_completo.split(' ')[0]} está de férias neste dia.`);
      return;
    }
    salvarTrabalho.mutate([{ pessoa, data, tipo }]);
  };

  const montarSemanaDeTrabalhoNaTela = () => {
    const historico = historicoDeHomeOffice(atribuicoes, pessoas, somarDias(segunda, -28));
    const plano = montarSemanaDeTrabalho({ pessoas, dias, indisponiveis, historico });
    const marcacoes = [];
    plano.forEach((tipo, chave) => {
      const [pessoaId, data] = chave.split('|');
      const pessoa = pessoas.find((p) => p.id === pessoaId);
      if (pessoa && trabalhoDe(mapa, pessoaId, data) !== tipo) marcacoes.push({ pessoa, data, tipo });
    });
    if (marcacoes.length === 0) { toast.info('A semana já está montada assim.'); return; }
    salvarTrabalho.mutate(marcacoes);
  };

  const repetirSemanaDeTrabalho = () => {
    const diasAnteriores = diasDaSemana(segundaAnterior);
    const anterior = trabalhoDaSemana(atribuicoes, diasAnteriores);
    const marcacoes = [];
    dias.forEach((d, i) => pessoas.forEach((p) => {
      const tipo = trabalhoDe(anterior, p.id, diasAnteriores[i].data);
      if (tipo && trabalhoDe(mapa, p.id, d.data) !== tipo) marcacoes.push({ pessoa: p, data: d.data, tipo });
    }));
    if (marcacoes.length === 0) { toast.info('Nada para copiar da semana passada.'); return; }
    salvarTrabalho.mutate(marcacoes);
  };

  // ── Escala de turno ───────────────────────────────────────────────────
  const salvarTurno = useMutation({
    mutationFn: async (novosTurnos) => {
      const participantes = [...new Set(dias.flatMap(({ data }) => (presentesPorDia.get(data) ?? []).map((p) => p.colaborador_id)))];
      if (escalaDaSemana) {
        return db.entities.EscalaTurno.update(escalaDaSemana.id, { turnos: novosTurnos, colaboradores_participantes: participantes });
      }
      return db.entities.EscalaTurno.create({
        semana_referencia: semanaRef,
        data_inicio_semana: segunda,
        colaboradores_participantes: participantes,
        turnos: novosTurnos,
        gerado_por_id: eu?.id,
        gerado_por_nome: eu?.nome_completo,
        ativa: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['escalas-turno'] });
      toast.success('Escala de turno salva.');
    },
    onError: () => toast.error('Não consegui salvar a escala de turno.'),
  });

  const turnosDaTela = () => dias.map((d) => turnos.find((t) => t.data === d.data)
    ?? { dia: d.chave, data: d.data, cancelado: false, motivo_cancelamento: '', manha: [], tarde: [] });

  const alternarAtendimento = (data, pessoa) => {
    const novos = turnosDaTela().map((t) => {
      if (t.data !== data) return t;
      const jaAtende = (t.manha || []).some((c) => c.colaborador_id === pessoa.colaborador_id);
      const manha = jaAtende
        ? t.manha.filter((c) => c.colaborador_id !== pessoa.colaborador_id)
        : [...(t.manha || []), pessoa];
      const presentes = presentesPorDia.get(data) ?? [];
      const tarde = presentes
        .filter((p) => !manha.some((m) => m.colaborador_id === p.colaborador_id))
        .slice(0, ATENDENDO_POR_TURNO);
      return { ...t, manha, tarde };
    });
    salvarTurno.mutate(novos);
  };

  const cancelarDia = (data) => {
    const novos = turnosDaTela().map((t) => (t.data === data ? { ...t, cancelado: !t.cancelado } : t));
    salvarTurno.mutate(novos);
  };

  const montarSemanaDeTurno = () => {
    const base = montarTurnosDaSemana({ dias, presentesPorDia, giro: Number(semanaRef.slice(-2)) });
    const atuais = turnosDaTela();
    salvarTurno.mutate(base.map((t) => {
      const atual = atuais.find((a) => a.data === t.data);
      return atual?.cancelado ? atual : t;
    }));
  };

  const repetirSemanaDeTurno = () => {
    const anterior = escalasTurno.find((e) => e.semana_referencia === semanaDeReferencia(segundaAnterior));
    if (!anterior) { toast.info('A semana passada não tem escala de turno.'); return; }
    salvarTurno.mutate(dias.map((d, i) => {
      const daAnterior = (anterior.turnos || [])[i];
      return {
        dia: d.chave,
        data: d.data,
        cancelado: false,
        motivo_cancelamento: '',
        manha: daAnterior?.manha ?? [],
        tarde: daAnterior?.tarde ?? [],
      };
    }));
  };

  if (carregandoPessoas || carregandoTrabalho) return <LoadingSpinner text="Carregando as escalas..." />;

  const eSemanaAtual = semanaOffset === 0;
  const periodo = `${dias[0].data.slice(8, 10)}/${dias[0].data.slice(5, 7)} a ${dias[4].data.slice(8, 10)}/${dias[4].data.slice(5, 7)}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Escalas"
        subtitle="A semana da equipe: quem trabalha de onde e quem atende em cada turno"
        icon={Calendar}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => setSemanaOffset((o) => o - 1)}>← Semana anterior</Button>
        <span className="text-sm font-medium text-foreground">
          {periodo}
          <span className="ml-2 text-xs font-normal text-muted-foreground">{semanaRef}{eSemanaAtual ? ' · esta semana' : ''}</span>
        </span>
        <Button variant="outline" size="sm" onClick={() => setSemanaOffset((o) => o + 1)}>Próxima semana →</Button>
        {!eSemanaAtual && (
          <Button variant="ghost" size="sm" onClick={() => setSemanaOffset(0)}>Voltar para esta semana</Button>
        )}
      </div>

      <Tabs defaultValue="trabalho">
        <TabsList>
          <TabsTrigger value="trabalho">Escala de Trabalho</TabsTrigger>
          <TabsTrigger value="turno">Escala de Turno</TabsTrigger>
          {isGestor && <TabsTrigger value="produtividade">Produtividade</TabsTrigger>}
        </TabsList>

        <TabsContent value="trabalho" className="pt-4">
          <GradeTrabalho
            pessoas={pessoas}
            dias={dias}
            mapa={mapa}
            podeEditar={isGestor}
            salvando={salvarTrabalho.isPending}
            onMarcar={marcarTrabalho}
            onMontarSemana={montarSemanaDeTrabalhoNaTela}
            onRepetirSemana={repetirSemanaDeTrabalho}
          />
        </TabsContent>

        <TabsContent value="turno" className="pt-4">
          <GradeTurno
            dias={dias}
            turnos={turnosDaTela()}
            presentesPorDia={presentesPorDia}
            podeEditar={isGestor}
            salvando={salvarTurno.isPending}
            onAlternar={alternarAtendimento}
            onCancelarDia={cancelarDia}
            onMontarSemana={montarSemanaDeTurno}
            onRepetirSemana={repetirSemanaDeTurno}
          />
        </TabsContent>

        {isGestor && (
          <TabsContent value="produtividade" className="pt-4">
            <RelatorioProdutividadeTurnos escalas={escalasTurno} tratativas={tratativas} colaboradores={colaboradores} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
