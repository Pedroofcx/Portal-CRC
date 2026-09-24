import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Cartao, Linha } from '@/components/ui/Cartao';
import { formatDateSP } from '@/components/utils/helpers';
import { filaDeNegativos, resumoDaFila } from '@/lib/apuracao/ouvidoriaChat';

/**
 * OUVIDORIA — classificar, ticket por ticket, os negativos do chat.
 *
 * Pedro (24/09/2026): o Zendesk não manda a nota no arquivo — quem sabe se
 * um "ruim" era nota 1, 2 ou 3 é ele, revisando. Esta tela é essa revisão:
 * uma lista dos tickets marcados "satisfação ruim", e três botões por linha.
 * 1 e 2 continuam negativos de verdade; 3 é neutro. Nada aqui muda o CSAT
 * oficial — só alimenta o comparativo em Análise → Chat.
 */
const NOTAS = [
  { valor: 1, rotulo: '1', classe: 'border-destructive/40 bg-destructive/10 text-destructive' },
  { valor: 2, rotulo: '2', classe: 'border-destructive/40 bg-destructive/10 text-destructive' },
  { valor: 3, rotulo: '3 · neutro', classe: 'border-success/40 bg-success-soft text-success' },
];

export default function OuvidoriaChat({ apuracoes, classificando, onClassificar }) {
  const [busca, setBusca] = useState('');
  const [soNaoClassificados, setSoNaoClassificados] = useState(true);

  const fila = useMemo(
    () => filaDeNegativos(apuracoes, { apenasNaoClassificados: soNaoClassificados }),
    [apuracoes, soNaoClassificados],
  );
  const resumoGeral = useMemo(() => resumoDaFila(filaDeNegativos(apuracoes)), [apuracoes]);

  const filtrada = busca
    ? fila.filter((l) => l.colaboradorNome?.toLowerCase().includes(busca.toLowerCase()) || String(l.ticket).includes(busca))
    : fila;

  return (
    <div className="space-y-6">
      <Cartao titulo="Quanto já foi revisado">
        <div className="grid grid-cols-2 gap-x-8 sm:grid-cols-4">
          <div className="divide-y divide-border sm:col-span-1">
            <Linha rotulo={'Tickets "ruim"'} valor={resumoGeral.total} forte />
          </div>
          <div className="divide-y divide-border sm:col-span-3">
            <Linha rotulo="Ainda sem classificar" valor={resumoGeral.naoClassificados} />
            <Linha rotulo="Nota 1 ou 2 (negativo confirmado)" valor={resumoGeral.nota1 + resumoGeral.nota2} />
            <Linha rotulo="Nota 3 (neutro)" valor={resumoGeral.nota3} />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Classificar aqui não muda o CSAT oficial da premiação — só alimenta o comparativo em Análise → Chat.
        </p>
      </Cartao>

      <div className="flex flex-wrap items-center gap-3">
        <Input className="max-w-xs" placeholder="Buscar por pessoa ou ticket..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" className="h-4 w-4 rounded accent-[hsl(var(--primary))]" checked={soNaoClassificados} onChange={(e) => setSoNaoClassificados(e.target.checked)} />
          Só os ainda não classificados
        </label>
      </div>

      <Cartao>
        {filtrada.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {soNaoClassificados ? 'Nada esperando classificação.' : 'Nenhum ticket "ruim" encontrado.'}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {filtrada.map((l) => (
              <div key={`${l.apuracaoId}-${l.ticket}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{l.colaboradorNome || 'sem pessoa vinculada'}</p>
                  <p className="text-xs text-muted-foreground">
                    Ticket {l.ticket || '—'} · {l.data ? formatDateSP(l.data, 'DD/MM/YYYY') : 'sem data'}
                    {l.nota ? ` · classificado como ${l.nota === 3 ? 'neutro' : l.nota}` : ''}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {NOTAS.map((n) => (
                    <button
                      key={n.valor}
                      type="button"
                      disabled={classificando}
                      onClick={() => onClassificar(l, l.nota === n.valor ? null : n.valor)}
                      className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                        l.nota === n.valor ? n.classe : 'border-border bg-card text-muted-foreground hover:bg-muted'}`}
                    >
                      {n.rotulo}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Cartao>
    </div>
  );
}
