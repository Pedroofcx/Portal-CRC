import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DialogoBonus from '@/components/ciclo/DialogoBonus';
import { ciclosEmOrdem } from '@/lib/bonusManual';
import { createPageUrl } from '@/utils';
import IconeExigencia from '@/components/ciclo/IconeExigencia';

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
                  <td className="px-2 text-right font-semibold tabular-nums text-foreground">{fmt(a.totalPontos)}</td>
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
