import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import useNotificacoes from '@/hooks/useNotificacoes';
import { agruparPorCategoria, rotuloDoSelo } from '@/lib/notificacoes';

/** Quantos itens cada categoria mostra antes de mandar para a tela de origem. */
const POR_CATEGORIA = 4;

/**
 * O sino do topo: tudo que pede a atenção da pessoa numa lista só — tickets
 * atribuídos, Hansei, pesquisas, avisos, POPs, prazos vencidos, férias.
 * Cada linha leva à tela onde a coisa se resolve. As regras de quem recebe o
 * quê estão em src/lib/notificacoes.js.
 */
export default function SinoDeNotificacoes({ colaborador, className = '' }) {
  const { notificacoes, total, marcarComoVistas } = useNotificacoes(colaborador);
  const [aberto, setAberto] = useState(false);
  const grupos = agruparPorCategoria(notificacoes);
  const informativas = notificacoes.filter((n) => n.informativa).map((n) => n.id);
  const selo = rotuloDoSelo(total);

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={total ? `Notificações: ${total} ${total === 1 ? 'pendente' : 'pendentes'}` : 'Notificações: nada pendente'}
          className={`relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground ${className}`}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {total > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
              {selo}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[22rem] max-w-[calc(100vw-1rem)] p-0">
        <div className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Notificações</h2>
          <span className="text-xs text-muted-foreground">{total ? `${total} ${total === 1 ? 'item' : 'itens'}` : 'em dia'}</span>
        </div>

        {grupos.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nada pendente. Tudo em dia.</p>
        ) : (
          <div className="max-h-[70vh] divide-y divide-border overflow-y-auto">
            {grupos.map((g) => (
              <section key={g.chave} className="px-4 py-3">
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {g.rotulo}{g.itens.length > 1 ? ` (${g.itens.length})` : ''}
                </h3>
                <ul>
                  {g.itens.slice(0, POR_CATEGORIA).map((n) => (
                    <li key={n.id}>
                      <Link
                        to={n.para}
                        onClick={() => setAberto(false)}
                        className="-mx-2 block rounded-md px-2 py-1.5 transition-colors hover:bg-accent"
                      >
                        <span className={`block text-sm ${n.urgente ? 'font-semibold text-critical' : 'font-medium text-foreground'}`}>{n.titulo}</span>
                        {n.detalhe && <span className="block text-xs text-muted-foreground">{n.detalhe}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
                {g.itens.length > POR_CATEGORIA && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    e mais {g.itens.length - POR_CATEGORIA}. <Link to={g.itens[0].para} onClick={() => setAberto(false)} className="text-primary underline">Ver todos</Link>
                  </p>
                )}
              </section>
            ))}
          </div>
        )}

        {informativas.length > 0 && (
          <div className="border-t border-border px-4 py-2 text-right">
            <button type="button" className="text-xs text-primary underline" onClick={() => marcarComoVistas(informativas)}>
              Marcar as novidades como vistas
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
