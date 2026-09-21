import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * Lista dentro de card, SEM barra de rolagem (regras-ui-ux.md, seção 9).
 *
 * Card é resumo: mostra os primeiros `limite` itens. O resto aparece de um de
 * dois jeitos:
 *   - com `verTodosHref`: um link "Ver todos os N" para a página da lista
 *     inteira — quando essa página existe;
 *   - sem ele: "Mostrar mais", que estica a lista NA PRÓPRIA PÁGINA. A página
 *     rola, como sempre rolou; o card não ganha uma segunda rolagem por dentro.
 *
 * Substitui o padrão antigo `max-h-72 overflow-y-auto`, que escondia o resto
 * atrás de uma barra fina — difícil de acertar com o mouse (lei de Fitts) e
 * fácil de não perceber que havia mais.
 *
 * `feminino` troca "Ver todos os" por "Ver todas as" ("as 8 tratativas abertas").
 *
 * `renderItem(item, indice)` recebe o mesmo que o callback do .map() antigo, e
 * deve devolver o elemento com `key`.
 */
export default function ListaResumida({
  itens = [],
  renderItem,
  limite = 5,
  verTodosHref,
  rotulo = 'itens',
  feminino = false,
  className = 'space-y-2',
}) {
  const [aberta, setAberta] = useState(false);
  const sobra = itens.length - limite;
  const visiveis = aberta || sobra <= 0 ? itens : itens.slice(0, limite);

  return (
    <div>
      <div className={className}>{visiveis.map((item, i) => renderItem(item, i))}</div>

      {sobra > 0 && (verTodosHref ? (
        <Link to={verTodosHref} className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
          {feminino ? 'Ver todas as' : 'Ver todos os'} {itens.length} {rotulo}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => setAberta((v) => !v)}
          aria-expanded={aberta}
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {aberta
            ? <>Mostrar menos <ChevronUp className="h-4 w-4" aria-hidden="true" /></>
            : <>Mostrar mais {sobra} <ChevronDown className="h-4 w-4" aria-hidden="true" /></>}
        </button>
      ))}
    </div>
  );
}
