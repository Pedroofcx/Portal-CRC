import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Eye, Bell } from 'lucide-react';
import { formatDateSP } from '@/components/utils/helpers';

function TrendIcon({ current, previous }) {
  if (previous == null) return <Minus className="w-4 h-4 text-muted-foreground" />;
  if (current > previous) return <TrendingUp className="w-4 h-4 text-success" />;
  if (current < previous) return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

export default function HanseiAgenteDashboard({ meusEnvios, onVerDetalhes }) {
  const [filtroQtd, setFiltroQtd] = useState('8');

  const enviosOrdenados = useMemo(() =>
    [...meusEnvios].sort((a, b) => new Date(a.periodo_inicio) - new Date(b.periodo_inicio)),
    [meusEnvios]
  );

  const enviosFiltrados = useMemo(() => {
    const qtd = parseInt(filtroQtd);
    return enviosOrdenados.slice(-qtd);
  }, [enviosOrdenados, filtroQtd]);

  const chartData = useMemo(() => enviosFiltrados.map(e => {
    const d = e.dados_consolidados || {};
    const slaTotal = (d.slas_cumpridos || 0) + (d.slas_estourados || 0);
    return {
      label: formatDateSP(e.periodo_inicio, 'DD/MM'),
      performance: d.performance_percentual || 0,
      csat: d.csat_individual || 0,
      sla: slaTotal > 0 ? Math.round((d.slas_cumpridos / slaTotal) * 100) : 0,
      solucionadas: d.tratativas_solucionadas || 0,
      envioId: e.id,
    };
  }), [enviosFiltrados]);

  const ultimo = meusEnvios.length > 0 ? [...meusEnvios].sort((a, b) => new Date(b.periodo_inicio) - new Date(a.periodo_inicio))[0] : null;
  const penultimo = meusEnvios.length > 1 ? [...meusEnvios].sort((a, b) => new Date(b.periodo_inicio) - new Date(a.periodo_inicio))[1] : null;

  const ld = ultimo?.dados_consolidados || {};
  const pd = penultimo?.dados_consolidados || {};

  const naoVistos = meusEnvios.filter(e => !e.visualizado).length;

  if (meusEnvios.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-12 text-center">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground font-medium">Nenhum resultado disponível ainda</p>
          <p className="text-sm text-muted-foreground mt-1">Seu gestor irá enviar seus resultados periodicamente</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {/* Alerta não visualizados */}
      {naoVistos > 0 && (
        <div className="flex items-center gap-3 p-3 bg-info-soft border border-info/25 rounded-xl">
          <Bell className="w-5 h-5 text-primary flex-shrink-0" />
          <p className="text-sm text-primary font-medium">{naoVistos} resultado(s) novo(s) aguardando sua leitura</p>
        </div>
      )}

      {/* KPIs do último período vs anterior */}
      {ultimo && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">Último período: {formatDateSP(ultimo.periodo_inicio, 'DD/MM')} – {formatDateSP(ultimo.periodo_fim, 'DD/MM/YYYY')}</p>
            <Button variant="ghost" size="sm" onClick={() => onVerDetalhes(ultimo)}>
              <Eye className="w-4 h-4 mr-1" /> Ver completo
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Performance', curr: ld.performance_percentual || 0, prev: pd.performance_percentual, fmt: v => `${v}%`, good: v => v >= 80 },
              { label: 'CSAT', curr: ld.csat_individual || 0, prev: pd.csat_individual, fmt: v => `${v}%`, good: v => v >= 85 },
              { label: 'SLA', curr: (() => { const t = (ld.slas_cumpridos||0)+(ld.slas_estourados||0); return t>0?Math.round((ld.slas_cumpridos/t)*100):0; })(), prev: (() => { const t = (pd.slas_cumpridos||0)+(pd.slas_estourados||0); return t>0?Math.round((pd.slas_cumpridos/t)*100):null; })(), fmt: v => `${v}%`, good: v => v >= 80 },
              { label: 'Solucionadas', curr: ld.tratativas_solucionadas || 0, prev: pd.tratativas_solucionadas, fmt: v => v, good: () => true },
            ].map(item => (
              <div key={item.label} className={`p-3 rounded-xl border ${item.good(item.curr) ? 'bg-success-soft border-success/25' : 'bg-destructive/10 border-destructive/25'}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <TrendIcon current={item.curr} previous={item.prev} />
                </div>
                <p className={`text-2xl font-bold ${item.good(item.curr) ? 'text-success' : 'text-destructive'}`}>
                  {item.fmt(item.curr)}
                </p>
                {item.prev != null && (
                  <p className="text-xs text-muted-foreground mt-0.5">Anterior: {item.fmt(item.prev)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráfico de evolução */}
      {chartData.length > 1 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Evolução de Desempenho</CardTitle>
            <Select value={filtroQtd} onValueChange={setFiltroQtd}>
              <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="4">Últimos 4</SelectItem>
                <SelectItem value="8">Últimos 8</SelectItem>
                <SelectItem value="12">Últimos 12</SelectItem>
                <SelectItem value="999">Todos</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} />
                <Tooltip formatter={(val, name) => [`${val}%`, name]} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="performance" stroke="hsl(var(--chart-1))" name="Performance" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="csat" stroke="hsl(var(--chart-2))" name="CSAT" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="sla" stroke="hsl(var(--chart-3))" name="SLA" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Histórico */}
      <div>
        <p className="text-sm font-semibold text-foreground mb-2">Histórico de Resultados</p>
        <div className="space-y-2">
          {[...meusEnvios].sort((a, b) => new Date(b.periodo_inicio) - new Date(a.periodo_inicio)).map(envio => {
            const d = envio.dados_consolidados || {};
            return (
              <div key={envio.id}
                className={`p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm ${!envio.visualizado ? 'border-info/30 bg-info-soft' : 'border-border bg-card'}`}
                onClick={() => onVerDetalhes(envio)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{envio.periodicidade}</Badge>
                    {!envio.visualizado && <Badge className="bg-primary text-white text-xs">Novo</Badge>}
                    <span className="text-sm text-foreground">
                      {formatDateSP(envio.periodo_inicio, 'DD/MM/YY')} – {formatDateSP(envio.periodo_fim, 'DD/MM/YY')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="hidden sm:inline">Perf: <strong>{d.performance_percentual || 0}%</strong></span>
                    <span className="hidden sm:inline">CSAT: <strong>{d.csat_individual || 0}%</strong></span>
                    <Eye className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}