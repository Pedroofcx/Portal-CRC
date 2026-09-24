import React, { useMemo } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import { Cartao, Linha } from '@/components/ui/Cartao';
import TabelaResumida from '@/components/ui/TabelaResumida';
import Grafico from '@/components/relatorios/hub/Grafico';
import { SERIE_GRAFICO } from '@/lib/cores-grafico';
import { formatDateSP } from '@/components/utils/helpers';

/**
 * O histórico de Hansei de uma pessoa, aberto a partir do card dela.
 * Evolução no topo (para não precisar descer a tela), depois cada envio.
 */
const pct = (v) => (v === null || v === undefined ? '—' : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);
const num = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 }));

export default function PainelColaboradorHansei({ colaborador, envios, comentarios = [], onVoltar, onAbrir, onEnviar }) {
  const meus = useMemo(
    () => envios.filter((e) => e.colaborador_id === colaborador.id)
      .sort((a, b) => String(b.periodo_fim).localeCompare(String(a.periodo_fim))),
    [envios, colaborador.id],
  );
  const serie = useMemo(() => [...meus].reverse().map((e) => ({
    rotulo: `${formatDateSP(e.periodo_fim, 'DD/MM')}`,
    csat: e.dados_consolidados?.csat_individual ?? null,
    performance: e.dados_consolidados?.performance_percentual ?? null,
  })), [meus]);

  const ultimo = meus[0]?.dados_consolidados ?? {};
  const naoLidos = meus.filter((e) => !e.visualizado).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onVoltar} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Todos os colaboradores
        </button>
        <Button size="sm" onClick={onEnviar}>
          <Send className="mr-2 h-4 w-4" aria-hidden="true" /> Enviar Hansei para {colaborador.nome_completo.split(' ')[0]}
        </Button>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-5">
        <Cartao titulo={colaborador.nome_completo} className="xl:col-span-2">
          <div className="divide-y divide-border">
            <Linha rotulo="Hanseis enviados" detalhe={naoLidos ? `${naoLidos} ainda não lido(s)` : 'todos lidos'} valor={meus.length} />
            <Linha rotulo="CSAT no último" valor={pct(ultimo.csat_individual)} />
            <Linha rotulo="Performance no último" valor={pct(ultimo.performance_percentual)} />
            <Linha rotulo="Avaliação CX no último" valor={num(ultimo.cx_nota_media)} />
            <Linha rotulo="Pontos no ciclo" valor={ultimo.pontuacao_trimestre === null || ultimo.pontuacao_trimestre === undefined ? '—' : num(ultimo.pontuacao_trimestre)} />
          </div>
        </Cartao>

        <Cartao titulo="Evolução" className="xl:col-span-3">
          <Grafico altura={220} temDados={serie.length > 1} vazio="É preciso mais de um Hansei para ver a evolução.">
            <LineChart data={serie} margin={{ left: -18, right: 8 }}>
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

      <Cartao titulo="Hanseis enviados">
        {meus.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum Hansei enviado para esta pessoa.</p>
        ) : (
          <TabelaResumida
            linhas={meus}
            chaveDaLinha={(e) => e.id}
            rotuloDetalhe="Ver os números do envio"
            limite={8}
            rotulo="envios"
            colunas={[
              {
                chave: 'periodo',
                rotulo: 'Período',
                alinhar: 'esquerda',
                principal: true,
                valor: (e) => (
                  <button type="button" onClick={(ev) => { ev.stopPropagation(); onAbrir(e); }} className="font-medium text-primary hover:underline">
                    {formatDateSP(e.periodo_inicio, 'DD/MM/YY')} a {formatDateSP(e.periodo_fim, 'DD/MM/YY')}
                  </button>
                ),
              },
              { chave: 'csat', rotulo: 'CSAT', principal: true, valor: (e) => pct(e.dados_consolidados?.csat_individual) },
              { chave: 'perf', rotulo: 'Performance', principal: true, valor: (e) => pct(e.dados_consolidados?.performance_percentual) },
              { chave: 'trat', rotulo: 'Tratativas', principal: true, valor: (e) => `${e.dados_consolidados?.tratativas_solucionadas ?? 0}/${e.dados_consolidados?.tratativas_total ?? 0}` },
              { chave: 'visto', rotulo: 'Situação', principal: true, valor: (e) => (e.visualizado ? 'lido' : 'não lido') },
              { chave: 'envio', rotulo: 'Enviado em', valor: (e) => formatDateSP(e.data_envio, 'DD/MM/YYYY') },
              { chave: 'cx', rotulo: 'Avaliação CX', valor: (e) => num(e.dados_consolidados?.cx_nota_media) },
              { chave: 'pontos', rotulo: 'Pontos no ciclo', valor: (e) => num(e.dados_consolidados?.pontuacao_trimestre) },
              { chave: 'sla', rotulo: 'No prazo / fora', valor: (e) => `${e.dados_consolidados?.slas_cumpridos ?? 0} / ${e.dados_consolidados?.slas_estourados ?? 0}` },
              { chave: 'comentario', rotulo: 'Comentário do gestor', valor: (e) => e.comentario_gestor || '—' },
              { chave: 'resposta', rotulo: 'Resposta do agente', valor: (e) => comentarios.filter((c) => c.hansei_envio_id === e.id).length || '—' },
            ]}
          />
        )}
      </Cartao>
    </div>
  );
}
