import React, { useMemo, useState } from 'react';
import db from '@/api/db';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import PainelLateral, { RodapeFixo } from '@/components/ui/PainelLateral';
import { GRUPOS_COMPETENCIA, ESCALA, leituraEmBranco, TIPO_LEITURA } from '@/lib/competencias';

/**
 * A leitura de pessoas — o antigo lançamento do Oráculo, agora dentro de
 * Observações (decisão de Pedro, 23/09/2026). Sai daqui uma observação do
 * tipo 'leitura': pergunta que guiou a conversa, palavras-chave, as doze
 * competências de 1 a 5 e o texto livre. O Oráculo só lê o que foi escrito
 * aqui — nada é avaliado em dois lugares.
 */
const cx = (...c) => c.filter(Boolean).join(' ');

function LinhaCompetencia({ item, valor, onChange }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{item.rotulo}</p>
        <p className="text-xs text-muted-foreground">{item.ajuda}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        {ESCALA.map((e) => (
          <button
            key={e.valor}
            type="button"
            title={e.rotulo}
            onClick={() => onChange(e.valor)}
            className={cx(
              'h-8 w-8 rounded-md border text-sm font-semibold tabular-nums transition-colors',
              valor === e.valor
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-muted-foreground hover:bg-muted',
            )}
          >
            {e.valor}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PainelLeitura({ open, onOpenChange, colaborador, palavrasDicionario = [], autor, contexto, onSalvar, salvando }) {
  const [pergunta, setPergunta] = useState('');
  const [palavras, setPalavras] = useState([]);
  const [novaPalavra, setNovaPalavra] = useState('');
  const [competencias, setCompetencias] = useState(leituraEmBranco);
  const [texto, setTexto] = useState('');
  const [visivel, setVisivel] = useState(false);
  const [gerando, setGerando] = useState(false);

  const porCategoria = useMemo(() => {
    const mapa = new Map();
    palavrasDicionario.forEach((p) => {
      const lista = mapa.get(p.categoria) || [];
      lista.push(p);
      mapa.set(p.categoria, lista);
    });
    return [...mapa.entries()];
  }, [palavrasDicionario]);

  const escolhida = (palavra) => palavras.some((p) => p.palavra === palavra);

  const alternar = (p) => setPalavras((atual) => (
    atual.some((x) => x.palavra === p.palavra)
      ? atual.filter((x) => x.palavra !== p.palavra)
      : [...atual, { palavra: p.palavra, categoria: p.categoria, origem: 'dicionario' }]
  ));

  const adicionarManual = () => {
    const palavra = novaPalavra.trim();
    if (!palavra) return;
    if (!escolhida(palavra)) setPalavras((atual) => [...atual, { palavra, categoria: null, origem: 'manual' }]);
    setNovaPalavra('');
  };

  const sugerirPergunta = async () => {
    setGerando(true);
    try {
      const resumo = [
        contexto?.ciclo_nome ? `Ciclo: ${contexto.ciclo_nome}` : null,
        contexto?.pontos_trimestre != null ? `Pontos no ciclo: ${contexto.pontos_trimestre}` : null,
        contexto?.csat_recente != null ? `CSAT: ${contexto.csat_recente.toFixed(1)}%` : null,
        contexto?.tratativas_periodo != null ? `Tratativas encerradas no ciclo: ${contexto.tratativas_periodo}` : null,
        ...(contexto?.sinais_recentes || []),
      ].filter(Boolean).join('\n');
      const palavrasTexto = palavras.map((p) => p.palavra).join(', ') || 'nenhuma ainda';
      const resposta = await db.integrations.Core.InvokeLLM({
        prompt: `Você ajuda um gestor de atendimento a conduzir uma conversa de desenvolvimento com um agente chamado ${colaborador?.nome_completo}.\n\nNúmeros do agente:\n${resumo || 'sem números no período'}\n\nPalavras-chave que o gestor já escolheu: ${palavrasTexto}.\n\nEscreva UMA pergunta aberta, curta, em português do Brasil, que o gestor possa fazer ao agente para entender o que está por trás desses sinais. Sem julgamento e sem elogio automático.`,
        response_json_schema: {
          type: 'object',
          properties: { pergunta: { type: 'string' } },
          required: ['pergunta'],
        },
      });
      if (resposta?.pergunta) setPergunta(resposta.pergunta);
      else toast.error('A IA não devolveu uma pergunta.');
    } catch {
      toast.error('Não consegui falar com a IA agora. Escreva a pergunta à mão.');
    } finally {
      setGerando(false);
    }
  };

  const limpar = () => {
    setPergunta(''); setPalavras([]); setNovaPalavra('');
    setCompetencias(leituraEmBranco()); setTexto(''); setVisivel(false);
  };

  const salvar = () => {
    if (texto.trim().length < 5) { toast.error('Escreva o que você observou.'); return; }
    onSalvar({
      tipo: TIPO_LEITURA,
      titulo: 'Leitura de pessoas',
      conteudo: texto.trim(),
      visibilidade: visivel ? 'ambos' : 'gestor',
      colaboradores_ids: [colaborador.id],
      colaboradores_nomes: [colaborador.nome_completo],
      autor_id: autor?.id,
      autor_nome: autor?.nome_completo,
      data_registro: new Date().toISOString(),
      competencias,
      palavras_chave: palavras,
      pergunta_gerada: pergunta.trim() || null,
    }, limpar);
  };

  return (
    <PainelLateral
      open={open}
      onOpenChange={(v) => { if (!v) limpar(); onOpenChange(v); }}
      largura="2xl"
      titulo={<>Leitura de pessoas — {colaborador?.nome_completo}</>}
    >
      <div className="mt-2 space-y-6">
        <p className="text-sm text-muted-foreground">
          Esta leitura alimenta o Oráculo CRC: os radares, a comparação com a equipe e a evolução ao longo do tempo
          saem daqui. Fica visível só para a gestão, a menos que você marque o contrário.
        </p>

        <div>
          <div className="flex items-end justify-between gap-2">
            <Label>Pergunta que guiou a conversa</Label>
            <Button type="button" variant="outline" size="sm" onClick={sugerirPergunta} disabled={gerando}>
              {gerando ? 'Pensando...' : 'Sugerir com a IA'}
            </Button>
          </div>
          <Input
            className="mt-1"
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            placeholder="Ex.: o que mudou na sua rotina nas últimas semanas?"
          />
        </div>

        <div>
          <Label>Palavras-chave</Label>
          <p className="text-xs text-muted-foreground">O que você viu se repetir. Elas viram as palavras recorrentes do Oráculo.</p>
          <div className="mt-2 space-y-3">
            {porCategoria.map(([categoria, itens]) => (
              <div key={categoria || 'outras'}>
                <p className="text-xs font-medium capitalize text-muted-foreground">{String(categoria || 'outras').replace(/_/g, ' ')}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {itens.map((p) => (
                    <button
                      key={p.id || p.palavra}
                      type="button"
                      onClick={() => alternar(p)}
                      className={cx(
                        'rounded-full border px-2.5 py-1 text-xs transition-colors',
                        escolhida(p.palavra)
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {p.palavra}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              value={novaPalavra}
              onChange={(e) => setNovaPalavra(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarManual(); } }}
              placeholder="Outra palavra"
            />
            <Button type="button" variant="outline" onClick={adicionarManual}>Adicionar</Button>
          </div>
          {palavras.filter((p) => p.origem === 'manual').length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Fora do dicionário: {palavras.filter((p) => p.origem === 'manual').map((p) => p.palavra).join(', ')}
            </p>
          )}
        </div>

        {GRUPOS_COMPETENCIA.map((grupo) => (
          <div key={grupo.chave}>
            <Label>{grupo.rotulo}</Label>
            <p className="text-xs text-muted-foreground">1 muito abaixo · 3 no esperado · 5 referência. Todas começam em 3.</p>
            <div className="mt-1 divide-y divide-border border-t border-border">
              {grupo.itens.map((item) => (
                <LinhaCompetencia
                  key={item.chave}
                  item={item}
                  valor={competencias[grupo.chave][item.chave]}
                  onChange={(valor) => setCompetencias((atual) => ({
                    ...atual,
                    [grupo.chave]: { ...atual[grupo.chave], [item.chave]: valor },
                  }))}
                />
              ))}
            </div>
          </div>
        ))}

        <div>
          <Label>O que você observou *</Label>
          <Textarea
            className="mt-1 min-h-32"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Fatos, exemplos, o que foi combinado."
          />
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
          <Switch checked={visivel} onCheckedChange={setVisivel} />
          <div>
            <Label className="cursor-pointer">Visível ao agente</Label>
            <p className="text-xs text-muted-foreground">
              {visivel ? 'O agente poderá ler esta leitura.' : 'Apenas a gestão vê esta leitura.'}
            </p>
          </div>
        </div>

        <RodapeFixo>
          <Button variant="outline" onClick={() => { limpar(); onOpenChange(false); }}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar leitura'}</Button>
        </RodapeFixo>
      </div>
    </PainelLateral>
  );
}
