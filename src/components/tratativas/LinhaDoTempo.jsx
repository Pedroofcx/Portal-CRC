import React from 'react';
import { formatDateSP } from '@/components/utils/helpers';
import { rotuloDoStatus } from '@/components/ui/StatusBadge';
import { ArrowRight, MessageSquare, Snowflake, Trash2, RotateCcw, Play } from 'lucide-react';

/**
 * Linha do tempo da tratativa.
 *
 * Conforme documentacao/regras-ui-ux.md: histórico em feed, do mais recente
 * para o mais antigo, com distinção visual entre os tipos de entrada.
 *
 * DUAS CORREÇÕES EM RELAÇÃO AO QUE EXISTIA
 *
 * 1. O campo `observacao` era gravado e nunca exibido. Cada entrada guarda o
 *    porquê da mudança — "SLA congelado, defesa enviada em 12/09", "Cliente
 *    reabriu a reclamação", o motivo de uma exclusão — e a tela mostrava só
 *    status, usuário e data. A informação estava no banco, invisível.
 *
 * 2. Todas as entradas tinham o mesmo ponto azul. Congelar SLA, encerrar e
 *    excluir apareciam idênticos, e só dava para diferenciar lendo.
 *
 * O tipo é deduzido da própria entrada, sem campo novo no banco: se o estado
 * mudou, é transição; se não mudou, é nota. Eventos específicos são
 * reconhecidos pelo texto que o próprio sistema escreve ao gravá-los.
 */

const TIPOS = {
  nota:        { Icone: MessageSquare, cor: 'text-muted-foreground', fundo: 'bg-muted' },
  transicao:   { Icone: ArrowRight,    cor: 'text-primary',          fundo: 'bg-info-soft' },
  inicio:      { Icone: Play,          cor: 'text-primary',          fundo: 'bg-info-soft' },
  congelamento:{ Icone: Snowflake,     cor: 'text-warning',          fundo: 'bg-warning-soft' },
  reabertura:  { Icone: RotateCcw,     cor: 'text-warning',          fundo: 'bg-warning-soft' },
  exclusao:    { Icone: Trash2,        cor: 'text-destructive',      fundo: 'bg-destructive/10' },
};

/** Deduz o tipo da entrada a partir do que ela registra. */
function tipoDaEntrada(entrada) {
  const obs = (entrada.observacao || '').toLowerCase();
  if (obs.includes('exclu')) return 'exclusao';
  if (obs.includes('congelad') || obs.includes('reativad')) return 'congelamento';
  if (obs.includes('reabr') || obs.includes('reabert')) return 'reabertura';
  if (entrada.estado_novo === 'tratativa_iniciada') return 'inicio';
  if (entrada.estado_anterior && entrada.estado_novo && entrada.estado_anterior !== entrada.estado_novo) {
    return 'transicao';
  }
  return 'nota';
}

export default function LinhaDoTempo({ entradas: recebidas }) {
  // Tratativa sem histórico chega com o campo NULO, não ausente — e o valor
  // padrão "= []" só vale para ausente. Com null, `.length` derrubava a tela
  // inteira da tratativa ("Cannot read properties of null").
  const entradas = Array.isArray(recebidas) ? recebidas : [];
  if (!entradas.length) {
    return <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>;
  }

  // Do mais recente para o mais antigo, como a regra pede. `slice` antes de
  // `reverse` porque reverse altera o array original — e este array é o
  // próprio dado da tratativa em memória.
  const ordenadas = entradas.slice().reverse();

  return (
    <ol className="space-y-0">
      {ordenadas.map((entrada, i) => {
        const tipo = tipoDaEntrada(entrada);
        const { Icone, cor, fundo } = TIPOS[tipo];
        const ultima = i === ordenadas.length - 1;
        const mudouEstado = tipo !== 'nota' && entrada.estado_anterior && entrada.estado_novo
          && entrada.estado_anterior !== entrada.estado_novo;

        return (
          <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
            {/* Fio que liga os marcos. Não desce depois do último. */}
            {!ultima && (
              <span
                className="absolute left-[15px] top-8 bottom-0 w-px bg-border"
                aria-hidden="true"
              />
            )}

            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${fundo} ${cor}`}
              aria-hidden="true"
            >
              <Icone className="h-4 w-4" />
            </span>

            <div className="min-w-0 flex-1 pt-1">
              <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-foreground">
                {mudouEstado ? (
                  <>
                    <span className="text-muted-foreground">{rotuloDoStatus(entrada.estado_anterior)}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                    <span>{rotuloDoStatus(entrada.estado_novo)}</span>
                  </>
                ) : (
                  <span>{tipo === 'nota' ? 'Registro' : rotuloDoStatus(entrada.estado_novo)}</span>
                )}
              </p>

              {entrada.observacao && (
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                  {entrada.observacao}
                </p>
              )}

              <p className="mt-1 text-xs text-muted-foreground">
                {entrada.usuario || 'Sistema'}
                {entrada.data_mudanca && ` · ${formatDateSP(entrada.data_mudanca)}`}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
