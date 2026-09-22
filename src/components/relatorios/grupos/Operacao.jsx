import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { createPageUrl } from '@/utils';
import { tipoTratativaLabels } from '@/components/utils/helpers';
import { Cartao, Linha } from '@/components/ui/Cartao';
import ListaResumida from '@/components/ui/ListaResumida';
import { descreverPrazo } from '@/lib/prazoSla';
import { filaDeHoje, entradaESaida, porSemana, tempoPorCanal } from '@/lib/relatorios/operacao';
import { SERIE_GRAFICO } from '@/lib/cores-grafico';
import { ComoCalculamos, Pergunta, periodoPorExtenso } from '@/components/relatorios/hub/Pecas';

/**
 * Relatórios › Operação — como está a fila. Substitui o "Analytics
 * Preditivo" (contas em src/lib/relatorios/operacao.js).
 */
const um = (n) => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const horas = (h) => {
  if (h === null || h === undefined) return '—';
  if (h < 48) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)} dias`;
};
const pct = (v) => (v === null || v === undefined ? '—' : `${Math.round(v)}%`);
const semanaCurta = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export default function Operacao({ tratativas, periodo }) {
  const agora = useMemo(() => new Date(), []);
  const fila = useMemo(() => filaDeHoje(tratativas, agora), [tratativas, agora]);
  const es = useMemo(() => entradaESaida(tratativas, periodo, agora), [tratativas, periodo, agora]);
  const semanas = useMemo(() => porSemana(tratativas, periodo).map((s) => ({ ...s, rotulo: semanaCurta(s.semana) })), [tratativas, periodo]);
  const tempos = useMemo(() => tempoPorCanal(tratativas, periodo), [tratativas, periodo]);

  const frase = es.saldo > 0
    ? `Entraram ${es.saldo} tratativas a mais do que saíram: a fila cresceu.`
    : es.saldo < 0 ? `Saíram ${-es.saldo} tratativas a mais do que entraram: a fila diminuiu.` : 'Entraram e saíram as mesmas quantidades.';

  return (
    <div className="space-y-6">
      <Pergunta
        pergunta="Como está a fila hoje?"
        explicacao={`A fila deste momento, e o ritmo de entrada e saída ${periodoPorExtenso(periodo)}.`}
      />

      <div className="grid items-start gap-6 xl:grid-cols-5">
        <Cartao titulo="A fila agora" className="xl:col-span-2">
          <p className="text-4xl font-bold tracking-tight tabular-nums text-foreground">{fila.total}</p>
          <p className="text-sm text-muted-foreground">tratativas abertas</p>
          <div className="mt-4 divide-y divide-border border-t border-border">
            <Linha rotulo="Já vencidas" detalhe="o prazo do SLA já passou" valor={fila.vencidas} />
            <Linha rotulo="Vencem nas próximas 24 horas" valor={fila.vence24h} />
            <Linha rotulo="Dentro do prazo" valor={fila.noPrazo} />
            {fila.semPrazo > 0 && <Linha rotulo="Sem prazo definido" valor={fila.semPrazo} />}
          </div>
          <ComoCalculamos>
            <p>Tratativas que ainda não foram encerradas (as que aguardam os 7 dias de reabertura já contam como encerradas). O prazo é a data de registro mais as horas de SLA do tipo, em tempo corrido — a mesma régua da fila de cada agente.</p>
          </ComoCalculamos>
        </Cartao>

        <Cartao titulo="Com quem está a fila" className="xl:col-span-3">
          {fila.porAgente.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma tratativa aberta.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-2 text-left font-medium">Agente</th>
                  <th className="py-2 text-right font-medium">Abertas</th>
                  <th className="py-2 text-right font-medium">Vencidas</th>
                  <th className="py-2 text-right font-medium">Vencem em 24h</th>
                </tr>
              </thead>
              <tbody>
                {fila.porAgente.map((a) => (
                  <tr key={a.nome} className="h-10 border-b border-border last:border-0">
                    <td className="text-foreground">{a.nome}</td>
                    <td className="text-right tabular-nums">{a.abertas}</td>
                    <td className={`text-right tabular-nums ${a.vencidas ? 'font-semibold text-critical' : ''}`}>{a.vencidas}</td>
                    <td className="text-right tabular-nums">{a.vence24h}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <h3 className="mt-5 border-b border-border pb-1.5 text-xs font-medium text-muted-foreground">As que venceram há mais tempo</h3>
          <ListaResumida
            className="divide-y divide-border"
            limite={5}
            rotulo="vencidas"
            feminino
            itens={fila.itens.filter((i) => i.situacao === 'vencida')}
            renderItem={(i) => (
              <Link key={i.t.id} to={`${createPageUrl('Tratativas')}?aberta=${encodeURIComponent(i.t.id)}`} className="flex items-center justify-between gap-3 py-2 text-sm hover:bg-muted/50">
                <span className="min-w-0 truncate text-foreground">
                  <span className="font-semibold">{i.t.id_interno || 'Tratativa'}</span> · {i.t.nome_cliente || '—'}
                  <span className="block text-xs text-muted-foreground">{tipoTratativaLabels[i.t.tipo_tratativa] ?? i.t.tipo_tratativa} · {i.t.agente_responsavel_nome || 'sem agente'}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-critical">{descreverPrazo(i.prazo, agora)}</span>
              </Link>
            )}
          />
        </Cartao>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-5">
        <Cartao titulo="Entrada e saída no período" className="xl:col-span-2">
          <div className="divide-y divide-border">
            <Linha rotulo="Entraram" detalhe={`${um(es.entradaPorDia)} por dia`} valor={es.entraram} />
            <Linha rotulo="Saíram (encerradas)" detalhe={`${um(es.saidaPorDia)} por dia`} valor={es.sairam} />
          </div>
          <p className="mt-3 text-sm text-foreground">{frase}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {es.diasParaZerar === null
              ? 'Nenhuma tratativa encerrada no período: não dá para estimar quando a fila zera.'
              : `No ritmo de saída do período, as ${es.abertasAgora} abertas de hoje levariam cerca de ${Math.ceil(es.diasParaZerar)} dias para acabar, se nada novo entrasse.`}
          </p>
          <ComoCalculamos>
            <p><strong>Entraram:</strong> registradas no período. <strong>Saíram:</strong> encerradas no período. Os dois no mesmo período, contando os dias até hoje ({es.dias} dias).</p>
            <p><strong>Dias para zerar:</strong> abertas hoje ÷ encerradas por dia no período. É uma régua de ritmo, não uma previsão: na prática sempre entra coisa nova.</p>
          </ComoCalculamos>
        </Cartao>

        <Cartao titulo="Entrada e saída por semana" className="xl:col-span-3">
          {semanas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={semanas} margin={{ left: -20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="rotulo" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(r) => `Semana de ${r}`} />
                <Legend />
                <Bar dataKey="entraram" name="Entraram" fill={SERIE_GRAFICO[0]} />
                <Bar dataKey="sairam" name="Saíram" fill={SERIE_GRAFICO[1]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Cartao>
      </div>

      <Cartao titulo="Quanto tempo leva para encerrar, por canal">
        {tempos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tratativa encerrada no período.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2 text-left font-medium">Canal</th>
                <th className="py-2 text-right font-medium">Encerradas</th>
                <th className="py-2 text-right font-medium">No prazo</th>
                <th className="py-2 text-right font-medium">Caso típico</th>
                <th className="py-2 text-right font-medium">9 em cada 10 até</th>
              </tr>
            </thead>
            <tbody>
              {tempos.map((t) => (
                <tr key={t.tipo} className="h-10 border-b border-border last:border-0">
                  <td className="text-foreground">{tipoTratativaLabels[t.tipo] ?? t.tipo}</td>
                  <td className="text-right tabular-nums">{t.qtd}</td>
                  <td className="text-right tabular-nums">{pct(t.pctNoPrazo)}</td>
                  <td className="text-right tabular-nums">{horas(t.medianaHoras)}</td>
                  <td className="text-right tabular-nums">{horas(t.p90Horas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <ComoCalculamos>
          <p><strong>Tempo:</strong> do registro ao encerramento, descontando os períodos de SLA congelado — o mesmo tempo que decide se ficou no prazo.</p>
          <p><strong>Caso típico</strong> é a mediana: metade das tratativas encerrou mais rápido que isso, metade mais devagar. Usamos a mediana, e não a média, porque alguns casos que duram meses puxariam a média para cima.</p>
          <p><strong>9 em cada 10 até:</strong> 90% das tratativas encerraram dentro desse tempo.</p>
        </ComoCalculamos>
      </Cartao>
    </div>
  );
}
