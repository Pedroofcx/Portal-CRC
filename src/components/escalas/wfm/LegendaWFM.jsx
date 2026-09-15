import React from 'react';
import { SLOT_CONFIG } from './SlotConfig';
import { Lock, GripVertical } from 'lucide-react';

export default function LegendaWFM() {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-muted border border-border rounded-xl">
      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Legenda:</span>
      {Object.entries(SLOT_CONFIG).map(([key, cfg]) => (
        <div key={key} className="flex items-center gap-1.5">
          <div className={`px-2 py-0.5 rounded text-white text-[11px] font-bold ${cfg.badgeBg}`}>
            {cfg.label}
          </div>
          <span className="text-xs text-muted-foreground hidden md:block">{cfg.labelLong}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5 ml-2">
        <Lock className="w-3.5 h-3.5 text-warning" />
        <span className="text-xs text-muted-foreground">Travado</span>
      </div>
      <div className="flex items-center gap-1.5">
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Arrastar p/ reorganizar</span>
      </div>
    </div>
  );
}