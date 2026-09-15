import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatDateSP } from '@/components/utils/helpers';
import { Target, Wrench, ShieldCheck, GitBranch, Info, Users } from 'lucide-react';

const PARTICIPANTES_CORES = {
  'Agentes CSC': 'bg-info-soft text-primary',
  'Supervisor CSC': 'bg-info-soft text-primary',
  'Facilitador Interno': 'bg-info-soft text-primary',
  'Gestão / Diretoria': 'bg-muted text-foreground',
  'Área Técnica': 'bg-success-soft text-success',
};

function ParticipanteBadge({ value }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const cls = PARTICIPANTES_CORES[value] || 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {value}
    </span>
  );
}

function SectionBlock({ icon: Icon, title, children, color = 'slate' }) {
  const borders = {
    slate: 'border-l-slate-300',
    blue: 'border-l-blue-400',
    emerald: 'border-l-emerald-400',
    violet: 'border-l-violet-400',
    amber: 'border-l-amber-400',
    indigo: 'border-l-indigo-400',
  };
  return (
    <div className={`border-l-4 ${borders[color]} pl-4`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function TextBlock({ text }) {
  if (!text) return <p className="text-muted-foreground text-sm italic">Não preenchido.</p>;
  return (
    <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
      {text}
    </div>
  );
}

export default function POPViewer({ pop }) {
  if (!pop) return null;

  const raciValido = pop.raci?.filter((r) => r.atividade);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="font-mono text-xs">{pop.codigo}</Badge>
            {pop.categoria && (
              <Badge variant="secondary" className="text-xs">{pop.categoria}</Badge>
            )}
            <Badge variant="outline" className="text-xs">v{pop.versao || '1.0'}</Badge>
          </div>
          <h2 className="text-lg font-bold text-foreground">{pop.titulo}</h2>
        </div>
        <div className="text-xs text-muted-foreground">
          Criado em {formatDateSP(pop.data_criacao, 'DD/MM/YYYY')}
        </div>
      </div>

      <Separator />

      {/* Objetivo — Destaque */}
      <div className="bg-muted superficie-escura rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Objetivo</span>
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{pop.objetivo}</p>
      </div>

      {/* Ferramentas */}
      {pop.ferramentas && (
        <SectionBlock icon={Wrench} title="Ferramentas Utilizadas" color="slate">
          <TextBlock text={pop.ferramentas} />
        </SectionBlock>
      )}

      {/* Critério de Qualidade */}
      {pop.criterio_qualidade && (
        <SectionBlock icon={ShieldCheck} title="Critério de Qualidade" color="emerald">
          <TextBlock text={pop.criterio_qualidade} />
        </SectionBlock>
      )}

      {/* Fluxo Operacional */}
      {pop.fluxo_operacional && (
        <SectionBlock icon={GitBranch} title="Fluxo Operacional" color="violet">
          <TextBlock text={pop.fluxo_operacional} />
        </SectionBlock>
      )}

      {/* Outras Informações */}
      {pop.outras_informacoes && (
        <SectionBlock icon={Info} title="Outras Informações, Padrões e Diretrizes" color="amber">
          <TextBlock text={pop.outras_informacoes} />
        </SectionBlock>
      )}

      {/* Tabela RACI */}
      {raciValido?.length > 0 && (
        <SectionBlock icon={Users} title="Tabela RACI — Responsabilidades" color="indigo">
          <div className="overflow-x-auto rounded-lg border border-border mt-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-1/3">Atividade</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Responsável</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Aprovador</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Consultado</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Informado</th>
                </tr>
              </thead>
              <tbody>
                {raciValido.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted">
                    <td className="px-3 py-2.5 font-medium text-foreground">{row.atividade || '—'}</td>
                    <td className="px-3 py-2.5"><ParticipanteBadge value={row.responsavel} /></td>
                    <td className="px-3 py-2.5"><ParticipanteBadge value={row.aprovador} /></td>
                    <td className="px-3 py-2.5"><ParticipanteBadge value={row.consultado} /></td>
                    <td className="px-3 py-2.5"><ParticipanteBadge value={row.informado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionBlock>
      )}
    </div>
  );
}