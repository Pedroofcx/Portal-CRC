import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Cartao, Linha } from '@/components/ui/Cartao';
import { ATENDENDO_POR_TURNO, equilibrioDoAtendimento } from '@/lib/escalas';

/**
 * Escala de Turno da semana. Em cada dia, quem atende de manhã analisa
 * tickets à tarde — e vice-versa. O gestor só escolhe a dupla da manhã;
 * a tarde é o espelho, calculado na hora.
 */
const primeiroNome = (nome) => String(nome || '').split(' ')[0];

function DiaDoTurno({ dia, presentes, podeEditar, onAlternar, onCancelar }) {
  const atendeManha = (id) => (dia.manha || []).some((c) => c.colaborador_id === id);
  const atendeTarde = (id) => (dia.tarde || []).some((c) => c.colaborador_id === id);

  return (
    <Cartao
      titulo={`${dia.rotulo} · ${dia.data.slice(8, 10)}/${dia.data.slice(5, 7)}`}
      extra={podeEditar && (
        <button type="button" onClick={onCancelar} className="text-xs text-muted-foreground hover:text-foreground">
          {dia.cancelado ? 'Reativar o dia' : 'Marcar sem operação'}
        </button>
      )}
    >
      {dia.cancelado ? (
        <p className="text-sm text-muted-foreground">
          Sem operação neste dia{dia.motivo_cancelamento ? ` — ${dia.motivo_cancelamento}` : ''}.
        </p>
      ) : presentes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ninguém trabalhando neste dia na escala de trabalho.</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted-foreground">
            Clique em quem <strong>atende de manhã</strong>. À tarde, essa pessoa analisa tickets.
          </p>
          <div className="space-y-1.5">
            {presentes.map((p) => {
              const manha = atendeManha(p.colaborador_id);
              const tarde = atendeTarde(p.colaborador_id);
              const texto = manha
                ? 'atende de manhã · analisa à tarde'
                : tarde
                  ? 'analisa de manhã · atende à tarde'
                  : 'analisa o dia todo';
              const classe = `w-full rounded-md border px-2.5 py-2 text-left text-xs transition-colors ${
                manha
                  ? 'border-primary/25 bg-info-soft text-primary'
                  : tarde
                    ? 'border-warning/25 bg-warning-soft text-warning'
                    : 'border-border bg-card text-muted-foreground'}`;
              const conteudo = (
                <>
                  <span className="block text-sm font-medium">{p.colaborador_nome}</span>
                  {texto}
                </>
              );
              return podeEditar ? (
                <button key={p.colaborador_id} type="button" className={`${classe} hover:opacity-80`} onClick={() => onAlternar(p)}>
                  {conteudo}
                </button>
              ) : (
                <div key={p.colaborador_id} className={classe}>{conteudo}</div>
              );
            })}
          </div>
          {(dia.manha || []).length !== ATENDENDO_POR_TURNO && presentes.length >= ATENDENDO_POR_TURNO * 2 && (
            <p className="mt-2 text-xs text-destructive">
              {(dia.manha || []).length} atendendo de manhã — o combinado são {ATENDENDO_POR_TURNO}.
            </p>
          )}
        </>
      )}
    </Cartao>
  );
}

export default function GradeTurno({ dias, turnos, presentesPorDia, podeEditar, salvando, onAlternar, onCancelarDia, onMontarSemana, onRepetirSemana }) {
  const equilibrio = useMemo(() => equilibrioDoAtendimento(turnos), [turnos]);
  const comRotulo = dias.map((d) => ({
    ...(turnos.find((t) => t.data === d.data) ?? { dia: d.chave, data: d.data, manha: [], tarde: [] }),
    rotulo: d.rotulo,
  }));

  return (
    <div className="space-y-4">
      {podeEditar && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onMontarSemana} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Montar a semana'}
          </Button>
          <Button size="sm" variant="outline" onClick={onRepetirSemana} disabled={salvando}>
            Repetir a semana passada
          </Button>
          <p className="self-center text-xs text-muted-foreground">
            Montar coloca {ATENDENDO_POR_TURNO} pessoas atendendo de manhã e inverte à tarde, girando a cada dia.
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {comRotulo.map((dia) => (
          <DiaDoTurno
            key={dia.data}
            dia={dia}
            presentes={presentesPorDia.get(dia.data) ?? []}
            podeEditar={podeEditar && !salvando}
            onAlternar={(p) => onAlternar(dia.data, p)}
            onCancelar={() => onCancelarDia(dia.data)}
          />
        ))}
      </div>

      <Cartao titulo="Equilíbrio da semana" extra={<span className="text-xs text-muted-foreground">metades de dia atendendo</span>}>
        {equilibrio.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada montado nesta semana ainda.</p>
        ) : (
          <div className="divide-y divide-border">
            {equilibrio.map((e) => (
              <Linha key={e.colaborador_id} rotulo={primeiroNome(e.nome) ? e.nome : e.colaborador_id} valor={e.metades} />
            ))}
          </div>
        )}
      </Cartao>
    </div>
  );
}
