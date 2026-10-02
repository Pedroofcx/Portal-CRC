import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function ModuloDocCard({ modulo }) {
  return (
    <AccordionItem value={modulo.id} className="border rounded-lg px-4 mb-2 bg-card">
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-3 text-left">
          <span className="font-semibold text-foreground">{modulo.nome}</span>
          <Badge variant="outline" className="text-xs font-normal">{modulo.categoria}</Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className="space-y-4 pb-4">
        <p className="text-sm text-foreground">{modulo.objetivo}</p>

        {modulo.acesso && (
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Quem acessa: </span>{modulo.acesso}
          </p>
        )}

        <div className="flex flex-wrap gap-4 text-xs">
          <div>
            <p className="font-semibold text-muted-foreground uppercase mb-1">Arquivos</p>
            <div className="flex flex-wrap gap-1">
              {modulo.paginas.map((p) => (
                <code key={p} className="bg-muted px-1.5 py-0.5 rounded text-foreground">{p}</code>
              ))}
            </div>
          </div>
          <div>
            <p className="font-semibold text-muted-foreground uppercase mb-1">Entidades</p>
            <div className="flex flex-wrap gap-1">
              {(modulo.entidades ?? []).map((e) => (
                <Badge key={e} className="bg-info-soft text-primary border-info/25 text-xs">{e}</Badge>
              ))}
            </div>
          </div>
        </div>

        {modulo.fluxo && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Fluxo / Lógica</p>
            <p className="text-sm text-foreground bg-muted border border-border rounded-lg p-3">{modulo.fluxo}</p>
          </div>
        )}

        {modulo.campos_chave?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Campos-chave</p>
            <div className="space-y-1.5">
              {modulo.campos_chave.map((c, i) => (
                <div key={i} className="text-sm">
                  <code className="text-primary bg-info-soft px-1.5 py-0.5 rounded text-xs">{c.campo}</code>
                  <span className="text-muted-foreground"> — {c.descricao}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {modulo.regras_negocio?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Regras de negócio</p>
            <ul className="space-y-1 list-disc list-inside text-sm text-foreground">
              {modulo.regras_negocio.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}

        {modulo.integracoes?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Integrações com outros módulos</p>
            <ul className="space-y-1 list-disc list-inside text-sm text-foreground">
              {modulo.integracoes.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}