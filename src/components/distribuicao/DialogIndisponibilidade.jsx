import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PainelLateral, { RodapeFixo } from '@/components/ui/PainelLateral';

const selecao = 'mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm';

/**
 * Marca alguém como indisponível para o rodízio (atestado médico ou imprevisto) quando
 * isso ainda não está na Escala. Grava na própria Escala como "ausente", então
 * a marcação também aparece lá e some quando alguém a apaga.
 */
export default function DialogIndisponibilidade({ open, onClose, agentes, hoje, onSalvar, isPending }) {
  const [agenteId, setAgenteId] = useState('');
  const [motivo, setMotivo] = useState('atestado');
  const [inicio, setInicio] = useState(hoje);
  const [fim, setFim] = useState(hoje);

  const valido = agenteId && inicio && fim && fim >= inicio;
  const salvar = () => {
    onSalvar({ agente: agentes.find((a) => a.id === agenteId), inicio, fim, tipo: motivo });
    setAgenteId('');
  };

  return (
    <PainelLateral open={open} onOpenChange={(v) => { if (!v) onClose(); }} largura="md" titulo="Marcar como indisponível">
      <div className="mt-2 space-y-4">
        <p className="text-sm text-muted-foreground">
          Enquanto estiver marcada, a pessoa é pulada no rodízio e mantém a vez para quando voltar.
        </p>
        <div>
          <Label className="text-xs">Pessoa</Label>
          <select className={selecao} value={agenteId} onChange={(e) => setAgenteId(e.target.value)}>
            <option value="">Selecione</option>
            {agentes.map((a) => <option key={a.id} value={a.id}>{a.nome_completo}</option>)}
          </select>
        </div>
        <div>
          <Label className="text-xs">Motivo</Label>
          <select className={selecao} value={motivo} onChange={(e) => setMotivo(e.target.value)}>
            <option value="atestado">Atestado médico</option>
            <option value="falta">Ausência / imprevisto</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">De</Label>
            <Input type="date" className="mt-1" value={inicio} onChange={(e) => { setInicio(e.target.value); if (fim < e.target.value) setFim(e.target.value); }} />
          </div>
          <div>
            <Label className="text-xs">Até (inclusive)</Label>
            <Input type="date" className="mt-1" value={fim} min={inicio} onChange={(e) => setFim(e.target.value)} />
          </div>
        </div>
        <RodapeFixo>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={salvar} disabled={!valido || isPending}>{isPending ? 'Salvando...' : 'Marcar indisponível'}</Button>
        </RodapeFixo>
      </div>
    </PainelLateral>
  );
}
