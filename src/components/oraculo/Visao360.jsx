import React, { useMemo, useState } from 'react';
import db from '@/api/db';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Cartao, Linha } from '@/components/ui/Cartao';
import TabelaResumida from '@/components/ui/TabelaResumida';
import Grafico from '@/components/relatorios/hub/Grafico';
import { SERIE_GRAFICO } from '@/lib/cores-grafico';
import { formatDateSP } from '@/components/utils/helpers';
import FotoDaPessoa from './FotoDaPessoa';
import {
  GRUPOS_COMPETENCIA, pontosDoRadar, evolucaoDasLeituras, palavrasRecorrentes, mediaDasCompetencias,
} from '@/lib/competencias';

/**
 * A visão 360º de uma pessoa: o que as leituras do gestor dizem (humano) ao
 * lado do que os números do ciclo dizem (processo). Nada é avaliado aqui —
 * a leitura é registrada em Observações; o Oráculo só concentra e compara.
 */
const nota = (v) => (v === null || v === undefined ? '—' : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}/5`);
const pct = (v) => (v === null || v === undefined ? '—' : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);
const num = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 }));

function RadarDoGrupo({ grupo, medias, mediasEquipe }) {
  const dados = pontosDoRadar(grupo.chave, medias, mediasEquipe);
  const temDados = dados.some((d) => d.pessoa !== null);
  return (
    <Cartao titulo={grupo.rotulo}>
      <Grafico altura={260} temDados={temDados} vazio="Nenhuma leitura registrada ainda.">
        <RadarChart data={dados} outerRadius="72%">
          <PolarGrid />
          <PolarAngleAxis dataKey="competencia" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 10 }} />
          <Tooltip formatter={(v) => (v === null ? '—' : `${Number(v).toFixed(1)}/5`)} />
          <Legend />
          <Radar name="A pessoa" dataKey="pessoa" stroke={SERIE_GRAFICO[0]} fill={SERIE_GRAFICO[0]} fillOpacity={0.25} />
          <Radar name="Média da equipe" dataKey="equipe" stroke={SERIE_GRAFICO[1]} fill={SERIE_GRAFICO[1]} fillOpacity={0.08} />
        </RadarChart>
      </Grafico>
      <div className="mt-2 divide-y divide-border border-t border-border">
        {dados.map((d) => (
          <Linha
            key={d.chave}
            rotulo={d.competencia}
            detalhe={d.equipe === null ? null : `equipe ${num(d.equipe)}`}
            valor={nota(d.pessoa)}
          />
        ))}
      </div>
    </Cartao>
  );
}

export default function Visao360({ colaborador, leituras, mediasEquipe, processo, acompanhamento, onVoltar }) {
  const [resumoIA, setResumoIA] = useState(null);
  const [gerando, setGerando] = useState(false);

  const medias = useMemo(() => mediaDasCompetencias(leituras), [leituras]);
  const evolucao = useMemo(() => evolucaoDasLeituras(leituras).map((e) => ({
    ...e,
    rotulo: formatDateSP(e.data, 'DD/MM/YY'),
  })), [leituras]);
  const palavras = useMemo(() => palavrasRecorrentes(leituras), [leituras]);

  const gerarResumo = async () => {
    if (leituras.length === 0) { toast.error('Registre ao menos uma leitura antes.'); return; }
    setGerando(true);
    try {
      const notas = GRUPOS_COMPETENCIA.map((g) => (
        `${g.rotulo}: ${g.itens.map((i) => `${i.rotulo} ${medias[g.chave][i.chave] ?? 'sem nota'}`).join(', ')}`
      )).join('\n');
      const textos = leituras.slice(0, 6).map((l) => (
        `- ${formatDateSP(l.data_registro || l.created_date, 'DD/MM/YYYY')}: ${String(l.conteudo || '').replace(/<[^>]*>/g, '').slice(0, 400)}`
      )).join('\n');
      const resposta = await db.integrations.Core.InvokeLLM({
        prompt: `Você apoia um gestor de atendimento na preparação de uma conversa de desenvolvimento com ${colaborador.nome_completo}.\n\nMédia das competências avaliadas pelo gestor (escala 1 a 5):\n${notas}\n\nÚltimas leituras escritas pelo gestor:\n${textos}\n\nNúmeros do ciclo: pontos ${processo.pontos ?? 'n/d'}, CSAT ${processo.csat ?? 'n/d'}, performance ${processo.performance ?? 'n/d'}, ${processo.tratativas} tratativas encerradas, ${processo.noPrazo} no prazo, ${processo.reaberturas} com reabertura.\n\nResponda em português do Brasil, sem elogio automático e sem inventar fato que não está acima.`,
        response_json_schema: {
          type: 'object',
          properties: {
            pontos_fortes: { type: 'array', items: { type: 'string' } },
            pontos_de_atencao: { type: 'array', items: { type: 'string' } },
            sugestao_de_conversa: { type: 'string' },
          },
          required: ['pontos_fortes', 'pontos_de_atencao', 'sugestao_de_conversa'],
        },
      });
      setResumoIA(resposta);
    } catch {
      toast.error('Não consegui falar com a IA agora.');
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onVoltar} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Todos os colaboradores
        </button>
        <Button asChild size="sm">
          <Link to={`${createPageUrl('Observacoes')}?colaborador=${colaborador.id}&leitura=1`}>
            Registrar leitura em Observações
          </Link>
        </Button>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-5">
        <Cartao className="xl:col-span-2">
          <div className="mb-3 flex items-center gap-4">
            <FotoDaPessoa colaborador={colaborador} className="h-24 w-20 shrink-0" textoClassName="text-2xl" />
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground">{colaborador.nome_completo}</h2>
              <p className="text-xs text-muted-foreground">{colaborador.cargo_atual || 'Agente'}</p>
            </div>
          </div>
          <div className="divide-y divide-border border-t border-border">
            <Linha rotulo="Leituras registradas" valor={leituras.length} />
            <Linha rotulo="Visão humana" detalhe="média das seis competências" valor={nota(medias.humanas_geral)} />
            <Linha rotulo="Visão de processo" detalhe="média das seis competências" valor={nota(medias.tecnicas_geral)} />
            <Linha rotulo="Média da equipe (humana)" valor={nota(mediasEquipe.humanas_geral)} />
            <Linha rotulo="Média da equipe (processo)" valor={nota(mediasEquipe.tecnicas_geral)} />
          </div>
        </Cartao>

        <Cartao titulo={`Números do ciclo${processo.ciclo ? ` — ${processo.ciclo}` : ''}`} className="xl:col-span-3">
          <div className="grid gap-x-8 sm:grid-cols-2">
            <div className="divide-y divide-border">
              <Linha rotulo="Pontos no ciclo" valor={num(processo.pontos)} forte />
              <Linha rotulo="CSAT" valor={pct(processo.csat)} />
              <Linha rotulo="Performance" valor={pct(processo.performance)} />
              <Linha rotulo="Avaliação CX" valor={num(processo.cx)} />
            </div>
            <div className="divide-y divide-border">
              <Linha rotulo="Tratativas encerradas" valor={processo.tratativas} />
              <Linha rotulo="Encerradas no prazo" detalhe={processo.tratativas ? `${Math.round((processo.noPrazo / processo.tratativas) * 100)}% do total` : null} valor={processo.noPrazo} />
              <Linha rotulo="Com reabertura em 7 dias" valor={processo.reaberturas} />
              <Linha rotulo="Soluções replicáveis" detalhe={`${processo.replicaveisPendentes} aguardando sua auditoria`} valor={processo.replicaveisAprovadas} />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            São os mesmos números do ranking e do Hansei, pelas regras do POP 11.
          </p>
        </Cartao>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        {GRUPOS_COMPETENCIA.map((grupo) => (
          <RadarDoGrupo key={grupo.chave} grupo={grupo} medias={medias} mediasEquipe={mediasEquipe} />
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-5">
        <Cartao titulo="Evolução das leituras" className="xl:col-span-3">
          <Grafico altura={220} temDados={evolucao.length > 1} vazio="É preciso mais de uma leitura para ver a evolução.">
            <LineChart data={evolucao} margin={{ left: -18, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="rotulo" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 5]} tickCount={6} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => (v === null ? '—' : `${Number(v).toFixed(1)}/5`)} />
              <Legend />
              <Line type="monotone" dataKey="humanas" name="Visão humana" stroke={SERIE_GRAFICO[0]} strokeWidth={2} connectNulls />
              <Line type="monotone" dataKey="tecnicas" name="Visão de processo" stroke={SERIE_GRAFICO[1]} strokeWidth={2} connectNulls />
            </LineChart>
          </Grafico>
        </Cartao>

        <Cartao titulo="Palavras que se repetem" className="xl:col-span-2">
          {palavras.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma palavra-chave escolhida nas leituras.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {palavras.map((p) => (
                <Badge key={p.palavra} variant="outline" className="text-xs">{p.palavra} · {p.vezes}x</Badge>
              ))}
            </div>
          )}
          <div className="mt-4 divide-y divide-border border-t border-border">
            <Linha rotulo="PDIs em andamento" valor={acompanhamento.pdisAtivos} />
            <Linha rotulo="Feedbacks registrados" detalhe={`${acompanhamento.positivos} positivos · ${acompanhamento.negativos} negativos`} valor={acompanhamento.feedbacks} />
            <Linha
              rotulo="Último Hansei"
              detalhe={acompanhamento.ultimoHansei ? (acompanhamento.hanseiLido ? 'lido pelo agente' : 'ainda não lido') : null}
              valor={acompanhamento.ultimoHansei ? formatDateSP(acompanhamento.ultimoHansei, 'DD/MM/YYYY') : '—'}
            />
          </div>
        </Cartao>
      </div>

      <Cartao
        titulo="Apoio da IA"
        extra={<Button size="sm" variant="outline" onClick={gerarResumo} disabled={gerando}>{gerando ? 'Pensando...' : 'Gerar leitura de apoio'}</Button>}
      >
        {!resumoIA ? (
          <p className="text-sm text-muted-foreground">
            A IA lê as leituras e os números acima e devolve pontos fortes, pontos de atenção e uma sugestão de conversa.
            Nada fica salvo: é apoio para você decidir, não avaliação.
          </p>
        ) : (
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-foreground">Pontos fortes</p>
              <ul className="list-inside list-disc text-muted-foreground">
                {resumoIA.pontos_fortes?.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground">Pontos de atenção</p>
              <ul className="list-inside list-disc text-muted-foreground">
                {resumoIA.pontos_de_atencao?.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
            <div>
              <p className="font-medium text-foreground">Sugestão de conversa</p>
              <p className="text-muted-foreground">{resumoIA.sugestao_de_conversa}</p>
            </div>
          </div>
        )}
      </Cartao>

      <Cartao titulo="Leituras registradas">
        {leituras.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma leitura ainda. Registre a primeira em Observações e ela aparece aqui.
          </p>
        ) : (
          <TabelaResumida
            linhas={leituras}
            chaveDaLinha={(l) => l.id}
            rotuloDetalhe="Ver a leitura inteira"
            limite={8}
            rotulo="leituras"
            colunas={[
              { chave: 'data', rotulo: 'Data', alinhar: 'esquerda', principal: true, valor: (l) => formatDateSP(l.data_registro || l.created_date, 'DD/MM/YYYY') },
              { chave: 'autor', rotulo: 'Por', alinhar: 'esquerda', principal: true, valor: (l) => l.autor_nome || '—' },
              { chave: 'humana', rotulo: 'Humana', principal: true, valor: (l) => nota(mediaDasCompetencias([l]).humanas_geral) },
              { chave: 'processo', rotulo: 'Processo', principal: true, valor: (l) => nota(mediaDasCompetencias([l]).tecnicas_geral) },
              { chave: 'palavras', rotulo: 'Palavras-chave', valor: (l) => (l.palavras_chave || []).map((p) => (typeof p === 'string' ? p : p.palavra)).join(', ') || '—' },
              { chave: 'pergunta', rotulo: 'Pergunta da conversa', valor: (l) => l.pergunta_gerada || '—' },
              { chave: 'texto', rotulo: 'O que foi observado', valor: (l) => String(l.conteudo || '').replace(/<[^>]*>/g, '') || '—' },
              { chave: 'visibilidade', rotulo: 'Visibilidade', valor: (l) => (l.visibilidade === 'gestor' ? 'só gestão' : 'visível ao agente') },
            ]}
          />
        )}
      </Cartao>
    </div>
  );
}
