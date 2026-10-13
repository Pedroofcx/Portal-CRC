import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ROTULO_DA_FONTE } from '@/lib/indicadoresCiclo';

/**
 * Escolhe de onde vem o CSAT do chat nos relatórios: as duas fontes juntas
 * (média simples do Zendesk e do ClickDesk, que é o número da premiação) ou uma
 * só, para comparar e analisar. Enquanto o Zendesk não for desligado, as duas
 * andam em paralelo.
 */
export default function SeletorFonteChat({ valor, aoMudar, id = 'fonte-chat' }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">Fonte do chat</Label>
      <Select value={valor} onValueChange={aoMudar}>
        <SelectTrigger id={id} className="w-64 max-w-full"><SelectValue /></SelectTrigger>
        <SelectContent>
          {['combinado', 'zendesk', 'clickdesk'].map((f) => <SelectItem key={f} value={f}>{ROTULO_DA_FONTE[f]}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

/** "Zendesk 88,0% (310) · ClickDesk 50,0% (7)" — o CSAT do chat de cada fonte, com o número de avaliações. */
export function detalheDasFontes(csatPorFonte = {}, volumesPorFonte = {}) {
  const fmt = (v) => `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  const partes = [['zendesk', 'Zendesk'], ['clickdesk', 'ClickDesk']]
    .filter(([f]) => csatPorFonte[f] != null)
    .map(([f, nome]) => `${nome} ${fmt(csatPorFonte[f])} (${volumesPorFonte[f]?.avaliados ?? 0} avaliações)`);
  return partes.join(' · ');
}
