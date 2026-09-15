import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    escalasFiltradas.forEach(escala => {
      (escala.turnos || []).forEach(dia => {
        if (dia.cancelado) return;
        ['manha', 'tarde'].forEach(turno => {
          (dia[turno] || []).forEach(colab => {
            const dataStr = dia.data;
            const colabEmail = colaboradores.find(c => c.id === colab.colaborador_id)?.email;
            const tratativasDoDia = tratativas.filter(t => {
              const criado = t.created_date?.split('T')[0];
              return criado === dataStr && (
                t.agente_responsavel_id === colab.colaborador_id ||
                (colabEmail && t.created_by === colabEmail)
              );
            });
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
            });
          });
        });
      });
    });
    return resultado.sort((a, b) => (b.data || '').localeCompare(a.data || ''));
  }, [escalas, semanaFiltro, tratativas, colaboradores]);

  // KPIs globais
  const kpis = useMemo(() => {
    const totalManha = linhas.filter(l => l.turno === 'manha').reduce((a, l) => a + l.total, 0);
    const totalTarde = linhas.filter(l => l.turno === 'tarde').reduce((a, l) => a + l.total, 0);
    const totalGeral = linhas.reduce((a, l) => a + l.total, 0);
    const totalConcluidas = linhas.reduce((a, l) => a + l.concluidas, 0);
    const taxaConclusao = totalGeral > 0 ? Math.round((totalConcluidas / totalGeral) * 100) : 0;

    // Colaborador mais produtivo
    const porColab = {};
    linhas.forEach(l => {
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
          <label className="text-xs font-medium text-slate-500">Semana:</label>
          <select
            className="border border-slate-200 rounded-lg text-sm px-3 py-1.5 bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
            className="text-xs text-blue-600 hover:underline"
          >
            Limpar filtro
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Sun className="w-5 h-5 text-amber-500" />
              <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Manhã</Badge>
            </div>
            <p className="text-2xl font-bold text-amber-700">{kpis.totalManha}</p>
            <p className="text-xs text-amber-600 mt-0.5">tratativas registradas</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Moon className="w-5 h-5 text-indigo-500" />
              <Badge className="bg-indigo-100 text-indigo-700 border-0 text-xs">Tarde</Badge>
            </div>
            <p className="text-2xl font-bold text-indigo-700">{kpis.totalTarde}</p>
            <p className="text-xs text-indigo-600 mt-0.5">tratativas registradas</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <Badge className="bg-green-100 text-green-700 border-0 text-xs">Taxa</Badge>
            </div>
            <p className="text-2xl font-bold text-green-700">{kpis.taxaConclusao}%</p>
            <p className="text-xs text-green-600 mt-0.5">taxa de conclusão</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-sky-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-blue-500" />
              <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">Top</Badge>
            </div>
            <p className="text-sm font-bold text-blue-700 truncate">
              {kpis.topColab?.nome?.split(' ')[0] || '—'}
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              {kpis.topColab ? `${kpis.topColab.total} tratativas` : 'sem dados'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detalhamento por dia */}
      {agrupadoPorDia.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-14 text-center">
            <BarChart2 className="w-12 h-12 mx-auto mb-3 text-slate-200" />
            <p className="text-slate-500 font-medium">Nenhum dado de produtividade disponível</p>
            <p className="text-slate-400 text-xs mt-1">Gere escalas e registre tratativas para visualizar o relatório</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-blue-500" />
            Produtividade por Dia
          </h3>
          {agrupadoPorDia.map(grupo => {
            const key = grupo.data || grupo.dia;
            const aberto = expandidos[key] !== false;
            const totalDia = [...grupo.manha, ...grupo.tarde].reduce((a, l) => a + l.total, 0);
            const concluidasDia = [...grupo.manha, ...grupo.tarde].reduce((a, l) => a + l.concluidas, 0);
            const pct = totalDia > 0 ? Math.round((concluidasDia / totalDia) * 100) : 0;

            return (
              <Card key={key} className="border-0 shadow-sm overflow-hidden">
                {/* Cabeçalho clicável */}
                <button
                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                  onClick={() => toggleDia(key)}
                >
                  {/* Data */}
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex flex-col items-center justify-center flex-shrink-0 shadow-sm">
                    {grupo.data ? (
                      <>
                        <span className="text-xs font-bold text-slate-700 leading-none">
                          {new Date(grupo.data + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit' })}
                        </span>
                        <span className="text-xs text-slate-500 leading-none mt-0.5">
                          {new Date(grupo.data + 'T12:00').toLocaleDateString('pt-BR', { month: 'short' })}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs font-bold text-slate-700">{grupo.dia?.slice(0, 3)}</span>
                    )}
                  </div>

                  {/* Info + barra de progresso */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold text-slate-800">{DIAS_PT[grupo.dia]}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{concluidasDia}/{totalDia}</span>
                        <Badge className={`text-xs ${pct >= 70 ? 'bg-green-100 text-green-700' : pct >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
                          {pct}%
                        </Badge>
                      </div>
                    </div>
                    {/* Barra de progresso */}
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-400' : 'bg-slate-300'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{grupo.semana}</p>
                  </div>

                  {aberto ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
                </button>

                {/* Detalhe expandido */}
                {aberto && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3 grid md:grid-cols-2 gap-4">
                    {/* Manhã */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-3">
                        <div className="w-6 h-6 bg-amber-100 rounded-lg flex items-center justify-center">
                          <Sun className="w-3.5 h-3.5 text-amber-600" />
                        </div>
                        <span className="text-sm font-semibold text-amber-700">Manhã</span>
                        <span className="ml-auto text-xs text-amber-500">
                          {grupo.manha.reduce((a, l) => a + l.total, 0)} tratativas
                        </span>
                      </div>
                      {grupo.manha.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Sem colaboradores</p>
                      ) : (
                        <div className="space-y-2">
                          {grupo.manha.map((l, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-amber-700">
                                  {l.colaborador_nome?.charAt(0) || '?'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-medium text-slate-700 truncate">
                                    {l.colaborador_nome?.split(' ').slice(0, 2).join(' ')}
                                  </p>
                                  <span className="text-xs font-bold text-slate-700 ml-2">{l.total}</span>
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-amber-400 rounded-full"
                                      style={{ width: `${pctBarra(l.total, maxTotal)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-green-600 flex-shrink-0">{l.concluidas}✓</span>
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
                        <div className="w-6 h-6 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <Moon className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                        <span className="text-sm font-semibold text-indigo-700">Tarde</span>
                        <span className="ml-auto text-xs text-indigo-500">
                          {grupo.tarde.reduce((a, l) => a + l.total, 0)} tratativas
                        </span>
                      </div>
                      {grupo.tarde.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Sem colaboradores</p>
                      ) : (
                        <div className="space-y-2">
                          {grupo.tarde.map((l, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-indigo-700">
                                  {l.colaborador_nome?.charAt(0) || '?'}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-medium text-slate-700 truncate">
                                    {l.colaborador_nome?.split(' ').slice(0, 2).join(' ')}
                                  </p>
                                  <span className="text-xs font-bold text-slate-700 ml-2">{l.total}</span>
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-indigo-400 rounded-full"
                                      style={{ width: `${pctBarra(l.total, maxTotal)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-green-600 flex-shrink-0">{l.concluidas}✓</span>
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