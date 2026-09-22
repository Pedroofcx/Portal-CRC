import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { tipoTratativaLabels } from '@/components/utils/helpers';
import { Cartao } from '@/components/ui/Cartao';
import ListaResumida from '@/components/ui/ListaResumida';
import TabelaResumida from '@/components/ui/TabelaResumida';
import { resumoJornada } from '@/lib/relatorios/jornada';
import { ComoCalculamos, Pergunta, periodoPorExtenso, brl } from '@/components/relatorios/hub/Pecas';

/**
 * Relatórios › Jornada do cliente — onde o cliente sofre: etapas, motivos e
 * clientes que voltam a reclamar. Contas em src/lib/relatorios/jornada.js.
 */
export default function Jornada({ tratativas, periodo, ehGestor }) {
  const j = useMemo(() => resumoJornada(tratativas, periodo), [tratativas, periodo]);
  const custo = (v) => (ehGestor ? brl(v) : '—');

  return (
    <div className="space-y-6">
      <Pergunta
        pergunta="Onde o cliente sofre?"
        explicacao={`Em que etapa da jornada e por qual motivo os clientes mais reclamaram ${periodoPorExtenso(periodo)}, e quanto isso custou.`}
      />

      <Cartao titulo="Etapas da jornada, da mais cara para a mais barata" extra={<span className="text-xs text-muted-foreground">{j.encerradas} encerradas · {custo(j.custoTotal)}</span>}>
        {j.etapas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tratativa encerrada no período.</p>
        ) : (
          <TabelaResumida
            linhas={j.etapas}
            chaveDaLinha={(e) => e.nome}
            rotuloDetalhe="Ver os motivos da etapa"
            colunas={[
              { chave: 'etapa', rotulo: 'Etapa', alinhar: 'esquerda', principal: true, valor: (e) => e.nome },
              { chave: 'casos', rotulo: 'Casos', principal: true, valor: (e) => e.casos },
              { chave: 'custo', rotulo: 'Custo', alinhar: 'direita', principal: true, valor: (e) => custo(e.custo) },
              { chave: 'motivos', rotulo: 'Motivos que mais aparecem', valor: (e) => e.motivos.map((m) => `${m.nome} (${m.casos})`).join(' · ') || '—' },
              { chave: 'medio', rotulo: 'Custo médio por caso', valor: (e) => custo(e.casos ? e.custo / e.casos : 0) },
            ]}
          />
        )}
        {j.semEtapa > 0 && <p className="mt-3 text-xs text-muted-foreground">{j.semEtapa} encerradas sem etapa da jornada informada aparecem como “Não definido”.</p>}
        <ComoCalculamos>
          <p><strong>Custo</strong> de cada caso = valor devolvido ao cliente + tempo da equipe (o custo operacional oficial, dividido pela carga simultânea) + perda de receita informada. A mesma conta do grupo Financeiro.</p>
          <p>A etapa é a que o agente marca no encerramento da tratativa.</p>
        </ComoCalculamos>
      </Cartao>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Cartao titulo="Motivos que mais se repetem">
          <ListaResumida
            className="divide-y divide-border"
            limite={8}
            rotulo="motivos"
            itens={j.motivos}
            renderItem={(m) => (
              <div key={m.nome} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 text-foreground">{m.nome}<span className="block text-xs text-muted-foreground">{custo(m.custo)}</span></span>
                <span className="shrink-0 font-semibold tabular-nums">{m.casos}</span>
              </div>
            )}
          />
        </Cartao>

        <Cartao titulo="Clientes que reclamaram mais de uma vez" extra={<span className="text-xs text-muted-foreground">{j.recorrentes.length} clientes</span>}>
          {j.recorrentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum cliente abriu mais de uma tratativa no período.</p>
          ) : (
            <ListaResumida
              className="divide-y divide-border"
              limite={8}
              rotulo="clientes"
              itens={j.recorrentes}
              renderItem={(c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0 text-foreground">
                    {c.nome || `Cliente ${c.id}`}
                    <span className="block text-xs text-muted-foreground">id {c.id} · {c.tipos.map((tp) => tipoTratativaLabels[tp] ?? tp).join(', ')}</span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">{c.qtd}</span>
                </div>
              )}
            />
          )}
          <ComoCalculamos>
            <p>Clientes (pelo id da base) com duas ou mais tratativas registradas no período, em qualquer canal.</p>
          </ComoCalculamos>
        </Cartao>
      </div>

      <p className="text-sm text-muted-foreground">
        Para a análise completa por etapa, com a versão para a diretoria, abra a{' '}
        <Link to={createPageUrl('JornadaCliente')} className="font-medium text-primary hover:underline">Jornada do Cliente</Link>.
      </p>
    </div>
  );
}
