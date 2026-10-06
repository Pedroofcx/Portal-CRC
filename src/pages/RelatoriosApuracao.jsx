import db from '@/api/db';
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AcessoRestrito from '@/components/ui/AcessoRestrito';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Cartao, Linha } from '@/components/ui/Cartao';
import TabelaResumida from '@/components/ui/TabelaResumida';
import { BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Grafico from '@/components/relatorios/hub/Grafico';
import { SERIE_GRAFICO } from '@/lib/cores-grafico';
import { ComoCalculamos, FiltroPeriodo, periodoPorExtenso } from '@/components/relatorios/hub/Pecas';
import { intervaloDoAtalho } from '@/lib/relatorios/periodo';
import { resumoQualidade, diaADiaQualidade } from '@/lib/relatorios/qualidade';
import { pontosDaFaixa, proximaFaixa } from '@/lib/faixasIndicadores';
import PreditivoApuracao from '@/components/relatorios/apuracao/PreditivoApuracao';
import { usePermissoes } from '@/hooks/usePermissoes';

/**
 * Análise da apuração — dia a dia e semana a semana, por trás do CSAT da
 * premiação. Reescrita em 24/09/2026 (Fase 2 do plano): a tela antiga
 * reimplementava sua própria conta de data/semana e tinha um filtro de canal
 * separado da aba visível (quem estivesse na aba Chat com o filtro em
 * "Telefone" via ver a tabela de chat vazia). Agora tudo usa a mesma conta
 * testada da premiação (`resumoQualidade` / `diaADiaQualidade`, em
 * src/lib/relatorios/qualidade.js) — nada de filtro próprio reinventado.
 */
const pct = (v) => (v === null || v === undefined ? '—' : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);
const nota = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }));
const dataCurta = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '—');
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotuloDoMes = (mes) => `${MESES[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`;
const diaSemanaCurto = (iso) => ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][new Date(`${iso}T00:00:00`).getDay()];

export default function RelatoriosApuracao() {
  const [periodo, setPeriodo] = useState(() => ({ chave: 'ultimos90', ...intervaloDoAtalho('ultimos90') }));
  const [filtroColaborador, setFiltroColaborador] = useState('todos');

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => db.auth.me() });
  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores', "list()"], queryFn: () => db.entities.Colaborador.list() });
  const { data: apuracoes = [], isLoading } = useQuery({
    queryKey: ['apuracoes-equipe'],
    queryFn: () => db.entities.Apuracao.list('-periodo_fim'),
  });

  const agentes = useMemo(() => colaboradores.filter((c) => c.papel === 'agente' && c.ativo !== false), [colaboradores]);
  const q = useMemo(() => resumoQualidade({ apuracoes, colaboradores, periodo }), [apuracoes, colaboradores, periodo]);
  const { temPermissao } = usePermissoes();
  const podeApurar = temPermissao('gerenciar_apuracao');
  const pessoa = filtroColaborador !== 'todos' ? q.pessoas.find((p) => p.id === filtroColaborador) : null;
  const drill = useMemo(
    () => (filtroColaborador !== 'todos' ? diaADiaQualidade({ apuracoes, colaboradorId: filtroColaborador, periodo }) : null),
    [apuracoes, filtroColaborador, periodo]
  );

  if (!user || isLoading) return <LoadingSpinner text="Carregando a análise..." />;

  if (!podeApurar) return <AcessoRestrito mensagem="A análise da apuração é feita pela gestão." />;

  const linhaComPontos = (chave, rotulo, valor, formato, detalheExtra) => {
    if (valor === null || valor === undefined) return <Linha key={chave} rotulo={rotulo} valor="—" />;
    const prox = proximaFaixa(chave, valor);
    const detalhe = [detalheExtra, prox ? `${formato(prox.limiar)} vale +${prox.ganho} ponto(s)` : 'já na faixa máxima'].filter(Boolean).join(' · ');
    return <Linha key={chave} rotulo={rotulo} detalhe={detalhe} valor={`${formato(valor)} · ${pontosDaFaixa(chave, valor)} pts`} forte />;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Análise da apuração" subtitle="Dia a dia e semana a semana, para achar o que puxou o mês" icon={BarChart3} />

      <Cartao>
        <div className="flex flex-wrap items-end gap-3">
          <FiltroPeriodo valor={periodo} onChange={setPeriodo} />
          <div className="space-y-1">
            <Label htmlFor="rel-apuracao-agente" className="text-xs">Agente</Label>
            <Select value={filtroColaborador} onValueChange={setFiltroColaborador}>
              <SelectTrigger id="rel-apuracao-agente" className="w-56 max-w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos — visão da equipe</SelectItem>
                {agentes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Cartao>

      {filtroColaborador === 'todos' ? (
        <VisaoEquipe q={q} periodo={periodo} />
      ) : (
        <VisaoPessoa pessoa={pessoa} drill={drill} periodo={periodo} linhaComPontos={linhaComPontos} equipeMeses={q.meses} />
      )}

      <PreditivoApuracao apuracoes={apuracoes} colaboradores={colaboradores} />
    </div>
  );
}

/** Linhas do mês a mês de UMA pessoa, com o CSAT da equipe ao lado para comparar. */
function GraficoMesAMesPessoa({ pessoa, equipeMeses }) {
  const equipePorMes = new Map(equipeMeses.map((m) => [m.mes, m.csat]));
  const dados = pessoa.meses.map((m) => ({ rotulo: rotuloDoMes(m.mes), csat: m.csat, performance: m.performance, equipe: equipePorMes.get(m.mes) ?? null }));
  return (
    <Cartao titulo={`Mês a mês · ${pessoa.nome}`}>
      <Grafico altura={220} temDados={dados.length > 1} vazio="Só há um mês com apuração neste período: não dá para traçar a linha.">
        <LineChart data={dados} margin={{ left: -18, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="rotulo" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
          <Tooltip formatter={(v) => (v === null ? '—' : `${Number(v).toFixed(1)}%`)} />
          <Legend />
          <Line type="monotone" dataKey="csat" name="CSAT" stroke={SERIE_GRAFICO[0]} strokeWidth={2} connectNulls />
          <Line type="monotone" dataKey="performance" name="Performance" stroke={SERIE_GRAFICO[1]} strokeWidth={2} connectNulls />
          <Line type="monotone" dataKey="equipe" name="CSAT da equipe" stroke={SERIE_GRAFICO[2]} strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls />
        </LineChart>
      </Grafico>
    </Cartao>
  );
}

const MAX_AGENTES_NO_GRAFICO = SERIE_GRAFICO.length;

/** Compara agentes mês a mês: uma linha por agente (até 5, as cores da paleta). */
function ComparacaoDeAgentes({ q }) {
  const [metrica, setMetrica] = useState('csat');
  const [escolhidos, setEscolhidos] = useState(() => q.pessoas.slice(0, 3).map((p) => p.id));
  const marcados = q.pessoas.filter((p) => escolhidos.includes(p.id));

  const alternar = (id) => setEscolhidos((atual) => {
    if (atual.includes(id)) return atual.filter((x) => x !== id);
    return atual.length >= MAX_AGENTES_NO_GRAFICO ? atual : [...atual, id];
  });

  const dados = q.meses.map((m) => {
    const linha = { rotulo: rotuloDoMes(m.mes) };
    for (const p of marcados) linha[p.id] = p.meses.find((x) => x.mes === m.mes)?.[metrica] ?? null;
    return linha;
  });

  return (
    <Cartao titulo="Agentes mês a mês">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex gap-2" role="group" aria-label="Indicador">
          {[['csat', 'CSAT'], ['performance', 'Performance']].map(([chave, rotulo]) => (
            <button
              key={chave}
              type="button"
              onClick={() => setMetrica(chave)}
              aria-pressed={metrica === chave}
              className={`rounded-md border px-3 py-1 text-sm ${metrica === chave ? 'border-primary bg-info-soft font-medium text-primary' : 'border-border text-foreground hover:bg-muted'}`}
            >
              {rotulo}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">Escolha até {MAX_AGENTES_NO_GRAFICO} agentes</span>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {q.pessoas.map((p) => {
          const marcado = escolhidos.includes(p.id);
          const cheio = !marcado && escolhidos.length >= MAX_AGENTES_NO_GRAFICO;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => alternar(p.id)}
              aria-pressed={marcado}
              disabled={cheio}
              className={`rounded-full border px-3 py-1 text-xs ${marcado ? 'border-primary bg-info-soft font-medium text-primary' : 'border-border text-foreground hover:bg-muted'} ${cheio ? 'opacity-50' : ''}`}
            >
              {p.nome}
            </button>
          );
        })}
      </div>
      <Grafico altura={260} temDados={dados.length > 1 && marcados.length > 0} vazio={marcados.length === 0 ? 'Escolha ao menos um agente.' : 'Só há um mês com apuração neste período: não dá para traçar a linha.'}>
        <LineChart data={dados} margin={{ left: -18, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="rotulo" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
          <Tooltip formatter={(v) => (v === null ? '—' : `${Number(v).toFixed(1)}%`)} />
          <Legend />
          {marcados.map((p, i) => (
            <Line key={p.id} type="monotone" dataKey={p.id} name={p.nome} stroke={SERIE_GRAFICO[i % SERIE_GRAFICO.length]} strokeWidth={2} connectNulls />
          ))}
        </LineChart>
      </Grafico>
    </Cartao>
  );
}

function VisaoEquipe({ q, periodo }) {
  const semDados = q.equipe.volumes.ligacoes + q.equipe.volumes.chats === 0 && !q.pessoas.some((p) => p.cxAvaliacoes > 0);
  if (semDados) {
    return (
      <Cartao>
        <p className="text-sm text-foreground">Nenhuma apuração importada {periodoPorExtenso(periodo)}.</p>
        <p className="mt-1 text-sm text-muted-foreground">Importe um arquivo na aba Importar, ou escolha outro período acima.</p>
      </Cartao>
    );
  }

  return (
    <>
      <div className="grid items-start gap-6 xl:grid-cols-5">
        <Cartao titulo="A equipe no período" className="xl:col-span-2">
          <p className="text-4xl font-bold tracking-tight tabular-nums text-foreground">{pct(q.equipe.csat)}</p>
          <p className="text-sm text-muted-foreground">CSAT da equipe</p>
          <div className="mt-4 divide-y divide-border border-t border-border">
            <Linha rotulo="CSAT do telefone" detalhe={`${q.equipe.volumes.avaliadas} avaliações`} valor={pct(q.equipe.csatTelefone)} />
            <Linha rotulo="CSAT do chat" detalhe={`${q.equipe.volumes.avaliados} avaliações`} valor={pct(q.equipe.csatChat)} />
            <Linha rotulo="Performance" detalhe={`${q.equipe.volumes.atendidas} de ${q.equipe.volumes.ligacoes} ligações`} valor={pct(q.equipe.performance)} />
          </div>
          <ComoCalculamos>
            <p><strong>CSAT</strong> = (CSAT do telefone + CSAT do chat) ÷ 2. Cada canal soma todas as avaliações do período: positivas ÷ (positivas + negativas). Canal sem nenhuma avaliação fica fora da média.</p>
            <p>Selecione um agente acima para ver o dia a dia e a semana a semana da pessoa.</p>
          </ComoCalculamos>
        </Cartao>

        <Cartao titulo="Mês a mês" className="xl:col-span-3">
          <Grafico altura={220} temDados={q.meses.length > 1}>
            <LineChart data={q.meses.map((m) => ({ ...m, rotulo: rotuloDoMes(m.mes) }))} margin={{ left: -18, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="rotulo" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v) => (v === null ? '—' : `${Number(v).toFixed(1)}%`)} />
              <Legend />
              <Line type="monotone" dataKey="csat" name="CSAT" stroke={SERIE_GRAFICO[0]} strokeWidth={2} connectNulls />
              <Line type="monotone" dataKey="performance" name="Performance" stroke={SERIE_GRAFICO[1]} strokeWidth={2} connectNulls />
            </LineChart>
          </Grafico>
        </Cartao>
      </div>

      <ComparacaoDeAgentes q={q} />

      <Cartao titulo="Cada pessoa no período">
        <TabelaResumida
          linhas={q.pessoas}
          chaveDaLinha={(p) => p.id}
          colunas={[
            { chave: 'nome', rotulo: 'Agente', alinhar: 'esquerda', principal: true, valor: (p) => p.nome },
            { chave: 'csat', rotulo: 'CSAT', principal: true, valor: (p) => pct(p.csat) },
            { chave: 'perf', rotulo: 'Performance', principal: true, valor: (p) => pct(p.performance) },
            { chave: 'cx', rotulo: 'Avaliação CX', principal: true, valor: (p) => nota(p.cx) },
            { chave: 'tel', rotulo: 'CSAT do telefone', valor: (p) => `${pct(p.csatTelefone)} (${p.volumes.avaliadas} avaliações)` },
            { chave: 'chat', rotulo: 'CSAT do chat', valor: (p) => `${pct(p.csatChat)} (${p.volumes.avaliados} avaliações)` },
            { chave: 'lig', rotulo: 'Ligações atendidas', valor: (p) => `${p.volumes.atendidas} de ${p.volumes.ligacoes}` },
            { chave: 'pts', rotulo: 'Pontos pela faixa', valor: (p) => `CSAT ${p.pontos.csat} · performance ${p.pontos.performance} · CX ${p.pontos.cx}` },
          ]}
        />
      </Cartao>
    </>
  );
}

function VisaoPessoa({ pessoa, drill, periodo, linhaComPontos, equipeMeses }) {
  if (!pessoa) {
    return (
      <Cartao>
        <p className="text-sm text-foreground">Sem apuração desta pessoa {periodoPorExtenso(periodo)}.</p>
      </Cartao>
    );
  }

  const { dias, semanas } = drill;
  const semanaRuim = semanas.length > 1 ? [...semanas].sort((a, b) => (a.csatTelefone ?? 101) - (b.csatTelefone ?? 101))[0] : null;

  return (
    <>
      <Cartao titulo={pessoa.nome}>
        <div className="divide-y divide-border border-t border-border">
          {linhaComPontos('csat', 'CSAT', pessoa.csat, pct)}
          {linhaComPontos('performance', 'Performance', pessoa.performance, pct, `${pessoa.volumes.atendidas} de ${pessoa.volumes.ligacoes} ligações`)}
          {linhaComPontos('cx', 'Avaliação CX', pessoa.cx, nota, `${pessoa.cxAvaliacoes} avaliação(ões)`)}
        </div>
        {semanaRuim && (
          <p className="mt-3 border-t border-border pt-3 text-sm text-muted-foreground">
            Semana mais fraca do período: <span className="font-medium text-foreground">{dataCurta(semanaRuim.inicio)} a {dataCurta(semanaRuim.fim)}</span>, CSAT do telefone {pct(semanaRuim.csatTelefone)}.
          </p>
        )}
      </Cartao>

      <GraficoMesAMesPessoa pessoa={pessoa} equipeMeses={equipeMeses} />

      <Cartao titulo="Semana a semana (seg → sex)">
        {semanas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum dia apurado {periodoPorExtenso(periodo)}.</p>
        ) : (
          <TabelaResumida
            linhas={semanas}
            chaveDaLinha={(s) => s.inicio}
            colunas={[
              { chave: 'semana', rotulo: 'Semana', alinhar: 'esquerda', principal: true, valor: (s) => <span className="whitespace-nowrap">{dataCurta(s.inicio)} – {dataCurta(s.fim)}</span> },
              { chave: 'csatTel', rotulo: 'CSAT tel.', principal: true, valor: (s) => pct(s.csatTelefone) },
              { chave: 'csatChat', rotulo: 'CSAT chat', principal: true, valor: (s) => pct(s.csatChat) },
              { chave: 'perf', rotulo: 'Performance', principal: true, valor: (s) => pct(s.performance) },
              { chave: 'lig', rotulo: 'Ligações atendidas', valor: (s) => `${s.volumes.atendidas} de ${s.volumes.ligacoes}` },
              { chave: 'chats', rotulo: 'Chats', valor: (s) => s.volumes.chats },
            ]}
          />
        )}
      </Cartao>

      <Cartao titulo="Dia a dia">
        {dias.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum dia apurado {periodoPorExtenso(periodo)}.</p>
        ) : (
          <TabelaResumida
            linhas={[...dias].reverse()}
            chaveDaLinha={(d) => d.dia}
            limite={14}
            rotulo="dias"
            colunas={[
              { chave: 'dia', rotulo: 'Dia', alinhar: 'esquerda', principal: true, valor: (d) => <span className="whitespace-nowrap">{dataCurta(d.dia)} <span className="text-xs text-muted-foreground">{diaSemanaCurto(d.dia)}</span></span> },
              { chave: 'csatTel', rotulo: 'CSAT tel.', principal: true, valor: (d) => pct(d.csatTelefone) },
              { chave: 'csatChat', rotulo: 'CSAT chat', principal: true, valor: (d) => pct(d.csatChat) },
              { chave: 'perf', rotulo: 'Performance', principal: true, valor: (d) => pct(d.performance) },
              { chave: 'lig', rotulo: 'Ligações', valor: (d) => d.telefone?.total_ligacoes ?? 0 },
              { chave: 'avalTel', rotulo: 'Avaliadas (tel.)', valor: (d) => d.telefone?.total_avaliadas ?? 0 },
              { chave: 'chats', rotulo: 'Chats', valor: (d) => d.chat?.total_chats ?? 0 },
              { chave: 'avalChat', rotulo: 'Avaliados (chat)', valor: (d) => d.chat?.total_avaliados ?? 0 },
            ]}
          />
        )}
      </Cartao>
    </>
  );
}
