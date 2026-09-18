import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { tipoTratativaLabels } from '@/components/utils/helpers';
import { prazoDaTratativa, consumoDoPrazo, descreverPrazo } from '@/lib/prazoSla';
import { resumoDoDia } from '@/lib/resumoDoDia';
import { Plus } from 'lucide-react';

/**
 * Fila de trabalho do operador, ordenada pela urgência do SLA.
 *
 * Substitui as "Tratativas recentes", que mostravam as 5 últimas CRIADAS —
 * inclusive as já encerradas. Uma tratativa fechada ontem podia ocupar o
 * lugar de uma que vencia em uma hora. Aqui só entram as abertas, e a ordem é
 * o prazo: vencidas primeiro (a mais atrasada no topo), depois a que vence
 * antes.
 *
 * Clicar numa linha abre a tratativa no modo dividido da página de
 * Tratativas (lista + detalhe), que é o padrão das regras de UI, seção 2.
 */
const FECHADAS = new Set(['encerrada', 'excluida']);
const LIMITE = 8;

const canalDe = (tipo) => (tipo === 'contestacao_compra' ? 'contestacao' : tipo);

function tomDoPrazo(prazo, consumo, agora) {
  if (!prazo) return { barra: 'bg-muted-foreground/30', texto: 'text-muted-foreground' };
  if (prazo < agora) return { barra: 'bg-critical', texto: 'text-critical' };
  if (consumo >= 0.75) return { barra: 'bg-warning', texto: 'text-warning' };
  return { barra: 'bg-info', texto: 'text-muted-foreground' };
}

export default function FilaDoOperador({ tratativas = [] }) {
  const agora = useMemo(() => new Date(), []);

  const abertas = useMemo(() => tratativas
    .filter((t) => !FECHADAS.has(t.status) && !t.excluida)
    .map((t) => ({ t, prazo: prazoDaTratativa(t) }))
    // Sem prazo vai para o fim: não dá para dizer que é urgente.
    .sort((a, b) => (a.prazo?.getTime() ?? Infinity) - (b.prazo?.getTime() ?? Infinity)),
  [tratativas]);

  const resumo = useMemo(() => resumoDoDia(tratativas, agora), [tratativas, agora]);

  return (
    // min-w-0: item de grade não encolhe abaixo do conteúdo sem isto, e a
    // tabela empurrava a página inteira para os lados em telas mais estreitas.
    <section className="min-w-0 rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Minha fila — pela urgência do SLA</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {abertas.length === 0
              ? 'Nenhuma tratativa aberta com você.'
              : [
                `${resumo.abertas} aberta${resumo.abertas === 1 ? '' : 's'}`,
                resumo.vencidas ? `${resumo.vencidas} com o SLA vencido` : null,
                resumo.vencemHoje ? `${resumo.vencemHoje} vence${resumo.vencemHoje === 1 ? '' : 'm'} hoje` : null,
              ].filter(Boolean).join(' · ')}
          </p>
        </div>
        <Button asChild>
          <Link to={`${createPageUrl('Tratativas')}?nova=1`}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Registrar tratativa
          </Link>
        </Button>
      </div>

      {abertas.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pr-3 font-semibold">Cliente</th>
                <th className="pb-2 pr-3 font-semibold">Tipo</th>
                <th className="pb-2 pr-3 font-semibold">Estado</th>
                <th className="w-56 pb-2 font-semibold">Prazo do SLA</th>
              </tr>
            </thead>
            <tbody>
              {abertas.slice(0, LIMITE).map(({ t, prazo }) => {
                const consumo = consumoDoPrazo(t, agora);
                const tom = tomDoPrazo(prazo, consumo, agora);
                const vencida = prazo && prazo < agora;
                const destino = `${createPageUrl('Tratativas')}?aberta=${t.id}`;
                return (
                  <tr key={t.id} className="h-12 border-t border-border transition-colors hover:bg-muted/60">
                    <td className={`pr-3 ${vencida ? 'shadow-[inset_3px_0_0_hsl(var(--critical))]' : ''}`}>
                      <Link to={destino} className="block truncate pl-2 font-medium text-foreground hover:underline">
                        {t.nome_cliente || t.id_interno || 'Sem nome'}
                      </Link>
                    </td>
                    <td className="pr-3 text-muted-foreground">
                      {tipoTratativaLabels[canalDe(t.tipo_tratativa)] || t.tipo_tratativa}
                    </td>
                    <td className="pr-3"><StatusBadge status={t.status} /></td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <span
                            className={`block h-full rounded-full ${tom.barra}`}
                            style={{ width: `${Math.min(100, Math.max(4, (consumo ?? 0) * 100))}%` }}
                          />
                        </span>
                        <span className={`w-28 text-right text-xs font-semibold ${tom.texto}`}>
                          {descreverPrazo(prazo, agora)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {abertas.length > LIMITE && (
            <Link to={createPageUrl('Tratativas')} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
              Ver todas as {abertas.length} abertas
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
