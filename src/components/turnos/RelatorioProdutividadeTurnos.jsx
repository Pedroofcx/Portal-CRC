import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { diaSP } from '@/lib/relatorios/periodo';
import { Sun, Moon, BarChart2, TrendingUp, Users, ChevronDown, ChevronUp } from 'lucide-react';

const DIAS_PT = {
  segunda: 'Segunda-feira', terca: 'Terça-feira', quarta: 'Quarta-feira',
  quinta: 'Quinta-feira', sexta: 'Sexta-feira',
};

export default function RelatorioProdutividadeTurnos({ escalas, tratativas, colaboradores }) {
  const [semanaFiltro, setSemanaFiltro] = useState('todas');
  const [expandidos, setExpandidos] = useState({});

  const semanasDisponiveis = useMemo(() =>
    [...new Set(escalas.map(e => e.semana_referencia))].sort().reverse()
  , [escalas]);

  const linhas = useMemo(() => {
    const escalasFiltradas = semanaFiltro === 'todas'
      ? escalas
      : escalas.filter(e => e.semana_referencia === semanaFiltro);

    const resultado = [];
    // Uma pessoa pode estar nos dois turnos do mesmo dia. As tratativas dela
    // naquele dia são as mesmas: contam UMA vez nos totais (antes entravam
    // duas vezes e inflavam tudo).
    const jaContado = new Set();
    escalasFiltradas.forEach(escala => {
      (escala.turnos || []).forEach(dia => {
        if (dia.cancelado) return;
        ['manha', 'tarde'].forEach(turno => {
          (dia[turno] || []).forEach(colab => {
            const dataStr = dia.data;
            const colabEmail = colaboradores.find(c => c.id === colab.colaborador_id)?.email;
            // Dia em horário de Brasília (o created_date é UTC: às 23h de um
            // dia em São Paulo já é o dia seguinte em UTC).
            const tratativasDoDia = tratativas.filter(t => {
              if (t.excluida || t.status === 'excluida') return false;
              return diaSP(t.data_registro || t.created_date) === dataStr && (
                t.agente_responsavel_id === colab.colaborador_id ||
                (colabEmail && t.created_by === colabEmail)
              );
            });
            const chaveDia = `${colab.colaborador_id}|${dataStr}`;
            const contaNosTotais = !jaContado.has(chaveDia);
            jaContado.add(chaveDia);
            const concluidas = tratativasDoDia.filter(t =>
              ['encerrada', 'aguardando_confirmacao_reabertura'].includes(t.status)
            ).length;
            const abertas = tratativasDoDia.length - concluidas;

            resultado.push({
              semana: escala.semana_referencia,
              dia: dia.dia,
              data: dia.data,
              turno,
              colaborador_id: colab.colaborador_id,
              colaborador_nome: colab.colaborador_nome,
              abertas,
              concluidas,
              total: tratativasDoDia.length,
              contaNosTotais,
            });
          });
        });
      });
    });
    return resultado.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  }, [escalas, semanaFiltro, tratativas, colaboradores]);

  // KPIs globais
  const kpis = useMemo(() => {
    const contaveis = linhas.filter(l => l.contaNosTotais);
    const totalManha = contaveis.filter(l => l.turno === 'manha').reduce((a, l) => a + l.total, 0);
    const totalTarde = contaveis.filter(l => l.turno === 'tarde').reduce((a, l) => a + l.total, 0);
    const totalGeral = contaveis.reduce((a, l) => a + l.total, 0);
    const totalConcluidas = contaveis.reduce((a, l) => a + l.concluidas, 0);
    const taxaConclusao = totalGeral > 0 ? Math.round((totalConcluidas / totalGeral) * 100) : 0;

    // Colaborador mais produtivo
    const porColab = {};
    contaveis.forEach(l => {
      if (!porColab[l.colaborador_id]) porColab[l.colaborador_id] = { nome: l.colaborador_nome, total: 0 };
      porColab[l.colaborador_id].total += l.total;
    });
    const topColab = Object.values(porColab).sort((a, b) => b.total - a.total)[0];

    return { totalManha, totalTarde, totalGeral, totalConcluidas, taxaConclusao, topColab };
  }, [linhas]);

  // Agrupado por dia
  const agrupadoPorDia = useMemo(() => {
    const map = {};
    linhas.forEach(l => {
      const key = l.data || l.dia;
      if (!map[key]) map[key] = { data: l.data, dia: l.dia, semana: l.semana, manha: [], tarde: [] };
      map[key][l.turno].push(l);
    });
    return Object.values(map).sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  }, [linhas]);

  const toggleDia = key => setExpandidos(prev => ({ ...prev, [key]: !prev[key] }));

  const pctBarra = (val, max) => max > 0 ? Math.round((val / max) * 100) : 0;
  const maxTotal = Math.max(...linhas.map(l => l.total), 1);

  return (
    <div className="space-y-6">

      {/* Filtro */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground">Semana:</label>
          <select
            className="border border-border rounded-lg text-sm px-3 py-1.5 bg-card shadow-sm focus:ring-2 focus:ring-ring focus:outline-none"
            value={semanaFiltro}
            onChange={e => setSemanaFiltro(e.target.value)}
          >
            <option value="todas">Todas as semanas</option>
            {semanasDisponiveis.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {semanaFiltro !== 'todas' && (
          <button
            onClick={() => setSemanaFiltro('todas')}
            className="text-xs text-primary hover:underline"
          >
            Limpar filtro
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm bg-warning-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Sun className="w-5 h-5 text-warning" />
              <Badge className="bg-warning-soft text-warning border-0 text-xs">Manhã</Badge>
            </div>
            <p className="text-2xl font-bold text-warning">{kpis.totalManha}</p>
            <p className="text-xs text-warning mt-0.5">tratativas registradas</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-info-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Moon className="w-5 h-5 text-primary" />
              <Badge className="bg-info-soft text-primary border-0 text-xs">Tarde</Badge>
            </div>
            <p className="text-2xl font-bold text-primary">{kpis.totalTarde}</p>
            <p className="text-xs text-primary mt-0.5">tratativas registradas</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-success-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-success" />
              <Badge className="bg-success-soft text-success border-0 text-xs">Taxa</Badge>
            </div>
            <p className="text-2xl font-bold text-success">{kpis.taxaConclusao}%</p>
            <p className="text-xs text-success mt-0.5">das registradas no turno já estão encerradas</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-info-soft">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-primary" />
              <Badge className="bg-info-soft text-primary border-0 text-xs">Top</Badge>
            </div>
            <p className="text-sm font-bold text-primary truncate">
              {kpis.topColab?.nome?.split(' ')[0] || '—'}
            </p>
            <p className="text-xs text-primary mt-0.5">
              {kpis.topColab ? `${kpis.topColab.total} tratativas` : 'sem dados'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detalhamento por dia */}
      {agrupadoPorDia.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-14 text-center">
            <BarChart2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground font-medium">Nenhum dado de produtividade disponível</p>
            <p className="text-muted-foreground text-xs mt-1">Gere escalas e registre tratativas para visualizar o relatório</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            Produtividade por Dia
          </h3>
          {agrupadoPorDia.map(grupo => {
            const key = grupo.data || grupo.dia;
            const aberto = expandidos[key] !== false;
            // Quem está nos dois turnos do mesmo dia conta uma vez só.
            const doDia = [...grupo.manha, ...grupo.tarde].filter(l => l.contaNosTotais);
            const totalDia = doDia.reduce((a, l) => a + l.total, 0);
            const concluidasDia = doDia.reduce((a, l) => a + l.concluidas, 0);
            const pct = totalDia > 0 ? Math.round((concluidasDia / totalDia) * 100) : 0;

            return (
              <Card key={key} className="border-0 shadow-sm overflow-hidden">
                {/* Cabeçalho clicável */}
                <button
                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted transition-colors text-left"
                  onClick={() => toggleDia(key)}
                >
                  {/* Data */}
                  <div className="w-12 h-12 bg-muted rounded-xl flex flex-col items-center justify-center flex-shrink-0 shadow-sm">
                    {grupo.data ? (
                      <>
                        <span className="text-xs font-bold text-foreground leading-none">
                          {new Date(grupo.data + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit' })}
                        </span>
                        <span className="text-xs text-muted-foreground leading-none mt-0.5">
                          {new Date(grupo.data + 'T12:00').toLocaleDateString('pt-BR', { month: 'short' })}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs font-bold text-foreground">{grupo.dia?.slice(0, 3)}</span>
                    )}
                  </div>

                  {/* Info + barra de progresso */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-foreground">{DIAS_PT[grupo.dia]}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{concluidasDia}/{totalDia}</span>
                        <Badge className={`text-xs ${pct >= 70 ? 'bg-success-soft text-success' : pct >= 40 ? 'bg-warning-soft text-warning' : 'bg-muted text-muted-foreground'}`}>
                          {pct}%
                        </Badge>
                      </div>
                    </div>
                    {/* Barra de progresso */}
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 70 ? 'bg-success' : pct >= 40 ? 'bg-warning' : 'bg-muted'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{grupo.semana}</p>
                  </div>

                  {aberto ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                </button>

                {/* Detalhe expandido */}
                {aberto && (
                  <div className="border-t border-border px-4 pb-4 pt-3 grid md:grid-cols-2 gap-4">
                    {/* Manhã */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className="text-sm font-semibold text-warning">Manhã</span>
                        <span className="ml-auto text-xs text-warning">
                          {grupo.manha.reduce((a, l) => a + l.total, 0)} tratativas
                        </span>
                      </div>
                      {grupo.manha.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Sem colaboradores</p>
                      ) : (
                        <div className="space-y-2">
                          {grupo.manha.map((l, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-warning-soft flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-warning">
                                  {l.colaborador_nome?.charAt(0) || '?'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-medium text-foreground truncate">
                                    {l.colaborador_nome?.split(' ').slice(0, 2).join(' ')}
                                  </p>
                                  <span className="text-xs font-bold text-foreground ml-2">{l.total}</span>
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-warning rounded-full"
                                      style={{ width: `${pctBarra(l.total, maxTotal)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-success flex-shrink-0">{l.concluidas}✓</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tarde */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-3">
                        <span className="text-sm font-semibold text-primary">Tarde</span>
                        <span className="ml-auto text-xs text-primary">
                          {grupo.tarde.reduce((a, l) => a + l.total, 0)} tratativas
                        </span>
                      </div>
                      {grupo.tarde.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Sem colaboradores</p>
                      ) : (
                        <div className="space-y-2">
                          {grupo.tarde.map((l, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-info-soft flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-primary">
                                  {l.colaborador_nome?.charAt(0) || '?'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-medium text-foreground truncate">
                                    {l.colaborador_nome?.split(' ').slice(0, 2).join(' ')}
                                  </p>
                                  <span className="text-xs font-bold text-foreground ml-2">{l.total}</span>
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-primary rounded-full"
                                      style={{ width: `${pctBarra(l.total, maxTotal)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-success flex-shrink-0">{l.concluidas}✓</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}