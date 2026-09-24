import React from 'react';
import { Button } from '@/components/ui/button';
import { Cartao } from '@/components/ui/Cartao';
import TabelaResumida from '@/components/ui/TabelaResumida';
import { formatDateSP } from '@/components/utils/helpers';
import { FONTES, lotesDeImportacao } from '@/lib/apuracao/importacao';

/**
 * O histórico das importações: o que cada arquivo trouxe e o botão de
 * desfazer. Sem isto, uma importação errada só saía do banco na mão.
 *
 * As apurações antigas (do Base44 e do assistente anterior) não têm
 * importacao_id — aparecem como "avulsa" e não podem ser desfeitas em lote,
 * porque não dá para saber o que veio junto com o quê.
 */
const TIPOS = { telefone: 'Telefone', chat: 'Chat', cx: 'Avaliação CX' };
const brDate = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—');

export default function HistoricoImportacoes({ apuracoes = [], desfazendo, onDesfazer }) {
  const lotes = lotesDeImportacao(apuracoes);

  return (
    <Cartao titulo="Importações" extra={<span className="text-xs text-muted-foreground">{lotes.length} no total</span>}>
      {lotes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma importação ainda.</p>
      ) : (
        <TabelaResumida
          linhas={lotes}
          chaveDaLinha={(l) => l.importacao_id ?? `avulsa-${l.ids[0]}`}
          rotuloDetalhe="Ver o que esta importação trouxe"
          limite={10}
          rotulo="importações"
          colunas={[
            { chave: 'quando', rotulo: 'Importada em', alinhar: 'esquerda', principal: true, valor: (l) => (l.quando ? formatDateSP(l.quando, 'DD/MM/YYYY') : '—') },
            { chave: 'tipo', rotulo: 'Indicador', alinhar: 'esquerda', principal: true, valor: (l) => TIPOS[l.tipo] ?? l.tipo },
            { chave: 'periodo', rotulo: 'Período', principal: true, valor: (l) => `${brDate(l.inicio)} a ${brDate(l.fim)}` },
            { chave: 'pessoas', rotulo: 'Pessoas', principal: true, valor: (l) => l.pessoas },
            { chave: 'dias', rotulo: 'Dias', principal: true, valor: (l) => l.dias },
            { chave: 'arquivo', rotulo: 'Arquivo', valor: (l) => l.arquivo || '—' },
            { chave: 'fonte', rotulo: 'Fonte', valor: (l) => FONTES.find((f) => f.valor === l.fonte)?.rotulo || '—' },
            { chave: 'por', rotulo: 'Importada por', valor: (l) => l.por || '—' },
            { chave: 'linhas', rotulo: 'Linhas lidas no arquivo', valor: (l) => l.linhasLidas ?? '—' },
            {
              chave: 'desfazer',
              rotulo: 'Desfazer',
              valor: (l) => (l.avulsa
                ? 'importação antiga, sem lote'
                : (
                  <Button size="sm" variant="outline" disabled={desfazendo} onClick={() => onDesfazer(l)}>
                    Desfazer ({l.pessoas} registro{l.pessoas === 1 ? '' : 's'})
                  </Button>
                )),
            },
          ]}
        />
      )}
    </Cartao>
  );
}
