import db from '@/api/db';
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Cartao, Linha } from '@/components/ui/Cartao';
import TabelaResumida from '@/components/ui/TabelaResumida';
import ListaResumida from '@/components/ui/ListaResumida';
import ExtratoPontos from '@/components/performance/ExtratoPontos';
import { formatDateSP, tipoTratativaLabels, situacaoReplicavel } from '@/components/utils/helpers';
import { posicaoNoRanking } from '@/lib/posicaoRanking';
import { ciclosEmOrdem, STATUS_ENCERRADOS } from '@/lib/bonusManual';
import { pessoasNoPeriodo } from '@/lib/relatorios/pessoas';
import { pontuacaoDoCiclo } from '@/lib/relatorios/pontuacao';
import { extratoDoAgente } from '@/lib/extratoPontos';
import { urlDaPessoa } from '@/components/dashboard/gestor/PainelCicloGestor';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Grafico from '@/components/relatorios/hub/Grafico';
import { SERIE_GRAFICO } from '@/lib/cores-grafico';
import { ComoCalculamos, Pergunta, periodoPorExtenso, baixarCSV } from '@/components/relatorios/hub/Pecas';

/**
 * Relatórios › Pessoas e premiação — três visões: o ranking do ciclo, o
 * relatório de pontuação (de onde vem cada ponto, regra por regra) e a
 * análise de um colaborador. As contas são as mesmas do ranking.
 */
const pts = (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const pct = (v) => (v === null || v === undefined ? '—' : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);
const nota = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }));
const VISOES = [
  { chave: 'ranking', rotulo: 'Ranking e equipe' },
  { chave: 'pontuacao', rotulo: 'Pontuação detalhada' },
  { chave: 'colaborador', rotulo: 'Análise por colaborador' },
];

export default function Pessoas({ tratativas, periodo, ciclos, colaboradores }) {
  const [visao, setVisao] = useState('ranking');
  const [cicloId, setCicloId] = useState('');
  const [pessoaId, setPessoaId] = useState('');

  const listaCiclos = useMemo(() => ciclosEmOrdem(ciclos), [ciclos]);
  useEffect(() => {
    if (!cicloId && listaCiclos.length) setCicloId((listaCiclos.find((c) => c.ativo) ?? listaCiclos[0]).id);
  }, [cicloId, listaCiclos]);
  const ciclo = listaCiclos.find((c) => c.id === cicloId) ?? null;

  const { data: apuracoes = [] } = useQuery({ queryKey: ['apuracoes-equipe'], queryFn: () => db.entities.Apuracao.list('-periodo_fim'), staleTime: 120000 });
  const { data: bonus = [] } = useQuery({ queryKey: ['bonus-manual'], queryFn: () => db.entities.Pontuacao.filter({ tipo: 'bonus_manual' }, '-created_date'), staleTime: 60000 });
  const { data: hanseis = [] } = useQuery({ queryKey: ['hansei-envios', "list('-data_envio')"], queryFn: () => db.entities.HanseiEnvio.list('-data_envio'), staleTime: 120000 });
  const { data: pdis = [] } = useQuery({ queryKey: ['pdis', "list('-created_date')"], queryFn: () => db.entities.PDI.list('-created_date'), staleTime: 120000 });
  const { data: observacoes = [] } = useQuery({ queryKey: ['observacoes', "list('-created_date')"], queryFn: () => db.entities.Observacao.list('-created_date'), staleTime: 120000 });

  const pontuacao = useMemo(
    () => pontuacaoDoCiclo({ tratativas, apuracoes, bonus, colaboradores, ciclo }),
    [tratativas, apuracoes, bonus, colaboradores, ciclo],
  );
  const noPeriodo = useMemo(() => pessoasNoPeriodo({ tratativas, apuracoes, colaboradores, periodo }), [tratativas, apuracoes, colaboradores, periodo]);
  const replicaveisPendentes = useMemo(
    () => tratativas.filter((t) => !t.excluida && STATUS_ENCERRADOS.includes(t.status) && situacaoReplicavel(t) === 'pendente').length,
    [tratativas],
  );
  const hanseiNaoLidos = hanseis.filter((h) => !h.visualizado).length;

  useEffect(() => { if (!pessoaId && pontuacao.pessoas.length) setPessoaId(pontuacao.pessoas[0].id); }, [pessoaId, pontuacao.pessoas]);
  const pessoa = pontuacao.pessoas.find((p) => p.id === pessoaId) ?? null;
  const daPessoaNoPeriodo = noPeriodo.find((p) => p.id === pessoaId) ?? null;

  const extrato = useMemo(() => (pessoa
    ? extratoDoAgente({ registro: pessoa, indicadores: pessoa.indicadores, lancamentos: pessoa.lancamentos, todas: tratativas })
    : null), [pessoa, tratativas]);

  const exportarPontuacao = () => baixarCSV(
    `pontuacao_${ciclo?.nome?.toLowerCase().replace(/\s+/g, '_') ?? 'ciclo'}.csv`,
    ['Agente', 'Tratativas encerradas', 'Pontos de encerramento', 'Aberturas', 'Pontos de abertura', 'Indicadores', 'Bônus', 'Total', 'A caminho'],
    pontuacao.pessoas.map((p) => [p.nome, p.itens.length, pts(p.pontosEncerramento), p.aberturas.length, pts(p.pontosAbertura), pts(p.pontosIndicadores), pts(p.pontosBonus), pts(p.total), pts(p.aCaminho.pontos)]),
  );

  const seletorCiclo = (
    <div className="space-y-1">
      <Label htmlFor="pes-ciclo" className="text-xs">Ciclo da premiação</Label>
      <Select value={cicloId} onValueChange={setCicloId}>
        <SelectTrigger id="pes-ciclo" className="w-56"><SelectValue placeholder="Escolha o ciclo" /></SelectTrigger>
        <SelectContent>{listaCiclos.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-6">
      <Pergunta
        pergunta="Como cada pessoa está?"
        explicacao={`O ranking oficial da premiação, de onde vem cada ponto e os números de cada agente ${periodoPorExtenso(periodo)}.`}
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Visão">
          {VISOES.map((v) => (
            <Button key={v.chave} size="sm" variant={v.chave === visao ? 'default' : 'outline'} onClick={() => setVisao(v.chave)}>{v.rotulo}</Button>
          ))}
        </div>
        {visao !== 'ranking' ? seletorCiclo : null}
      </div>

      {visao === 'ranking' && (
        <div className="grid items-start gap-6 xl:grid-cols-5">
          <Cartao titulo={ciclo ? `Ranking do ${ciclo.nome}` : 'Ranking da premiação'} className="xl:col-span-2" extra={seletorCiclo}>
            <div className="divide-y divide-border">
              {pontuacao.pessoas.map((p) => (
                <Link key={p.id} to={urlDaPessoa(p.id, ciclo?.id)} className="flex items-center justify-between gap-3 py-2 text-sm hover:bg-muted/50">
                  <span className="min-w-0 text-foreground">
                    <span className="mr-2 font-semibold tabular-nums">{posicaoNoRanking(pontuacao.pessoas.map((x) => ({ id: x.id, totalPontos: x.total })), p.id)?.posicao}º</span>
                    {p.nome}
                    <span className="block text-xs text-muted-foreground">
                      tratativas {pts(p.pontosEncerramento)} · abertas {pts(p.pontosAbertura)} · indicadores {pts(p.pontosIndicadores)} · bônus {pts(p.pontosBonus)}
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-foreground">{pts(p.total)}</span>
                </Link>
              ))}
            </div>
            <ComoCalculamos>
              <p>A mesma conta da tela inicial e do “Meu ciclo” de cada agente, pelas regras do POP 11: pontos das tratativas encerradas no ciclo, 0,5 por tratativa aberta, os indicadores e o bônus que você lança.</p>
            </ComoCalculamos>
          </Cartao>

          <div className="space-y-6 xl:col-span-3">
            <Cartao titulo="O que depende de você">
              <div className="divide-y divide-border">
                <Link to={createPageUrl('SolucoesReplicaveis')} className="block hover:bg-muted/50">
                  <Linha rotulo="Soluções replicáveis esperando aprovação" detalhe="o meio ponto só conta depois que você aprova" valor={replicaveisPendentes} />
                </Link>
                <Link to={createPageUrl('Hansei')} className="block hover:bg-muted/50">
                  <Linha rotulo="Hanseis enviados e ainda não lidos" valor={hanseiNaoLidos} />
                </Link>
              </div>
            </Cartao>

            <Cartao titulo="Cada pessoa no período">
              <TabelaResumida
                linhas={noPeriodo}
                chaveDaLinha={(p) => p.id}
                rotuloDetalhe="Ver os números da pessoa"
                colunas={[
                  { chave: 'nome', rotulo: 'Agente', alinhar: 'esquerda', principal: true, valor: (p) => p.nome },
                  { chave: 'enc', rotulo: 'Encerradas', principal: true, valor: (p) => p.encerradas },
                  { chave: 'prazo', rotulo: 'No prazo', principal: true, valor: (p) => pct(p.pctNoPrazo) },
                  { chave: 'csat', rotulo: 'CSAT', principal: true, valor: (p) => pct(p.indicadores.csat?.valor) },
                  { chave: 'perf', rotulo: 'Performance', principal: true, valor: (p) => pct(p.indicadores.performance?.valor) },
                  { chave: 'cx', rotulo: 'Avaliação CX', valor: (p) => nota(p.indicadores.cx?.valor) },
                  { chave: 'abertas', rotulo: 'Tratativas abertas por ela no período', valor: (p) => p.abertas },
                  { chave: 'reab', rotulo: 'Clientes que voltaram em 7 dias', valor: (p) => p.reaberturas },
                  { chave: 'rep', rotulo: 'Soluções replicáveis', valor: (p) => `${p.replicaveis.aprovadas} aprovadas · ${p.replicaveis.pendentes} pendentes · ${p.replicaveis.contestadas} contestadas` },
                ]}
              />
            </Cartao>
          </div>
        </div>
      )}

      {visao === 'pontuacao' && (
        <div className="space-y-6">
          <div className="grid items-start gap-6 xl:grid-cols-5">
            <Cartao titulo="Pontos da equipe por regra" className="xl:col-span-2" extra={<span className="text-xs text-muted-foreground">{pts(pontuacao.total)} no total</span>}>
              {pontuacao.regras.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum ponto neste ciclo.</p>
              ) : (
                <div className="divide-y divide-border">
                  {pontuacao.regras.map((r) => <Linha key={r.regra} rotulo={r.regra} detalhe={`${r.casos} ${r.casos === 1 ? 'vez' : 'vezes'}`} valor={pts(r.pontos)} />)}
                </div>
              )}
              <ComoCalculamos>
                <p>Cada regra do POP 11 somada em toda a equipe: encerramento no prazo, sem reabertura, solução replicável aprovada, notas do Reclame Aqui, Google, contestação, abertura de tratativa, indicadores e bônus.</p>
              </ComoCalculamos>
            </Cartao>

            <Cartao titulo="De onde vêm os pontos de cada pessoa" className="xl:col-span-3">
              <Grafico altura={Math.max(180, pontuacao.pessoas.filter((p) => p.total > 0).length * 46)} temDados={pontuacao.pessoas.some((p) => p.total > 0)}>
                <BarChart layout="vertical" data={pontuacao.pessoas.filter((p) => p.total > 0).map((p) => ({ ...p, curto: p.nome.split(' ')[0] }))} margin={{ left: 8, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="curto" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => pts(v)} />
                  <Legend />
                  <Bar dataKey="pontosEncerramento" name="Tratativas" stackId="p" fill={SERIE_GRAFICO[0]} />
                  <Bar dataKey="pontosAbertura" name="Aberturas" stackId="p" fill={SERIE_GRAFICO[1]} />
                  <Bar dataKey="pontosIndicadores" name="Indicadores" stackId="p" fill={SERIE_GRAFICO[2]} />
                  <Bar dataKey="pontosBonus" name="Bônus" stackId="p" fill={SERIE_GRAFICO[3]} />
                </BarChart>
              </Grafico>
            </Cartao>
          </div>

          <div className="grid items-start gap-6">
            <Cartao
              titulo="Pontuação de cada pessoa"
              extra={<Button variant="outline" size="sm" onClick={exportarPontuacao}><Download className="mr-1.5 h-4 w-4" aria-hidden="true" /> Exportar</Button>}
            >
              <TabelaResumida
                linhas={pontuacao.pessoas}
                chaveDaLinha={(p) => p.id}
                rotuloDetalhe="Ver regra por regra"
                colunas={[
                  { chave: 'nome', rotulo: 'Agente', alinhar: 'esquerda', principal: true, valor: (p) => p.nome },
                  { chave: 'trat', rotulo: 'Tratativas', principal: true, valor: (p) => pts(p.pontosEncerramento) },
                  { chave: 'abert', rotulo: 'Aberturas', principal: true, valor: (p) => pts(p.pontosAbertura) },
                  { chave: 'ind', rotulo: 'Indicadores', principal: true, valor: (p) => pts(p.pontosIndicadores) },
                  { chave: 'bonus', rotulo: 'Bônus', principal: true, valor: (p) => pts(p.pontosBonus) },
                  { chave: 'total', rotulo: 'Total', alinhar: 'direita', principal: true, valor: (p) => pts(p.total) },
                  { chave: 'regras', rotulo: 'Regra por regra', valor: (p) => p.porRegra.map((r) => `${r.regra}: ${pts(r.pontos)} (${r.casos})`).join(' · ') || '—' },
                  { chave: 'encerradas', rotulo: 'Tratativas que pontuaram', valor: (p) => `${p.itens.filter((i) => i.pontos > 0).length} de ${p.itens.length} encerradas` },
                  { chave: 'caminho', rotulo: 'Ainda pode entrar', valor: (p) => (p.aCaminho.pontos ? `${pts(p.aCaminho.pontos)} pts · ${p.aCaminho.replicaveis} replicáveis a aprovar · ${p.aCaminho.reaberturas} dentro dos 7 dias` : 'nada pendente') },
                ]}
              />
            </Cartao>
          </div>
        </div>
      )}

      {visao === 'colaborador' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="pes-pessoa" className="text-xs">Colaborador</Label>
              <Select value={pessoaId} onValueChange={setPessoaId}>
                <SelectTrigger id="pes-pessoa" className="w-64"><SelectValue placeholder="Escolha" /></SelectTrigger>
                <SelectContent>{pontuacao.pessoas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {pessoa && <Link to={urlDaPessoa(pessoa.id, ciclo?.id)} className="pb-2 text-sm font-medium text-primary hover:underline">Abrir a visão do ciclo dela</Link>}
          </div>

          {!pessoa ? (
            <Cartao><p className="text-sm text-muted-foreground">Escolha um colaborador.</p></Cartao>
          ) : (
            <div className="grid items-start gap-6 xl:grid-cols-5">
              <Cartao titulo={`Extrato de pontos · ${ciclo?.nome ?? 'ciclo'}`} className="xl:col-span-3">
                <ExtratoPontos extrato={extrato} />
              </Cartao>

              <div className="space-y-6 xl:col-span-2">
                <Cartao titulo="No período escolhido">
                  <div className="divide-y divide-border">
                    <Linha rotulo="Tratativas encerradas" valor={daPessoaNoPeriodo?.encerradas ?? 0} />
                    <Linha rotulo="Encerradas no prazo" valor={pct(daPessoaNoPeriodo?.pctNoPrazo)} />
                    <Linha rotulo="Tratativas abertas por ela" valor={daPessoaNoPeriodo?.abertas ?? 0} />
                    <Linha rotulo="Clientes que voltaram em 7 dias" valor={daPessoaNoPeriodo?.reaberturas ?? 0} />
                    <Linha rotulo="CSAT" detalhe="telefone e chat, no período" valor={pct(daPessoaNoPeriodo?.indicadores.csat?.valor)} />
                    <Linha rotulo="Performance" valor={pct(daPessoaNoPeriodo?.indicadores.performance?.valor)} />
                    <Linha rotulo="Avaliação CX" valor={nota(daPessoaNoPeriodo?.indicadores.cx?.valor)} />
                  </div>
                </Cartao>

                <Cartao titulo="Acompanhamento">
                  <div className="divide-y divide-border">
                    <Linha
                      rotulo="PDI em andamento"
                      detalhe={pdis.find((p) => p.colaborador_id === pessoa.id && p.status === 'em_andamento')?.titulo}
                      valor={pdis.find((p) => p.colaborador_id === pessoa.id && p.status === 'em_andamento') ? `${Math.round(pdis.find((p) => p.colaborador_id === pessoa.id && p.status === 'em_andamento').percentual_conclusao || 0)}%` : 'nenhum'}
                    />
                    <Linha
                      rotulo="Último Hansei"
                      detalhe={hanseis.find((h) => h.colaborador_id === pessoa.id)?.visualizado ? 'visualizado' : 'ainda não visualizado'}
                      valor={hanseis.find((h) => h.colaborador_id === pessoa.id) ? formatDateSP(hanseis.find((h) => h.colaborador_id === pessoa.id).data_envio, 'DD/MM/YYYY') : 'nenhum'}
                    />
                  </div>
                  <h3 className="mt-4 border-b border-border pb-1.5 text-xs font-medium text-muted-foreground">Feedbacks registrados</h3>
                  <ListaResumida
                    className="divide-y divide-border"
                    limite={4}
                    rotulo="feedbacks"
                    itens={observacoes.filter((o) => o.colaboradores_ids?.includes(pessoa.id))}
                    renderItem={(o) => (
                      <div key={o.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                        <span className="min-w-0 text-foreground">
                          <span className="line-clamp-1">{o.titulo || o.conteudo?.slice(0, 60)}</span>
                          <span className="block text-xs text-muted-foreground">{o.autor_nome}</span>
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">{formatDateSP(o.data_registro, 'DD/MM/YYYY')}</span>
                      </div>
                    )}
                  />
                </Cartao>

                <Cartao titulo="Canais que ela encerrou no ciclo">
                  <div className="divide-y divide-border">
                    {Object.entries(pessoa.itens.reduce((a, i) => ({ ...a, [i.tipo_tratativa]: (a[i.tipo_tratativa] || 0) + 1 }), {}))
                      .sort((a, b) => b[1] - a[1])
                      .map(([tipo, n]) => <Linha key={tipo} rotulo={tipoTratativaLabels[tipo] ?? tipo} valor={n} />)}
                    {pessoa.itens.length === 0 && <p className="py-2 text-sm text-muted-foreground">Nenhuma tratativa encerrada no ciclo.</p>}
                  </div>
                </Cartao>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
