import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Cartao, Linha } from '@/components/ui/Cartao';
import TabelaResumida from '@/components/ui/TabelaResumida';
import Grafico from '@/components/relatorios/hub/Grafico';
import { ComoCalculamos } from '@/components/relatorios/hub/Pecas';
import { SERIE_GRAFICO } from '@/lib/cores-grafico';
import { produtividadePorTurno } from '@/lib/relatorios/turnos';

/**
 * Produtividade por turno dentro dos Relatórios (antes era uma aba de
 * Escalas — Pedro, 24/09/2026: "deve ficar em relatórios e desvincular de
 * escalas"). O turno vem do horário do registro; a escala só diz quantas
 * pessoas estavam de pé em cada metade do dia.
 */
const num = (v, casas = 1) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: casas }));
const pct = (v) => (v === null || v === undefined ? '—' : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`);
const diaCurto = (data) => `${data.slice(8, 10)}/${data.slice(5, 7)}`;

export default function ProdutividadePorTurno({ tratativas, escalas = [], colaboradores = [], periodo }) {
  const r = useMemo(
    () => produtividadePorTurno({ escalas, tratativas, colaboradores, periodo }),
    [escalas, tratativas, colaboradores, periodo],
  );

  const serie = useMemo(() => [...r.dias].reverse().slice(-30).map((d) => ({
    rotulo: diaCurto(d.data), manha: d.manha, tarde: d.tarde,
  })), [r.dias]);

  return (
    <div className="grid items-start gap-6 xl:grid-cols-5">
      <Cartao titulo="Manhã e tarde" className="xl:col-span-2">
        {r.total === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tratativa registrada no período.</p>
        ) : (
          <>
            <p className="text-4xl font-bold tracking-tight tabular-nums text-foreground">{pct(r.parteDaManha)}</p>
            <p className="text-sm text-muted-foreground">das tratativas entram de manhã</p>
            <div className="mt-4 divide-y divide-border border-t border-border">
              <Linha rotulo="Registradas de manhã" detalhe={`${r.manha.encerradas} já encerradas`} valor={r.manha.tratativas} />
              <Linha rotulo="Registradas à tarde" detalhe={`${r.tarde.encerradas} já encerradas`} valor={r.tarde.tratativas} />
              {r.temEscala && (
                <>
                  <Linha rotulo="Por pessoa escalada de manhã" valor={num(r.manha.porPessoaEscalada, 2)} />
                  <Linha rotulo="Por pessoa escalada à tarde" valor={num(r.tarde.porPessoaEscalada, 2)} />
                </>
              )}
            </div>
            {!r.temEscala && (
              <p className="mt-3 text-xs text-muted-foreground">
                Sem escala de turno montada no período, dá para ver o volume de cada metade do dia, mas não o volume por pessoa escalada.
              </p>
            )}
          </>
        )}
        <ComoCalculamos>
          <p>O turno sai do <strong>horário do registro</strong> da tratativa: até 11:59 é manhã, das 12:00 em diante é tarde.</p>
          <p>Quem estava escalado vem da <strong>Escala de Turno</strong> (quem atende e quem analisa tickets). Dia marcado como sem operação não entra.</p>
          <p>Tratativas excluídas ficam de fora.</p>
        </ComoCalculamos>
      </Cartao>

      <Cartao titulo="Dia a dia" className="xl:col-span-3">
        <Grafico altura={220} temDados={serie.length > 0} vazio="Nada no período.">
          <BarChart data={serie} margin={{ left: -18, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="rotulo" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="manha" name="Manhã" fill={SERIE_GRAFICO[0]} stackId="dia" />
            <Bar dataKey="tarde" name="Tarde" fill={SERIE_GRAFICO[1]} stackId="dia" />
          </BarChart>
        </Grafico>

        <div className="mt-4">
          <TabelaResumida
            linhas={r.pessoas}
            chaveDaLinha={(p) => p.id}
            rotuloDetalhe="Ver os números da pessoa"
            limite={8}
            rotulo="pessoas"
            colunas={[
              { chave: 'nome', rotulo: 'Agente', alinhar: 'esquerda', principal: true, valor: (p) => p.nome },
              { chave: 'manha', rotulo: 'Manhã', principal: true, valor: (p) => p.manha },
              { chave: 'tarde', rotulo: 'Tarde', principal: true, valor: (p) => p.tarde },
              { chave: 'total', rotulo: 'Total', principal: true, valor: (p) => p.total },
              { chave: 'encerradas', rotulo: 'Já encerradas', valor: (p) => p.encerradas },
            ]}
          />
        </div>
      </Cartao>
    </div>
  );
}
