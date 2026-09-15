import React, { useMemo } from 'react';
import { formatDateSP, tipoTratativaLabels } from '@/components/utils/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, DollarSign, TrendingDown, AlertTriangle } from 'lucide-react';
import StatCard from '@/components/ui/StatCard';

const origemLabel = {
  reclamacao_interna: 'Reclamação Interna',
  reclame_aqui: 'Reclame Aqui',
  google_meu_negocio: 'Google Meu Negócio',
  contestacao: 'Contestação (Chargeback)',
};

const origemColor = {
  reclamacao_interna: 'bg-blue-100 text-blue-700',
  reclame_aqui: 'bg-amber-100 text-amber-700',
  google_meu_negocio: 'bg-green-100 text-green-700',
  contestacao: 'bg-red-100 text-red-700',
};

export default function RelatorioFinanceiroConsolidado({ tratativasFiltradas }) {
  // Coleta todos os registros com valor devolvido de qualquer origem
  const registros = useMemo(() => {
    const lista = [];

    tratativasFiltradas.forEach(t => {
      // Contestação: usa valor_contestado_final ou valor_contestado_inicial
      if (t.tipo_tratativa === 'contestacao') {
        const valor = parseFloat(t.valor_contestado_final || t.valor_contestado_inicial || t.valor_contestacao || 0);
        if (valor > 0) {
          lista.push({
            id: t.id,
            id_interno: t.id_interno,
            nome_cliente: t.nome_cliente,
            id_base_cliente: t.id_base_cliente,
            origem: 'contestacao',
            valor,
            data: t.data_encerramento || t.data_registro || t.created_date,
            agente: t.agente_responsavel_nome || '-',
            status: t.status,
            motivo: t.motivo_contestacao || t.motivo_nome || '-',
          });
        }
      } else {
        // Demais tipos: usa houve_devolucao_financeira + valor_devolvido_cliente
        if (t.houve_devolucao_financeira) {
          const valor = parseFloat(t.valor_devolvido_cliente || 0);
          lista.push({
            id: t.id,
            id_interno: t.id_interno,
            nome_cliente: t.nome_cliente,
            id_base_cliente: t.id_base_cliente,
            origem: t.tipo_tratativa,
            valor,
            data: t.data_encerramento || t.data_registro || t.created_date,
            agente: t.agente_responsavel_nome || '-',
            status: t.status,
            motivo: t.motivo_nome || '-',
          });
        }
      }
    });

    return lista.sort((a, b) => new Date(b.data) - new Date(a.data));
  }, [tratativasFiltradas]);

  const totalGeral = useMemo(() => registros.reduce((acc, r) => acc + r.valor, 0), [registros]);

  const porOrigem = useMemo(() => {
    const mapa = {};
    registros.forEach(r => {
      if (!mapa[r.origem]) mapa[r.origem] = { qtd: 0, valor: 0 };
      mapa[r.origem].qtd++;
      mapa[r.origem].valor += r.valor;
    });
    return Object.entries(mapa).map(([origem, d]) => ({ origem, ...d })).sort((a, b) => b.valor - a.valor);
  }, [registros]);

  const exportarCSV = () => {
    const headers = ['Data', 'ID Interno', 'Cliente', 'ID Base Cliente', 'Origem', 'Valor Devolvido (R$)', 'Agente', 'Status', 'Motivo'];
    const rows = registros.map(r => [
      formatDateSP(r.data, 'DD/MM/YYYY'),
      r.id_interno || '-',
      r.nome_cliente || '-',
      r.id_base_cliente || '-',
      origemLabel[r.origem] || r.origem,
      r.valor.toFixed(2),
      r.agente,
      r.status,
      r.motivo,
    ]);
    const csv = [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total de Registros"
          value={registros.length}
          subtitle="devoluções no período"
          icon={DollarSign}
          color="orange"
        />
        <StatCard
          title="Valor Total Devolvido"
          value={`R$ ${totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="todos os canais"
          icon={TrendingDown}
          color="red"
        />
        <StatCard
          title="Custo Médio"
          value={registros.length > 0 ? `R$ ${(totalGeral / registros.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'}
          subtitle="por devolução"
          icon={AlertTriangle}
          color="amber"
        />
      </div>

      {/* Impacto por canal */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Impacto Financeiro por Canal</CardTitle>
        </CardHeader>
        <CardContent>
          {porOrigem.length === 0 ? (
            <p className="text-slate-500 text-center py-6">Nenhuma devolução registrada no período</p>
          ) : (
            <div className="space-y-3">
              {porOrigem.map(item => (
                <div key={item.origem} className="p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${origemColor[item.origem] || 'bg-slate-200 text-slate-700'}`}>
                      {origemLabel[item.origem] || item.origem}
                    </span>
                    <Badge variant="outline">{item.qtd} caso{item.qtd !== 1 ? 's' : ''}</Badge>
                  </div>
                  <p className="text-xl font-bold text-red-600 mt-1">
                    R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  {totalGeral > 0 && (
                    <div className="mt-2">
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${(item.valor / totalGeral) * 100}%` }} />
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{Math.round((item.valor / totalGeral) * 100)}% do total</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabela detalhada */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Detalhamento de Devoluções</CardTitle>
            <Button variant="outline" size="sm" onClick={exportarCSV}>
              <Download className="w-4 h-4 mr-1" />
              Exportar CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {registros.length === 0 ? (
            <p className="text-slate-500 text-center py-8">Nenhuma devolução encontrada no período selecionado</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Data</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">ID</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Cliente</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Origem</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Valor (R$)</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Agente</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map(r => (
                    <tr key={r.id} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDateSP(r.data, 'DD/MM/YYYY')}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.id_interno || r.id?.substring(0, 8)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{r.nome_cliente || '-'}</p>
                        <p className="text-xs text-slate-400">{r.id_base_cliente || ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${origemColor[r.origem] || 'bg-slate-100 text-slate-600'}`}>
                          {origemLabel[r.origem] || r.origem}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-600 whitespace-nowrap">
                        {r.valor > 0 ? `R$ ${r.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.agente}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate">{r.motivo}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-red-50 border-t-2 border-red-200">
                    <td colSpan={4} className="px-4 py-3 font-bold text-slate-700">Total Geral ({registros.length} registros)</td>
                    <td className="px-4 py-3 text-right font-bold text-red-700 text-base">
                      R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}