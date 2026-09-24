import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import PainelLateral, { RodapeFixo } from '@/components/ui/PainelLateral';
import { Linha } from '@/components/ui/Cartao';
import {
  ANTECEDENCIA_MINIMA_DIAS, MAXIMO_SIMULTANEOS, conferirPedido, cicloParaAData, saldoDoCiclo, hojeSP,
} from '@/lib/ferias';

/**
 * O pedido de férias do agente. As regras são conferidas enquanto ele escolhe
 * as datas — ninguém envia um pedido que já nasce recusado.
 */
const brDate = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—');

export default function PainelPedidoFerias({ open, onOpenChange, colaborador, ciclos = [], solicitacoes = [], enviando, onEnviar }) {
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [venda, setVenda] = useState(0);
  const [observacao, setObservacao] = useState('');

  const hoje = hojeSP();
  const ciclo = useMemo(() => (inicio ? cicloParaAData(ciclos, inicio, hoje) : null), [ciclos, inicio, hoje]);
  const saldo = ciclo ? saldoDoCiclo(ciclo, hoje) : null;

  const conferencia = useMemo(() => (inicio && fim
    ? conferirPedido({
      pedido: { colaborador_id: colaborador?.id, data_inicio: inicio, data_fim: fim, venda_dias: Number(venda) || 0 },
      solicitacoes,
      ciclo,
      hoje,
    })
    : null), [inicio, fim, venda, colaborador, solicitacoes, ciclo, hoje]);

  const limpar = () => { setInicio(''); setFim(''); setVenda(0); setObservacao(''); };

  const enviar = () => {
    onEnviar({
      data_inicio: inicio,
      data_fim: fim,
      venda_dias: Number(venda) || 0,
      observacoes_colaborador: observacao.trim(),
      dias_corridos: conferencia?.dias ?? 0,
      periodo_aquisitivo_inicio: ciclo?.aquisitivo_inicio ?? null,
      periodo_aquisitivo_fim: ciclo?.aquisitivo_fim ?? null,
      periodo_concessivo_fim: ciclo?.concessivo_fim ?? null,
    }, limpar);
  };

  return (
    <PainelLateral
      open={open}
      onOpenChange={(v) => { if (!v) limpar(); onOpenChange(v); }}
      largura="xl"
      titulo="Pedir férias"
    >
      <div className="mt-2 space-y-5">
        <p className="text-sm text-muted-foreground">
          O pedido vai para a gestão aprovar aqui no Portal. Regras: no mínimo {ANTECEDENCIA_MINIMA_DIAS} dias
          de antecedência e no máximo {MAXIMO_SIMULTANEOS} pessoas de férias ao mesmo tempo.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Primeiro dia *</Label>
            <Input type="date" className="mt-1" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div>
            <Label>Último dia *</Label>
            <Input type="date" className="mt-1" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Vender dias (abono)</Label>
          <Input type="number" min="0" max="10" className="mt-1 max-w-32" value={venda} onChange={(e) => setVenda(e.target.value)} />
          <p className="mt-1 text-xs text-muted-foreground">Até 10 dias. Eles saem do mesmo saldo.</p>
        </div>

        <div>
          <Label>Alguma observação para a gestão</Label>
          <Textarea className="mt-1" rows={2} value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Opcional." />
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <p className="mb-2 text-sm font-semibold text-foreground">Conferência</p>
          {!conferencia ? (
            <p className="text-sm text-muted-foreground">Escolha as datas para eu conferir as regras.</p>
          ) : (
            <>
              <div className="divide-y divide-border border-b border-t border-border">
                <Linha rotulo="Dias corridos" valor={conferencia.dias} />
                {saldo && (
                  <Linha
                    rotulo="Saldo do período"
                    detalhe={saldo.venceEm ? `vence em ${brDate(saldo.venceEm)}` : null}
                    valor={`${saldo.restantes} dia(s)`}
                  />
                )}
                <Linha
                  rotulo="Pessoas de férias junto"
                  detalhe={conferencia.lotacao?.pessoas.length ? conferencia.lotacao.pessoas.join(', ') : 'ninguém'}
                  valor={conferencia.lotacao?.pico ?? 0}
                />
              </div>

              {conferencia.erros.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-destructive">
                  {conferencia.erros.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
              {conferencia.avisos.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {conferencia.avisos.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              )}
              {conferencia.erros.length === 0 && (
                <p className="mt-3 text-sm text-success">Pode enviar: o pedido está dentro das regras.</p>
              )}
            </>
          )}
        </div>

        <RodapeFixo>
          <Button variant="outline" onClick={() => { limpar(); onOpenChange(false); }}>Cancelar</Button>
          <Button onClick={enviar} disabled={enviando || !conferencia || conferencia.erros.length > 0}>
            {enviando ? 'Enviando...' : 'Enviar pedido'}
          </Button>
        </RodapeFixo>
      </div>
    </PainelLateral>
  );
}
