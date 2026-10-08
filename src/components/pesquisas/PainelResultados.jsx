import React, { useMemo } from 'react';
import { quandoPorExtenso } from '@/lib/avd';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Cartao, Linha } from '@/components/ui/Cartao';
import TabelaResumida from '@/components/ui/TabelaResumida';
import { formatDateSP } from '@/components/utils/helpers';
import { SITUACOES, situacaoDaPesquisa, resultadoDasPerguntas, resumoDaPesquisa } from '@/lib/pesquisas';

/**
 * O resultado de uma pesquisa: o que foi respondido, e quem respondeu.
 *
 * Nas anônimas as duas coisas aparecem lado a lado mas não se ligam — é
 * exatamente o ponto do anonimato (migration 23).
 */
const num = (v, casas = 1) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: casas }));
const pct = (v) => (v === null || v === undefined ? '—' : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`);

export default function PainelResultados({ pesquisa, respostas, participacao, agendamentos = [], podeEditar, onVoltar, onEditar, onDuplicar, onReenviar, onArquivar, ocupado }) {
  const perguntas = useMemo(() => resultadoDasPerguntas(pesquisa, respostas), [pesquisa, respostas]);
  const resumo = useMemo(() => resumoDaPesquisa(pesquisa, respostas), [pesquisa, respostas]);
  const situacao = situacaoDaPesquisa(pesquisa);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onVoltar} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Todas as pesquisas
        </button>
        {podeEditar && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={onEditar} disabled={ocupado}>Editar</Button>
            <Button size="sm" variant="outline" onClick={onDuplicar} disabled={ocupado}>Duplicar</Button>
            <Button size="sm" variant="outline" onClick={onReenviar} disabled={ocupado}>Reenviar para quem falta</Button>
            <Button size="sm" variant="outline" onClick={onArquivar} disabled={ocupado}>Arquivar</Button>
          </div>
        )}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-5">
        <Cartao titulo={pesquisa.titulo} className="xl:col-span-2">
          {pesquisa.descricao && <p className="mb-3 text-sm text-muted-foreground">{pesquisa.descricao}</p>}
          <div className="divide-y divide-border border-t border-border">
            <Linha rotulo="Situação" valor={SITUACOES[situacao]} />
            <Linha
              rotulo="Responderam"
              detalhe={participacao.total ? `${pct(participacao.taxa)} da equipe` : null}
              valor={`${participacao.responderam.length} de ${participacao.total}`}
              forte
            />
            <Linha rotulo="Respostas gravadas" valor={resumo.respostas} />
            {resumo.media !== null && <Linha rotulo="Nota média" valor={num(resumo.media, 2)} />}
            <Linha rotulo="Quem responde" valor={pesquisa.anonima ? 'anônimo' : 'identificado'} />
            <Linha
              rotulo="Período"
              valor={pesquisa.data_inicio || pesquisa.data_fim
                ? `${pesquisa.data_inicio ? formatDateSP(pesquisa.data_inicio, 'DD/MM/YY') : '—'} a ${pesquisa.data_fim ? formatDateSP(pesquisa.data_fim, 'DD/MM/YY') : '—'}`
                : 'sem prazo'}
            />
          </div>
          {pesquisa.anonima && (
            <p className="mt-3 text-xs text-muted-foreground">
              Pesquisa anônima: o sistema sabe quem respondeu, mas não guarda qual resposta é de quem.
            </p>
          )}
        </Cartao>

        <Cartao titulo="Quem respondeu" className="xl:col-span-3">
          {participacao.total === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum colaborador ativo na lista.</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Responderam ({participacao.responderam.length})</p>
                {participacao.responderam.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ninguém ainda.</p>
                ) : (
                  <div className="divide-y divide-border border-t border-border">
                    {participacao.responderam.map((p) => (
                      <Linha
                        key={p.id}
                        rotulo={p.nome_completo}
                        valor={p.respondida_em ? formatDateSP(p.respondida_em, 'DD/MM/YY') : '—'}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Faltam ({participacao.faltam.length})</p>
                {participacao.faltam.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Todo mundo respondeu.</p>
                ) : (
                  <div className="divide-y divide-border border-t border-border">
                    {participacao.faltam.map((p) => {
                      const ag = agendamentos.find((a) => a.colaborador_id === p.id);
                      return <Linha key={p.id} rotulo={p.nome_completo} valor={ag ? `agendou para ${quandoPorExtenso(ag.agendada_para)}` : '—'} />;
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          {participacao.deDesligados.length > 0 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Mais {participacao.deDesligados.length} resposta(s) de quem não está mais na equipe.
            </p>
          )}
        </Cartao>
      </div>

      {perguntas.map((p, i) => (
        <Cartao key={p.id} titulo={`${i + 1}. ${p.texto}`} extra={<span className="text-xs text-muted-foreground">{p.respondidas} resposta(s)</span>}>
          {p.media !== null && (
            <p className="mb-2 text-2xl font-bold tabular-nums text-foreground">{num(p.media, 2)}<span className="ml-2 text-sm font-normal text-muted-foreground">média</span></p>
          )}
          {p.opcoes.length > 0 && (
            <div className="divide-y divide-border border-t border-border">
              {p.opcoes.map((o) => (
                <Linha key={o.opcao} rotulo={o.opcao} detalhe={pct(o.parte)} valor={o.vezes} />
              ))}
            </div>
          )}
          {p.textos.length > 0 && (
            <TabelaResumida
              linhas={p.textos.map((t, idx) => ({ id: `${p.id}-${idx}`, texto: t }))}
              chaveDaLinha={(l) => l.id}
              rotuloDetalhe="Ver a resposta inteira"
              limite={8}
              rotulo="respostas"
              colunas={[{ chave: 'texto', rotulo: 'Resposta', alinhar: 'esquerda', principal: true, valor: (l) => l.texto }]}
            />
          )}
          {p.opcoes.length === 0 && p.textos.length === 0 && p.media === null && (
            <p className="text-sm text-muted-foreground">Sem respostas nesta pergunta.</p>
          )}
        </Cartao>
      ))}
    </div>
  );
}
