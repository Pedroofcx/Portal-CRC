import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Cartao } from '@/components/ui/Cartao';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import TabelaResumida from '@/components/ui/TabelaResumida';
import { ComoCalculamos } from '@/components/relatorios/hub/Pecas';
import { resumoQualidade, diaADiaEquipeQualidade } from '@/lib/relatorios/qualidade';

const pct = (v) => (v === null || v === undefined ? '—' : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);
const dataCurta = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '—');
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const rotuloMes = (mes) => `${MESES[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`;
const diaSemanaCurto = (iso) => ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][new Date(`${iso}T00:00:00`).getDay()];
const ultimoDiaDoMes = (mes) => { const [a, m] = mes.split('-').map(Number); return String(new Date(a, m, 0).getDate()).padStart(2, '0'); };

function melhorEPior(lista, chave) {
  const comValor = lista.filter((x) => x[chave] !== null && x[chave] !== undefined);
  if (!comValor.length) return { melhor: null, pior: null };
  return {
    melhor: comValor.reduce((a, b) => (b[chave] > a[chave] ? b : a)),
    pior: comValor.reduce((a, b) => (b[chave] < a[chave] ? b : a)),
  };
}

/**
 * Preditivo — varre TODO o histórico (não o período filtrado acima na tela)
 * pra achar o melhor e o pior mês/semana de CSAT da equipe, e deixa escolher
 * qualquer outro mês ou semana pra ver o dia que puxou o resultado.
 */
export default function PreditivoApuracao({ apuracoes, colaboradores }) {
  const [granularidade, setGranularidade] = useState('mes');
  const [selecionado, setSelecionado] = useState('');

  const q = useMemo(() => resumoQualidade({ apuracoes, colaboradores, periodo: {} }), [apuracoes, colaboradores]);
  const equipe = useMemo(() => diaADiaEquipeQualidade({ apuracoes, colaboradores, periodo: {} }), [apuracoes, colaboradores]);

  const { melhor: melhorMes, pior: piorMes } = useMemo(() => melhorEPior(q.meses, 'csat'), [q.meses]);
  const { melhor: melhorSemana, pior: piorSemana } = useMemo(() => melhorEPior(equipe.semanas, 'csat'), [equipe.semanas]);

  const opcoes = granularidade === 'mes'
    ? q.meses.map((m) => ({ chave: m.mes, rotulo: `${rotuloMes(m.mes)} · CSAT ${pct(m.csat)}` }))
    : equipe.semanas.map((s) => ({ chave: s.inicio, rotulo: `${dataCurta(s.inicio)} a ${dataCurta(s.fim)} · CSAT ${pct(s.csat)}` }));

  const chaveEfetiva = selecionado || (granularidade === 'mes' ? melhorMes?.mes : melhorSemana?.inicio) || '';

  const diasDoSelecionado = useMemo(() => {
    if (!chaveEfetiva) return [];
    if (granularidade === 'semana') {
      const semana = equipe.semanas.find((s) => s.inicio === chaveEfetiva);
      return semana ? semana.dias.filter(Boolean) : [];
    }
    return equipe.dias.filter((d) => d.dia.slice(0, 7) === chaveEfetiva);
  }, [chaveEfetiva, granularidade, equipe]);

  const { melhor: melhorDia, pior: piorDia } = useMemo(() => melhorEPior(diasDoSelecionado, 'csat'), [diasDoSelecionado]);

  if (!melhorMes) {
    return (
      <Cartao titulo="Preditivo">
        <p className="text-sm text-muted-foreground">Sem apuração suficiente no histórico pra achar um padrão ainda.</p>
      </Cartao>
    );
  }

  return (
    <Cartao titulo="Preditivo" className="space-y-5">
      <p className="text-sm text-muted-foreground -mt-2">
        Olha todo o histórico de apuração, não só o período filtrado acima.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-xl border border-success/25 bg-success-soft p-4">
          <TrendingUp className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" aria-hidden="true" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-success">Melhor mês</p>
            <p className="text-lg font-bold text-foreground">{rotuloMes(melhorMes.mes)}</p>
            <p className="text-sm text-muted-foreground">CSAT {pct(melhorMes.csat)}</p>
            {melhorSemana && (
              <p className="mt-1 text-xs text-muted-foreground">
                Melhor semana: {dataCurta(melhorSemana.inicio)} a {dataCurta(melhorSemana.fim)} · CSAT {pct(melhorSemana.csat)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/10 p-4">
          <TrendingDown className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-destructive">Pior mês</p>
            <p className="text-lg font-bold text-foreground">{rotuloMes(piorMes.mes)}</p>
            <p className="text-sm text-muted-foreground">CSAT {pct(piorMes.csat)}</p>
            {piorSemana && (
              <p className="mt-1 text-xs text-muted-foreground">
                Pior semana: {dataCurta(piorSemana.inicio)} a {dataCurta(piorSemana.fim)} · CSAT {pct(piorSemana.csat)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
        <div className="space-y-1">
          <Label className="text-xs">Ver por</Label>
          <Select value={granularidade} onValueChange={(v) => { setGranularidade(v); setSelecionado(''); }}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Mês</SelectItem>
              <SelectItem value="semana">Semana</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{granularidade === 'mes' ? 'Qual mês' : 'Qual semana'}</Label>
          <Select value={chaveEfetiva} onValueChange={setSelecionado}>
            <SelectTrigger className="w-64 max-w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {opcoes.map((o) => <SelectItem key={o.chave} value={o.chave}>{o.rotulo}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {diasDoSelecionado.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum dia apurado nesse período.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {melhorDia && <>Melhor dia: <span className="font-medium text-success">{dataCurta(melhorDia.dia)} ({diaSemanaCurto(melhorDia.dia)})</span>, CSAT {pct(melhorDia.csat)}. </>}
            {piorDia && piorDia.dia !== melhorDia?.dia && <>Pior dia: <span className="font-medium text-destructive">{dataCurta(piorDia.dia)} ({diaSemanaCurto(piorDia.dia)})</span>, CSAT {pct(piorDia.csat)}.</>}
          </p>
          <TabelaResumida
            linhas={diasDoSelecionado}
            chaveDaLinha={(d) => d.dia}
            classeDaLinha={(d) => (d.dia === melhorDia?.dia ? 'bg-success-soft' : d.dia === piorDia?.dia ? 'bg-destructive/10' : '')}
            colunas={[
              {
                chave: 'dia', rotulo: 'Dia', alinhar: 'esquerda', principal: true,
                valor: (d) => (
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    {dataCurta(d.dia)} <span className="text-xs text-muted-foreground">{diaSemanaCurto(d.dia)}</span>
                    {d.dia === melhorDia?.dia && <Badge className="bg-success text-success-foreground text-[10px]">melhor</Badge>}
                    {d.dia === piorDia?.dia && d.dia !== melhorDia?.dia && <Badge className="bg-destructive text-destructive-foreground text-[10px]">pior</Badge>}
                  </span>
                ),
              },
              { chave: 'csat', rotulo: 'CSAT', principal: true, valor: (d) => pct(d.csat) },
              { chave: 'csatTel', rotulo: 'CSAT tel.', principal: true, valor: (d) => pct(d.csatTelefone) },
              { chave: 'csatChat', rotulo: 'CSAT chat', principal: true, valor: (d) => pct(d.csatChat) },
              { chave: 'perf', rotulo: 'Performance', valor: (d) => pct(d.performance) },
              { chave: 'lig', rotulo: 'Ligações', valor: (d) => d.volumes.ligacoes },
              { chave: 'chats', rotulo: 'Chats', valor: (d) => d.volumes.chats },
            ]}
          />
        </>
      )}

      <ComoCalculamos>
        <p>Melhor/pior mês e semana comparam o CSAT da equipe (telefone + chat) em todo o histórico de apuração importado, sem o filtro de data de cima. Dentro do mês ou semana escolhido, o melhor e o pior dia usam o mesmo CSAT, por dia.</p>
      </ComoCalculamos>
    </Cartao>
  );
}
