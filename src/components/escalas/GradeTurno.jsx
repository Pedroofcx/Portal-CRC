import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Cartao, Linha } from '@/components/ui/Cartao';
import {
  ATENDENDO_POR_TURNO, METADES, estadoNoTurno, proximoEstado, equilibrioDoAtendimento, trabalhandoNaMetade,
} from '@/lib/escalas';

/**
 * Escala de Turno da semana, em grade: uma linha por pessoa e duas células
 * por dia (manhã e tarde). Clicar na célula gira entre atende → analisa →
 * fora. O "fora" é o que dá o turno de verdade — alguém só de manhã, outro
 * só de tarde, e a troca dia a dia (pedido de Pedro, 24/09/2026).
 */
const CORES = {
  atendendo: 'border-primary/25 bg-info-soft text-primary',
  analisando: 'border-warning/25 bg-warning-soft text-warning',
  fora: 'border-dashed border-border bg-card text-muted-foreground',
};
const ROTULO = { atendendo: 'Atende', analisando: 'Analisa', fora: '—' };
const primeiroNome = (nome) => String(nome || '').split(' ')[0];

function Celula({ estado, podeEditar, onClick, descricao }) {
  const classe = `w-full rounded-md border px-1.5 py-1.5 text-xs font-medium transition-colors ${CORES[estado]}`;
  if (!podeEditar) return <span className={classe}>{ROTULO[estado]}</span>;
  return (
    <button type="button" className={`${classe} hover:opacity-80`} onClick={onClick} title={descricao}>
      {ROTULO[estado]}
    </button>
  );
}

export default function GradeTurno({
  pessoas, dias, turnos, presentesPorDia, podeEditar, salvando,
  onTrocarEstado, onInverterDia, onCopiarDoAnterior, onCancelarDia, onMontarSemana, onRepetirSemana,
}) {
  const porData = useMemo(() => new Map(turnos.map((t) => [t.data, t])), [turnos]);
  const equilibrio = useMemo(() => equilibrioDoAtendimento(turnos), [turnos]);

  /** Quem pode ser escalado num dia: quem está trabalhando naquele dia. */
  const escalaveis = (data) => new Set((presentesPorDia.get(data) ?? []).map((p) => p.colaborador_id));

  return (
    <div className="space-y-4">
      {podeEditar && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onMontarSemana} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Montar no padrão'}
          </Button>
          <Button size="sm" variant="outline" onClick={onRepetirSemana} disabled={salvando}>
            Repetir a semana passada
          </Button>
          <p className="self-center text-xs text-muted-foreground">
            O padrão põe {ATENDENDO_POR_TURNO} atendendo de manhã e inverte à tarde. Depois é só clicar para mudar:
            atende → analisa → fora.
          </p>
        </div>
      )}

      <Cartao>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th rowSpan={2} className="py-2 pr-3 text-left align-bottom font-medium">Pessoa</th>
                {dias.map((d) => {
                  const dia = porData.get(d.data);
                  return (
                    <th key={d.data} colSpan={2} className="px-1 pb-1 pt-2 text-center font-medium">
                      {d.rotulo} <span className="font-normal">{d.data.slice(8, 10)}/{d.data.slice(5, 7)}</span>
                      {podeEditar && (
                        <span className="mt-0.5 flex justify-center gap-2 text-[11px] font-normal">
                          <button type="button" className="hover:text-foreground" onClick={() => onInverterDia(d.data)} title="Troca manhã por tarde neste dia">
                            inverter
                          </button>
                          <button type="button" className="hover:text-foreground" onClick={() => onCopiarDoAnterior(d.data)} title="Copia a escalação do dia anterior">
                            copiar anterior
                          </button>
                          <button type="button" className="hover:text-foreground" onClick={() => onCancelarDia(d.data)}>
                            {dia?.cancelado ? 'reativar' : 'sem operação'}
                          </button>
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
              <tr className="border-b border-border text-[11px] text-muted-foreground">
                {dias.map((d) => (
                  <React.Fragment key={d.data}>
                    <th className="px-1 pb-1 font-normal">manhã</th>
                    <th className="px-1 pb-1 font-normal">tarde</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {pessoas.map((pessoa) => (
                <tr key={pessoa.id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3 align-middle text-foreground">{pessoa.nome_completo}</td>
                  {dias.map((d) => {
                    const dia = porData.get(d.data);
                    const podeEntrar = escalaveis(d.data).has(pessoa.id);
                    return METADES.map((metade) => {
                      const estado = dia?.cancelado ? 'fora' : estadoNoTurno(dia, pessoa.id, metade.chave);
                      return (
                        <td key={`${d.data}-${metade.chave}`} className="px-1 py-1.5 align-middle">
                          <Celula
                            estado={estado}
                            podeEditar={podeEditar && !salvando && !dia?.cancelado}
                            descricao={`${pessoa.nome_completo} — ${d.rotulo} de ${metade.rotulo}${podeEntrar ? '' : ' (não trabalha neste dia)'}`}
                            onClick={() => onTrocarEstado(d.data, pessoa, metade.chave, proximoEstado(estado))}
                          />
                        </td>
                      );
                    });
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border text-xs text-muted-foreground">
                <td className="py-2 pr-3">Atendendo / trabalhando</td>
                {dias.map((d) => {
                  const dia = porData.get(d.data);
                  return METADES.map((metade) => {
                    const atendendo = (dia?.[metade.chave] || []).length;
                    const trabalhando = trabalhandoNaMetade(dia, metade.chave).length;
                    const semAtendimento = !dia?.cancelado && trabalhando > 0 && atendendo === 0;
                    return (
                      <td key={`${d.data}-${metade.chave}-total`} className={`px-1 py-2 tabular-nums ${semAtendimento ? 'font-semibold text-destructive' : ''}`}>
                        {atendendo} / {trabalhando}
                      </td>
                    );
                  });
                })}
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Azul atende, âmbar analisa tickets, tracejado é quem não trabalha naquela metade do dia.
        </p>
      </Cartao>

      <Cartao titulo="Equilíbrio da semana" extra={<span className="text-xs text-muted-foreground">metades de dia atendendo</span>}>
        {equilibrio.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada montado nesta semana ainda.</p>
        ) : (
          <div className="divide-y divide-border">
            {equilibrio.map((e) => (
              <Linha key={e.colaborador_id} rotulo={e.nome || primeiroNome(e.nome) || e.colaborador_id} valor={e.metades} />
            ))}
          </div>
        )}
      </Cartao>
    </div>
  );
}
