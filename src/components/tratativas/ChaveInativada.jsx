import React, { useId } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

/**
 * "Inativada na plataforma" no encerramento de Reclame Aqui e GMN.
 * Vale +1 ponto a partir do Ciclo 3 (ver inativadaPontua em helpers.js).
 */
export default function ChaveInativada({ rotulo, checked, onCheckedChange }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <Switch id={id} checked={!!checked} onCheckedChange={onCheckedChange} className="mt-0.5" />
      <div>
        <Label htmlFor={id}>{rotulo} (+1 pt)</Label>
        <p className="text-xs text-muted-foreground">Vale a partir do Ciclo 3: encerradas desde 17/09/2026.</p>
      </div>
    </div>
  );
}
