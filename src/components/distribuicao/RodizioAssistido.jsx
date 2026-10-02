import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TIPOS_CONFIG } from './distribuicaoUtils';
import { filaDoCanal, dataCurta, rotuloDoMes, mesDe } from '@/lib/equidade';

/**
 * Rodízio assistido: para cada canal, quem é o próximo AGORA — já sem quem
 * está de férias ou ausente. Dá para abrir a fila inteira de um canal e,
 * com um clique, abrir a atribuição já preenchida com canal e pessoa.
 */
export default function RodizioAssistido({ agentesAtivos, distribuicoes, indisponiveis, hoje, onAtribuir, onIndisponivel }) {
  const [aberto, setAberto] = useState(null);

  const canais = useMemo(
    () => Object.keys(TIPOS_CONFIG).map((tipo) => ({ tipo, ...filaDoCanal(tipo, agentesAtivos, distribuicoes, indisponiveis, hoje) })),
    [agentesAtivos, distribuicoes, indisponiveis, hoje],
  );

  const ausentes = agentesAtivos.filter((a) => indisponiveis.has(a.id));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          O próximo de cada canal, por quem recebeu há mais tempo. Quem não pode receber hoje é pulado e
          mantém a vez. Contagem do mês: {rotuloDoMes(mesDe(hoje))}.
        </p>
      </div>

      {ausentes.length > 0 && (
        <div className="rounded-lg border border-border bg-muted p-3 text-sm">
          <p className="font-medium text-foreground">Fora do rodízio hoje</p>
          <ul className="mt-1 space-y-0.5 text-muted-foreground">
            {ausentes.map((a) => {
              const i = indisponiveis.get(a.id);
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-x-2">
                  <span className="text-foreground">{a.nome_completo}</span>
                  <span>{i.motivo}{i.ate ? `, até ${dataCurta(i.ate)}` : ''}</span>
                  {i.escalaId && onIndisponivel && (
                    <button className="text-xs text-primary underline" onClick={() => onIndisponivel({ voltar: a, escalaId: i.escalaId })}>
                      Voltou
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {canais.map(({ tipo, fila, sugerido, puladosAFrente }) => {
          const cfg = TIPOS_CONFIG[tipo];
          const expandido = aberto === tipo;
          return (
            <div key={tipo} className="p-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-44 shrink-0">
                  <p className="text-sm font-semibold text-foreground">{cfg.label}</p>
                </div>
                <div className="min-w-0 flex-1">
                  {sugerido ? (
                    <>
                      <p className="text-sm text-foreground">
                        <span className="text-muted-foreground">Próximo: </span>
                        <span className="font-semibold">{sugerido.agente.nome_completo}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {sugerido.ultima
                          ? `última em ${dataCurta(sugerido.ultima.data_atribuicao)} (#${sugerido.ultima.ticket_id})`
                          : 'nunca recebeu este canal'}
                        {' · '}{sugerido.noMes} no mês
                        {puladosAFrente.length > 0 && (
                          <span className="text-warning">
                            {' · '}pulou {puladosAFrente.map((p) => `${p.agente.nome_completo} (${p.motivo.toLowerCase()})`).join(', ')}
                          </span>
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Ninguém disponível hoje.</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button size="sm" disabled={!sugerido} onClick={() => onAtribuir({ tipo, agenteId: sugerido?.agente.id })}>
                    Atribuir
                  </Button>
                  <button
                    onClick={() => setAberto(expandido ? null : tipo)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                    aria-label={expandido ? 'Fechar a fila' : 'Ver a fila completa'}
                  >
                    {expandido ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {expandido && (
                <ol className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
                  {fila.map((l) => (
                    <li key={l.agente.id} className={`flex items-center gap-3 ${l.disponivel ? '' : 'text-muted-foreground'}`}>
                      <span className="w-5 text-right tabular-nums text-muted-foreground">{l.posicao}</span>
                      <span className={`w-44 truncate ${l.disponivel ? 'text-foreground' : ''} ${l.posicao === 1 && l.disponivel ? 'font-semibold' : ''}`}>
                        {l.agente.nome_completo}
                      </span>
                      <span className="flex-1 text-xs">
                        {!l.disponivel
                          ? `${l.motivo}${l.ate ? `, até ${dataCurta(l.ate)}` : ''}`
                          : l.ultima ? `última em ${dataCurta(l.ultima.data_atribuicao)}` : 'nunca recebeu'}
                      </span>
                      <span className={`w-20 text-right text-xs tabular-nums ${l.noMes === 0 ? 'font-semibold text-warning' : 'text-muted-foreground'}`}>
                        {l.noMes} no mês
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          );
        })}
      </div>

      {onIndisponivel && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Atestado ou imprevisto que não está na Escala?</span>
          <Button size="sm" variant="outline" onClick={() => onIndisponivel({})}>Marcar alguém como indisponível</Button>
        </div>
      )}
    </div>
  );
}
