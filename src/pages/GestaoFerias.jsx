import db from '@/api/db';
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ColaboradorFeriasCard from '@/components/ferias/ColaboradorFeriasCard';
import DetalheColaboradorFerias from '@/components/ferias/DetalheColaboradorFerias';
import MinhasFerias from '@/components/ferias/MinhasFerias';
import PainelPedidoFerias from '@/components/ferias/PainelPedidoFerias';
import PedidosParaAprovar from '@/components/ferias/PedidosParaAprovar';
import { fragmentoDoPedido, hojeSP, deFeriasEm, proximasFerias } from '@/lib/ferias';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Cartao, Linha } from '@/components/ui/Cartao';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Palmtree, Search, Download, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInDays, format, parseISO, addYears, addDays } from 'date-fns';

// ── Utilitários ──────────────────────────────────────────────────────────────

export function parseDataLocal(d) {
  if (!d) return null;
  const [y, m, dia] = d.split('-').map(Number);
  return new Date(y, m - 1, dia);
}

export function fmtDate(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d; }
}

/**
 * Gera todos os ciclos aquisitivos esperados a partir da data de admissão até hoje.
 * Retorna array de { aquisitivo_inicio, aquisitivo_fim, concessivo_fim } como strings 'yyyy-MM-dd'.
 */
export function gerarCiclosEsperados(dataAdmissao) {
  if (!dataAdmissao) return [];
  const ciclos = [];
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  let inicio = parseDataLocal(dataAdmissao);
  if (!inicio) return [];
  for (let i = 0; i < 30; i++) {
    const fim = addDays(addYears(inicio, 1), -1);
    const concFim = addYears(fim, 1);
    ciclos.push({
      aquisitivo_inicio: format(inicio, 'yyyy-MM-dd'),
      aquisitivo_fim: format(fim, 'yyyy-MM-dd'),
      concessivo_fim: format(concFim, 'yyyy-MM-dd'),
    });
    // Para quando o início do próximo ciclo já é futuro
    if (addYears(inicio, 1) > hoje) break;
    inicio = addYears(inicio, 1);
  }
  return ciclos;
}

/**
 * Dado um array de ciclos do BD, retorna o ciclo ao qual uma data de início de férias pertence.
 * Estratégia: ciclo cujo período concessivo abrange a data de férias.
 * Fallback: ciclo mais recente cujo aquisitivo já terminou antes da data de férias.
 * Fallback final: ciclo mais recente disponível (não em_aquisicao), para não bloquear o gestor.
 */
export function identificarCiclo(ciclos, dataInicioFerias) {
  if (!dataInicioFerias || !ciclos?.length) return null;
  const d = parseDataLocal(dataInicioFerias);
  if (!d) return null;

  // 1. Ciclo cujo período concessivo abrange a data
  const porConcessivo = ciclos.filter(c => {
    const fimAq = parseDataLocal(c.aquisitivo_fim);
    const fimConc = parseDataLocal(c.concessivo_fim);
    if (!fimAq || !fimConc) return false;
    return d > fimAq && d <= fimConc;
  });
  if (porConcessivo.length > 0) {
    // Retorna o mais recente entre os candidatos
    return porConcessivo.sort((a, b) => (b.aquisitivo_inicio || '').localeCompare(a.aquisitivo_inicio || ''))[0];
  }

  // 2. Férias que começam dentro do próprio período aquisitivo (adiantamento)
  const dentroAquisitivo = ciclos.filter(c => {
    const inicioAq = parseDataLocal(c.aquisitivo_inicio);
    const fimAq = parseDataLocal(c.aquisitivo_fim);
    return inicioAq && fimAq && d >= inicioAq && d <= fimAq;
  });
  if (dentroAquisitivo.length > 0) {
    return dentroAquisitivo.sort((a, b) => (b.aquisitivo_inicio || '').localeCompare(a.aquisitivo_inicio || ''))[0];
  }

  // 3. Fallback: ciclo mais recente cujo aquisitivo terminou antes da data
  const passados = ciclos
    .filter(c => {
      const fimAq = parseDataLocal(c.aquisitivo_fim);
      return fimAq && d > fimAq;
    })
    .sort((a, b) => (b.aquisitivo_inicio || '').localeCompare(a.aquisitivo_inicio || ''));
  if (passados.length > 0) return passados[0];

  // 4. Último fallback: qualquer ciclo disponível
  return ciclos.sort((a, b) => (b.aquisitivo_inicio || '').localeCompare(a.aquisitivo_inicio || ''))[0];
}

export function calcularStatus(ciclo) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const fimAquisitivo = parseDataLocal(ciclo.aquisitivo_fim);
  const fimConcessivo = parseDataLocal(ciclo.concessivo_fim);
  if (fimAquisitivo && hoje <= fimAquisitivo) return 'em_aquisicao';
  if (!fimConcessivo) return 'disponivel';
  const diasDireito = ciclo.dias_direito || 30;
  const abono = ciclo.abono_dias || 0;
  const utilizados = ciclo.dias_utilizados || 0;
  // Abono (dias vendidos) conta como dias "utilizados" do período aquisitivo
  if (utilizados + abono >= diasDireito) return 'utilizado';
  if (hoje > fimConcessivo) return 'vencido';
  if (differenceInDays(fimConcessivo, hoje) <= 90) return 'vencendo';
  if (utilizados > 0) return 'parcialmente_utilizado';
  return 'disponivel';
}

function diasRestantes(ciclo) {
  const diasDireito = ciclo.dias_direito || 30;
  const abono = ciclo.abono_dias || 0;
  const utilizados = ciclo.dias_utilizados || 0;
  return Math.max(0, diasDireito - abono - utilizados);
}

const STATUS_FILTROS = [
  { key: 'todos', label: 'Todos' },
  { key: 'disponivel', label: 'Disponível' },
  { key: 'vencendo', label: 'Vencendo' },
  { key: 'vencido', label: 'Vencido' },
  { key: 'parcialmente_utilizado', label: 'Parcial' },
  { key: 'utilizado', label: 'Utilizado' },
  { key: 'em_aquisicao', label: 'Em Aquisição' },
  { key: 'sem_ciclo', label: 'Sem Cadastro' },
];

// ── Componente principal ─────────────────────────────────────────────────────

export default function GestaoFerias() {
  const [colaboradorDetalhe, setColaboradorDetalhe] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => db.auth.me() });
  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores', "list()"], queryFn: () => db.entities.Colaborador.list() });
  const { data: ciclos = [], isLoading } = useQuery({ queryKey: ['ciclos-ferias'], queryFn: () => db.entities.CicloFerias.list('-created_date') });

  const { data: solicitacoes = [] } = useQuery({
    queryKey: ['solicitacoes-ferias'],
    queryFn: () => db.entities.SolicitacaoFerias.list('-data_inicio', 500),
    staleTime: 30000,
  });

  const colaboradorAtual = colaboradores.find(c => c.email === user?.email);
  const isGestor = colaboradorAtual?.papel === 'gestor' || user?.role === 'admin';
  const [pedirAberto, setPedirAberto] = useState(false);

  // ── Pedido de férias: o agente pede, a gestão responde aqui no Portal ──
  const pedirMutation = useMutation({
    mutationFn: (dados) => db.entities.SolicitacaoFerias.create({
      ...dados,
      colaborador_id: colaboradorAtual?.id,
      colaborador_nome: colaboradorAtual?.nome_completo,
      colaborador_funcao: colaboradorAtual?.cargo_atual ?? null,
      status: 'em_analise',
      data_solicitacao: new Date().toISOString(),
      versao_regra: 'portal-2026-09',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-ferias'] });
      queryClient.invalidateQueries({ queryKey: ['ferias-aprovadas'] });
      toast.success('Pedido enviado. A gestão responde por aqui.');
      setPedirAberto(false);
    },
    onError: () => toast.error('Não consegui enviar o pedido.'),
  });

  const responderPedido = useMutation({
    mutationFn: async ({ pedido, ciclo, status, extras = {} }) => {
      await db.entities.SolicitacaoFerias.update(pedido.id, {
        status,
        aprovador_id: colaboradorAtual?.id,
        aprovador_nome: colaboradorAtual?.nome_completo,
        data_aprovacao: new Date().toISOString(),
        ...extras,
      });
      // Aprovar baixa o saldo: o período vira um fragmento do ciclo.
      if (status === 'aprovada' && ciclo) {
        const fragmentos = [...(ciclo.fragmentos || []).filter(f => f.solicitacao_id !== pedido.id), fragmentoDoPedido(pedido)];
        const utilizados = fragmentos.reduce((soma, f) => soma + (f.dias || 0), 0);
        const abono = (pedido.venda_dias || 0) || ciclo.abono_dias || 0;
        await db.entities.CicloFerias.update(ciclo.id, {
          fragmentos,
          dias_utilizados: utilizados,
          abono_dias: abono,
          status: calcularStatus({ ...ciclo, dias_utilizados: utilizados, abono_dias: abono }),
        });
      }
    },
    onSuccess: (_r, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-ferias'] });
      queryClient.invalidateQueries({ queryKey: ['ciclos-ferias'] });
      queryClient.invalidateQueries({ queryKey: ['ferias-aprovadas'] });
      toast.success({
        aprovada: 'Férias aprovadas. O saldo já foi baixado.',
        recusada: 'Pedido recusado. A pessoa vê o motivo.',
        sugestao_nova_data: 'Sugestão enviada.',
        cancelada: 'Pedido cancelado.',
      }[status] || 'Pedido atualizado.');
    },
    onError: () => toast.error('Não consegui responder ao pedido.'),
  });

  const criarMutation = useMutation({
    mutationFn: (data) => db.entities.CicloFerias.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ciclos-ferias'] }); toast.success('Ciclo criado!'); },
  });
  const atualizarMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.CicloFerias.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ciclos-ferias'] }); },
  });
  const deletarMutation = useMutation({
    mutationFn: (id) => db.entities.CicloFerias.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ciclos-ferias'] }); toast.success('Removido'); },
  });

  // Mapa colaborador → ciclo mais relevante (ativo/vencendo/disponivel)
  const ciclosPorColab = useMemo(() => {
    const map = {};
    ciclos.forEach(c => {
      const status = calcularStatus(c);
      const cicloComStatus = { ...c, status };
      if (!map[c.colaborador_id]) {
        map[c.colaborador_id] = cicloComStatus;
      } else {
        const existente = map[c.colaborador_id];
        // Prefere o ciclo com status mais crítico / mais recente
        const prioridade = { vencido: 0, vencendo: 1, disponivel: 2, parcialmente_utilizado: 3, em_aquisicao: 4, utilizado: 5 };
        const pNovo = prioridade[status] ?? 99;
        const pExistente = prioridade[existente.status] ?? 99;
        if (pNovo < pExistente) {
          map[c.colaborador_id] = cicloComStatus;
        } else if (pNovo === pExistente && (c.aquisitivo_inicio || '') > (existente.aquisitivo_inicio || '')) {
          map[c.colaborador_id] = cicloComStatus;
        }
      }
    });
    return map;
  }, [ciclos]);

  const agentes = colaboradores.filter(c => c.papel === 'agente' && c.ativo !== false);

  const alertasVencimento = useMemo(() =>
    ciclos.filter(c => { const s = calcularStatus(c); return s === 'vencendo' || s === 'vencido'; }),
    [ciclos]
  );

  const pedidosPendentes = useMemo(
    () => solicitacoes.filter(s => s.status === 'em_analise')
      .sort((x, y) => String(x.data_inicio || '').localeCompare(String(y.data_inicio || ''))),
    [solicitacoes],
  );
  const foraHoje = useMemo(() => deFeriasEm(solicitacoes, hojeSP()), [solicitacoes]);
  const proximas = useMemo(() => proximasFerias(solicitacoes).slice(0, 8), [solicitacoes]);

  const resumo = useMemo(() => ({
    total: agentes.length,
    disponiveis: agentes.filter(c => ciclosPorColab[c.id]?.status === 'disponivel').length,
    vencendo: agentes.filter(c => ciclosPorColab[c.id]?.status === 'vencendo').length,
    vencidos: agentes.filter(c => ciclosPorColab[c.id]?.status === 'vencido').length,
  }), [agentes, ciclosPorColab]);

  const agendados = useMemo(() => {
    const hoje = new Date();
    return ciclos
      .flatMap(c => (c.fragmentos || []).map(f => ({ ...f, ciclo: c })))
      .filter(f => f.data_inicio && parseISO(f.data_inicio) >= hoje)
      .sort((a, b) => new Date(a.data_inicio) - new Date(b.data_inicio));
  }, [ciclos]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  /**
   * Garante que o colaborador tenha todos os ciclos gerados automaticamente pela data de admissão.
   * Cria os que ainda não existem. Retorna array de ciclos atualizado.
   */
  const garantirCiclosAutomatic = async (colaborador) => {
    if (!colaborador.data_admissao) return [];
    const ciclosEsperados = gerarCiclosEsperados(colaborador.data_admissao);
    const ciclosExistentes = ciclos.filter(c => c.colaborador_id === colaborador.id);

    const promises = [];
    for (const esperado of ciclosEsperados) {
      const jaExiste = ciclosExistentes.some(c => c.aquisitivo_inicio === esperado.aquisitivo_inicio);
      if (!jaExiste) {
        const novoStatus = calcularStatus({ ...esperado, dias_direito: 30, abono_dias: 0, dias_utilizados: 0 });
        promises.push(db.entities.CicloFerias.create({
          ...esperado,
          colaborador_id: colaborador.id,
          colaborador_nome: colaborador.nome_completo,
          colaborador_setor: colaborador.equipe_nome || colaborador.cargo_atual || '',
          data_admissao: colaborador.data_admissao,
          dias_direito: 30,
          abono_dias: 0,
          fragmentos: [],
          dias_utilizados: 0,
          status: novoStatus,
        }));
      }
    }
    if (promises.length > 0) {
      await Promise.all(promises);
      await queryClient.invalidateQueries({ queryKey: ['ciclos-ferias'] });
    }
  };

  const handleAbrirDetalhe = async (colab) => {
    setColaboradorDetalhe(colab);
    // Gera ciclos automaticamente se não existirem
    if (colab.data_admissao) {
      await garantirCiclosAutomatic(colab);
    }
  };

  const handleAdicionarFragmento = async (colaborador, fragmento) => {
    // Ciclos do colaborador (atualizados)
    const ciclosColab = ciclos.filter(c => c.colaborador_id === colaborador.id);
    const cicloAlvo = identificarCiclo(ciclosColab, fragmento.data_inicio);

    if (!cicloAlvo) {
      toast.error('Não foi possível identificar o período aquisitivo para esta data.');
      return;
    }

    const novosFragmentos = [...(cicloAlvo.fragmentos || []), fragmento];
    const totalUtilizado = novosFragmentos.reduce((sum, f) => sum + (f.dias || 0), 0);
    // O abono do fragmento mais recente sempre sobrescreve o campo abono_dias do ciclo
    const novoAbono = fragmento.abono_dias || cicloAlvo.abono_dias || 0;
    const cicloAtualizado = { ...cicloAlvo, fragmentos: novosFragmentos, dias_utilizados: totalUtilizado, abono_dias: novoAbono };
    await atualizarMutation.mutateAsync({
      id: cicloAlvo.id,
      data: { fragmentos: novosFragmentos, dias_utilizados: totalUtilizado, abono_dias: novoAbono, status: calcularStatus(cicloAtualizado) },
    });
    toast.success(`Férias registradas no ciclo ${fmtDate(cicloAlvo.aquisitivo_inicio)} — ${fmtDate(cicloAlvo.aquisitivo_fim)}`);
  };

  const handleRemoverFragmento = (ciclo, fragId) => {
    const novosFragmentos = (ciclo.fragmentos || []).filter(f => f.id !== fragId);
    const totalUtilizado = novosFragmentos.reduce((sum, f) => sum + (f.dias || 0), 0);
    const cicloAtualizado = { ...ciclo, fragmentos: novosFragmentos, dias_utilizados: totalUtilizado };
    atualizarMutation.mutate({ id: ciclo.id, data: { fragmentos: novosFragmentos, dias_utilizados: totalUtilizado, status: calcularStatus(cicloAtualizado) } });
  };

  const handleEditarCiclo = (id, data) => {
    atualizarMutation.mutate({ id, data: { ...data, status: calcularStatus(data) } });
  };

  const handleDeletarCiclo = (id) => deletarMutation.mutate(id);

  const [recalculando, setRecalculando] = useState(false);
  const handleRecalcular = async () => {
    setRecalculando(true);
    try {
      let count = 0;
      for (const ciclo of ciclos) {
        const novoStatus = calcularStatus(ciclo);
        if (novoStatus !== ciclo.status) {
          await db.entities.CicloFerias.update(ciclo.id, { status: novoStatus });
          count++;
        }
      }
      queryClient.invalidateQueries({ queryKey: ['ciclos-ferias'] });
      toast.success(`Recálculo concluído — ${count} status atualizados!`);
    } finally {
      setRecalculando(false);
    }
  };

  const exportarCSV = () => {
    const rows = [['Colaborador', 'Setor', 'Admissão', 'Aquisitivo Início', 'Aquisitivo Fim', 'Concessivo até', 'Dias Direito', 'Abono', 'Utilizados', 'Restantes', 'Status']];
    ciclos.forEach(c => {
      rows.push([c.colaborador_nome, c.colaborador_setor, c.data_admissao, c.aquisitivo_inicio, c.aquisitivo_fim, c.concessivo_fim, c.dias_direito, c.abono_dias, c.dias_utilizados, diasRestantes(c), calcularStatus(c)]);
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' }));
    a.download = `ferias_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('CSV exportado!');
  };

  const agentesFiltrados = useMemo(() => {
    return agentes.filter(c => {
      const match = c.nome_completo?.toLowerCase().includes(busca.toLowerCase()) || c.cargo_atual?.toLowerCase().includes(busca.toLowerCase());
      if (!match) return false;
      if (filtroStatus === 'todos') return true;
      if (filtroStatus === 'sem_ciclo') return !ciclosPorColab[c.id];
      return ciclosPorColab[c.id]?.status === filtroStatus;
    });
  }, [agentes, busca, filtroStatus, ciclosPorColab]);

  if (!user || isLoading) return <LoadingSpinner text="Carregando gestão de férias..." />;

  // O agente entra na própria tela: saldo, vencimento e pedido (decisão de
  // Pedro, 23/09/2026 — a aprovação passou a acontecer no Portal).
  if (!isGestor) {
    return (
      <div className="space-y-6">
        <PageHeader title="Férias" subtitle="Seu saldo, seus pedidos e quem está de férias" icon={Palmtree} />
        <MinhasFerias
          colaborador={colaboradorAtual}
          ciclos={ciclos}
          solicitacoes={solicitacoes}
          cancelando={responderPedido.isPending}
          onPedir={() => setPedirAberto(true)}
          onCancelar={(pedido) => responderPedido.mutate({ pedido, status: 'cancelada' })}
        />
        <PainelPedidoFerias
          open={pedirAberto}
          onOpenChange={setPedirAberto}
          colaborador={colaboradorAtual}
          ciclos={ciclos.filter(c => c.colaborador_id === colaboradorAtual?.id)}
          solicitacoes={solicitacoes}
          enviando={pedirMutation.isPending}
          onEnviar={(dados) => pedirMutation.mutate(dados)}
        />
      </div>
    );
  }

  if (colaboradorDetalhe) {
    const ciclosDoColab = ciclos.filter(c => c.colaborador_id === colaboradorDetalhe.id);
    return (
      <DetalheColaboradorFerias
        colaborador={colaboradorDetalhe}
        ciclos={ciclosDoColab}
        onBack={() => setColaboradorDetalhe(null)}
        onAdicionarFragmento={(frag) => handleAdicionarFragmento(colaboradorDetalhe, frag)}
        onRemoverFragmento={handleRemoverFragmento}
        onEditarCiclo={handleEditarCiclo}
        onDeletarCiclo={handleDeletarCiclo}
        loadingMutation={criarMutation.isPending || atualizarMutation.isPending}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Férias"
        subtitle="Pedidos, saldo e vencimento — até 3 pessoas de férias ao mesmo tempo"
        icon={Palmtree}
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleRecalcular} disabled={recalculando}>
              <RefreshCw className={`w-4 h-4 mr-1 ${recalculando ? 'animate-spin' : ''}`} />
              {recalculando ? 'Recalculando...' : 'Recalcular Status'}
            </Button>
            <Button variant="outline" size="sm" onClick={exportarCSV}><Download className="w-4 h-4 mr-1" />Exportar CSV</Button>
          </div>
        }
      />

      {alertasVencimento.length > 0 && (
        <Alert className="border-warning/30 bg-warning-soft">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <AlertDescription className="text-warning">
            <strong>{alertasVencimento.length} período(s)</strong> com férias vencendo ou vencidas:{' '}
            {alertasVencimento.map(c => `${c.colaborador_nome} (até ${fmtDate(c.concessivo_fim)})`).join(' • ')}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <Cartao titulo="A equipe hoje">
          <div className="divide-y divide-border">
            <Linha rotulo="Pedidos esperando resposta" valor={pedidosPendentes.length} forte />
            <Linha rotulo="De férias hoje" detalhe={foraHoje.map(s => s.colaborador_nome.split(' ')[0]).join(', ') || null} valor={foraHoje.length} />
            <Linha rotulo="Colaboradores" valor={resumo.total} />
          </div>
        </Cartao>
        <Cartao titulo="Saldo da equipe">
          <div className="divide-y divide-border">
            <Linha rotulo="Com período disponível" valor={resumo.disponiveis} />
            <Linha rotulo="Vencendo nos próximos 90 dias" valor={resumo.vencendo} />
            <Linha rotulo="Já vencidos" valor={resumo.vencidos} />
          </div>
        </Cartao>
      </div>

      <Tabs defaultValue={pedidosPendentes.length > 0 ? 'pedidos' : 'colaboradores'}>
        <TabsList>
          <TabsTrigger value="pedidos">Pedidos{pedidosPendentes.length > 0 ? ` (${pedidosPendentes.length})` : ''}</TabsTrigger>
          <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
          <TabsTrigger value="planejamento">Planejamento</TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos" className="space-y-4 mt-4">
          <PedidosParaAprovar
            pedidos={pedidosPendentes}
            solicitacoes={solicitacoes}
            ciclos={ciclos}
            salvando={responderPedido.isPending}
            onAprovar={(pedido, ciclo) => responderPedido.mutate({ pedido, ciclo, status: 'aprovada' })}
            onRecusar={(pedido, motivo) => responderPedido.mutate({ pedido, status: 'recusada', extras: { motivo_recusa: motivo } })}
            onSugerir={(pedido, inicio, fim) => responderPedido.mutate({
              pedido, status: 'sugestao_nova_data',
              extras: { sugestao_nova_data_inicio: inicio, sugestao_nova_data_fim: fim },
            })}
          />

          <div className="grid items-start gap-6 xl:grid-cols-2">
            <Cartao titulo="De férias hoje">
              <div className="divide-y divide-border">
                {foraHoje.length === 0
                  ? <p className="py-2 text-sm text-muted-foreground">Ninguém de férias hoje.</p>
                  : foraHoje.map((s) => (
                    <Linha key={s.id} rotulo={s.colaborador_nome} detalhe={`volta em ${fmtDate(s.data_fim)}`} valor={`até ${fmtDate(s.data_fim)}`} />
                  ))}
              </div>
            </Cartao>

            <Cartao titulo="Próximas férias aprovadas" extra={<span className="text-xs text-muted-foreground">até 3 pessoas ao mesmo tempo</span>}>
              <div className="divide-y divide-border">
                {proximas.length === 0
                  ? <p className="py-2 text-sm text-muted-foreground">Nada aprovado pela frente.</p>
                  : proximas.map((s) => (
                    <Linha key={s.id} rotulo={s.colaborador_nome} valor={`${fmtDate(s.data_inicio)} a ${fmtDate(s.data_fim)}`} />
                  ))}
              </div>
            </Cartao>
          </div>
        </TabsContent>

        <TabsContent value="colaboradores" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar colaborador..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-10" />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTROS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFiltroStatus(key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filtroStatus === key ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted'}`}
              >
                {label}
                {key !== 'todos' && (
                  <span className="ml-1 opacity-70">
                    ({key === 'sem_ciclo' ? agentes.filter(c => !ciclosPorColab[c.id]).length : agentes.filter(c => ciclosPorColab[c.id]?.status === key).length})
                  </span>
                )}
              </button>
            ))}
          </div>

          {agentesFiltrados.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">Nenhum colaborador encontrado</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {agentesFiltrados.map(colab => (
                <ColaboradorFeriasCard
                  key={colab.id}
                  colaborador={colab}
                  cicloAtivo={ciclosPorColab[colab.id] || null}
                  onClick={() => handleAbrirDetalhe(colab)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="planejamento" className="space-y-6 mt-4">
          <div>
            <h3 className="font-semibold text-foreground mb-3">Próximas Férias Agendadas</h3>
            {agendados.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma férias agendada</p>
            ) : (
              <div className="space-y-2">
                {agendados.slice(0, 20).map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-card border border-border rounded-lg text-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-success" />
                      <span className="font-medium">{f.ciclo.colaborador_nome}</span>
                      <span className="text-muted-foreground">{fmtDate(f.data_inicio)} → {fmtDate(f.data_fim)}</span>
                    </div>
                    <Badge className="bg-success-soft text-success">{f.dias} dias</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-3">De Férias Hoje</h3>
            {(() => {
              const hoje = new Date();
              const emFerias = ciclos
                .flatMap(c => (c.fragmentos || []).map(f => ({ ...f, ciclo: c })))
                .filter(f => f.data_inicio && f.data_fim && parseISO(f.data_inicio) <= hoje && parseISO(f.data_fim) >= hoje);
              return emFerias.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum colaborador de férias hoje</p>
              ) : (
                <div className="space-y-2">
                  {emFerias.map((f, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-warning-soft border border-warning/25 rounded-lg text-sm">
                      <span className="font-medium">{f.ciclo.colaborador_nome}</span>
                      <span className="text-muted-foreground">retorna em {fmtDate(f.data_fim)}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-3">Férias Vencendo (próximos 90 dias)</h3>
            {alertasVencimento.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum alerta de vencimento</p>
            ) : (
              <div className="space-y-2">
                {alertasVencimento.map(c => {
                  const dias = c.concessivo_fim ? differenceInDays(parseISO(c.concessivo_fim), new Date()) : null;
                  return (
                    <div key={c.id} className={`flex items-center justify-between p-3 border rounded-lg text-sm ${dias < 0 ? 'bg-destructive/10 border-destructive/25' : 'bg-warning-soft border-warning/25'}`}>
                      <div>
                        <span className="font-medium">{c.colaborador_nome}</span>
                        <span className="text-muted-foreground ml-2">concessivo até {fmtDate(c.concessivo_fim)}</span>
                      </div>
                      <Badge className={dias < 0 ? 'bg-destructive/10 text-destructive' : 'bg-warning-soft text-warning'}>
                        {dias < 0 ? 'VENCIDO' : `${dias}d`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}