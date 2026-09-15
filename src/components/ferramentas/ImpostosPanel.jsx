import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Unlock } from 'lucide-react';
import { IMPOSTO_LABELS } from './calculos';

const CAMPOS = ['iss', 'pis', 'cofins', 'irpj', 'csll', 'comissao_vendedor', 'multa_contratual'];

export default function ImpostosPanel({ config, onChange, isAdmin }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {isAdmin
          ? <Unlock className="w-4 h-4 text-amber-500" />
          : <Lock className="w-4 h-4 text-slate-400" />}
        <h3 className="text-sm font-semibold text-slate-700">
          Impostos & Descontos
          <span className="ml-2 text-xs font-normal text-slate-400">
            {isAdmin ? '(editável — somente admin)' : '(somente visualização)'}
          </span>
        </h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {CAMPOS.map(key => (
          <div key={key} className="space-y-1">
            <Label className="text-xs text-slate-500">{IMPOSTO_LABELS[key]} (%)</Label>
            <div className="relative">
              <Input
                type="number" step="0.01" min="0" max="100"
                value={isAdmin ? (config?.[key] ?? '') : Number(config?.[key] ?? 0).toFixed(2)}
                onChange={e => isAdmin && onChange(key, parseFloat(e.target.value) || 0)}
                readOnly={!isAdmin}
                className={`pr-6 text-sm h-8 ${!isAdmin ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}