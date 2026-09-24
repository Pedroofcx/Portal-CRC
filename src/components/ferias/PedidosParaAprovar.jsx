import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Cartao, Linha } from '@/components/ui/Cartao';
import PainelLateral, { RodapeFixo } from '@/components/ui/PainelLateral';
import { conferirPedido, saldoDoCiclo, cicloParaAData, hojeSP } from '@/lib/ferias';

/**
 * Os pedidos esperando a gestão. A mesma conferência que o agente viu ao
 * pedir aparece aqui — se algo mudou desde então (outra pessoa aprovada no
 * mesmo período, por exemplo), o gestor vê antes de aprovar.
 */
const brDate = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—');

export default function PedidosParaAprovar({ pedidos = [], solicitacoes = [], ciclos = [], salvando, onAprovar, onRecusar, onSugerir }) {
  const [recusando, setRecusando] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [sugerindo, setSugerindo] = useState(null);
  const [novaInicio, setNovaInicio] = useState('');
  const [novaFim, setNovaFim] = useState('');
  const hoje = hojeSP();

  if (pedidos.length === 0) {
    return (
      <Cartao titulo="Pedidos de férias">
        <p className="text-sm text-muted-foreground">Nenhum pedido esperando resposta.</p>
      </Cartao>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {pedidos.map((pedido) => {
          const ciclosDaPessoa = ciclos.filter((c) => c.colaborador_id === pedido.colaborador_id);
          const ciclo = cicloParaAData(ciclosDaPessoa, pedido.data_inicio, hoje);
          const conferencia = conferirPedido({ pedido, solicitacoes, ciclo, hoje });
          const saldo = ciclo ? saldoDoCiclo(ciclo, hoje) : null;

          return (
            <Cartao
              key={pedido.id}
              titulo={pedido.colaborador_nome}
              extra={<span className="text-xs text-muted-foreground">pedido em {brDate(pedido.data_solicitacao || pedido.created_date)}</span>}
            >
              <div className="divide-y divide-border border-t border-border">
                <Linha rotulo="Período pedido" detalhe={`${conferencia.dias} dia(s) corridos`} valor={`${brDate(pedido.data_inicio)} a ${brDate(pedido.data_fim)}`} forte />
                {pedido.venda_dias > 0 && <Linha rotulo="Quer vender" valor={`${pedido.venda_dias} dia(s)`} />}
                {saldo && (
                  <Linha
                    rotulo="Saldo do período aquisitivo"
                    detalhe={`${brDate(ciclo.aquisitivo_inicio)} a ${brDate(ciclo.aquisitivo_fim)} · vence em ${brDate(saldo.venceEm)}`}
                    valor={`${saldo.restantes} dia(s)`}
                  />
                )}
                <Linha
                  rotulo="Outras pessoas fora no período"
                  detalhe={conferencia.lotacao?.pessoas.length ? conferencia.lotacao.pessoas.join(', ') : 'ninguém'}
                  valor={conferencia.lotacao?.pico ?? 0}
                />
              </div>

              {pedido.observacoes_colaborador && (
                <p className="mt-3 text-sm text-muted-foreground">&ldquo;{pedido.observacoes_colaborador}&rdquo;</p>
              )}

              {conferencia.erros.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-destructive">
                  {conferencia.erros.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
              {conferencia.avisos.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {conferencia.avisos.map((a, i) => <li key={i}>{a}</li>)}
                </ul>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" disabled={salvando} onClick={() => onAprovar(pedido, ciclo)}>Aprovar</Button>
                <Button size="sm" variant="outline" disabled={salvando} onClick={() => { setSugerindo(pedido); setNovaInicio(''); setNovaFim(''); }}>
                  Sugerir outra data
                </Button>
                <Button size="sm" variant="outline" disabled={salvando} onClick={() => { setRecusando(pedido); setMotivo(''); }}>Recusar</Button>
              </div>
            </Cartao>
          );
        })}
      </div>

      <PainelLateral open={!!recusando} onOpenChange={() => setRecusando(null)} largura="md" titulo="Recusar pedido">
        <div className="mt-2 space-y-4">
          <p className="text-sm text-muted-foreground">
            {recusando?.colaborador_nome} — {brDate(recusando?.data_inicio)} a {brDate(recusando?.data_fim)}
          </p>
          <div>
            <Label>Motivo *</Label>
            <Textarea className="mt-1" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="O que impede estas datas." />
          </div>
          <RodapeFixo>
            <Button variant="outline" onClick={() => setRecusando(null)}>Voltar</Button>
            <Button disabled={salvando || motivo.trim().length < 3} onClick={() => { onRecusar(recusando, motivo.trim()); setRecusando(null); }}>
              Recusar pedido
            </Button>
          </RodapeFixo>
        </div>
      </PainelLateral>

      <PainelLateral open={!!sugerindo} onOpenChange={() => setSugerindo(null)} largura="md" titulo="Sugerir outra data">
        <div className="mt-2 space-y-4">
          <p className="text-sm text-muted-foreground">
            {sugerindo?.colaborador_nome} pediu {brDate(sugerindo?.data_inicio)} a {brDate(sugerindo?.data_fim)}.
            A pessoa vê a sugestão e decide.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Primeiro dia</Label>
              <Input type="date" className="mt-1" value={novaInicio} onChange={(e) => setNovaInicio(e.target.value)} />
            </div>
            <div>
              <Label>Último dia</Label>
              <Input type="date" className="mt-1" value={novaFim} onChange={(e) => setNovaFim(e.target.value)} />
            </div>
          </div>
          <RodapeFixo>
            <Button variant="outline" onClick={() => setSugerindo(null)}>Voltar</Button>
            <Button disabled={salvando || !novaInicio || !novaFim} onClick={() => { onSugerir(sugerindo, novaInicio, novaFim); setSugerindo(null); }}>
              Enviar sugestão
            </Button>
          </RodapeFixo>
        </div>
      </PainelLateral>
    </>
  );
}
