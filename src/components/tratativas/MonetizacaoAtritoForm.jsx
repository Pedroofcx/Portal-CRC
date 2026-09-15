import React from 'react';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Switch } from '@/components/ui/switch';
import { TrendingDown } from 'lucide-react';

// Campos opcionais, visíveis apenas para gestor no encerramento —
// não geram nenhum trabalho obrigatório adicional para o agente.
export default function MonetizacaoAtritoForm({ form, onChange }) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
      <h5 className="font-medium text-sm text-red-900 flex items-center gap-2">
        <TrendingDown className="w-4 h-4" />
        Monetização de Atrito (opcional — apenas gestor)
      </h5>
      <div className="flex items-center gap-3">
        <Switch
          checked={form.teve_churn}
          onCheckedChange={(checked) => onChange({ ...form, teve_churn: checked })}
        />
        <Label>Cliente cancelou/evadiu por causa desta tratativa (churn)</Label>
      </div>
      <div>
        <Label>Valor de receita perdida estimado (R$)</Label>
        <CurrencyInput
          value={form.valor_perda_receita || 0}
          onChange={(num) => onChange({ ...form, valor_perda_receita: num })}
          className="mt-1 max-w-xs"
        />
      </div>
    </div>
  );
}