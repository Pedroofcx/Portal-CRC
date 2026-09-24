import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatDateSP, tipoTratativaLabels } from '@/components/utils/helpers';
import { Button } from '@/components/ui/button';
import { Cartao, Linha } from '@/components/ui/Cartao';
import TabelaResumida from '@/components/ui/TabelaResumida';
import { resumoFinanceiro, financeiroPorMes, financeiroPorDimensao, EXPLICACAO_DO_GRUPO } from '@/lib/relatorios/financeiro';
import { Bar, Line, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Grafico from '@/components/relatorios/hub/Grafico';
import { SERIE_GRAFICO, CORES_GRAFICO } from '@/lib/cores-grafico';
import { ComoCalculamos, Pergunta, brl, periodoPorExtenso } from '@/components/relatorios/hub/Pecas';

/**
 * Relatórios › Financeiro — quanto custou e quanto recuperamos.
 * As contas moram em src/lib/relatorios/financeiro.js (testadas).
 */
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const mesCurto = (m) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`;
const DIMENSOES = [
  { chave: 'agente_responsavel_nome', rotulo: 'Por agente' },
  { chave: 'plano_cliente', rotulo: 'Por plano' },
  { chave: 'segmento_cliente', rotulo: 'Por segmento' },
  { chave: 'motivo_nome', rotulo: 'Por motivo' },
];

const linkDa = (t) => `${createPageUrl('TratativaDetalhe')}?id=${t.id}`;
const nomeDa = (t) => [t.id_interno, t.nome_cliente].filter(Boolean).join(' · ') || 'Tratativa';

export default function Financeiro({ tratativas, periodo, ehGestor }) {
  const [dimensao, setDimensao] = useState('agente_responsavel_nome');
  const r = useMemo(() => resumoFinanceiro(tratativas, periodo), [tratativas, periodo]);
  const meses = useMemo(() => financeiroPorMes(tratativas, periodo), [tratativas, periodo]);
  const porDimensao = useMemo(() => financeiroPorDimensao(tratativas, periodo, dimensao), [tratativas, periodo, dimensao]);
  const canais = Object.entries(r.custoPorCanal).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <Pergunta
        pergunta="Quanto custou e quanto recuperamos?"
        explicacao={`Dinheiro que saiu por causa das tratativas encerradas ${periodoPorExtenso(periodo)}: o que devolvemos ao cliente, o que perdemos nas contestações e o tempo da equipe. E o que conseguimos recuperar.`}
      />

      <div className="grid items-start gap-6 xl:grid-cols-5">
        <Cartao titulo="Resultado do período" className="xl:col-span-2">
          <div className="divide-y divide-border">
            <Linha rotulo="Devolvido ao cliente" detalhe={`${r.devolucoes.qtd} devoluções`} valor={brl(r.custou.devolvido)} />
            <Linha rotulo="Perdido em contestações" detalhe="sem acordo, sem contato, contestou, e a diferença dos acordos" valor={brl(r.custou.perdaContestacoes)} />
            {ehGestor && <Linha rotulo="Tempo da equipe (custo operacional)" detalhe="o oficial, dividido pela carga simultânea" valor={brl(r.custou.custoOperacional)} />}
            {r.custou.perdaReceita > 0 && <Linha rotulo="Perda de receita informada" detalhe="cancelamentos lançados pelo gestor" valor={brl(r.custou.perdaReceita)} />}
            <Linha rotulo="Total que custou" valor={brl(ehGestor ? r.custou.total : r.custou.total - r.custou.custoOperacional)} forte />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-success-soft px-3 py-2 text-sm">
            <span className="text-foreground">Recuperado em contestações</span>
            <span className="font-semibold tabular-nums text-foreground">{brl(r.recuperado)}</span>
          </div>
          <ComoCalculamos>
            <p><strong>Devolvido ao cliente:</strong> tratativas encerradas no período em que foi marcada devolução, com o valor informado no encerramento.</p>
            <p><strong>Contestações:</strong> cada desfecho entra de um jeito (veja o quadro de contestações). As que ainda estão em andamento ficam de fora até encerrar.</p>
            <p><strong>Tempo da equipe:</strong> o custo operacional calculado pelo servidor — horas em atendimento × custo da hora da pessoa (salário × 1,6 de encargos ÷ 220 h), dividido pelo número de tratativas que ela atendia ao mesmo tempo. É uma estimativa de ocupação, não um cronômetro.</p>
            <p><strong>Período:</strong> conta a data de encerramento, em horário de Brasília; tratativa aberta conta pela data de registro.</p>
          </ComoCalculamos>
        </Cartao>

        <Cartao titulo="Contestações por desfecho" className="xl:col-span-3" extra={<span className="text-xs text-muted-foreground">{r.contestacoes.qtd} no período</span>}>
          {r.contestacoes.desfechos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma contestação no período.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-2 text-left font-medium">Desfecho</th>
                  <th className="py-2 text-right font-medium">Casos</th>
                  <th className="py-2 text-right font-medium">Contestado</th>
                  <th className="py-2 text-right font-medium">Perdido</th>
                  <th className="py-2 text-right font-medium">Recuperado</th>
                </tr>
              </thead>
              <tbody>
                {r.contestacoes.desfechos.map((d) => (
                  <tr key={d.rotulo} className="border-b border-border last:border-0">
                    <td className="py-2 text-foreground">
                      {d.rotulo}
                      <span className="block text-xs text-muted-foreground">{EXPLICACAO_DO_GRUPO[d.grupo]}</span>
                    </td>
                    <td className="py-2 text-right tabular-nums">{d.qtd}</td>
                    <td className="py-2 text-right tabular-nums">{brl(d.contestado)}</td>
                    <td className="py-2 text-right tabular-nums">{['em_andamento', 'sem_desfecho'].includes(d.grupo) ? '—' : brl(d.perda)}</td>
                    <td className="py-2 text-right tabular-nums">{['em_andamento', 'sem_desfecho'].includes(d.grupo) ? '—' : brl(d.recuperado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <ComoCalculamos titulo="Como lemos cada desfecho">
            <p><strong>Perda</strong> — sem acordo, sem contato, e quando o cliente contestou (prazo de cancelamento ou pagamento em duplicidade): perdemos o valor contestado.</p>
            <p><strong>Acordo</strong> — perdemos só a diferença entre o valor inicial e o acordado; o acordado conta como recuperado.</p>
            <p><strong>Recuperado</strong> — o cliente pagou, ou cancelou a contestação: nada perdido.</p>
            <p><strong>Em andamento</strong> — ainda sem desfecho: aparece aqui, mas fica fora das somas até encerrar.</p>
          </ComoCalculamos>
        </Cartao>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-5">
        <Cartao titulo="Mês a mês" className="xl:col-span-2">
          <Grafico altura={200} temDados={meses.length > 1}>
            <ComposedChart data={meses.map((m) => ({ ...m, rotulo: mesCurto(m.mes) }))} margin={{ left: -8, right: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="rotulo" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip formatter={(v) => brl(v)} />
              <Legend />
              <Bar dataKey="devolvido" name="Devolvido" stackId="custo" fill={SERIE_GRAFICO[0]} />
              <Bar dataKey="perdaContestacoes" name="Contestações" stackId="custo" fill={SERIE_GRAFICO[1]} />
              {ehGestor && <Bar dataKey="custoOperacional" name="Tempo da equipe" stackId="custo" fill={SERIE_GRAFICO[2]} />}
              <Line type="monotone" dataKey="recuperado" name="Recuperado" stroke={CORES_GRAFICO.serie4 ?? SERIE_GRAFICO[3]} strokeWidth={2} dot={false} />
            </ComposedChart>
          </Grafico>
          {meses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada encerrado no período.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="py-2 text-left font-medium">Mês</th>
                  <th className="py-2 text-right font-medium">Casos</th>
                  <th className="py-2 text-right font-medium">Custou</th>
                  <th className="py-2 text-right font-medium">Recuperado</th>
                </tr>
              </thead>
              <tbody>
                {meses.map((m) => (
                  <tr key={m.mes} className="h-10 border-b border-border last:border-0">
                    <td className="text-foreground">{mesCurto(m.mes)}</td>
                    <td className="text-right tabular-nums">{m.casos}</td>
                    <td className="text-right tabular-nums">{brl(ehGestor ? m.total : m.total - m.custoOperacional)}</td>
                    <td className="text-right tabular-nums">{brl(m.recuperado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Cartao>

        <Cartao
          titulo="Onde o dinheiro foi"
          className="xl:col-span-3"
          extra={(
            <div className="flex flex-wrap gap-1">
              {DIMENSOES.map((d) => (
                <Button key={d.chave} size="sm" variant={dimensao === d.chave ? 'default' : 'outline'} onClick={() => setDimensao(d.chave)}>{d.rotulo}</Button>
              ))}
            </div>
          )}
        >
          {porDimensao.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada encerrado no período.</p>
          ) : (
            <TabelaResumida
              linhas={porDimensao.slice(0, 12)}
              chaveDaLinha={(d) => d.nome}
              rotuloDetalhe="Ver a composição"
              colunas={[
                { chave: 'nome', rotulo: DIMENSOES.find((d) => d.chave === dimensao)?.rotulo.replace('Por ', '') ?? '', alinhar: 'esquerda', principal: true, valor: (d) => d.nome },
                { chave: 'casos', rotulo: 'Casos', principal: true, valor: (d) => d.casos },
                { chave: 'total', rotulo: 'Custou', alinhar: 'direita', principal: true, valor: (d) => brl(ehGestor ? d.total : d.total - d.custoOperacional) },
                { chave: 'dev', rotulo: 'Devolvido ao cliente', valor: (d) => brl(d.devolvido) },
                { chave: 'perda', rotulo: 'Perdido em contestações', valor: (d) => brl(d.perda) },
                { chave: 'custo', rotulo: 'Tempo da equipe', valor: (d) => (ehGestor ? brl(d.custoOperacional) : '—') },
                { chave: 'rec', rotulo: 'Recuperado', valor: (d) => brl(d.recuperado) },
              ]}
            />
          )}
        </Cartao>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Cartao titulo="Devoluções ao cliente" extra={<span className="text-xs text-muted-foreground">{brl(r.devolucoes.total)}</span>}>
          {r.devolucoes.itens.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma devolução no período.</p>
          ) : (
            <TabelaResumida
              linhas={[...r.devolucoes.itens].sort((a, b) => b.valor - a.valor)}
              chaveDaLinha={(l) => l.t.id}
              rotuloDetalhe="Ver detalhes da devolução"
              colunas={[
                { chave: 'cliente', rotulo: 'Tratativa', alinhar: 'esquerda', principal: true, valor: (l) => <Link to={linkDa(l.t)} className="hover:underline" onClick={(e) => e.stopPropagation()}>{nomeDa(l.t)}</Link> },
                { chave: 'valor', rotulo: 'Valor', alinhar: 'direita', principal: true, valor: (l) => brl(l.valor) },
                { chave: 'canal', rotulo: 'Canal', valor: (l) => tipoTratativaLabels[l.t.tipo_tratativa] ?? l.t.tipo_tratativa },
                { chave: 'data', rotulo: 'Encerrada em', valor: (l) => formatDateSP(l.t.data_encerramento, 'DD/MM/YYYY') },
                { chave: 'agente', rotulo: 'Agente', valor: (l) => l.t.agente_responsavel_nome || '—' },
                { chave: 'motivo', rotulo: 'Motivo', valor: (l) => l.t.motivo_nome || '—' },
              ]}
            />
          )}
        </Cartao>

        <div className="space-y-6">
          {ehGestor && (
            <Cartao titulo="Tempo da equipe por canal">
              <div className="divide-y divide-border">
                {canais.length === 0
                  ? <p className="py-2 text-sm text-muted-foreground">Nenhuma tratativa encerrada no período.</p>
                  : canais.map(([tipo, v]) => <Linha key={tipo} rotulo={tipoTratativaLabels[tipo] ?? tipo} valor={brl(v)} />)}
              </div>
            </Cartao>
          )}

          <Cartao titulo="Casos de risco reputacional" extra={<span className="text-xs text-muted-foreground">contagem, sem valor em R$</span>}>
            <div className="divide-y divide-border">
              {r.risco.qtd === 0
                ? <p className="py-2 text-sm text-muted-foreground">Nenhum caso no período.</p>
                : Object.entries(r.risco.porMotivo).sort((a, b) => b[1] - a[1]).map(([motivo, n]) => <Linha key={motivo} rotulo={motivo} valor={n} />)}
            </div>
            <ComoCalculamos titulo="O que conta como caso de risco">
              <p>Tratativa encerrada no período em que a reputação pública ficou exposta: Reclame Aqui com nota abaixo de 7 (inclusive 0), cliente que não voltaria a fazer negócio, ou avaliação negativa no Google sem reavaliação, exclusão ou inativação.</p>
              <p>É só uma contagem. O valor em reais que o sistema antigo somava aqui (R$ 500, 300, 200 por caso) era inventado e saiu da conta em 22/09/2026.</p>
            </ComoCalculamos>
          </Cartao>
        </div>
      </div>
    </div>
  );
}
