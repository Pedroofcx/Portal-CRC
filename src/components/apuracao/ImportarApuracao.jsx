import React, { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Cartao, Linha } from '@/components/ui/Cartao';
import { lerCsv } from '@/lib/csv';
import {
  CAMPOS, FONTES, conferirImportacao, detectarFonte, sugerirMapeamento,
} from '@/lib/apuracao/importacao';

/**
 * Importar a apuração em uma tela só: escolher o arquivo, conferir o de-para
 * (que vem pronto do que já foi corrigido antes), ver o que entra e o que
 * sai, e só então salvar.
 *
 * O assistente antigo tinha cinco passos, pedia o mês à mão e lia o CSV com
 * um split por vírgula. Aqui o período sai do arquivo e a leitura respeita
 * aspas (src/lib/csv.js).
 */
const brDate = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—');

export default function ImportarApuracao({ colaboradores, mapeamentos = [], apuracoes = [], salvando, onSalvar }) {
  const entrada = useRef(null);
  const [arquivo, setArquivo] = useState(null);
  const [leitura, setLeitura] = useState(null);
  const [fonte, setFonte] = useState('');
  const [mapeamento, setMapeamento] = useState({});
  const [vinculos, setVinculos] = useState({});

  const tipo = FONTES.find((f) => f.valor === fonte)?.tipo ?? '';
  const lembrado = useMemo(() => mapeamentos.find((m) => m.fonte === fonte) ?? null, [mapeamentos, fonte]);

  const conferencia = useMemo(() => (leitura && tipo
    ? conferirImportacao({
      tipo,
      linhas: leitura.linhas,
      mapeamento,
      colaboradores,
      vinculos,
      apuracoesExistentes: apuracoes,
    })
    : null), [leitura, tipo, mapeamento, colaboradores, vinculos, apuracoes]);

  const escolherArquivo = async (evento) => {
    const file = evento.target.files?.[0];
    if (!file) return;
    const texto = await file.text();
    const r = lerCsv(texto);
    if (r.linhas.length === 0) {
      toast.error(r.avisos[0] || 'Não consegui ler este arquivo.');
      return;
    }

    const detectada = detectarFonte(r.colunas);
    const doBanco = mapeamentos.find((m) => m.fonte === detectada) ?? null;
    const tipoDetectado = FONTES.find((f) => f.valor === detectada)?.tipo ?? '';

    setArquivo(file);
    setLeitura(r);
    setFonte(detectada ?? '');
    setMapeamento(tipoDetectado ? sugerirMapeamento(r.colunas, tipoDetectado, doBanco?.colunas ?? {}) : {});
    setVinculos(doBanco?.agentes ?? {});
    r.avisos.forEach((a) => toast.warning(a));
    toast.success(`${r.linhas.length} linha(s) lidas${detectada ? ` — reconheci como ${FONTES.find((f) => f.valor === detectada).rotulo}` : ''}.`);
  };

  const trocarFonte = (nova) => {
    setFonte(nova);
    const doBanco = mapeamentos.find((m) => m.fonte === nova) ?? null;
    const novoTipo = FONTES.find((f) => f.valor === nova)?.tipo ?? '';
    setMapeamento(leitura && novoTipo ? sugerirMapeamento(leitura.colunas, novoTipo, doBanco?.colunas ?? {}) : {});
    setVinculos(doBanco?.agentes ?? {});
  };

  const limpar = () => {
    setArquivo(null); setLeitura(null); setFonte(''); setMapeamento({}); setVinculos({});
    if (entrada.current) entrada.current.value = '';
  };

  const salvar = () => {
    // Vale o que está na tela: tanto o que o gestor escolheu quanto o que o
    // sistema ligou sozinho pelo nome — senão só as correções manuais seriam
    // gravadas, e o resto do arquivo se perderia.
    const vinculosFinais = Object.fromEntries(
      (conferencia?.agentes ?? []).filter((a) => a.colaborador_id).map((a) => [a.nome, a.colaborador_id]),
    );
    onSalvar({
      arquivo, fonte, tipo, mapeamento, vinculos: vinculosFinais, leitura, conferencia,
    }, limpar);
  };

  return (
    <div className="space-y-6">
      <Cartao titulo="1. O arquivo">
        <div className="flex flex-wrap items-center gap-3">
          <input ref={entrada} type="file" accept=".csv,text/csv" onChange={escolherArquivo} className="hidden" id="arquivo-apuracao" />
          <Button onClick={() => entrada.current?.click()} variant={arquivo ? 'outline' : 'default'}>
            {arquivo ? 'Trocar arquivo' : 'Escolher arquivo CSV'}
          </Button>
          {arquivo && (
            <>
              <span className="text-sm text-foreground">{arquivo.name}</span>
              <button type="button" onClick={limpar} className="text-xs text-muted-foreground hover:text-foreground">descartar</button>
            </>
          )}
        </div>
        {!arquivo && (
          <p className="mt-2 text-sm text-muted-foreground">
            Exporte o relatório do 55PBX, do Zendesk ou a planilha de CX em CSV. O período vem do próprio arquivo —
            não precisa escolher mês.
          </p>
        )}
        {leitura && (
          <div className="mt-3 divide-y divide-border border-t border-border">
            <Linha rotulo="Linhas no arquivo" valor={leitura.linhas.length} />
            <Linha rotulo="Colunas" detalhe={leitura.colunas.join(' · ')} valor={leitura.colunas.length} />
          </div>
        )}
      </Cartao>

      {leitura && (
        <Cartao titulo="2. De onde veio e o que é cada coluna" extra={lembrado ? <span className="text-xs text-muted-foreground">de-para lembrado da última importação</span> : null}>
          <div className="max-w-sm">
            <Label>Fonte</Label>
            <Select value={fonte} onValueChange={trocarFonte}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Escolha a fonte" /></SelectTrigger>
              <SelectContent>
                {FONTES.map((f) => <SelectItem key={f.valor} value={f.valor}>{f.rotulo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {tipo && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {CAMPOS[tipo].map((campo) => (
                <div key={campo.chave}>
                  <Label className="text-xs">
                    {campo.rotulo}{campo.obrigatorio && <span className="ml-0.5 text-destructive">*</span>}
                  </Label>
                  <Select
                    value={mapeamento[campo.chave] ?? ''}
                    onValueChange={(v) => setMapeamento((m) => ({ ...m, [campo.chave]: v }))}
                  >
                    <SelectTrigger className="mt-1"><SelectValue placeholder="Escolha a coluna" /></SelectTrigger>
                    <SelectContent>
                      {leitura.colunas.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {campo.ajuda && <p className="mt-1 text-xs text-muted-foreground">{campo.ajuda}</p>}
                </div>
              ))}
            </div>
          )}
        </Cartao>
      )}

      {conferencia && (
        <>
          <Cartao titulo="3. Conferência antes de salvar">
            {conferencia.faltando.length > 0 ? (
              <p className="text-sm text-destructive">Falta dizer qual coluna é: {conferencia.faltando.join(', ')}.</p>
            ) : (
              <>
                <div className="grid gap-x-8 sm:grid-cols-2">
                  <div className="divide-y divide-border">
                    <Linha rotulo="Linhas lidas" valor={conferencia.linhasLidas} />
                    <Linha rotulo="Linhas que entram" valor={conferencia.linhasValidas} forte />
                    {conferencia.descartadas.map((d) => (
                      <Linha key={d.motivo} rotulo={`Descartadas — ${d.motivo}`} valor={d.quantidade} />
                    ))}
                  </div>
                  <div className="divide-y divide-border">
                    <Linha
                      rotulo="Período do arquivo"
                      detalhe={conferencia.periodo ? `${conferencia.periodo.dias.length} dia(s) com dados` : null}
                      valor={conferencia.periodo ? `${brDate(conferencia.periodo.inicio)} a ${brDate(conferencia.periodo.fim)}` : '—'}
                    />
                    <Linha rotulo="Pessoas no arquivo" valor={conferencia.agentes.length} />
                    <Linha rotulo="Dias já importados antes" valor={conferencia.diasJaImportados.length} />
                  </div>
                </div>

                {conferencia.avisos.length > 0 && (
                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {conferencia.avisos.map((a, i) => <li key={i}>{a}</li>)}
                  </ul>
                )}
              </>
            )}
          </Cartao>

          {conferencia.agentes.length > 0 && (
            <Cartao titulo="4. Quem é quem" extra={<span className="text-xs text-muted-foreground">o vínculo fica guardado para as próximas importações</span>}>
              <div className="divide-y divide-border">
                {conferencia.agentes.map((a) => (
                  <div key={a.nome} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{a.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.linhas} linha(s) · {a.dias} dia(s)
                        {a.origem === 'lembrado' ? ' · vínculo lembrado' : a.origem === 'automatico' ? ' · ligado pelo nome' : ''}
                      </p>
                    </div>
                    <div className="w-64">
                      <Select
                        value={a.colaborador_id ?? ''}
                        onValueChange={(v) => setVinculos((atual) => ({ ...atual, [a.nome]: v }))}
                      >
                        <SelectTrigger className={a.colaborador_id ? '' : 'border-destructive/50'}>
                          <SelectValue placeholder="Escolha a pessoa" />
                        </SelectTrigger>
                        <SelectContent>
                          {colaboradores.filter((c) => c.ativo !== false).map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            </Cartao>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={salvar} disabled={!conferencia.pronta || salvando}>
              {salvando ? 'Salvando...' : 'Salvar importação'}
            </Button>
            <Button variant="outline" onClick={limpar} disabled={salvando}>Cancelar</Button>
            {!conferencia.pronta && conferencia.faltando.length === 0 && (
              <span className="text-sm text-muted-foreground">Ligue todas as pessoas antes de salvar.</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
