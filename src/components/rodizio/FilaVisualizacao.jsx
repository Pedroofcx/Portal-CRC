import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListOrdered } from 'lucide-react';
import { formatDateSP } from '@/components/utils/helpers';

export default function FilaVisualizacao({ titulo, participantes, statusLabels }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-muted-foreground" />
          Fila de Rodízio — {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {participantes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum participante ativo no rodízio.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase">
                  <th className="text-left py-2 px-3">Posição</th>
                  <th className="text-left py-2 px-3">Nome</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-center py-2 px-3">Acionamentos</th>
                  <th className="text-left py-2 px-3">Último Acionamento</th>
                </tr>
              </thead>
              <tbody>
                {participantes.map((p) => (
                  <tr key={p.id} className={`border-b border-border ${p.isProximo ? 'bg-info-soft border-info/25' : 'hover:bg-muted'}`}>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${p.isProximo ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                          {p.ordem}
                        </span>
                        {p.isProximo && <Badge className="bg-info-soft text-primary border-info/25 text-xs">← Próximo</Badge>}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-medium text-foreground">{p.nome}</td>
                    <td className="py-3 px-3">
                      <Badge className={statusLabels[p.status]?.color || 'bg-muted text-foreground'}>
                        {statusLabels[p.status]?.label || p.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`font-semibold ${p.countAcionamentos > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {p.countAcionamentos}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">
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