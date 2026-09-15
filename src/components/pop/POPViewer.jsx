import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatDateSP } from '@/components/utils/helpers';
import { Target, Wrench, ShieldCheck, GitBranch, Info, Users } from 'lucide-react';

const PARTICIPANTES_CORES = {
  'Agentes CSC': 'bg-blue-100 text-blue-700',
  'Supervisor CSC': 'bg-indigo-100 text-indigo-700',
  'Facilitador Interno': 'bg-violet-100 text-violet-700',
  'Gestão / Diretoria': 'bg-slate-200 text-slate-700',
  'Área Técnica': 'bg-emerald-100 text-emerald-700',
};

function ParticipanteBadge({ value }) {
  if (!value) return <span className="text-slate-300">—</span>;
  const cls = PARTICIPANTES_CORES[value] || 'bg-slate-100 text-slate-600';
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
        <Icon className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function TextBlock({ text }) {
  if (!text) return <p className="text-slate-400 text-sm italic">Não preenchido.</p>;
  return (
    <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
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
          <h2 className="text-lg font-bold text-slate-900">{pop.titulo}</h2>
        </div>
        <div className="text-xs text-slate-400">
          Criado em {formatDateSP(pop.data_criacao, 'DD/MM/YYYY')}
        </div>
      </div>

      <Separator />

      {/* Objetivo — Destaque */}
      <div className="bg-slate-900 rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Objetivo</span>
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-100">{pop.objetivo}</p>
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
          <div className="overflow-x-auto rounded-lg border border-slate-200 mt-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-2 font-semibold text-slate-500 w-1/3">Atividade</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Responsável</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Aprovador</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Consultado</th>
                  <th className="text-left px-3 py-2 font-semibold text-slate-500">Informado</th>
                </tr>
              </thead>
              <tbody>
                {raciValido.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-3 py-2.5 font-medium text-slate-700">{row.atividade || '—'}</td>
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