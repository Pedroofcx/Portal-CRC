import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { formatDateSP, tipoTratativaLabels, statusLabels } from '@/components/utils/helpers';
import { Cartao, Linha } from '@/components/ui/Cartao';
import TabelaResumida from '@/components/ui/TabelaResumida';
import { resumoDoCanal } from '@/lib/relatorios/canais';
import { ComoCalculamos, Pergunta, periodoPorExtenso, brl, baixarCSV } from '@/components/relatorios/hub/Pecas';

/**
 * Relatórios › Canais — como estamos em cada canal. Substitui o antigo
 * "Relatórios por Tipo" (contas em src/lib/relatorios/canais.js).
 */
const ABAS = [
  { chave: 'reclamacao_interna', rotulo: 'Reclamação interna' },
  { chave: 'reclame_aqui', rotulo: 'Reclame Aqui' },
  { chave: 'google_meu_negocio', rotulo: 'Google Meu Negócio' },
  { chave: 'contestacao', rotulo: 'Contestação' },
  { chave: 'outros', rotulo: 'Outros tipos' },
];
const CAUSAS = { processo: 'Processo', produto_sistema: 'Produto / Sistema', comunicacao: 'Comunicação', expectativa_cliente: 'Expectativa do cliente', operacao_interna: 'Operação interna', terceiro: 'Terceiro' };
const pct = (v) => (v === null || v === undefined ? '—' : `${Math.round(v)}%`);
const nota = (v) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 }));
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const mesCurto = (m) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`;
const PRIORIDADES = { baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' };
const horas = (h) => (h === null || h === undefined ? '—' : h < 48 ? `${Math.round(h)}h` : `${Math.round(h / 24)} dias`);

function Lista({ titulo, itens, rotular = (x) => x }) {
  if (!itens?.length) return null;
  return (
    <Cartao titulo={titulo}>
      <div className="divide-y divide-border">
        {itens.map((i) => <Linha key={i.nome} rotulo={rotular(i.nome)} valor={i.qtd} />)}
      </div>
    </Cartao>
  );
}

export default function Canais({ tratativas, periodo }) {
  const [aba, setAba] = useState('reclamacao_interna');
  const r = useMemo(() => resumoDoCanal(tratativas, aba, periodo), [tratativas, aba, periodo]);

  const exportar = () => {
    const nome = ABAS.find((a) => a.chave === aba)?.rotulo ?? aba;
    baixarCSV(
      `${nome.toLowerCase().replace(/\s+/g, '_')}_${periodo.inicio || 'inicio'}_${periodo.fim || 'hoje'}.csv`,
      ['ID', 'Cliente', 'Tipo', 'Agente', 'Registrada', 'Encerrada', 'Status', 'No prazo', 'Motivo', 'Valor devolvido'],
      r.itens.map((t) => [
        t.id_interno, t.nome_cliente, tipoTratativaLabels[t.tipo_tratativa] ?? t.tipo_tratativa, t.agente_responsavel_nome,
        formatDateSP(t.data_registro, 'DD/MM/YYYY'), formatDateSP(t.data_encerramento, 'DD/MM/YYYY'),
        statusLabels[t.status] ?? t.status, t.encerrado_no_sla ? 'Sim' : 'Não', t.motivo_nome,
        t.houve_devolucao_financeira ? String(t.valor_devolvido_cliente ?? '').replace('.', ',') : '',
      ]),
    );
  };

  return (
    <div className="space-y-6">
      <Pergunta pergunta="Como estamos em cada canal?" explicacao={`Os números de cada canal, pelas tratativas encerradas ${periodoPorExtenso(periodo)}.`} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Canal">
          {ABAS.map((a) => (
            <Button key={a.chave} size="sm" variant={a.chave === aba ? 'default' : 'outline'} onClick={() => setAba(a.chave)}>{a.rotulo}</Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={exportar} disabled={!r.itens.length}>
          <Download className="mr-1.5 h-4 w-4" aria-hidden="true" /> Exportar as {r.itens.length} encerradas
        </Button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Cartao titulo="O canal no período" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 border-b border-border pb-4 sm:grid-cols-4">
            <div><p className="text-xs text-muted-foreground">Entraram</p><p className="text-2xl font-semibold tabular-nums">{r.entraram}</p></div>
            <div><p className="text-xs text-muted-foreground">Encerradas</p><p className="text-2xl font-semibold tabular-nums">{r.encerradas}</p></div>
            <div><p className="text-xs text-muted-foreground">No prazo</p><p className="text-2xl font-semibold tabular-nums">{pct(r.pctNoPrazo)}</p></div>
            <div><p className="text-xs text-muted-foreground">Caso típico</p><p className="text-2xl font-semibold tabular-nums">{horas(r.medianaHoras)}</p></div>
          </div>

          <div className="divide-y divide-border">
            {aba === 'reclamacao_interna' && (
              <>
                <Linha rotulo="Sem reabertura em 7 dias" detalhe={`${r.voltaram} cliente(s) voltaram · ${r.aguardando} ainda dentro dos 7 dias`} valor={pct(r.pctSemReabertura)} />
                <Linha rotulo="Soluções replicáveis" detalhe={`${r.replicaveis.aprovadas} aprovadas · ${r.replicaveis.pendentes} esperando você · ${r.replicaveis.contestadas} contestadas`} valor={r.replicaveis.marcadas} />
              </>
            )}
            {aba === 'reclame_aqui' && (
              <>
                <Linha rotulo="Nota média do consumidor" detalhe={`${r.avaliadas} avaliadas${r.semNota ? ` · ${r.semNota} sem nota` : ''}`} valor={nota(r.notaMedia)} />
                <Linha rotulo="Notas" detalhe="0 a 6 · 7 e 8 · 9 · 10" valor={`${r.notas.ate6} · ${r.notas.de7a8} · ${r.notas.nove} · ${r.notas.dez}`} />
                <Linha rotulo="Voltaria a fazer negócio" detalhe="entre as avaliadas" valor={`${r.voltaria} (${pct(r.pctVoltaria)})`} />
                <Linha rotulo="Reclamações inativadas" valor={r.inativadas} />
              </>
            )}
            {aba === 'google_meu_negocio' && (
              <>
                <Linha rotulo="Reavaliação positiva" valor={r.reavaliacoes} />
                <Linha rotulo="Avaliação negativa excluída" valor={r.exclusoes} />
                <Linha rotulo="Avaliação inativada" valor={r.inativadas} />
                <Linha rotulo="Sem reversão" detalhe="a avaliação negativa continua lá" valor={r.semReversao} />
                <Linha rotulo="Comentário" detalhe="mantido · editado · excluído" valor={`${r.comentario.mantido} · ${r.comentario.editado} · ${r.comentario.excluido}`} />
              </>
            )}
            {aba === 'contestacao' && (
              <>
                <Linha rotulo="Recuperadas" detalhe="cliente pagou ou cancelou a contestação" valor={r.recuperadas} />
                <Linha rotulo="Acordos" valor={r.acordos} />
                <Linha rotulo="Perdidas" detalhe="sem acordo, sem contato ou contestou" valor={r.perdidas} />
                {r.semDesfecho > 0 && <Linha rotulo="Encerradas sem desfecho registrado" valor={r.semDesfecho} />}
                <Linha rotulo="Em andamento agora" valor={r.emAndamento} />
                <p className="py-2 text-xs text-muted-foreground">Os valores em R$ de cada desfecho estão no grupo Financeiro.</p>
              </>
            )}
            {r.devolucoes > 0 && <Linha rotulo="Devoluções ao cliente" valor={`${r.devolucoes} · ${brl(r.valorDevolvido)}`} />}
          </div>

          <ComoCalculamos>
            <p><strong>Encerradas, no prazo e caso típico:</strong> tratativas do canal encerradas no período. “No prazo” é o SLA calculado pelo servidor; o caso típico é a mediana do tempo do registro ao encerramento.</p>
            {aba === 'reclamacao_interna' && <p><strong>Sem reabertura:</strong> entre as que já passaram dos 7 dias, a parte em que o mesmo cliente não abriu nova tratativa — a mesma regra da premiação.</p>}
            {aba === 'reclame_aqui' && <p><strong>Nota média:</strong> média das notas dadas pelo consumidor, inclusive as notas 0. Encerradas sem nota ficam fora da média.</p>}
            {aba === 'contestacao' && <p><strong>Desfechos:</strong> a mesma leitura do Financeiro — recuperada (pagou ou cancelou), acordo, perdida (sem acordo, sem contato ou contestou).</p>}
          </ComoCalculamos>
        </Cartao>

        <div className="space-y-6">
          <Cartao titulo="Mês a mês">
            {r.meses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada no período.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="py-2 text-left font-medium">Mês</th>
                    <th className="py-2 text-right font-medium">Entraram</th>
                    <th className="py-2 text-right font-medium">Encerradas</th>
                  </tr>
                </thead>
                <tbody>
                  {r.meses.map((m) => (
                    <tr key={m.mes} className="h-9 border-b border-border last:border-0">
                      <td className="text-foreground">{mesCurto(m.mes)}</td>
                      <td className="text-right tabular-nums">{m.entraram}</td>
                      <td className="text-right tabular-nums">{m.encerradas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Cartao>
          <Lista titulo="Motivos que mais aparecem" itens={r.motivos} />
          <Lista titulo="Prioridade das encerradas" itens={r.prioridades} rotular={(p) => PRIORIDADES[p] ?? p} />
          <Lista titulo="Clientes que apareceram mais de uma vez" itens={r.clientes} />
          {aba === 'reclamacao_interna' && <Lista titulo="Causa primária" itens={r.causas} rotular={(c) => CAUSAS[c] ?? c} />}
          {(aba === 'reclame_aqui' || aba === 'contestacao') && <Lista titulo="Categorias" itens={r.categorias} />}
          {aba === 'outros' && <Lista titulo="Tipos" itens={r.porTipo} rotular={(t) => tipoTratativaLabels[t] ?? t} />}
        </div>
      </div>

      <Cartao titulo="As encerradas do canal no período" extra={<span className="text-xs text-muted-foreground">{r.itens.length} tratativas</span>}>
        {r.itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tratativa encerrada no período.</p>
        ) : (
          <TabelaResumida
            linhas={[...r.itens].sort((a, b) => String(b.data_encerramento).localeCompare(String(a.data_encerramento)))}
            chaveDaLinha={(t) => t.id}
            rotuloDetalhe="Ver os detalhes da tratativa"
            limite={12}
            rotulo="tratativas"
            colunas={[
              { chave: 'id', rotulo: 'Tratativa', alinhar: 'esquerda', principal: true, valor: (t) => <Link to={`${createPageUrl('TratativaDetalhe')}?id=${t.id}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>{[t.id_interno, t.nome_cliente].filter(Boolean).join(' · ')}</Link> },
              { chave: 'agente', rotulo: 'Agente', principal: true, valor: (t) => t.agente_responsavel_nome || '—' },
              { chave: 'enc', rotulo: 'Encerrada', principal: true, valor: (t) => formatDateSP(t.data_encerramento, 'DD/MM/YYYY') },
              { chave: 'prazo', rotulo: 'No prazo', principal: true, valor: (t) => (t.encerrado_no_sla ? 'sim' : 'não') },
              { chave: 'motivo', rotulo: 'Motivo', valor: (t) => t.motivo_nome || '—' },
              { chave: 'reg', rotulo: 'Registrada em', valor: (t) => formatDateSP(t.data_registro, 'DD/MM/YYYY') },
              { chave: 'tempo', rotulo: 'Tempo até encerrar', valor: (t) => horas(Number(t.tempo_total_minutos) / 60) },
              { chave: 'dev', rotulo: 'Devolução ao cliente', valor: (t) => (t.houve_devolucao_financeira ? brl(t.valor_devolvido_cliente) : '—') },
            ]}
          />
        )}
      </Cartao>
    </div>
  );
}
