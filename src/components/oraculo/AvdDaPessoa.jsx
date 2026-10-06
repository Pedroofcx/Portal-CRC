import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import db from '@/api/db';
import { Cartao, Linha } from '@/components/ui/Cartao';
import Grafico from '@/components/relatorios/hub/Grafico';
import { SERIE_GRAFICO } from '@/lib/cores-grafico';
import { INDICADORES, NOTAS, serieMensalAvd, textosDaResposta, rotuloDaCompetencia, tituloDaAvd } from '@/lib/avd';

const nota = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 }));
const OPCOES = [{ chave: 'geral', rotulo: 'Média geral' }, ...INDICADORES];
const PADRAO = ['geral', 'bem_estar', 'clima'];

/**
 * A AVD (autoavaliação mensal) da pessoa, no Oráculo: a evolução mês a mês de
 * cada bloco ao lado da média da equipe, e o que ela escreveu em cada mês.
 * Só a gestão vê (a regra de acesso é do banco). Não entra na pontuação.
 */
export default function AvdDaPessoa({ colaborador }) {
  const [escolhidos, setEscolhidos] = useState(PADRAO);
  const [mesAberto, setMesAberto] = useState(null);

  const { data: pesquisas = [] } = useQuery({
    queryKey: ['avd-pesquisas'],
    queryFn: () => db.entities.Pesquisa.filter({ tipo: 'avd' }),
    staleTime: 60000,
  });
  const { data: respostas = [], isLoading } = useQuery({
    queryKey: ['avd-respostas'],
    queryFn: () => db.entities.RespostaPesquisa.filter({ pesquisa_tipo: 'avd' }),
    staleTime: 60000,
  });

  const competenciaDa = useMemo(() => new Map(pesquisas.map((p) => [p.id, p.competencia])), [pesquisas]);
  const itens = useMemo(() => respostas.map((r) => ({ ...r, competencia: competenciaDa.get(r.pesquisa_id) })), [respostas, competenciaDa]);
  const dela = useMemo(() => itens.filter((i) => i.colaborador_id === colaborador.id), [itens, colaborador.id]);

  const serie = useMemo(() => serieMensalAvd(dela), [dela]);
  const equipe = useMemo(() => new Map(serieMensalAvd(itens).map((m) => [m.competencia, m])), [itens]);
  const dados = serie.map((m) => {
    const linha = { rotulo: m.rotulo };
    for (const o of OPCOES) {
      linha[o.chave] = m[o.chave];
      linha[`equipe_${o.chave}`] = equipe.get(m.competencia)?.[o.chave] ?? null;
    }
    return linha;
  });

  const alternar = (chave) => setEscolhidos((atual) => {
    if (atual.includes(chave)) return atual.filter((c) => c !== chave);
    return atual.length >= SERIE_GRAFICO.length ? atual : [...atual, chave];
  });

  const meses = [...dela].sort((a, b) => String(b.competencia).localeCompare(String(a.competencia)));
  const aberto = meses.find((m) => m.competencia === (mesAberto ?? meses[0]?.competencia)) ?? null;
  const ultima = serie[serie.length - 1];
  const penultima = serie[serie.length - 2];

  if (isLoading) return null;

  return (
    <Cartao titulo="AVD — autoavaliação mensal">
      {dela.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma AVD desta pessoa ainda.</p>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-x-8 sm:grid-cols-2">
            <div className="divide-y divide-border border-t border-border">
              <Linha rotulo="AVDs respondidas" valor={dela.length} />
              <Linha rotulo={`Média geral · ${ultima.rotulo}`} detalhe={penultima ? `mês anterior: ${nota(penultima.geral)}` : null} valor={nota(ultima.geral)} />
            </div>
            <div className="divide-y divide-border border-t border-border">
              <Linha rotulo="Como se sentiu (último mês)" detalhe={penultima ? `mês anterior: ${nota(penultima.bem_estar)}` : null} valor={nota(ultima.bem_estar)} forte />
              <Linha rotulo="Clima do setor (último mês)" valor={nota(ultima.clima)} />
            </div>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              {OPCOES.map((o) => {
                const marcado = escolhidos.includes(o.chave);
                const cheio = !marcado && escolhidos.length >= SERIE_GRAFICO.length;
                return (
                  <button
                    key={o.chave}
                    type="button"
                    onClick={() => alternar(o.chave)}
                    aria-pressed={marcado}
                    disabled={cheio}
                    className={`rounded-full border px-3 py-1 text-xs ${marcado ? 'border-primary bg-info-soft font-medium text-primary' : 'border-border text-foreground hover:bg-muted'} ${cheio ? 'opacity-50' : ''}`}
                  >
                    {o.rotulo}
                  </button>
                );
              })}
            </div>
            <Grafico altura={240} temDados={dados.length > 1 && escolhidos.length > 0} vazio={escolhidos.length === 0 ? 'Escolha ao menos um indicador.' : 'Só há uma AVD: ainda não dá para traçar a linha.'}>
              <LineChart data={dados} margin={{ top: 8, left: -18, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="rotulo" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => (v === null ? '—' : Number(v).toFixed(1))} />
                <Legend />
                {escolhidos.flatMap((chave, i) => {
                  const rotulo = OPCOES.find((o) => o.chave === chave)?.rotulo ?? chave;
                  const cor = SERIE_GRAFICO[i % SERIE_GRAFICO.length];
                  return [
                    <Line key={chave} type="monotone" dataKey={chave} name={rotulo} stroke={cor} strokeWidth={2} connectNulls />,
                    <Line key={`eq_${chave}`} type="monotone" dataKey={`equipe_${chave}`} name={`${rotulo} (equipe)`} stroke={cor} strokeWidth={1.5} strokeDasharray="5 4" dot={false} connectNulls />,
                  ];
                })}
              </LineChart>
            </Grafico>
            <p className="mt-1 text-xs text-muted-foreground">Linha cheia: a pessoa. Tracejada: média da equipe no mesmo mês. Nota de 0 a 10.</p>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">O que ela escreveu em</span>
              {meses.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMesAberto(m.competencia)}
                  aria-pressed={aberto?.id === m.id}
                  className={`rounded-md border px-2.5 py-1 text-xs ${aberto?.id === m.id ? 'border-primary bg-info-soft font-medium text-primary' : 'border-border text-foreground hover:bg-muted'}`}
                >
                  {rotuloDaCompetencia(m.competencia)}
                </button>
              ))}
            </div>
            {aberto && (
              <div className="space-y-4 rounded-lg border border-border p-4">
                <p className="text-sm font-medium text-foreground">{tituloDaAvd(aberto.competencia)}</p>
                <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                  {NOTAS.map((n) => (
                    <Linha key={n.chave} rotulo={n.rotulo} valor={nota(serieMensalAvd([aberto])[0]?.[n.chave])} />
                  ))}
                </div>
                {textosDaResposta(aberto.respostas).map((b) => (
                  <section key={b.bloco}>
                    <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{b.rotulo}</h4>
                    {b.itens.map((t) => (
                      <p key={t.id} className="mb-2 whitespace-pre-line text-sm text-foreground">{t.resposta}</p>
                    ))}
                  </section>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Cartao>
  );
}
