import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { createPageUrl } from '@/utils';
import { tipoTratativaLabels } from '@/components/utils/helpers';
import { Button } from '@/components/ui/button';
import { Cartao, Linha } from '@/components/ui/Cartao';
import ListaResumida from '@/components/ui/ListaResumida';
import TabelaResumida from '@/components/ui/TabelaResumida';
import { descreverPrazo } from '@/lib/prazoSla';
import { filaDeHoje, entradaESaida, serie, tempoPorCanal, produtividade, idadeDaFila, avisosDaOperacao } from '@/lib/relatorios/operacao';
import { SERIE_GRAFICO, CORES_GRAFICO } from '@/lib/cores-grafico';
import { ComoCalculamos, Pergunta, periodoPorExtenso } from '@/components/relatorios/hub/Pecas';

/**
 * Relatórios › Operação — a fila, o ritmo de entrada e saída, a produtividade
 * da equipe e o tempo até encerrar. Substitui o "Analytics Preditivo", com as
 * mesmas perguntas que ele tentava responder (throughput, capacidade,
 * governança), mas com contas definidas — src/lib/relatorios/operacao.js.
 */
const um = (n) => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const dias = (d) => (d === null || d === undefined ? '—' : d < 1 ? 'menos de 1 dia' : `${Math.round(d)} dias`);
const horas = (h) => (h === null || h === undefined ? '—' : h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)} dias`);
const pct = (v) => (v === null || v === undefined ? '—' : `${Math.round(v)}%`);
const GRANULARIDADES = [{ chave: 'dia', rotulo: 'Por dia' }, { chave: 'semana', rotulo: 'Por semana' }, { chave: 'mes', rotulo: 'Por mês' }];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotuloDoPonto = (chave, g) => (g === 'mes' ? `${MESES[Number(chave.slice(5, 7)) - 1]}/${chave.slice(2, 4)}` : `${chave.slice(8, 10)}/${chave.slice(5, 7)}`);

export default function Operacao({ tratativas, periodo }) {
  const agora = useMemo(() => new Date(), []);
  const [granularidade, setGranularidade] = useState('semana');

  const fila = useMemo(() => filaDeHoje(tratativas, agora), [tratativas, agora]);
  const es = useMemo(() => entradaESaida(tratativas, periodo, agora), [tratativas, periodo, agora]);
  const pontos = useMemo(
    () => serie(tratativas, periodo, granularidade).map((p) => ({ ...p, rotulo: rotuloDoPonto(p.chave, granularidade) })),
    [tratativas, periodo, granularidade],
  );
  const tempos = useMemo(() => tempoPorCanal(tratativas, periodo), [tratativas, periodo]);
  const prod = useMemo(() => produtividade(tratativas, periodo, agora), [tratativas, periodo, agora]);
  const idade = useMemo(() => idadeDaFila(tratativas, agora), [tratativas, agora]);
  const avisos = useMemo(() => avisosDaOperacao({ fila, es, tempos: tempos.map((t) => ({ ...t, tipo: tipoTratativaLabels[t.tipo] ?? t.tipo })), produtividade: prod }), [fila, es, tempos, prod]);

  const frase = es.saldo > 0
    ? `Entraram ${es.saldo} tratativas a mais do que saíram: a fila cresceu.`
    : es.saldo < 0 ? `Saíram ${-es.saldo} tratativas a mais do que entraram: a fila diminuiu.` : 'Entraram e saíram as mesmas quantidades.';

  return (
    <div className="space-y-6">
      <Pergunta
        pergunta="Como está a fila hoje?"
        explicacao={`A fila deste momento, o ritmo de entrada e saída ${periodoPorExtenso(periodo)}, quem está encerrando o quê e quanto tempo cada canal leva.`}
      />

      {avisos.length > 0 && (
        <Cartao titulo="O que merece atenção">
          <div className="divide-y divide-border">
            {avisos.map((a) => (
              <div key={a.texto} className="flex items-start gap-3 py-2 text-sm">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.tom === 'critico' ? 'bg-critical' : 'bg-warning'}`} aria-hidden="true" />
                <span className="min-w-0 text-foreground">{a.texto}<span className="block text-xs text-muted-foreground">{a.acao}</span></span>
              </div>
            ))}
          </div>
        </Cartao>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-5">
        <Cartao titulo="A fila agora" className="xl:col-span-2">
          <p className="text-4xl font-bold tracking-tight tabular-nums text-foreground">{fila.total}</p>
          <p className="text-sm text-muted-foreground">tratativas abertas</p>
          <div className="mt-4 divide-y divide-border border-t border-border">
            <Linha rotulo="Já vencidas" detalhe="o prazo do SLA já passou" valor={fila.vencidas} />
            <Linha rotulo="Vencem nas próximas 24 horas" valor={fila.vence24h} />
            <Linha rotulo="Dentro do prazo" valor={fila.noPrazo} />
            {fila.semPrazo > 0 && <Linha rotulo="Sem prazo definido" valor={fila.semPrazo} />}
            <Linha rotulo="Esperando há (caso típico)" detalhe={`a mais antiga espera há ${dias(idade.maisAntigaDias)}`} valor={dias(idade.medianaDias)} />
          </div>
          <h3 className="mt-5 border-b border-border pb-1.5 text-xs font-medium text-muted-foreground">Há quanto tempo estão vencidas</h3>
          <div className="divide-y divide-border">
            <Linha rotulo="Até 1 dia de atraso" valor={idade.atraso.ate1} />
            <Linha rotulo="De 1 a 7 dias" valor={idade.atraso.de1a7} />
            <Linha rotulo="De 8 a 30 dias" valor={idade.atraso.de8a30} />
            <Linha rotulo="Mais de 30 dias" valor={idade.atraso.mais30} />
          </div>
          <ComoCalculamos>
            <p>Tratativas que ainda não foram encerradas (as que aguardam os 7 dias de reabertura já contam como encerradas). O prazo é a data de registro mais as horas de SLA do tipo, em tempo corrido — a mesma régua da fila de cada agente.</p>
            <p><strong>Esperando há</strong> é a mediana do tempo desde o registro: metade espera menos, metade espera mais.</p>
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
            <Linha rotulo="Saída por agente" detalhe={`${prod.length} agentes encerraram algo`} valor={`${um(prod.length ? es.sairam / prod.length / (es.dias || 1) : 0)} por dia`} />
          </div>
          <p className="mt-3 text-sm text-foreground">{frase}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {es.diasParaZerar === null
              ? 'Nenhuma tratativa encerrada no período: não dá para estimar quando a fila zera.'
              : `No ritmo de saída do período, as ${es.abertasAgora} abertas de hoje levariam cerca de ${Math.ceil(es.diasParaZerar)} dias para acabar, se nada novo entrasse.`}
          </p>
          <ComoCalculamos>
            <p><strong>Entraram:</strong> registradas no período. <strong>Saíram:</strong> encerradas no período. Os dois no mesmo período, contando os dias corridos até hoje ({es.dias} dias).</p>
            <p><strong>Saída por agente:</strong> encerradas ÷ agentes que encerraram algo ÷ dias. É o ritmo médio de quem está trabalhando na fila, não uma meta.</p>
            <p><strong>Dias para zerar:</strong> abertas hoje ÷ encerradas por dia. É uma régua de ritmo, não uma previsão: na prática sempre entra coisa nova.</p>
          </ComoCalculamos>
        </Cartao>

        <Cartao
          titulo="Entrada, saída e o tamanho da fila"
          className="xl:col-span-3"
          extra={(
            <div className="flex gap-1">
              {GRANULARIDADES.map((g) => (
                <Button key={g.chave} size="sm" variant={granularidade === g.chave ? 'default' : 'outline'} onClick={() => setGranularidade(g.chave)}>{g.rotulo}</Button>
              ))}
            </div>
          )}
        >
          {pontos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada no período.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={pontos} margin={{ left: -20, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="rotulo" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="entraram" name="Entraram" fill={SERIE_GRAFICO[0]} />
                <Bar dataKey="sairam" name="Saíram" fill={SERIE_GRAFICO[1]} />
                <Line type="monotone" dataKey="acumulado" name="Fila acumulada no período" stroke={CORES_GRAFICO.serie3 ?? SERIE_GRAFICO[2]} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
          <ComoCalculamos>
            <p>As barras são quantas entraram e quantas saíram em cada {granularidade === 'dia' ? 'dia' : granularidade === 'mes' ? 'mês' : 'semana'}. A linha é o saldo somado desde o começo do período: quando sobe, a fila está crescendo.</p>
          </ComoCalculamos>
        </Cartao>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Cartao titulo="Quem encerrou o quê no período">
          {prod.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma tratativa encerrada no período.</p>
          ) : (
            <TabelaResumida
              linhas={prod}
              chaveDaLinha={(a) => a.nome}
              rotuloDetalhe="Ver os canais do agente"
              colunas={[
                { chave: 'nome', rotulo: 'Agente', alinhar: 'esquerda', principal: true, valor: (a) => a.nome },
                { chave: 'enc', rotulo: 'Encerradas', principal: true, valor: (a) => a.encerradas },
                { chave: 'dia', rotulo: 'Por dia', principal: true, valor: (a) => um(a.porDia) },
                { chave: 'prazo', rotulo: 'No prazo', principal: true, valor: (a) => pct(a.pctNoPrazo) },
                { chave: 'aberto', rotulo: 'Abertas agora', principal: true, valor: (a) => a.abertasAgora },
                { chave: 'tempo', rotulo: 'Tempo típico até encerrar', valor: (a) => horas(a.medianaHoras) },
                { chave: 'canais', rotulo: 'Por canal', valor: (a) => Object.entries(a.porCanal).map(([c, n]) => `${tipoTratativaLabels[c] ?? c}: ${n}`).join(' · ') },
              ]}
            />
          )}
        </Cartao>

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

      <Cartao titulo="Governança: de onde vem cada número">
        <div className="grid gap-4 text-sm text-muted-foreground lg:grid-cols-2">
          <div className="space-y-2">
            <p><strong className="text-foreground">Fonte dos números.</strong> Tudo sai das tratativas registradas no Portal. Prazo e tempo de atendimento são calculados no servidor, no encerramento, e não podem ser alterados pelo navegador.</p>
            <p><strong className="text-foreground">O que fica de fora.</strong> Tratativas excluídas nunca entram em nenhuma conta.</p>
            <p><strong className="text-foreground">Datas.</strong> Tudo em horário de Brasília. “Entraram” conta pela data de registro; “saíram”, pela data de encerramento.</p>
          </div>
          <div className="space-y-2">
            <p><strong className="text-foreground">Rotina sugerida.</strong> Diário: as vencidas e as que vencem em 24h. Semanal: entrada × saída e quem está com a fila. Mensal: tempo por canal e produtividade. A cada ciclo: fechar a premiação com os relatórios de Pessoas.</p>
            <p><strong className="text-foreground">Quando um número não aparece.</strong> Aparece “—” quando não há dado no período; nunca um zero inventado.</p>
            <p><strong className="text-foreground">Conferência.</strong> As contas ficam em funções testadas (<span className="font-mono text-xs">npm run testar</span>), e o banco tem a mesma conta de pontos para auditoria.</p>
          </div>
        </div>
      </Cartao>
    </div>
  );
}
