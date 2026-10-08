import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import db from '@/api/db';
import { tipoTratativaLabels } from '@/components/utils/helpers';
import { useRankingCiclo, posicaoNoRanking } from '@/hooks/useRankingCiclo';
import { pontosDaFaixa, proximaFaixa } from '@/lib/faixasIndicadores';
import { avaliarExigencia } from '@/lib/elegibilidade';
import { cicloExigeVolumeMinimo } from '@/lib/pontuacaoCiclo';
import { indicadoresDoCiclo, detalheCsat } from '@/lib/indicadoresCiclo';
import { pontosPorSemana, fimDoRitmo } from '@/lib/ritmoSemanal';
import IconeExigencia from '@/components/ciclo/IconeExigencia';
import { registrosNoCiclo } from '@/lib/cicloEquipe';

/**
 * "Meu ciclo" — o painel de pontuação da tela inicial do operador.
 *
 * A premiação é um RANKING e a pontuação não tem teto (Estrutura de Trabalho
 * CRC 2026). Então não há "quanto falta para a meta". O que dá direção:
 *   - o RITMO: pontos por semana, e quanto entrou nesta;
 *   - a POSIÇÃO: em que lugar ela está, e a quantos pontos do de cima
 *     (só se o gestor deixar o ranking visível para os agentes);
 *   - a PRÓXIMA FAIXA de cada indicador: "CSAT 92% · 95% vale +1" é um alvo
 *     concreto e alcançável, mesmo sem teto no total.
 *
 * Tudo vem do que o gestor configura: o ciclo ativo, o bônus manual, as
 * exigências de elegibilidade e a visibilidade do ranking.
 */

const CANAIS = ['reclame_aqui', 'reclamacao_interna', 'google_meu_negocio', 'contestacao'];
const canalDe = (tipo) => (tipo === 'contestacao_compra' ? 'contestacao' : tipo);
const DIA = 24 * 3600 * 1000;

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR', {
  minimumFractionDigits: Number(n) % 1 ? 1 : 0,
  maximumFractionDigits: 1,
});
const dataCurta = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '—');

function Grupo({ titulo, children }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function Linha({ rotulo, detalhe, valor }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="min-w-0 text-foreground">
        {rotulo}
        {detalhe && <span className="ml-1.5 text-xs text-muted-foreground">{detalhe}</span>}
      </span>
      <span className="shrink-0 font-semibold tabular-nums text-foreground">{valor}</span>
    </div>
  );
}

export default function PainelMeuCiclo({
  colaborador,
  cicloAtivo,
  totalPontos,
  detalhamentoPontos = [],
  bonusManual = 0,
  retidos = {},
  minhasTratativas = [],
  exigencias = [],
  rankingVisivel = true,
}) {
  const agora = useMemo(() => new Date(), []);

  // Todas as apurações (a mesma busca do ranking): o ciclo inteiro, não os
  // últimos meses.
  const { data: apuracoes = [] } = useQuery({
    queryKey: ['apuracoes-equipe'],
    queryFn: () => db.entities.Apuracao.list('-periodo_fim'),
    enabled: Boolean(colaborador?.id),
    staleTime: 120000,
    refetchOnWindowFocus: false,
  });

  const { ranking } = useRankingCiclo();
  const posicao = rankingVisivel ? posicaoNoRanking(ranking, colaborador?.id) : null;

  const semanas = useMemo(
    () => pontosPorSemana(detalhamentoPontos, fimDoRitmo(cicloAtivo, agora), 6),
    [detalhamentoPontos, cicloAtivo, agora],
  );
  const maiorSemana = Math.max(1, ...semanas.map((s) => s.pontos));
  const estaSemana = semanas[semanas.length - 1]?.pontos ?? 0;

  const porCanal = useMemo(() => {
    const soma = Object.fromEntries(CANAIS.map((c) => [c, 0]));
    detalhamentoPontos.forEach((d) => {
      if (d.abertura) return; // aberturas têm linha própria
      const canal = canalDe(d.tipo_tratativa);
      if (canal in soma) soma[canal] += Number(d.pontos) || 0;
    });
    return soma;
  }, [detalhamentoPontos]);
  const aberturas = useMemo(() => detalhamentoPontos.filter((d) => d.abertura).length, [detalhamentoPontos]);

  const indicadores = useMemo(
    () => indicadoresDoCiclo(apuracoes.filter((a) => a.colaborador_id === colaborador?.id), cicloAtivo),
    [apuracoes, colaborador?.id, cicloAtivo],
  );

  // Registros por canal no ciclo: conta pelo REGISTRO (data_registro) — a
  // mesma conta da página do gestor (src/lib/cicloEquipe.js).
  const volume = useMemo(() => registrosNoCiclo(minhasTratativas, cicloAtivo), [minhasTratativas, cicloAtivo]);

  const contexto = {
    csat: indicadores.csat?.valor,
    performance: indicadores.performance?.valor,
    cx: indicadores.cx?.valor,
    volume,
    totalTratativas: Object.values(volume).reduce((a, n) => a + n, 0),
  };
  const volumeMinimo = Number(exigencias.find((e) => e.tipo_validacao === 'volume_minimo_canal')?.volume_minimo_canal ?? 4);

  if (!cicloAtivo) {
    return (
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Meu ciclo</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Nenhum ciclo de premiação está ativo. Assim que o gestor abrir o próximo, a sua pontuação aparece aqui.
        </p>
      </section>
    );
  }

  const fimDoCiclo = new Date(`${cicloAtivo.data_fim}T23:59:59`);
  const encerrado = fimDoCiclo < agora;
  const diasParaFechar = Math.ceil((fimDoCiclo - agora) / DIA);

  const linhaIndicador = (chave, rotulo, dado, formato) => {
    if (!dado) return <Linha key={chave} rotulo={rotulo} detalhe="aguardando apuração" valor="—" />;
    const prox = proximaFaixa(chave, dado.valor);
    const detalhe = [
      formato(dado.valor),
      chave === 'csat' ? detalheCsat(dado) : null,
      prox ? `${formato(prox.limiar)} vale +${prox.ganho}` : 'faixa máxima',
    ].filter(Boolean).join(' · ');
    return <Linha key={chave} rotulo={rotulo} detalhe={detalhe} valor={pontosDaFaixa(chave, dado.valor)} />;
  };
  const pct = (v) => `${fmt(v)}%`;
  const nota = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

  return (
    <section className="grid gap-6 rounded-xl border border-border bg-card p-5 lg:grid-cols-[1fr_1.3fr_1fr]">
      {/* 1. Pontos, ritmo e posição */}
      <div>
        <p className="text-sm text-muted-foreground">
          {cicloAtivo.nome} · {dataCurta(cicloAtivo.data_inicio)} a {dataCurta(cicloAtivo.data_fim)}
        </p>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="text-5xl font-bold tracking-tight tabular-nums text-foreground">{fmt(totalPontos)}</span>
          <span className="text-muted-foreground">pontos</span>
        </p>

        <div className="mt-4 flex h-14 items-end gap-1.5" aria-label="Pontos por semana nas últimas 6 semanas">
          {semanas.map((s, i) => (
            <span
              key={s.inicio.toISOString()}
              title={`Semana de ${s.inicio.toLocaleDateString('pt-BR')}: ${fmt(s.pontos)} pts`}
              className={`flex-1 rounded-t ${i === semanas.length - 1 ? 'bg-primary' : 'bg-primary/20'}`}
              style={{ height: `${Math.max(6, (s.pontos / maiorSemana) * 100)}%` }}
            />
          ))}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          <span className={`font-semibold ${estaSemana > 0 ? 'text-success' : 'text-muted-foreground'}`}>
            +{fmt(estaSemana)} {fimDoRitmo(cicloAtivo, agora) < agora ? 'na última semana' : 'esta semana'}
          </span>
          {' · '}
          {encerrado
            ? `o ciclo terminou em ${dataCurta(cicloAtivo.data_fim)}`
            : `o ciclo fecha em ${diasParaFechar} dia${diasParaFechar === 1 ? '' : 's'}`}
        </p>

        {posicao && (
          <div className="mt-4 flex items-center gap-3 rounded-lg bg-muted px-3 py-2.5">
            <span className="text-2xl font-bold tabular-nums text-foreground">{posicao.posicao}º</span>
            <span className="text-sm">
              <span className="block font-medium text-foreground">no ranking da equipe</span>
              <span className="block text-muted-foreground">
                {posicao.posicaoAcima
                  ? `${fmt(posicao.distancia)} pts do ${posicao.posicaoAcima}º lugar`
                  : 'na liderança do ciclo'}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* 2. De onde vieram */}
      <div className="space-y-4">
        <Grupo titulo="De onde vieram — tratativas">
          {CANAIS.map((c) => (
            <Linha
              key={c}
              rotulo={tipoTratativaLabels[c]}
              detalhe={retidos[c]?.pontos > 0 ? `${fmt(retidos[c].pontos)} pts retidos: só ${retidos[c].registros} de ${volumeMinimo} registros` : null}
              valor={fmt(porCanal[c])}
            />
          ))}
          {aberturas > 0 && <Linha rotulo="Tratativas abertas" detalhe={`${aberturas} × 0,5`} valor={fmt(aberturas * 0.5)} />}
          {bonusManual > 0 && <Linha rotulo="Bônus lançado pelo gestor" valor={fmt(bonusManual)} />}
        </Grupo>
        <Grupo titulo="Indicadores do ciclo — valem até 10 cada">
          {linhaIndicador('csat', 'CSAT', indicadores.csat, pct)}
          {linhaIndicador('performance', 'Performance', indicadores.performance, pct)}
          {linhaIndicador('cx', 'Avaliação CX', indicadores.cx, nota)}
        </Grupo>
      </div>

      {/* 3. Elegibilidade */}
      <div>
        <h3 className="text-sm font-semibold text-foreground">Elegibilidade do ciclo</h3>
        {exigencias.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Nenhuma exigência cadastrada.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {exigencias.map((e) => {
              const r = avaliarExigencia(e, contexto);
              return (
                <li key={e.id} className="flex items-start gap-2 text-sm">
                  <IconeExigencia status={r.status} className="mt-0.5 h-4 w-4" />
                  <span>
                    <span className="block text-foreground">{e.nome_exigencia}</span>
                    <span className="block text-xs text-muted-foreground">{r.detalhe}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Registros por canal · mínimo {volumeMinimo}
        </p>
        {cicloExigeVolumeMinimo(cicloAtivo) && (
          <p className="mt-1 text-xs text-muted-foreground">
            Cada canal só soma pontos com {volumeMinimo} registros ou mais no ciclo. Abaixo disso os pontos do canal ficam retidos e voltam a contar quando ele chega lá.
          </p>
        )}
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          {CANAIS.map((c) => {
            const n = volume[c];
            const conta = n >= volumeMinimo;
            return (
              <span
                key={c}
                className={`flex items-center justify-between rounded-md px-2 py-1 text-xs ${conta ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground'}`}
                title={conta ? 'Este canal conta para a premiação' : `Faltam ${volumeMinimo - n} para os pontos do canal contarem`}
              >
                <span className="truncate">{tipoTratativaLabels[c]}</span>
                <span className="font-semibold tabular-nums">{n}/{volumeMinimo}</span>
              </span>
            );
          })}
        </div>
      </div>
    </section>
  );
}
