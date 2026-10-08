import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DialogoBonus from '@/components/ciclo/DialogoBonus';
import { ciclosEmOrdem } from '@/lib/bonusManual';
import { createPageUrl } from '@/utils';
import IconeExigencia from '@/components/ciclo/IconeExigencia';
import { cicloExigeRegistroDaEquipe, canaisLiberadosDaEquipe } from '@/lib/pontuacaoCiclo';
import { primeiroNome } from '@/lib/nomes';

/**
 * Tela inicial do gestor — proposta C, "O ciclo".
 *
 * Quatro números do ciclo e uma tabela: uma linha por agente, com pontos, o
 * ritmo das últimas 6 semanas e cada exigência de elegibilidade (cumprida,
 * pendente, sem dado). A matriz deixa comparar sem ler — quem está fora da
 * premiação salta aos olhos. Clicar numa pessoa abre a página detalhada dela.
 */

const DIA = 24 * 3600 * 1000;
const fmt = (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dataCurta = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '—');
/** Os 4 canais, na ordem da premiação, com a sigla da tabela. */
const CANAIS_DA_TABELA = [
  { chave: 'reclame_aqui', sigla: 'R.A.', nome: 'Reclame Aqui' },
  { chave: 'google_meu_negocio', sigla: 'GMN', nome: 'Google Meu Negócio' },
  { chave: 'contestacao', sigla: 'Contest.', nome: 'Contestação de compra' },
  { chave: 'reclamacao_interna', sigla: 'R.I.', nome: 'Reclamação interna' },
];

/** Registros de cada canal no ciclo. O canal só pontua quando TODOS da equipe têm registro nele. */
export function ContadorPorCanal({ volume = {}, liberados = [], regraValendo }) {
  return (
    <span className="mx-auto grid w-[9.5rem] grid-cols-2 gap-1">
      {CANAIS_DA_TABELA.map((c) => {
        const n = volume[c.chave] ?? 0;
        const liberado = liberados.includes(c.chave);
        const bloqueando = regraValendo && !liberado && n === 0;
        const classe = !regraValendo ? (n > 0 ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground')
          : liberado ? 'bg-success-soft text-success'
            : bloqueando ? 'bg-warning-soft text-warning' : 'bg-muted text-foreground';
        const titulo = !regraValendo ? `${c.nome}: ${n} registro${n === 1 ? '' : 's'}`
          : liberado ? `${c.nome}: ${n} registro${n === 1 ? '' : 's'} — canal liberado, conta para a pontuação`
            : bloqueando ? `${c.nome}: sem registro — falta esta pessoa para o canal ser liberado`
              : `${c.nome}: ${n} registro${n === 1 ? '' : 's'} — canal ainda não liberado (falta alguém da equipe)`;
        return (
          <span key={c.chave} title={titulo} className={`flex items-baseline justify-between gap-1 rounded px-1.5 py-0.5 text-[11px] tabular-nums ${classe}`}>
            <span>{c.sigla}</span>
            <span className="font-semibold">{n}</span>
          </span>
        );
      })}
    </span>
  );
}

/** Página detalhada da pessoa; com `cicloId`, abre naquele ciclo do histórico. */
export const urlDaPessoa = (id, cicloId) => `${createPageUrl('CicloColaborador')}?id=${encodeURIComponent(id)}${cicloId ? `&ciclo=${encodeURIComponent(cicloId)}` : ''}`;

function Numero({ rotulo, valor, detalhe }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <p className="mt-0.5 text-2xl font-bold tracking-tight tabular-nums text-foreground">{valor}</p>
      {detalhe && <p className="text-xs text-muted-foreground">{detalhe}</p>}
    </div>
  );
}

export function Ritmo({ semanas, className = 'h-5 w-16' }) {
  const maior = Math.max(1, ...semanas.map((s) => s.pontos));
  return (
    <span className={`inline-flex items-end gap-0.5 ${className}`} aria-label="Pontos por semana nas últimas 6 semanas">
      {semanas.map((s, i) => (
        <span
          key={s.inicio.toISOString()}
          title={`Semana de ${s.inicio.toLocaleDateString('pt-BR')}: ${fmt(s.pontos)} pts`}
          className={`flex-1 rounded-sm ${i === semanas.length - 1 ? 'bg-primary' : 'bg-primary/25'}`}
          style={{ height: `${Math.max(8, (s.pontos / maior) * 100)}%` }}
        />
      ))}
    </span>
  );
}

function Avatar({ nome, foto }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-muted-foreground">
      {foto ? <img src={foto} alt="" className="h-full w-full object-cover" /> : nome?.charAt(0)}
    </span>
  );
}

export default function PainelCicloGestor({
  ciclo, cicloAtivo, ciclos = [], aoEscolherCiclo, agentes, exigencias, equipe, agora, isLoading, gestor,
}) {
  const navigate = useNavigate();
  const [bonusAberto, setBonusAberto] = useState(false);

  if (!ciclo) {
    return (
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Ciclo de premiação</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Nenhum ciclo está ativo.{' '}
          <Link to={createPageUrl('ConfigElegibilidade')} className="font-medium text-primary hover:underline">
            Abrir um ciclo
          </Link>
        </p>
      </section>
    );
  }

  const fim = new Date(`${ciclo.data_fim}T23:59:59`);
  const encerrado = fim < agora;
  const dias = Math.ceil((fim - agora) / DIA);
  // Histórico: um ciclo que não é o ativo. O aviso de "abra o próximo" só
  // faz sentido para o ativo que já passou do fim.
  const historico = ciclo.id !== cicloAtivo?.id;
  const cicloIdDaUrl = historico ? ciclo.id : null;
  const regraDoVolume = cicloExigeRegistroDaEquipe(ciclo);
  const liberacao = canaisLiberadosDaEquipe(agentes.map((a) => ({ id: a.id, volume: a.volume })));
  const nomeDe = (id) => primeiroNome(agentes.find((a) => a.id === id)?.nome ?? '');

  return (
    <section className="space-y-4" aria-labelledby="titulo-ciclo-gestor">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Numero
          rotulo={ciclo.nome}
          valor={encerrado ? 'Encerrado' : `${dias} dia${dias === 1 ? '' : 's'}`}
          detalhe={encerrado ? `terminou em ${dataCurta(ciclo.data_fim)}` : `para fechar · ${dataCurta(ciclo.data_inicio)} a ${dataCurta(ciclo.data_fim)}`}
        />
        <Numero rotulo="Pontos da equipe no ciclo" valor={fmt(equipe.pontos)} />
        <Numero
          rotulo="Encerradas no SLA (ciclo)"
          valor={equipe.noSla === null ? '—' : `${Math.round(equipe.noSla)}%`}
        />
        <Numero
          rotulo="Sem exigência pendente"
          valor={`${equipe.semPendencia} de ${agentes.length}`}
          detalhe="sem dado não conta como pendente"
        />
      </div>

      {encerrado && !historico && (
        <p className="rounded-lg bg-warning-soft px-4 py-2.5 text-sm text-foreground">
          O {ciclo.nome} terminou em {dataCurta(ciclo.data_fim)}. A pontuação abaixo é a final dele —{' '}
          <Link to={createPageUrl('ConfigElegibilidade')} className="font-medium text-primary hover:underline">
            abra o próximo ciclo
          </Link>{' '}
          para começar a contar de novo.
        </p>
      )}

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 id="titulo-ciclo-gestor" className="text-base font-semibold text-foreground">Ranking e elegibilidade do ciclo</h2>
            <p className="hidden text-xs text-muted-foreground sm:block">Clique numa pessoa para ver em detalhe</p>
            <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
              {regraDoVolume
                ? 'Regra para pontuar (Estrutura de Trabalho): um canal só conta quando TODOS os colaboradores têm pelo menos 1 tratativa nele no ciclo. Enquanto um não tiver, os pontos daquele canal — de todo mundo — ficam retidos, fora do total e do ranking, e passam a contar quando o último registrar. Se o trimestre acabar assim, o canal é desconsiderado.'
                : 'Este ciclo já foi apurado sem a regra de liberação dos canais (ela vale do Ciclo 3 em diante). Os contadores mostram os registros de cada canal.'}
            </p>
            {regraDoVolume && liberacao.participantes > 0 && (
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {CANAIS_DA_TABELA.map((c) => (liberacao.liberados.includes(c.chave)
                  ? <span key={c.chave} className="text-success"><span className="font-semibold">{c.nome}</span>: liberado</span>
                  : (
                    <span key={c.chave} className="text-warning">
                      <span className="font-semibold">{c.nome}</span>: aguardando {liberacao.faltam[c.chave].map(nomeDe).filter(Boolean).join(', ')}
                    </span>
                  )))}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Histórico: os ciclos encerrados ficam a um clique, do mais recente ao mais antigo. */}
            <Select value={ciclo.id} onValueChange={aoEscolherCiclo}>
              <SelectTrigger className="h-9 w-auto min-w-44" aria-label="Ciclo exibido">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ciclosEmOrdem(ciclos).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}{c.id === cicloAtivo?.id ? ' · ativo' : ` · ${dataCurta(c.data_inicio)} a ${dataCurta(c.data_fim)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={() => setBonusAberto(true)}>
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" /> Lançar bônus
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Calculando o ciclo…</p>
        ) : agentes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhum agente ativo no ranking.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-2 font-medium">Agente</th>
                <th className="pb-2 px-2 text-right font-medium">Pontos</th>
                <th className="hidden pb-2 px-2 text-center font-medium md:table-cell">
                  Registros por canal
                  <span className="block text-[11px] font-normal">1 de cada pessoa libera o canal</span>
                </th>
                <th className="hidden whitespace-nowrap pb-2 px-2 font-medium lg:table-cell">Ritmo 6 sem.</th>
                {exigencias.map((e) => (
                  <th key={e.id} className="hidden pb-2 px-2 text-center font-medium md:table-cell" title={e.nome_exigencia}>
                    <span className="mx-auto line-clamp-2 block w-24">{e.nome_exigencia}</span>
                  </th>
                ))}
                <th className="pb-2 px-2 text-center font-medium md:hidden">Exigências</th>
                <th className="w-6 pb-2" aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {agentes.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => navigate(urlDaPessoa(a.id, cicloIdDaUrl))}
                  className="cursor-pointer border-t border-border transition-colors hover:bg-muted/50"
                >
                  {/* w-full + max-w-0: a coluna do nome fica com o que sobra e o
                      nome longo encolhe com "…", em vez de empurrar a tabela
                      para fora da tela no celular. */}
                  <td className="w-full max-w-0 py-2.5 pr-2">
                    <Link to={urlDaPessoa(a.id, cicloIdDaUrl)} className="flex min-w-0 items-center gap-2 font-medium text-foreground" onClick={(ev) => ev.stopPropagation()}>
                      <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">{a.posicao?.posicao}º</span>
                      <Avatar nome={a.nome} foto={a.foto} />
                      <span className="truncate" title={a.nome}>{a.nome}</span>
                    </Link>
                  </td>
                  <td className="px-2 text-right font-semibold tabular-nums text-foreground">
                    {fmt(a.totalPontos)}
                    {regraDoVolume && a.pontosRetidos > 0 && (
                      <span className="block text-[11px] font-normal text-warning" title="Pontos de canais que a equipe ainda não liberou (falta registro de alguém): não entram no total">
                        +{fmt(a.pontosRetidos)} retidos
                      </span>
                    )}
                  </td>
                  <td className="hidden px-2 md:table-cell">
                    <ContadorPorCanal volume={a.volume} liberados={liberacao.liberados} regraValendo={regraDoVolume} />
                  </td>
                  <td className="hidden px-2 lg:table-cell"><Ritmo semanas={a.semanas} /></td>
                  {a.avaliacoes.map((av) => (
                    <td key={av.exigencia.id} className="hidden px-2 md:table-cell">
                      <span className="flex justify-center">
                        <IconeExigencia status={av.status} titulo={av.detalhe} />
                      </span>
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-2 text-center text-xs tabular-nums md:hidden">
                    <span className={a.pendencias ? 'font-semibold text-warning' : 'text-muted-foreground'}>
                      {a.pendencias ? `${a.pendencias} pendente${a.pendencias === 1 ? '' : 's'}` : 'ok'}
                    </span>
                  </td>
                  <td className="text-muted-foreground"><ChevronRight className="h-4 w-4" aria-hidden="true" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><IconeExigencia status="ok" className="h-3.5 w-3.5" /> cumprida</span>
          <span className="inline-flex items-center gap-1"><IconeExigencia status="pendente" className="h-3.5 w-3.5" /> pendente</span>
          <span className="inline-flex items-center gap-1"><IconeExigencia status="sem_dado" className="h-3.5 w-3.5" /> sem dado ainda</span>
          {historico && <span>Exigências conferidas pelas regras de hoje.</span>}
        </p>
      </div>

      <DialogoBonus
        open={bonusAberto}
        onOpenChange={setBonusAberto}
        ciclo={ciclo}
        pessoas={agentes.map((a) => ({ id: a.id, nome: a.nome }))}
        gestor={gestor}
        agora={agora}
      />
    </section>
  );
}
