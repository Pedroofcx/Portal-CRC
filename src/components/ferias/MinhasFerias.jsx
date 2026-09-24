import React from 'react';
import { Button } from '@/components/ui/button';
import { Cartao, Linha } from '@/components/ui/Cartao';
import { saldoDoCiclo, situacaoDoCiclo, deFeriasEm, proximasFerias, hojeSP } from '@/lib/ferias';

/**
 * "Minhas férias" para o agente: o saldo de cada período aquisitivo, quando
 * ele vence, os pedidos em andamento e quem já está fora — para ele escolher
 * uma data que tenha vaga antes de pedir.
 */
const brDate = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—');

const SITUACAO = {
  em_aquisicao: 'ainda em aquisição',
  disponivel: 'disponível',
  parcialmente_utilizado: 'parcialmente usado',
  vencendo: 'vencendo',
  vencido: 'vencido',
  utilizado: 'usado',
};

const STATUS_PEDIDO = {
  em_analise: 'esperando a gestão',
  aprovada: 'aprovada',
  recusada: 'recusada',
  cancelada: 'cancelada',
  sugestao_nova_data: 'a gestão sugeriu outra data',
};

export default function MinhasFerias({ colaborador, ciclos = [], solicitacoes = [], onPedir, onCancelar, cancelando }) {
  const hoje = hojeSP();
  const meusCiclos = ciclos
    .filter((c) => c.colaborador_id === colaborador?.id)
    .sort((a, b) => String(b.aquisitivo_inicio || '').localeCompare(String(a.aquisitivo_inicio || '')));
  const meusPedidos = solicitacoes
    .filter((s) => s.colaborador_id === colaborador?.id)
    .sort((a, b) => String(b.data_inicio || '').localeCompare(String(a.data_inicio || '')));

  const totalDisponivel = meusCiclos.reduce((soma, c) => soma + saldoDoCiclo(c, hoje).restantes, 0);
  const vencendo = meusCiclos.filter((c) => ['vencendo', 'vencido'].includes(situacaoDoCiclo(c, hoje)));
  const foraHoje = deFeriasEm(solicitacoes, hoje);
  const proximas = proximasFerias(solicitacoes, hoje).slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-6 xl:grid-cols-5">
        <Cartao
          titulo="Meu saldo"
          className="xl:col-span-2"
          extra={<Button size="sm" onClick={onPedir}>Pedir férias</Button>}
        >
          <p className="text-4xl font-bold tracking-tight tabular-nums text-foreground">{totalDisponivel}</p>
          <p className="text-sm text-muted-foreground">dias disponíveis somando todos os períodos</p>

          {vencendo.length > 0 && (
            <p className="mt-3 text-sm text-destructive">
              Atenção: {vencendo.length} período(s) vencendo — o mais próximo em {brDate(saldoDoCiclo(vencendo[0], hoje).venceEm)}.
            </p>
          )}

          <div className="mt-4 divide-y divide-border border-t border-border">
            {meusCiclos.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">Nenhum período cadastrado ainda. Fale com a gestão.</p>
            ) : meusCiclos.map((c) => {
              const saldo = saldoDoCiclo(c, hoje);
              return (
                <Linha
                  key={c.id}
                  rotulo={`${brDate(c.aquisitivo_inicio)} a ${brDate(c.aquisitivo_fim)}`}
                  detalhe={`${SITUACAO[situacaoDoCiclo(c, hoje)]}${saldo.venceEm ? ` · vence em ${brDate(saldo.venceEm)}` : ''}`}
                  valor={`${saldo.restantes} dia(s)`}
                />
              );
            })}
          </div>
        </Cartao>

        <Cartao titulo="Quem está de férias" className="xl:col-span-3">
          <div className="divide-y divide-border">
            {foraHoje.length === 0
              ? <p className="py-2 text-sm text-muted-foreground">Ninguém de férias hoje.</p>
              : foraHoje.map((s) => (
                <Linha key={s.id} rotulo={s.colaborador_nome} detalhe="de férias hoje" valor={`volta ${brDate(s.data_fim)}`} />
              ))}
          </div>

          <p className="mb-1 mt-4 text-xs font-medium text-muted-foreground">Já marcadas</p>
          <div className="divide-y divide-border border-t border-border">
            {proximas.length === 0
              ? <p className="py-2 text-sm text-muted-foreground">Nada marcado pela frente.</p>
              : proximas.map((s) => (
                <Linha key={s.id} rotulo={s.colaborador_nome} valor={`${brDate(s.data_inicio)} a ${brDate(s.data_fim)}`} />
              ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Até três pessoas podem estar de férias ao mesmo tempo — vale conferir aqui antes de escolher a data.
          </p>
        </Cartao>
      </div>

      <Cartao titulo="Meus pedidos">
        {meusPedidos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Você ainda não pediu férias pelo Portal.</p>
        ) : (
          <div className="divide-y divide-border">
            {meusPedidos.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{brDate(s.data_inicio)} a {brDate(s.data_fim)}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.dias_corridos || 0} dia(s){s.venda_dias ? ` · ${s.venda_dias} vendido(s)` : ''} · {STATUS_PEDIDO[s.status] || s.status}
                    {s.motivo_recusa ? ` — ${s.motivo_recusa}` : ''}
                    {s.status === 'sugestao_nova_data' && s.sugestao_nova_data_inicio
                      ? ` — sugestão: ${brDate(s.sugestao_nova_data_inicio)} a ${brDate(s.sugestao_nova_data_fim)}`
                      : ''}
                  </p>
                </div>
                {['em_analise', 'sugestao_nova_data'].includes(s.status) && (
                  <Button size="sm" variant="outline" disabled={cancelando} onClick={() => onCancelar(s)}>Cancelar pedido</Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Cartao>
    </div>
  );
}
