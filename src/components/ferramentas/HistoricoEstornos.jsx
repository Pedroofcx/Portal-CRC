import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Eye, Trash2, FileText } from 'lucide-react';
import { fmtBRL, TIPO_ESTORNO_OPTIONS } from './calculos';

const STATUS_CLS = {
  rascunho: 'bg-slate-100 text-slate-600',
  finalizado: 'bg-green-100 text-green-700',
  vinculado: 'bg-blue-100 text-blue-700',
  cancelado: 'bg-red-100 text-red-600',
};

const tipoLabel = (v) => TIPO_ESTORNO_OPTIONS.find(o => o.value === v)?.label || v;

export default function HistoricoEstornos({ calculos, isAdmin, onVer, onExcluir }) {
  const [busca, setBusca] = useState('');

  const filtrados = (calculos || []).filter(c => {
    const b = busca.toLowerCase();
    return !b ||
      c.nome_cliente?.toLowerCase().includes(b) ||
      c.ticket_zendesk?.toLowerCase().includes(b) ||
      c.operador_nome?.toLowerCase().includes(b) ||
      c.documento_cliente?.includes(b) ||
      c.numero_calculo?.toLowerCase().includes(b) ||
      c.data_solicitacao?.includes(b);
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por cliente, ticket, operador, CNPJ/CPF, data..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">{busca ? 'Nenhum resultado encontrado' : 'Nenhum cálculo salvo ainda'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['#', 'Cliente', 'Ticket', 'Tipo', 'Valor Final', 'Operador', 'Data', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{c.numero_calculo || '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{c.nome_cliente}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{c.ticket_zendesk || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{tipoLabel(c.tipo_estorno)}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-emerald-700">{fmtBRL(c.resultado?.valor_final_devolucao)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{c.operador_nome || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{c.data_solicitacao || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLS[c.status] || STATUS_CLS.rascunho}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => onVer(c)} className="h-7 w-7 p-0" title="Carregar na calculadora">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      {isAdmin && (
                        <Button size="sm" variant="ghost" onClick={() => onExcluir(c)} className="h-7 w-7 p-0 text-red-400 hover:text-red-600" title="Excluir">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}