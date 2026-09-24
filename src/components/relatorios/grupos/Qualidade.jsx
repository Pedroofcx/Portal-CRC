import db from '@/api/db';
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Cartao, Linha } from '@/components/ui/Cartao';
import TabelaResumida from '@/components/ui/TabelaResumida';
import { resumoQualidade } from '@/lib/relatorios/qualidade';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Grafico from '@/components/relatorios/hub/Grafico';
import { SERIE_GRAFICO } from '@/lib/cores-grafico';
import { ComoCalculamos, Pergunta, periodoPorExtenso } from '@/components/relatorios/hub/Pecas';

/**
 * Relatórios › Qualidade — como os clientes nos avaliam (CSAT, performance e
 * avaliação CX, da tela Apuração). Contas em src/lib/relatorios/qualidade.js.
 */
const pct = (v) => (v === null || v === undefined ? '—' : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);
const nota = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }));
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const mesCurto = (m) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`;

export default function Qualidade({ periodo, colaboradores }) {
  const { data: apuracoes = [], isLoading } = useQuery({
    queryKey: ['apuracoes-equipe'],
    queryFn: () => db.entities.Apuracao.list('-periodo_fim'),
    staleTime: 120000,
  });
  const q = useMemo(() => resumoQualidade({ apuracoes, colaboradores, periodo }), [apuracoes, colaboradores, periodo]);
  const semDados = !isLoading && q.equipe.volumes.ligacoes + q.equipe.volumes.chats === 0 && !q.pessoas.some((p) => p.cxAvaliacoes > 0);

  return (
    <div className="space-y-6">
      <Pergunta pergunta="Como os clientes nos avaliam?" explicacao={`CSAT, performance e avaliação de atendimento ${periodoPorExtenso(periodo)}, a partir das apurações importadas.`} />

      {semDados ? (
        <Cartao>
          <p className="text-sm text-foreground">Nenhuma apuração importada neste período.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Os números de CSAT, performance e avaliação vêm dos relatórios importados na tela{' '}
            <Link to={createPageUrl('Apuracao')} className="font-medium text-primary hover:underline">Apuração</Link>.
            Sem eles, estes indicadores também valem 0 na premiação.
          </p>
        </Cartao>
      ) : (
        <>
          <div className="grid items-start gap-6 xl:grid-cols-5">
            <Cartao titulo="A equipe no período" className="xl:col-span-2">
              <p className="text-4xl font-bold tracking-tight tabular-nums text-foreground">{pct(q.equipe.csat)}</p>
              <p className="text-sm text-muted-foreground">CSAT da equipe</p>
              <div className="mt-4 divide-y divide-border border-t border-border">
                <Linha rotulo="CSAT do telefone" detalhe={`${q.equipe.volumes.avaliadas} avaliações · ${pct(q.equipe.avaliadosTelefone)} das ligações atendidas`} valor={pct(q.equipe.csatTelefone)} />
                <Linha rotulo="CSAT do chat" detalhe={`${q.equipe.volumes.avaliados} avaliações · ${pct(q.equipe.avaliadosChat)} dos chats`} valor={pct(q.equipe.csatChat)} />
                <Linha rotulo="Performance" detalhe={`${q.equipe.volumes.atendidas} de ${q.equipe.volumes.ligacoes} ligações atendidas`} valor={pct(q.equipe.performance)} />
              </div>
              <ComoCalculamos>
                <p><strong>CSAT</strong> = (CSAT do telefone + CSAT do chat) ÷ 2. Cada canal junta todas as avaliações do período: avaliações positivas ÷ avaliações. Se um canal não teve nenhuma avaliação, vale só o outro.</p>
                <p><strong>Performance</strong> = ligações atendidas (não abandonadas) ÷ ligações recebidas.</p>
                <p><strong>A equipe</strong> soma as avaliações de todo mundo — quem atendeu mais pesa mais. Não é a média das pessoas (uma pessoa com 1 avaliação ruim puxaria a média tanto quanto outra com 30).</p>
                <p>Cada dia conta uma vez: se o mesmo dia foi importado duas vezes, vale a importação mais recente.</p>
              </ComoCalculamos>
            </Cartao>

            <Cartao titulo="Mês a mês" className="xl:col-span-3">
              <Grafico altura={220} temDados={q.meses.length > 1}>
                <LineChart data={q.meses.map((m) => ({ ...m, rotulo: mesCurto(m.mes) }))} margin={{ left: -18, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="rotulo" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip formatter={(v) => (v === null ? '—' : `${Number(v).toFixed(1)}%`)} />
                  <Legend />
                  <Line type="monotone" dataKey="csat" name="CSAT" stroke={SERIE_GRAFICO[0]} strokeWidth={2} connectNulls />
                  <Line type="monotone" dataKey="performance" name="Performance" stroke={SERIE_GRAFICO[1]} strokeWidth={2} connectNulls />
                </LineChart>
              </Grafico>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="py-2 text-left font-medium">Mês</th>
                    <th className="py-2 text-right font-medium">CSAT</th>
                    <th className="py-2 text-right font-medium">Telefone</th>
                    <th className="py-2 text-right font-medium">Chat</th>
                    <th className="py-2 text-right font-medium">Performance</th>
                  </tr>
                </thead>
                <tbody>
                  {q.meses.map((m) => (
                    <tr key={m.mes} className="h-10 border-b border-border last:border-0">
                      <td className="text-foreground">{mesCurto(m.mes)}</td>
                      <td className="text-right font-semibold tabular-nums">{pct(m.csat)}</td>
                      <td className="text-right tabular-nums">{pct(m.csatTelefone)}</td>
                      <td className="text-right tabular-nums">{pct(m.csatChat)}</td>
                      <td className="text-right tabular-nums">{pct(m.performance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-sm">
                <Link to={createPageUrl('RelatoriosApuracao')} className="font-medium text-primary hover:underline">Ver os números dia a dia</Link>
              </p>
            </Cartao>
          </div>

          <Cartao titulo="Cada pessoa no período">
            <TabelaResumida
              linhas={q.pessoas}
              chaveDaLinha={(p) => p.id}
              rotuloDetalhe="Ver os números da pessoa"
              colunas={[
                { chave: 'nome', rotulo: 'Agente', alinhar: 'esquerda', principal: true, valor: (p) => p.nome },
                { chave: 'csat', rotulo: 'CSAT', principal: true, valor: (p) => pct(p.csat) },
                { chave: 'perf', rotulo: 'Performance', principal: true, valor: (p) => pct(p.performance) },
                { chave: 'cx', rotulo: 'Avaliação CX', principal: true, valor: (p) => nota(p.cx) },
                { chave: 'tel', rotulo: 'CSAT do telefone', valor: (p) => `${pct(p.csatTelefone)} (${p.volumes.avaliadas} avaliações)` },
                { chave: 'chat', rotulo: 'CSAT do chat', valor: (p) => `${pct(p.csatChat)} (${p.volumes.avaliados} avaliações)` },
                { chave: 'lig', rotulo: 'Ligações atendidas', valor: (p) => `${p.volumes.atendidas} de ${p.volumes.ligacoes}` },
                { chave: 'chats', rotulo: 'Chats', valor: (p) => p.volumes.chats },
                { chave: 'pts', rotulo: 'Pontos pela faixa do POP 11', valor: (p) => `CSAT ${p.pontos.csat} · performance ${p.pontos.performance} · CX ${p.pontos.cx}` },
              ]}
            />
          </Cartao>
        </>
      )}
    </div>
  );
}
