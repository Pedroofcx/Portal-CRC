import db from '@/api/db';
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Calendar } from 'lucide-react';

import PainelLateral from '@/components/ui/PainelLateral';
import { Cartao, Linha } from '@/components/ui/Cartao';
import {
  TIPOS_TRABALHO, diasDaSemana, segundaDaSemana, semanaDeReferencia, trabalhoDaSemana, trabalhoDe, meuDiaNoTurno,
} from '@/lib/escalas';

/**
 * "Minha semana" no painel do agente: onde eu trabalho hoje (presencial ou de
 * casa) e o que eu faço em cada metade do dia (atendendo ou analisando
 * tickets). O detalhe da semana inteira abre no painel lateral.
 */
const hojeSP = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const rotuloDoLocal = (tipo) => TIPOS_TRABALHO.find((t) => t.valor === tipo)?.rotulo ?? 'sem marcação';
const rotuloDoPapel = (papel) => (papel === 'atendendo' ? 'atendendo' : 'analisando tickets');

export default function MinhaSemanaCard({ colaboradorId }) {
  const [aberto, setAberto] = useState(false);
  const hoje = hojeSP();
  const segunda = useMemo(() => segundaDaSemana(hoje), [hoje]);
  const dias = useMemo(() => diasDaSemana(segunda), [segunda]);

  const { data: atribuicoes = [] } = useQuery({
    queryKey: ['escalaAtribuicoes', "list('-created_date')"],
    queryFn: () => db.entities.EscalaAtribuicao.list('-created_date', 2000),
    enabled: !!colaboradorId,
    staleTime: 60000,
  });

  const { data: escalas = [] } = useQuery({
    queryKey: ['escalas-turno', "filter({ ativa: true }, '-created_date', 60)"],
    queryFn: () => db.entities.EscalaTurno.filter({ ativa: true }, '-created_date', 60),
    enabled: !!colaboradorId,
    staleTime: 60000,
  });

  const mapa = useMemo(() => trabalhoDaSemana(atribuicoes, dias), [atribuicoes, dias]);
  const escalaDaSemana = escalas.find((e) => e.semana_referencia === semanaDeReferencia(segunda)) ?? null;

  const daSemana = dias.map((d) => ({
    ...d,
    local: trabalhoDe(mapa, colaboradorId, d.data),
    papeis: meuDiaNoTurno((escalaDaSemana?.turnos || []).find((t) => t.data === d.data), colaboradorId),
  }));
  const doDia = daSemana.find((d) => d.data === hoje) ?? null;

  if (!doDia && !escalaDaSemana) return null;

  const resumoDeHoje = doDia
    ? [
      doDia.local ? rotuloDoLocal(doDia.local) : null,
      doDia.papeis ? `${rotuloDoPapel(doDia.papeis.manha)} de manhã` : null,
    ].filter(Boolean).join(' · ') || 'sem escala para hoje'
    : 'hoje não é dia útil';

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Calendar className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">Minha semana</span>
          <span className="block text-xs text-muted-foreground">{resumoDeHoje} · ver a semana</span>
        </span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </button>

      <PainelLateral open={aberto} onOpenChange={setAberto} largura="lg" titulo="Minha semana">
        <div className="mt-2 space-y-4">
          {daSemana.map((d) => (
            <Cartao key={d.data} titulo={`${d.rotulo} · ${d.data.slice(8, 10)}/${d.data.slice(5, 7)}${d.data === hoje ? ' · hoje' : ''}`}>
              <div className="divide-y divide-border">
                <Linha rotulo="Onde eu trabalho" valor={rotuloDoLocal(d.local)} />
                <Linha rotulo="De manhã" valor={d.papeis ? rotuloDoPapel(d.papeis.manha) : '—'} />
                <Linha rotulo="À tarde" valor={d.papeis ? rotuloDoPapel(d.papeis.tarde) : '—'} />
              </div>
            </Cartao>
          ))}
          <p className="text-xs text-muted-foreground">
            Quem atende de manhã analisa tickets à tarde, e o contrário. Quem monta a escala é a gestão.
          </p>
        </div>
      </PainelLateral>
    </>
  );
}
