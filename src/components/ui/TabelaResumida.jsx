import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

/**
 * Tabela larga SEM rolagem para o lado (regras-ui-ux.md, seção 9).
 *
 * Só as colunas que decidem ficam na linha; o resto aparece ao abrir a linha,
 * logo abaixo dela, em pares rótulo/valor. Rolagem horizontal esconde metade
 * da tabela de quem não sabe que precisa arrastar — e quem sabe precisa
 * arrastar a cada linha para ligar o número ao nome.
 *
 * colunas: [{ chave, rotulo, valor: (linha) => node, alinhar: 'esquerda'|'centro'|'direita', principal: bool }]
 *   `principal: true` fica na linha; as demais vão para o detalhe.
 * linhas: os registros. `chaveDaLinha(linha, i)` dá a key.
 */
const ALINHAR = { esquerda: 'text-left', centro: 'text-center', direita: 'text-right' };

export default function TabelaResumida({ colunas, linhas, chaveDaLinha = (_, i) => i, rotuloDetalhe = 'Ver todos os números' }) {
  const [abertas, setAbertas] = useState(() => new Set());
  const principais = colunas.filter((c) => c.principal);
  const detalhe = colunas.filter((c) => !c.principal);
  const temDetalhe = detalhe.length > 0;

  const alternar = (chave) => setAbertas((atual) => {
    const nova = new Set(atual);
    if (nova.has(chave)) nova.delete(chave); else nova.add(chave);
    return nova;
  });

  return (
    <table className="w-full text-sm">
      <thead className="bg-muted">
        <tr>
          {temDetalhe && <th className="w-8 p-2" aria-label="Abrir linha" />}
          {principais.map((c) => (
            <th key={c.chave} className={`p-2 font-medium ${ALINHAR[c.alinhar ?? 'centro']}`}>{c.rotulo}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha, i) => {
          const chave = chaveDaLinha(linha, i);
          const aberta = abertas.has(chave);
          return (
            <React.Fragment key={chave}>
              <tr
                className={`h-11 border-t border-border ${temDetalhe ? 'cursor-pointer hover:bg-muted/60' : ''} ${aberta ? 'bg-muted/40' : ''}`}
                onClick={temDetalhe ? () => alternar(chave) : undefined}
              >
                {temDetalhe && (
                  <td className="p-2 text-muted-foreground">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); alternar(chave); }}
                      aria-expanded={aberta}
                      aria-label={aberta ? 'Fechar os números da linha' : rotuloDetalhe}
                      className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted"
                    >
                      {aberta ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  </td>
                )}
                {principais.map((c) => (
                  <td key={c.chave} className={`p-2 ${ALINHAR[c.alinhar ?? 'centro']}`}>{c.valor(linha)}</td>
                ))}
              </tr>
              {aberta && (
                <tr className="bg-muted/40">
                  <td colSpan={principais.length + 1} className="px-10 pb-3 pt-1">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-4">
                      {detalhe.map((c) => (
                        <div key={c.chave} className="flex items-baseline justify-between gap-2 border-b border-border/60 py-1">
                          <dt className="text-xs text-muted-foreground">{c.rotulo}</dt>
                          <dd className="font-medium tabular-nums text-foreground">{c.valor(linha)}</dd>
                        </div>
                      ))}
                    </dl>
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
}
