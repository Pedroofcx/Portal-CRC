import db from '@/api/db';
import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, ShieldAlert, ChevronDown, ChevronRight } from 'lucide-react';
import { minutosDeEsforco, formatBRL, construirContextoComercialIA, calcularReceitaMensalEquivalente, calcularReceitaAnualEquivalente } from '@/components/utils/helpers';

const isEncerradaEfetiva = (t) => !t.excluida && (t.status === 'encerrada' || t.status === 'aguardando_confirmacao_reabertura');
const MINUTOS_POR_FTE = 13200;

const GLOSSARIO = [
  { termo: 'Quantidade de Reclamações', def: 'Quantos casos (tickets) foram fechados nesta etapa da jornada do cliente.' },
  { termo: 'Dinheiro Devolvido ao Cliente', def: 'Valor em R$ que a empresa estornou/reembolsou ao cliente para resolver o problema.' },
  { termo: 'Contratos Perdidos (Cancelamentos)', def: 'Receita mensal estimada que deixamos de receber porque o cliente cancelou (churn) por causa desse problema.' },
  { termo: 'Custo do Tempo da Equipe (Operacional)', def: 'Quanto pagamos em salário/hora ao time para apagar esse incêndio (tempo do agente x custo por minuto).' },
  { termo: 'Prejuízo Total', def: 'A soma de tudo: dinheiro devolvido + contratos perdidos + custo do tempo da equipe.' },
];

export default function RelatorioJornadaDiretoria() {
  const [insight, setInsight] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [etapaAberta, setEtapaAberta] = useState(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => db.auth.me() });
  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores', "list()"], queryFn: () => db.entities.Colaborador.list() });
  const isGestor = colaboradores.find(c => c.email === user?.email)?.papel === 'gestor';

  const { data: tratativas = [], isLoading } = useQuery({
    queryKey: ['tratativas-jornada'],
    queryFn: () => db.entities.Tratativa.list('-created_date', 2000),
  });
  const { data: motivos = [] } = useQuery({
    queryKey: ['motivos', "filter({ ativo: true }, 'nome', 200)"],
    queryFn: () => db.entities.MotivoTratativa.filter({ ativo: true }, 'nome', 200),
  });

  const porEtapa = useMemo(() => {
    // A busca de salário e o cálculo de custo só acontecem para gestores.
    const colaboradoresPorId = isGestor
      ? colaboradores.reduce((acc, c) => { acc[c.id] = c; return acc; }, {})
      : {};

    const mapa = {};
    tratativas.filter(isEncerradaEfetiva).forEach((t) => {
      const etapa = t.etapa_jornada_nome || 'Não definida';
      if (!mapa[etapa]) mapa[etapa] = { volumetria: 0, custoOperacional: 0, devolucaoCliente: 0, perdaReceita: 0, minutosEfetivos: 0 };
      mapa[etapa].volumetria += 1;
      // Custo operacional OFICIAL (servidor, dividido pela carga simultânea).
      mapa[etapa].custoOperacional += isGestor ? (parseFloat(t.custo_operacional_reais) || 0) : 0;
      mapa[etapa].devolucaoCliente += parseFloat(t.valor_devolvido_cliente) || 0;
      mapa[etapa].perdaReceita += parseFloat(t.valor_perda_receita) || 0;
      mapa[etapa].minutosEfetivos += isGestor ? minutosDeEsforco(t, colaboradoresPorId[t.agente_responsavel_id]) : 0;
    });
    return Object.entries(mapa)
      .map(([etapa, d]) => ({
        etapa,
        ...d,
        ftePerdido: d.minutosEfetivos / MINUTOS_POR_FTE,
        custoTotalDor: d.custoOperacional + d.devolucaoCliente + d.perdaReceita,
      }))
      .sort((a, b) => b.custoTotalDor - a.custoTotalDor);
  }, [tratativas, colaboradores, isGestor]);

  // Detalhamento de causa raiz (motivos) por etapa
  const causaRaizPorEtapa = useMemo(() => {

    const mapa = {};
    tratativas.filter(isEncerradaEfetiva).forEach((t) => {
      const etapa = t.etapa_jornada_nome || 'Não definida';
      if (!t.motivo_id) return;
      if (!mapa[etapa]) mapa[etapa] = {};
      if (!mapa[etapa][t.motivo_id]) mapa[etapa][t.motivo_id] = { custo: 0, casos: 0 };
      const custoOperacionalDinamico = isGestor ? (parseFloat(t.custo_operacional_reais) || 0) : 0;
      mapa[etapa][t.motivo_id].custo +=
        custoOperacionalDinamico +
        (parseFloat(t.valor_devolvido_cliente) || 0) +
        (parseFloat(t.valor_perda_receita) || 0);
      mapa[etapa][t.motivo_id].casos += 1;
    });
    const resultado = {};
    Object.entries(mapa).forEach(([etapa, motivosMap]) => {
      resultado[etapa] = Object.entries(motivosMap)
        .map(([motivoId, dados]) => {
          const motivo = motivos.find(m => m.id === motivoId);
          return { nome: motivo?.motivo || 'Motivo removido', esforco: motivo?.esforco_correcao_ti || 'Não definido', ...dados };
        })
        .sort((a, b) => b.custo - a.custo);
    });
    return resultado;
  }, [tratativas, motivos, colaboradores, isGestor]);

  const totalGeral = porEtapa.reduce((acc, e) => acc + e.custoTotalDor, 0);
  const etapaMaisCustosa = porEtapa[0];

  // Agrupamentos comerciais: Reclamações e Impacto Financeiro por Plano e Segmento,
  // além de Receita Mensal/Anual envolvida por categoria de reclamação (tipo_tratativa).
  const analiseComercial = useMemo(() => {
    const encerradas = tratativas.filter(isEncerradaEfetiva);

    const porPlano = {};
    const porSegmento = {};
    const receitaPorCategoria = {};

    encerradas.forEach(t => {
      const custoOp = isGestor ? (parseFloat(t.custo_operacional_reais) || 0) : 0;
      const impacto = custoOp + (parseFloat(t.valor_devolvido_cliente) || 0) + (parseFloat(t.valor_perda_receita) || 0);

      // Receitas equivalentes calculadas dinamicamente (modalidade + valor contratado)
      const receitaMensalEq = (t.modalidade_plano && t.valor_contratacao_plano_atual) ? calcularReceitaMensalEquivalente(t) : 0;
      const receitaAnualEq = (t.modalidade_plano && t.valor_contratacao_plano_atual) ? calcularReceitaAnualEquivalente(t) : 0;

      // Por Plano
      const plano = t.plano_cliente || 'Sem plano';
      if (!porPlano[plano]) porPlano[plano] = { reclamacoes: 0, impacto: 0, receitaMensal: 0, receitaAnual: 0 };
      porPlano[plano].reclamacoes += 1;
      porPlano[plano].impacto += impacto;
      porPlano[plano].receitaMensal += receitaMensalEq;
      porPlano[plano].receitaAnual += receitaAnualEq;

      // Por Segmento
      const segmento = t.segmento_cliente || 'Sem segmento';
      if (!porSegmento[segmento]) porSegmento[segmento] = { reclamacoes: 0, impacto: 0, receitaMensal: 0, receitaAnual: 0 };
      porSegmento[segmento].reclamacoes += 1;
      porSegmento[segmento].impacto += impacto;
      porSegmento[segmento].receitaMensal += receitaMensalEq;
      porSegmento[segmento].receitaAnual += receitaAnualEq;

      // Receita por categoria (tipo_tratativa)
      const categoria = t.tipo_tratativa || 'sem_categoria';
      if (!receitaPorCategoria[categoria]) receitaPorCategoria[categoria] = { reclamacoes: 0, receitaMensal: 0, receitaAnual: 0 };
      receitaPorCategoria[categoria].reclamacoes += 1;
      receitaPorCategoria[categoria].receitaMensal += receitaMensalEq;
      receitaPorCategoria[categoria].receitaAnual += receitaAnualEq;
    });

    const toSortedArray = (obj) => Object.entries(obj)
      .map(([chave, d]) => ({ chave, ...d }))
      .sort((a, b) => b.impacto - a.impacto || b.receitaMensal - a.receitaMensal);

    return {
      porPlano: toSortedArray(porPlano),
      porSegmento: toSortedArray(porSegmento),
      receitaPorCategoria: Object.entries(receitaPorCategoria)
        .map(([chave, d]) => ({ chave, ...d }))
        .sort((a, b) => b.receitaMensal - a.receitaMensal),
    };
  }, [tratativas, colaboradores, isGestor]);

  useEffect(() => {
    if (isLoading || porEtapa.length === 0 || insight || loadingInsight) return;
    setLoadingInsight(true);
    const top = porEtapa.slice(0, 3).map(e =>
      `${e.etapa}: prejuízo total R$ ${e.custoTotalDor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${e.volumetria} casos, equivalente a ${e.ftePerdido.toFixed(2)} funcionários perdidos)`
    ).join(' | ');

    // Contexto comercial agregado das tratativas mais impactantes
    const tratativasTop = tratativas.filter(isEncerradaEfetiva).slice(0, 15);
    const contextoComercial = tratativasTop
      .map(t => construirContextoComercialIA(t))
      .filter(ctx => ctx)
      .slice(0, 10)
      .join('\n---\n');

    db.integrations.Core.InvokeLLM({
      prompt: `Gere um diagnóstico direto de 3 linhas para o Diretor da empresa indicando qual etapa da jornada está dando o maior prejuízo financeiro e quantos funcionários ele está perdendo por não corrigir o processo. Dados: [${top}]. Use linguagem simples, direta e focada em dinheiro, sem jargão técnico.\n\nContexto comercial dos clientes impactados (use para destacar relevância financeira dos clientes afetados):\n${contextoComercial || 'Sem dados comerciais disponíveis.'}`,
    })
      .then((texto) => setInsight(typeof texto === 'string' ? texto : ''))
      .catch(() => setInsight(''))
      .finally(() => setLoadingInsight(false));
  }, [isLoading, porEtapa, insight, loadingInsight]);

  if (!isGestor) {
    return (
      <div className="text-center py-16">
        <ShieldAlert className="w-12 h-12 text-warning mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Acesso restrito</h2>
        <p className="text-muted-foreground">Este relatório é acessível apenas a gestores.</p>
      </div>
    );
  }

  const esforcoBadgeClass = {
    Baixo: 'bg-success-soft text-success border-success/30',
    Medio: 'bg-warning-soft text-warning border-warning/30',
    Alto: 'bg-destructive/10 text-destructive border-destructive/30',
  };

  return (
    <div className="space-y-6 print-report">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-report, .print-report * { visibility: visible; }
          .print-report { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .print-report { font-size: 11px; }
        }
      `}</style>

      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-xl font-bold text-foreground">Relatório Executivo de Jornada</h1>
          <p className="text-sm text-muted-foreground">Visão restrita a gestores — foco em ROI e capacidade de equipe</p>
        </div>
        <Button onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      <div className="bg-card border border-border rounded-none sm:rounded-xl p-8 space-y-8">
        {/* Cabeçalho formal */}
        <div className="text-center border-b-2 border-border pb-4">
          <h2 className="text-2xl font-bold text-foreground uppercase tracking-wide">
            Relatório de Impacto Financeiro e Eficiência Operacional
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Ouvidoria CRC</p>
          <p className="text-xs text-muted-foreground mt-1">Gerado em {new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        {/* Seção 1: Glossário Executivo */}
        <div>
          <h3 className="font-bold text-foreground mb-3 text-base border-b border-border pb-1 flex items-center gap-2">
            1. Glossário Executivo (O que é o quê)
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {GLOSSARIO.map((g) => (
              <div key={g.termo} className="bg-muted border border-border rounded-lg p-3">
                <p className="text-xs font-semibold text-foreground">{g.termo}</p>
                <p className="text-xs text-muted-foreground mt-1">{g.def}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Seção 2: Tabela de Prejuízo */}
        <div>
          <h3 className="font-bold text-foreground mb-1 text-base border-b border-border pb-1">
            2. Tabela de Prejuízo Aberto da Jornada
          </h3>
          <p className="text-xs text-muted-foreground mb-3 no-print">Clique em uma etapa para ver a causa raiz detalhada.</p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-muted superficie-escura text-white text-xs uppercase">
                <th className="text-left p-2">Etapa da Jornada</th>
                <th className="text-right p-2">Qtd. Reclamações</th>
                <th className="text-right p-2">Dinheiro Devolvido</th>
                <th className="text-right p-2">Contratos Perdidos</th>
                <th className="text-right p-2">Custo do Tempo da Equipe</th>
                <th className="text-right p-2">Prejuízo Total</th>
              </tr>
            </thead>
            <tbody>
              {porEtapa.map((e, i) => {
                const aberta = etapaAberta === e.etapa;
                return (
                  <React.Fragment key={e.etapa}>
                    <tr
                      className={`${i % 2 === 0 ? 'bg-card' : 'bg-muted'} cursor-pointer hover:bg-info-soft no-print-hover`}
                      onClick={() => setEtapaAberta(aberta ? null : e.etapa)}
                    >
                      <td className="p-2 font-medium flex items-center gap-1">
                        {aberta ? <ChevronDown className="w-3.5 h-3.5 no-print" /> : <ChevronRight className="w-3.5 h-3.5 no-print" />}
                        {e.etapa}
                      </td>
                      <td className="p-2 text-right">{e.volumetria}</td>
                      <td className="p-2 text-right">{formatBRL(e.devolucaoCliente)}</td>
                      <td className="p-2 text-right">{formatBRL(e.perdaReceita)}</td>
                      <td className="p-2 text-right">
                        {formatBRL(e.custoOperacional)}
                        <p className="text-[10px] text-muted-foreground italic font-normal">
                          Média: {e.volumetria > 0 ? Math.round(e.minutosEfetivos / e.volumetria) : 0} min/caso
                        </p>
                      </td>
                      <td className="p-2 text-right font-bold">{formatBRL(e.custoTotalDor)}</td>
                    </tr>
                    {aberta && (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <div className="p-4 bg-info-soft border-y border-info/25">
                            <p className="text-xs font-semibold text-primary mb-2">
                              Causa Raiz — Principais Motivos em "{e.etapa}"
                            </p>
                            {(causaRaizPorEtapa[e.etapa] || []).length === 0 ? (
                              <p className="text-xs text-muted-foreground">Nenhum motivo detalhado para esta etapa.</p>
                            ) : (
                              <div className="space-y-1.5">
                                {(causaRaizPorEtapa[e.etapa] || []).map((m, idx) => (
                                  <div key={idx} className="flex items-center justify-between bg-card rounded-md p-2 border border-primary/25 text-xs">
                                    <span className="font-medium text-foreground">{m.nome}</span>
                                    <div className="flex items-center gap-3">
                                      <span className="text-muted-foreground">{m.casos} caso(s)</span>
                                      <Badge variant="outline" className={esforcoBadgeClass[m.esforco] || ''}>
                                        Esforço de TI: {m.esforco}
                                      </Badge>
                                      <span className="font-semibold w-24 text-right">{formatBRL(m.custo)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border font-bold">
                <td className="p-2" colSpan={5}>Total Geral</td>
                <td className="p-2 text-right">{formatBRL(totalGeral)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Seção 3.5: Análise Comercial — agrupamentos por Plano, Segmento e Categoria */}
        {analiseComercial.porPlano.length > 0 && (
          <div>
            <h3 className="font-bold text-foreground mb-3 text-base border-b border-border pb-1 flex items-center gap-2">
              3. Análise Comercial — Impacto por Plano e Segmento
            </h3>

            {/* Por Plano */}
            <p className="text-xs font-semibold text-foreground mb-1">Reclamações e Impacto Financeiro por Plano</p>
            <table className="w-full text-sm border-collapse mb-4">
              <thead>
                <tr className="bg-muted text-foreground text-xs uppercase">
                  <th className="text-left p-2">Plano</th>
                  <th className="text-right p-2">Reclamações</th>
                  <th className="text-right p-2">Impacto Financeiro</th>
                  <th className="text-right p-2">Receita Mensal Equivalente</th>
                  <th className="text-right p-2">Receita Anual Equivalente</th>
                </tr>
              </thead>
              <tbody>
                {analiseComercial.porPlano.map((p, i) => (
                  <tr key={p.chave} className={i % 2 === 0 ? 'bg-card' : 'bg-muted'}>
                    <td className="p-2 font-medium">{p.chave}</td>
                    <td className="p-2 text-right">{p.reclamacoes}</td>
                    <td className="p-2 text-right font-semibold">{formatBRL(p.impacto)}</td>
                    <td className="p-2 text-right">{formatBRL(p.receitaMensal)}</td>
                    <td className="p-2 text-right">{formatBRL(p.receitaAnual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Por Segmento */}
            <p className="text-xs font-semibold text-foreground mb-1">Reclamações e Impacto Financeiro por Segmento</p>
            <table className="w-full text-sm border-collapse mb-4">
              <thead>
                <tr className="bg-muted text-foreground text-xs uppercase">
                  <th className="text-left p-2">Segmento</th>
                  <th className="text-right p-2">Reclamações</th>
                  <th className="text-right p-2">Impacto Financeiro</th>
                  <th className="text-right p-2">Receita Mensal Equivalente</th>
                  <th className="text-right p-2">Receita Anual Equivalente</th>
                </tr>
              </thead>
              <tbody>
                {analiseComercial.porSegmento.map((p, i) => (
                  <tr key={p.chave} className={i % 2 === 0 ? 'bg-card' : 'bg-muted'}>
                    <td className="p-2 font-medium">{p.chave}</td>
                    <td className="p-2 text-right">{p.reclamacoes}</td>
                    <td className="p-2 text-right font-semibold">{formatBRL(p.impacto)}</td>
                    <td className="p-2 text-right">{formatBRL(p.receitaMensal)}</td>
                    <td className="p-2 text-right">{formatBRL(p.receitaAnual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Receita por Categoria */}
            <p className="text-xs font-semibold text-foreground mb-1">Receita Mensal e Anual Equivalente por Categoria de Reclamação</p>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted text-foreground text-xs uppercase">
                  <th className="text-left p-2">Categoria</th>
                  <th className="text-right p-2">Reclamações</th>
                  <th className="text-right p-2">Receita Mensal</th>
                  <th className="text-right p-2">Receita Anual</th>
                </tr>
              </thead>
              <tbody>
                {analiseComercial.receitaPorCategoria.map((p, i) => (
                  <tr key={p.chave} className={i % 2 === 0 ? 'bg-card' : 'bg-muted'}>
                    <td className="p-2 font-medium capitalize">{p.chave.replace(/_/g, ' ')}</td>
                    <td className="p-2 text-right">{p.reclamacoes}</td>
                    <td className="p-2 text-right">{formatBRL(p.receitaMensal)}</td>
                    <td className="p-2 text-right">{formatBRL(p.receitaAnual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Seção 4: Sumário Executivo de IA */}
        <div>
          <h3 className="font-bold text-foreground mb-3 text-base border-b border-border pb-1 flex items-center gap-2">
            3. Sumário Executivo (IA)
          </h3>
          <div className="bg-muted border border-border rounded-lg p-5">
            {loadingInsight ? (
              <p className="text-sm text-muted-foreground italic">Gerando diagnóstico...</p>
            ) : (
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                {insight || (etapaMaisCustosa
                  ? `A etapa "${etapaMaisCustosa.etapa}" é a que mais gera prejuízo, somando ${formatBRL(etapaMaisCustosa.custoTotalDor)} e equivalendo a ${etapaMaisCustosa.ftePerdido.toFixed(2)} funcionários dedicados só a apagar incêndio.`
                  : 'Sem dados suficientes para gerar o diagnóstico.')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}