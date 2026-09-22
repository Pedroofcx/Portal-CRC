import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown } from 'lucide-react';
import { formatBRL } from '@/components/utils/helpers';

// Restrito: só deve ser renderizado quando o usuário logado é gestor.
export default function CustoOperacionalCard({ tratativa }) {
  const temDados = tratativa.custo_operacional_reais > 0 || tratativa.teve_churn || tratativa.valor_perda_receita > 0;
  if (!temDados) return null;

  return (
    <Card className="border-0 shadow-sm bg-muted superficie-escura text-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          Impacto Financeiro (restrito)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {tratativa.custo_operacional_reais > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Custo operacional</span>
            <span className="font-semibold">
              {formatBRL(tratativa.custo_operacional_reais)}
            </span>
          </div>
        )}
        {tratativa.valor_perda_receita > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Perda de receita estimada</span>
            <span className="font-semibold">
              {formatBRL(tratativa.valor_perda_receita)}
            </span>
          </div>
        )}
        {tratativa.teve_churn && (
          <Badge className="bg-destructive/20 text-destructive border-destructive/40/40 flex items-center gap-1 w-fit">
            <TrendingDown className="w-3 h-3" />
            Churn registrado
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}