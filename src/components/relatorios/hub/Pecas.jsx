import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ciclosEmOrdem } from '@/lib/bonusManual';

/**
 * Peças comuns dos relatórios (padrão aprovado em 22/09/2026): a pergunta que
 * o relatório responde, o "como calculamos" em português, e o período.
 */

/** "Como calculamos": fechado por padrão, abre com um clique. */
export function ComoCalculamos({ children, titulo = 'Como calculamos' }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="mt-3 border-t border-border pt-2 text-sm">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
      >
        {aberto ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
        {titulo}
      </button>
      {aberto && <div className="mt-2 max-w-3xl space-y-1.5 text-muted-foreground">{children}</div>}
    </div>
  );
}

/** A pergunta do grupo, no topo. */
export function Pergunta({ pergunta, explicacao }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground">{pergunta}</h2>
      {explicacao && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{explicacao}</p>}
    </div>
  );
}

const dataCurta = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');

/**
 * Período: um ciclo da premiação ou datas escolhidas. `valor` =
 * { chave: cicloId | 'personalizado', inicio, fim }.
 */
export function FiltroPeriodo({ ciclos = [], valor, onChange }) {
  const lista = ciclosEmOrdem(ciclos);
  const escolher = (chave) => {
    if (chave === 'personalizado') { onChange({ ...valor, chave }); return; }
    const c = lista.find((x) => x.id === chave);
    if (c) onChange({ chave, inicio: c.data_inicio, fim: c.data_fim });
  };
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor="rel-periodo" className="text-xs">Período</Label>
        <Select value={valor.chave} onValueChange={escolher}>
          <SelectTrigger id="rel-periodo" className="w-72 max-w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {lista.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome} · {dataCurta(c.data_inicio).slice(0, 5)} a {dataCurta(c.data_fim).slice(0, 5)}</SelectItem>
            ))}
            <SelectItem value="personalizado">Escolher as datas</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {valor.chave === 'personalizado' && (
        <>
          <div className="space-y-1">
            <Label htmlFor="rel-inicio" className="text-xs">De</Label>
            <Input id="rel-inicio" type="date" className="w-40 min-w-0" value={valor.inicio || ''} onChange={(e) => onChange({ ...valor, inicio: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="rel-fim" className="text-xs">Até</Label>
            <Input id="rel-fim" type="date" className="w-40 min-w-0" value={valor.fim || ''} onChange={(e) => onChange({ ...valor, fim: e.target.value })} />
          </div>
        </>
      )}
    </div>
  );
}

export const brl = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const periodoPorExtenso = ({ inicio, fim } = {}) =>
  inicio && fim ? `de ${dataCurta(inicio)} a ${dataCurta(fim)}` : inicio ? `desde ${dataCurta(inicio)}` : fim ? `até ${dataCurta(fim)}` : 'em todo o período';
