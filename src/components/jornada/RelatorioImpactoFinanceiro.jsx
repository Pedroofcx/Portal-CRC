import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { DollarSign, AlertTriangle, Users, Settings } from 'lucide-react';
import { calcularTempoEfetivo, calcularCustoOperacional, formatBRL } from '@/components/utils/helpers';

const isEncerradaEfetiva = (t) => !t.excluida && (t.status === 'encerrada' || t.status === 'aguardando_confirmacao_reabertura');

// 1 funcionário = 220h/mês * 60min = 13.200 minutos/mês
const MINUTOS_POR_FTE = 13200;

export default function RelatorioImpactoFinanceiro({ tratativas, colaboradores = [], isGestor = false }) {
  // Parâmetros do simulador — apenas client-side, nunca persistidos no banco.
  const [multiplicadorEncargos, setMultiplicadorEncargos] = useState(1.6);
  const [cargaHorariaMensal, setCargaHorariaMensal] = useState(220);

  const porEtapa = useMemo(() => {
    // A busca de salário e o cálculo de custo só acontecem para gestores.
    const colaboradoresPorId = isGestor
      ? colaboradores.reduce((acc, c) => { acc[c.id] = c; return acc; }, {})
      : {};

    const mapa = {};
    tratativas.filter(isEncerradaEfetiva).forEach((t) => {
      const etapa = t.etapa_jornada_nome || 'Não definida';
      if (!mapa[etapa]) mapa[etapa] = { custoOperacional: 0, devolucaoCliente: 0, perdaReceita: 0, minutosEfetivos: 0, casos: 0 };
      // Custo operacional recalculado dinamicamente com o salário atual do
      // colaborador responsável — nunca lê o campo estático do banco.
      const custoDinamico = isGestor
        ? calcularCustoOperacional(t, colaboradoresPorId[t.agente_responsavel_id], multiplicadorEncargos, cargaHorariaMensal)
        : 0;
      mapa[etapa].custoOperacional += custoDinamico;
      mapa[etapa].devolucaoCliente += parseFloat(t.valor_devolvido_cliente) || 0;
      mapa[etapa].perdaReceita += parseFloat(t.valor_perda_receita) || 0;
      mapa[etapa].minutosEfetivos += calcularTempoEfetivo(t);
      mapa[etapa].casos += 1;
    });
    return Object.entries(mapa)
      .map(([etapa, dados]) => ({
        etapa,
        ...dados,
        ftePerdido: dados.minutosEfetivos / MINUTOS_POR_FTE,
        totalDor: dados.custoOperacional + dados.devolucaoCliente + dados.perdaReceita,
      }))
      .sort((a, b) => b.totalDor - a.totalDor);
  }, [tratativas, colaboradores, isGestor, multiplicadorEncargos, cargaHorariaMensal]);

  if (porEtapa.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-10 text-center text-muted-foreground">
          Nenhum dado financeiro disponível ainda para as etapas da jornada.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-destructive" />
          Impacto Financeiro por Etapa da Jornada
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Soma de custo operacional + devolução ao cliente + perda de receita por churn.
        </p>
      </CardHeader>
      <CardContent>
        {isGestor && (
          <Accordion type="single" collapsible className="mb-5">
            <AccordionItem value="parametros" className="border border-border rounded-lg px-4 bg-muted">
              <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline">
                <span className="flex items-center gap-2"><Settings className="w-4 h-4" /> Ajustar Parâmetros e Variáveis do Cálculo</span>
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-xs text-muted-foreground mb-3">
                  Simulação client-side: altere os valores para ver o impacto no custo operacional em tempo real. Nada aqui é salvo no banco de dados.
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Multiplicador de Encargos Trabalhistas</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={multiplicadorEncargos}
                      onChange={(e) => setMultiplicadorEncargos(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Carga Horária Mensal (horas)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={cargaHorariaMensal}
                      onChange={(e) => setCargaHorariaMensal(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
        <div className="grid lg:grid-cols-2 gap-5">
          {porEtapa.map((item, i) => (
            <div
              key={item.etapa}
              className={`p-5 rounded-xl border ${i === 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-muted border-border'}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-foreground text-lg">{item.etapa}</span>
                {i === 0 && (
                  <Badge className="bg-destructive/10 text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Mais custosa
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-4">{item.casos} caso(s) fecharam nesta etapa</p>

              {/* Card de Custo Operacional */}
              <div className="bg-card border border-border rounded-lg p-4 mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Prejuízo em Horas Trabalhadas (Custo Operacional)
                </p>
                <p className="text-2xl font-bold text-foreground mt-1">{formatBRL(item.custoOperacional)}</p>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  <strong>Como chegamos a esse número?</strong> Pegamos o salário base do agente responsável + 60% de encargos trabalhistas de mercado.
                  Dividimos isso por 220 horas mensais para descobrir o custo por minuto de atendimento do funcionário.
                  Depois, multiplicamos esse valor pelos minutos reais que o sistema cronometrou enquanto o ticket estava em andamento.
                </p>
              </div>

              {/* Card de FTE */}
              <div className="bg-info-soft border border-info/25 rounded-lg p-4">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Desperdício de Mão de Obra (Força de Trabalho Ativa)
                </p>
                <p className="text-2xl font-bold text-primary mt-1">
                  {item.ftePerdido.toFixed(2)} Funcionários perdidos apagando incêndio
                </p>
                <p className="text-xs text-primary mt-2 leading-relaxed">
                  <strong>Como chegamos a esse número?</strong> Nossa equipe gastou um total de {Math.round(item.minutosEfetivos).toLocaleString('pt-BR')} minutos
                  reais tratando esse problema neste mês. Como um colaborador trabalha 13.200 minutos por mês (220 horas), significa que o volume de erros
                  dessa etapa da jornada equivale a ter {item.ftePerdido.toFixed(2)} pessoas contratadas exclusivamente para resolver falhas, em vez de estarem
                  vendendo ou atendendo bem.
                </p>
              </div>

              <div className="space-y-1 text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                <div className="flex justify-between"><span>Devolução ao cliente</span><span>{formatBRL(item.devolucaoCliente)}</span></div>
                <div className="flex justify-between"><span>Perda de receita (churn)</span><span>{formatBRL(item.perdaReceita)}</span></div>
                <div className="flex justify-between font-semibold text-foreground"><span>Prejuízo total</span><span>{formatBRL(item.totalDor)}</span></div>
              </div>
              <p className="text-[11px] text-muted-foreground italic mt-2">
                Média de tempo nesta etapa: {item.casos > 0 ? Math.round(item.minutosEfetivos / item.casos) : 0} minutos por caso.
                Baseado no custo-hora real do agente focado em cada ticket.
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}