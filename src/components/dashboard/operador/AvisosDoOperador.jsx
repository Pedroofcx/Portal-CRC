import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatDateSP } from '@/components/utils/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

/**
 * Avisos da lateral do operador: os três primeiros pendentes, com o que já foi
 * confirmado apagado. Saiu de dentro do Dashboard para a prévia do operador
 * (previas/operador.jsx) poder mostrar exatamente o mesmo componente.
 */
export default function AvisosDoOperador({ avisosParaExibir = [], leituras = [], colaborador }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            Avisos
          </CardTitle>
          <Link to={createPageUrl('Avisos')}>
            <Button variant="ghost" size="sm" className="text-primary h-7 text-xs px-2">Ver todos</Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {avisosParaExibir.length === 0 ? (
          <p className="text-muted-foreground text-xs text-center py-3">Nenhum aviso pendente</p>
        ) : (
          <div className="space-y-2">
            {avisosParaExibir.slice(0, 3).map((aviso) => {
              const jaLeu = leituras.some(l => l.aviso_id === aviso.id && l.colaborador_id === colaborador?.id && l.confirmou === true);
              return (
                <div key={aviso.id} className={`p-2.5 rounded-lg ${jaLeu ? 'bg-muted opacity-60' : 'bg-muted'}`}>
                  <div className="flex items-start gap-1.5">
                    {aviso.tipo === 'urgente' && <Badge variant="destructive" className="text-xs py-0">Urgente</Badge>}
                    <div className="flex-1">
                      <p className={`text-xs font-medium ${jaLeu ? 'text-muted-foreground' : 'text-foreground'}`}>{aviso.titulo}</p>
                      <p className="text-xs text-muted-foreground">{formatDateSP(aviso.data_publicacao, 'DD/MM/YYYY')}</p>
                    </div>
                    {jaLeu && <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0 mt-0.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
