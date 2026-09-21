import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronRight, Clock, GitBranch, History, Info, ShieldCheck, Target, Users, Wrench } from 'lucide-react';
import TextoFormatado from '@/components/ui/TextoFormatado';
import { formatDateSP } from '@/components/utils/helpers';
import { primeiroNome } from '@/lib/nomes';

/**
 * Um POP, para ler rápido: prazos em destaque no topo, depois objetivo,
 * ferramentas, fluxo, critérios, outras informações e RACI. Para o gestor,
 * quem já confirmou a leitura da versão atual e o histórico de versões.
 */

function Secao({ icone: Icone, titulo, children }) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icone className="h-3.5 w-3.5" aria-hidden="true" /> {titulo}
      </h3>
      {children}
    </section>
  );
}

export default function POPViewer({ pop, versoes = [], leitores = null, isGestor = false }) {
  const [historicoAberto, setHistoricoAberto] = useState(false);
  if (!pop) return null;
  const raci = (pop.raci ?? []).filter((r) => r.atividade);
  const prazos = (pop.prazos ?? []).filter((p) => p.rotulo || p.valor);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="rounded-md bg-muted px-2 py-0.5 font-mono font-semibold text-foreground">{pop.codigo}</span>
        {pop.categoria && <span>{pop.categoria}</span>}
        <span>· versão {pop.versao || '1.0'}</span>
        {pop.vigencia && <span>· vigente desde {formatDateSP(pop.vigencia, 'DD/MM/YYYY')}</span>}
        {pop.publicado_em && <span>· publicada em {formatDateSP(pop.publicado_em, 'DD/MM/YYYY')}{pop.publicado_por_nome ? ` por ${primeiroNome(pop.publicado_por_nome)}` : ''}</span>}
      </div>

      {pop.o_que_mudou && pop.versao !== '1.0' && (
        <div className="rounded-lg border border-info/25 bg-info-soft px-4 py-3 text-sm">
          <p className="font-medium text-foreground">O que mudou na versão {pop.versao}</p>
          <p className="mt-0.5 text-muted-foreground">{pop.o_que_mudou}</p>
        </div>
      )}

      {prazos.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {prazos.map((p, i) => (
            <div key={i} className="flex items-start gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{p.rotulo}</p>
                <p className="text-sm font-semibold text-foreground">{p.valor}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {pop.objetivo && (
        <Secao icone={Target} titulo="Objetivo">
          <p className="text-sm leading-relaxed text-foreground/90">{pop.objetivo}</p>
        </Secao>
      )}

      {pop.ferramentas && pop.ferramentas !== '—' && (
        <Secao icone={Wrench} titulo="Ferramentas">
          <p className="text-sm text-foreground/90">{pop.ferramentas}</p>
        </Secao>
      )}

      {pop.fluxo_operacional && (
        <Secao icone={GitBranch} titulo="Fluxo operacional">
          <TextoFormatado texto={pop.fluxo_operacional} />
        </Secao>
      )}

      {pop.criterio_qualidade && (
        <Secao icone={ShieldCheck} titulo="Critérios de qualidade">
          <TextoFormatado texto={pop.criterio_qualidade} />
        </Secao>
      )}

      {pop.outras_informacoes && (
        <Secao icone={Info} titulo="Outras informações">
          <TextoFormatado texto={pop.outras_informacoes} />
        </Secao>
      )}

      {raci.length > 0 && (
        <Secao icone={Users} titulo="Matriz RACI">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-2 pr-2 font-medium">Atividade</th>
                <th className="px-2 py-2 font-medium" title="Responsável — executa">R</th>
                <th className="px-2 py-2 font-medium" title="Aprovador — responde pelo resultado">A</th>
                <th className="px-2 py-2 font-medium" title="Consultado">C</th>
                <th className="px-2 py-2 font-medium" title="Informado">I</th>
              </tr>
            </thead>
            <tbody>
              {raci.map((r, i) => (
                <tr key={i} className="border-b border-border/60 last:border-0">
                  <td className="py-2 pr-2 font-medium text-foreground">{r.atividade}</td>
                  <td className="px-2 py-2">{r.responsavel || '—'}</td>
                  <td className="px-2 py-2 font-semibold text-foreground">{r.aprovador || '—'}</td>
                  <td className="px-2 py-2">{r.consultado || '—'}</td>
                  <td className="px-2 py-2">{r.informado || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1.5 text-xs text-muted-foreground">R executa · A aprova e responde pelo resultado · C é consultado · I é informado</p>
        </Secao>
      )}

      {isGestor && leitores && (
        <Secao icone={CheckCircle2} titulo={`Leitura da versão ${pop.versao || '1.0'}`}>
          <p className="text-sm text-foreground">
            <span className="font-semibold">{leitores.leram.length}</span> de {leitores.total} confirmaram
          </p>
          {leitores.faltam.length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">Faltam: {leitores.faltam.map((c) => primeiroNome(c.nome_completo)).join(', ')}</p>
          )}
        </Secao>
      )}

      {versoes.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setHistoricoAberto((v) => !v)}
            aria-expanded={historicoAberto}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
          >
            <History className="h-3.5 w-3.5" aria-hidden="true" /> Histórico de versões ({versoes.length})
            {historicoAberto ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          {historicoAberto && (
            <ol className="mt-2 space-y-2 border-l border-border pl-4">
              {versoes.map((v) => (
                <li key={v.id} className="text-sm">
                  <span className="font-semibold text-foreground">v{v.versao}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {formatDateSP(v.publicado_em, 'DD/MM/YYYY')}{v.publicado_por_nome ? ` · ${primeiroNome(v.publicado_por_nome)}` : ''}
                  </span>
                  {v.o_que_mudou && <p className="text-xs text-muted-foreground">{v.o_que_mudou}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
