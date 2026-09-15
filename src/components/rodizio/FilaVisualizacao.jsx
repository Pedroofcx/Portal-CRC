import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListOrdered } from 'lucide-react';
import { formatDateSP } from '@/components/utils/helpers';

export default function FilaVisualizacao({ titulo, participantes, statusLabels }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-slate-500" />
          Fila de Rodízio — {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {participantes.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Nenhum participante ativo no rodízio.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase">
                  <th className="text-left py-2 px-3">Posição</th>
                  <th className="text-left py-2 px-3">Nome</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-center py-2 px-3">Acionamentos</th>
                  <th className="text-left py-2 px-3">Último Acionamento</th>
                </tr>
              </thead>
              <tbody>
                {participantes.map((p) => (
                  <tr key={p.id} className={`border-b border-slate-100 ${p.isProximo ? 'bg-violet-50 border-violet-200' : 'hover:bg-slate-50'}`}>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${p.isProximo ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          {p.ordem}
                        </span>
                        {p.isProximo && <Badge className="bg-violet-100 text-violet-700 border-violet-200 text-xs">← Próximo</Badge>}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800">{p.nome}</td>
                    <td className="py-3 px-3">
                      <Badge className={statusLabels[p.status]?.color || 'bg-slate-100 text-slate-700'}>
                        {statusLabels[p.status]?.label || p.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-semibold ${p.countAcionamentos > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                        {p.countAcionamentos}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500">
                      {p.ultimoAcionamento ? formatDateSP(p.ultimoAcionamento, 'DD/MM HH:mm') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}