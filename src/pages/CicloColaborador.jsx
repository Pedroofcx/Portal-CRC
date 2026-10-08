import db from '@/api/db';
import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import DialogoBonus from '@/components/ciclo/DialogoBonus';
import { createPageUrl } from '@/utils';
import { tipoTratativaLabels } from '@/components/utils/helpers';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ListaResumida from '@/components/ui/ListaResumida';
import IconeExigencia from '@/components/ciclo/IconeExigencia';
import { useCicloEquipe } from '@/hooks/useCicloEquipe';
import { pontosDaFaixa, proximaFaixa } from '@/lib/faixasIndicadores';
import { detalheCsat } from '@/lib/indicadoresCiclo';
import { prazoDaTratativa, descreverPrazo } from '@/lib/prazoSla';
import { acompanhamentoDa, ordenarPorPrazo, situacaoDoPrazo } from '@/lib/cicloEquipe';
import { primeiroNome } from '@/lib/nomes';
import { Cartao, Linha } from '@/components/ui/Cartao';

/**
 * Visão detalhada de uma pessoa no ciclo — aberta pelo gestor a partir do
 * ranking da tela inicial.
 *
 * Ordem (posição serial): o resultado primeiro — pontos, de onde vieram,
 * ritmo, elegibilidade —, a rotina no fim — tratativas abertas e o
 * acompanhamento (PDI, feedback, Hansei, férias). Tudo com as mesmas contas
 * do ranking e do "Meu ciclo" do operador, via useCicloEquipe.
 */

const CANAIS = ['reclame_aqui', 'reclamacao_interna', 'google_meu_negocio', 'contestacao'];
const canalDe = (tipo) => (tipo === 'contestacao_compra' ? 'contestacao' : tipo);
const fmt = (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dataCurta = (iso) => (iso ? `${String(iso).slice(8, 10)}/${String(iso).slice(5, 7)}` : '—');
const pct = (v) => `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
const nota = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

export default function CicloColaborador() {
  const { search } = useLocation();
  const parametros = new URLSearchParams(search);
  const id = parametros.get('id');
  const cicloParam = parametros.get('ciclo');
  const queryClient = useQueryClient();
  const [bonusAberto, setBonusAberto] = useState(false);
  const [apagando, setApagando] = useState(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => db.auth.me() });
  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores', "list()"],
    queryFn: () => db.entities.Colaborador.list(),
  });
  const eu = colaboradores.find((c) => c.email?.toLowerCase() === user?.email?.toLowerCase());
  const isGestor = eu?.papel === 'gestor';

  const { ciclo, cicloAtivo, agentes, agora, isLoading } = useCicloEquipe(cicloParam);
  const historico = Boolean(ciclo && ciclo.id !== cicloAtivo?.id);
  const pessoa = agentes.find((a) => a.id === id) ?? null;

  const habilitado = Boolean(id) && isGestor;
  const { data: pdis = [] } = useQuery({
    queryKey: ['pdis-colaborador', id],
    queryFn: () => db.entities.PDI.filter({ colaborador_id: id }),
    enabled: habilitado,
  });
  const { data: hanseis = [] } = useQuery({
    queryKey: ['hansei-colaborador', id],
    queryFn: () => db.entities.HanseiEnvio.filter({ colaborador_id: id }, '-data_envio', 20),
    enabled: habilitado,
  });
  const { data: ciclosFerias = [] } = useQuery({
    queryKey: ['ciclos-ferias-colaborador', id],
    queryFn: () => db.entities.CicloFerias.filter({ colaborador_id: id }),
    enabled: habilitado,
  });
  const { data: observacoes = [] } = useQuery({
    queryKey: ['observacoes', "list('-created_date', 500)"],
    queryFn: () => db.entities.Observacao.list('-created_date', 500),
    enabled: habilitado,
    staleTime: 120000,
  });

  const acompanhamento = useMemo(
    () => acompanhamentoDa(id, { pdis, observacoes, hanseis, ciclosFerias }, agora),
    [id, pdis, observacoes, hanseis, ciclosFerias, agora],
  );

  const porCanal = useMemo(() => {
    const soma = Object.fromEntries(CANAIS.map((c) => [c, { pontos: 0, n: 0 }]));
    (pessoa?.itens ?? []).forEach((i) => {
      const canal = canalDe(i.tipo_tratativa);
      if (canal in soma) { soma[canal].pontos += i.pontos; soma[canal].n += 1; }
    });
    return soma;
  }, [pessoa]);

  const abertasOrdenadas = useMemo(() => ordenarPorPrazo(pessoa?.tratativasAbertas ?? []), [pessoa]);

  const apagarBonus = useMutation({
    mutationFn: (bonusId) => db.entities.Pontuacao.delete(bonusId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonus-manual'] });
      toast.success('Lançamento apagado. O ranking já foi recalculado.');
      setApagando(null);
    },
    onError: (e) => toast.error(`Não foi possível apagar: ${e.message}`),
  });

  if (!user || !colaboradores.length || isLoading) return <LoadingSpinner text="Carregando o ciclo…" />;

  const voltar = (
    <Link
      to={`${createPageUrl('Dashboard')}${historico ? `?ciclo=${encodeURIComponent(ciclo.id)}` : ''}`}
      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Ranking do ciclo
    </Link>
  );

  if (!isGestor) {
    return (
      <div className="space-y-4">
        {voltar}
        <Cartao><p className="text-sm text-muted-foreground">Esta página é da visão do gestor. A sua pontuação está em “Meu ciclo”, na tela inicial.</p></Cartao>
      </div>
    );
  }

  if (!pessoa) {
    return (
      <div className="space-y-4">
        {voltar}
        <Cartao><p className="text-sm text-muted-foreground">Esta pessoa não está no ranking deste ciclo — pode estar inativa ou não ser agente.</p></Cartao>
      </div>
    );
  }

  const { posicao } = pessoa;
  const indice = agentes.findIndex((a) => a.id === pessoa.id);
  const acima = agentes.slice(0, indice).reverse().find((a) => a.totalPontos > pessoa.totalPontos) ?? null;
  const abaixo = agentes.slice(indice + 1).find((a) => a.totalPontos < pessoa.totalPontos) ?? null;
  const media = pessoa.semanas.reduce((acc, s) => acc + s.pontos, 0) / (pessoa.semanas.length || 1);
  const maiorSemana = Math.max(1, ...pessoa.semanas.map((s) => s.pontos));
  const esta = pessoa.semanas[pessoa.semanas.length - 1]?.pontos ?? 0;
  const cicloEncerrado = new Date(`${ciclo.data_fim}T23:59:59`) < agora;
  const volumeMinimo = Number(pessoa.avaliacoes.find((a) => a.exigencia.tipo_validacao === 'volume_minimo_canal')?.exigencia.volume_minimo_canal ?? 4);
  const cumpridas = pessoa.avaliacoes.filter((a) => a.status === 'ok').length;
  const { indicadores } = pessoa;

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

  const { pdi, feedback, hansei, ferias } = acompanhamento;

  return (
    <div className="space-y-6">
      {voltar}

      {/* Cabeçalho: quem, qual ciclo, onde está */}
      <Cartao>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-lg font-semibold text-muted-foreground">
            {pessoa.foto ? <img src={pessoa.foto} alt="" className="h-full w-full object-cover" /> : pessoa.nome?.charAt(0)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">{pessoa.nome}</h1>
            <p className="text-sm text-muted-foreground">
              {ciclo.nome} · {dataCurta(ciclo.data_inicio)} a {dataCurta(ciclo.data_fim)}
              {historico && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">histórico</span>}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground">Posição</p>
            <p className="text-2xl font-bold tracking-tight tabular-nums text-foreground">
              {posicao?.posicao}º · {fmt(pessoa.totalPontos)} pts
            </p>
            <p className="text-xs text-muted-foreground">
              {acima
                ? `${fmt(acima.totalPontos - pessoa.totalPontos)} atrás de ${primeiroNome(acima.nome)}`
                : abaixo ? `${fmt(pessoa.totalPontos - abaixo.totalPontos)} à frente de ${primeiroNome(abaixo.nome)}` : 'na liderança'}
            </p>
          </div>
        </div>
      </Cartao>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* De onde vieram os pontos */}
        <Cartao titulo="De onde vieram os pontos">
          <div className="divide-y divide-border">
            {CANAIS.map((c) => (
              <Linha
                key={c}
                rotulo={tipoTratativaLabels[c]}
                detalhe={[
                  `${porCanal[c].n} encerrada${porCanal[c].n === 1 ? '' : 's'} no ciclo`,
                  pessoa.retidos?.[c]?.pontos > 0 ? `${fmt(pessoa.retidos[c].pontos)} pts retidos: só ${pessoa.retidos[c].registros} de ${volumeMinimo} registros` : null,
                ].filter(Boolean).join(' · ')}
                valor={fmt(porCanal[c].pontos)}
              />
            ))}
            <Linha rotulo="Indicadores (CSAT, performance e CX)" valor={fmt(pessoa.pontosIndicadores ?? 0)} />
            <Linha
              rotulo="Tratativas abertas no ciclo"
              detalhe={`${pessoa.aberturas?.length ?? 0} × 0,5`}
              valor={fmt(pessoa.pontosAbertura ?? 0)}
            />
            <Linha rotulo="Bônus lançado pelo gestor" valor={fmt(pessoa.bonus)} />
            <Linha rotulo="Total" valor={fmt(pessoa.totalPontos)} forte />
          </div>
        </Cartao>

        {/* Bônus do ciclo: cada lançamento, com o motivo e quem lançou */}
        <Cartao
          titulo="Bônus do ciclo"
          extra={(
            <Button size="sm" variant="outline" onClick={() => setBonusAberto(true)}>
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Lançar bônus
            </Button>
          )}
        >
          {pessoa.lancamentosBonus.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum bônus lançado neste ciclo.</p>
          ) : (
            <ListaResumida
              className="divide-y divide-border"
              limite={5}
              rotulo="lançamentos"
              itens={pessoa.lancamentosBonus}
              renderItem={(b) => (
                <div key={b.id} className="flex items-start justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block text-foreground">{b.descricao || 'Sem motivo registrado'}</span>
                    <span className="block text-xs text-muted-foreground">
                      {dataCurta(b.created_date)}/{String(b.created_date ?? '').slice(0, 4)}
                      {b.lancado_por_nome ? ` · por ${primeiroNome(b.lancado_por_nome)}` : ''}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <span className="font-semibold tabular-nums text-foreground">+{fmt(b.total_pontos)}</span>
                    <button
                      type="button"
                      onClick={() => setApagando(b)}
                      className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                      aria-label={`Apagar o bônus de ${fmt(b.total_pontos)} pontos`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                </div>
              )}
            />
          )}
        </Cartao>

        {/* Ritmo */}
        <Cartao titulo="Ritmo por semana" extra={<span className="text-xs text-muted-foreground">pontos por semana</span>}>
          <div className="flex h-36 items-end gap-2" aria-label="Pontos por semana nas últimas 6 semanas">
            {pessoa.semanas.map((s, i) => (
              <div key={s.inicio.toISOString()} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="text-xs font-semibold tabular-nums text-foreground">{fmt(s.pontos)}</span>
                <span
                  className={`w-full rounded-t ${i === pessoa.semanas.length - 1 ? 'bg-primary' : 'bg-primary/25'}`}
                  style={{ height: `${Math.max(4, (s.pontos / maiorSemana) * 70)}%` }}
                />
                <span className="text-xs text-muted-foreground">{s.inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Média de {fmt(media)} por semana. {cicloEncerrado ? 'Última semana do ciclo' : 'Esta semana'}: <span className="font-semibold text-foreground">{fmt(esta)}</span>
            {pessoa.noSla !== null && <> · {Math.round(pessoa.noSla)}% das encerradas no SLA</>}.
          </p>
        </Cartao>

        {/* Elegibilidade */}
        <Cartao
          titulo="Elegibilidade para a premiação"
          extra={<span className="text-xs font-medium text-muted-foreground">{cumpridas} de {pessoa.avaliacoes.length} cumpridas</span>}
        >
          {pessoa.avaliacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma exigência cadastrada.</p>
          ) : (
            <ul className="space-y-2.5">
              {pessoa.avaliacoes.map((a) => (
                <li key={a.exigencia.id} className="flex items-start gap-2 text-sm">
                  <IconeExigencia status={a.status} className="mt-0.5 h-4 w-4" />
                  <span>
                    <span className="block font-medium text-foreground">{a.exigencia.nome_exigencia}</span>
                    <span className="block text-xs text-muted-foreground">{a.detalhe}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Registros por canal · mínimo {volumeMinimo}
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {CANAIS.map((c) => {
              const n = pessoa.volume[c];
              const conta = n >= volumeMinimo;
              return (
                <span
                  key={c}
                  className={`flex items-center justify-between rounded-md px-2 py-1 text-xs ${conta ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground'}`}
                  title={conta ? 'Este canal conta para a premiação' : `Faltam ${volumeMinimo - n} para o canal contar`}
                >
                  <span className="truncate">{tipoTratativaLabels[c]}</span>
                  <span className="font-semibold tabular-nums">{n}/{volumeMinimo}</span>
                </span>
              );
            })}
          </div>
        </Cartao>

        <div className="space-y-6">
          {/* Indicadores */}
          <Cartao titulo="Indicadores do ciclo — valem até 10 cada">
            <div className="divide-y divide-border">
              {linhaIndicador('csat', 'CSAT', indicadores.csat, pct)}
              {linhaIndicador('performance', 'Performance', indicadores.performance, pct)}
              {linhaIndicador('cx', 'Avaliação CX', indicadores.cx, nota)}
            </div>
          </Cartao>

          {/* Distância */}
          <Cartao titulo="Distância no ranking">
            <div className="space-y-2 text-sm">
              {acima ? (
                <p>
                  <span className="font-semibold text-foreground">{fmt(acima.totalPontos - pessoa.totalPontos)} pts</span>{' '}
                  <span className="text-muted-foreground">para alcançar {primeiroNome(acima.nome)} ({acima.posicao?.posicao}º, {fmt(acima.totalPontos)})</span>
                </p>
              ) : (
                <p className="font-medium text-foreground">Na liderança do ciclo.</p>
              )}
              {abaixo && (
                <p>
                  <span className="font-semibold text-foreground">{fmt(pessoa.totalPontos - abaixo.totalPontos)} pts</span>{' '}
                  <span className="text-muted-foreground">à frente de {primeiroNome(abaixo.nome)} ({abaixo.posicao?.posicao}º, {fmt(abaixo.totalPontos)})</span>
                </p>
              )}
            </div>
          </Cartao>
        </div>

        {/* Tratativas abertas */}
        <Cartao
          titulo="Tratativas abertas agora"
          extra={pessoa.vencidas > 0
            ? <span className="rounded-full bg-critical-soft px-2 py-0.5 text-xs font-semibold text-critical">{pessoa.vencidas} vencida{pessoa.vencidas === 1 ? '' : 's'}</span>
            : <span className="text-xs text-muted-foreground">{pessoa.abertas} aberta{pessoa.abertas === 1 ? '' : 's'}</span>}
        >
          {abertasOrdenadas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma tratativa aberta.</p>
          ) : (
            <ListaResumida
              className="divide-y divide-border"
              limite={5}
              rotulo="tratativas abertas"
              feminino
              verTodosHref={`${createPageUrl('Tratativas')}?agente=${encodeURIComponent(pessoa.id)}&situacao=abertas`}
              itens={abertasOrdenadas}
              renderItem={(t) => {
                const vencida = situacaoDoPrazo(t, agora) === 'vencida';
                return (
                  <Link
                    key={t.id}
                    to={`${createPageUrl('Tratativas')}?aberta=${encodeURIComponent(t.id)}`}
                    className="flex items-center justify-between gap-3 py-2 text-sm hover:bg-muted/50"
                  >
                    <span className="min-w-0 truncate text-foreground">
                      <span className="font-semibold">{t.id_interno || 'Tratativa'}</span>
                      {' · '}{t.nome_cliente || tipoTratativaLabels[canalDe(t.tipo_tratativa)] || '—'}
                    </span>
                    <span className={`shrink-0 text-xs ${vencida ? 'font-semibold text-critical' : 'text-muted-foreground'}`}>
                      {descreverPrazo(prazoDaTratativa(t), agora)}
                    </span>
                  </Link>
                );
              }}
            />
          )}
        </Cartao>

        {/* Acompanhamento */}
        <Cartao titulo="Acompanhamento">
          <div className="divide-y divide-border">
            <Linha
              rotulo="PDI"
              detalhe={pdi ? pdi.titulo : null}
              valor={pdi ? `${Math.round(pdi.percentual)}% concluído` : 'nenhum em andamento'}
            />
            <Linha
              rotulo="Último feedback"
              detalhe={feedback?.titulo}
              valor={feedback ? (feedback.dias === 0 ? 'hoje' : `há ${feedback.dias} dia${feedback.dias === 1 ? '' : 's'}`) : 'nenhum registrado'}
            />
            <Linha
              rotulo="Último Hansei enviado"
              detalhe={hansei ? (hansei.visualizado ? 'visualizado' : 'ainda não visualizado') : null}
              valor={hansei ? dataCurta(hansei.data) : 'nenhum'}
            />
            <Linha
              rotulo="Próximas férias"
              valor={ferias ? `${dataCurta(ferias.inicio)} a ${dataCurta(ferias.fim)}${ferias.dias ? ` · ${ferias.dias} dias` : ''}` : 'nenhuma marcada'}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Link to={createPageUrl('PDI')} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">PDI <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
            <Link to={createPageUrl('Observacoes')} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">Feedbacks <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
            <Link to={createPageUrl('Hansei')} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">Hansei <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
          </div>
        </Cartao>
      </div>

      <DialogoBonus
        open={bonusAberto}
        onOpenChange={setBonusAberto}
        ciclo={ciclo}
        pessoaFixa={{ id: pessoa.id, nome: pessoa.nome }}
        gestor={eu}
        agora={agora}
      />
      <ConfirmDialog
        open={Boolean(apagando)}
        onOpenChange={(aberto) => { if (!aberto) setApagando(null); }}
        title="Apagar este bônus?"
        description={apagando ? `${fmt(apagando.total_pontos)} pontos para ${primeiroNome(pessoa.nome)} — “${apagando.descricao || 'sem motivo'}”. Os pontos saem do ranking na hora.` : ''}
        confirmLabel="Apagar"
        onConfirm={() => apagarBonus.mutate(apagando.id)}
      />

      <p className="text-xs text-muted-foreground">
        Pontos = tratativas encerradas no ciclo + 0,5 por tratativa aberta no ciclo + indicadores + bônus do gestor, a mesma conta do ranking e do “Meu ciclo” do operador.
      </p>
    </div>
  );
}
