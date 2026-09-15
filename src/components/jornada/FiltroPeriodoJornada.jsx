import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const opcoes = [
  { value: 'd7', label: 'Últimos 7 dias' },
  { value: 'mes_atual', label: 'Mês Atual' },
  { value: 'trimestre', label: 'Trimestre Atual' },
  { value: 'customizado', label: 'Período Customizado' },
];

export default function FiltroPeriodoJornada({ tipo, onTipoChange, customInicio, customFim, onCustomInicioChange, onCustomFimChange }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <Label className="text-xs mb-1 block">Período</Label>
        <Select value={tipo} onValueChange={onTipoChange}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            {opcoes.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {tipo === 'customizado' && (
        <>
          <div>
            <Label className="text-xs mb-1 block">Início</Label>
            <Input type="date" value={customInicio} onChange={(e) => onCustomInicioChange(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Fim</Label>
            <Input type="date" value={customFim} onChange={(e) => onCustomFimChange(e.target.value)} />
          </div>
        </>
      )}
    </div>
  );
}