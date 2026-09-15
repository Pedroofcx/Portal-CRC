import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function ModuloDocCard({ modulo }) {
  return (
    <AccordionItem value={modulo.id} className="border rounded-lg px-4 mb-2 bg-white">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-3 text-left">
          <span className="font-semibold text-slate-900">{modulo.nome}</span>
          <Badge variant="outline" className="text-xs font-normal">{modulo.categoria}</Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-4 pb-4">
        <p className="text-sm text-slate-700">{modulo.objetivo}</p>

        <div className="flex flex-wrap gap-4 text-xs">
          <div>
            <p className="font-semibold text-slate-500 uppercase mb-1">Páginas / Componentes</p>
            <div className="flex flex-wrap gap-1">
              {modulo.paginas.map((p) => (
                <code key={p} className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">{p}</code>
              ))}
            </div>
          </div>
          <div>
            <p className="font-semibold text-slate-500 uppercase mb-1">Entidades</p>
            <div className="flex flex-wrap gap-1">
              {modulo.entidades.map((e) => (
                <Badge key={e} className="bg-blue-50 text-blue-700 border-blue-200 text-xs">{e}</Badge>
              ))}
            </div>
          </div>
        </div>

        {modulo.fluxo && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Fluxo / Lógica</p>
            <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">{modulo.fluxo}</p>
          </div>
        )}

        {modulo.campos_chave?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Campos-chave</p>
            <div className="space-y-1.5">
              {modulo.campos_chave.map((c, i) => (
                <div key={i} className="text-sm">
                  <code className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-xs">{c.campo}</code>
                  <span className="text-slate-600"> — {c.descricao}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {modulo.regras_negocio?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Regras de negócio</p>
            <ul className="space-y-1 list-disc list-inside text-sm text-slate-700">
              {modulo.regras_negocio.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}

        {modulo.integracoes?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Integrações com outros módulos</p>
            <ul className="space-y-1 list-disc list-inside text-sm text-slate-700">
              {modulo.integracoes.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}