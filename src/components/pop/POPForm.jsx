import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import CampoFormulario from '@/components/ui/CampoFormulario';
import { RodapeFixo } from '@/components/ui/PainelLateral';
import { useValidacao } from '@/hooks/useValidacao';
import { obrigatorio } from '@/lib/validacao';
import { CATEGORIAS_POP, proximaVersao } from '@/lib/pops';

/**
 * Criar ou editar um POP. Na edição, cada salvamento vira uma VERSÃO nova
 * (ajuste: 1.0 → 1.1; nova versão: 1.1 → 2.0), com "o que mudou" obrigatório
 * e a opção de pedir confirmação de leitura à equipe.
 *
 * Textos aceitam formatação leve: "## subtítulo", "- item", "1. passo",
 * "**destaque**".
 */

const REGRAS_NOVO = {
  codigo: [obrigatorio('O código')],
  titulo: [obrigatorio('O título')],
  objetivo: [obrigatorio('O objetivo')],
};
const REGRAS_EDICAO = { ...REGRAS_NOVO, o_que_mudou: [obrigatorio('O resumo do que mudou')] };

const RACI_VAZIA = { atividade: '', responsavel: '', aprovador: '', consultado: '', informado: '' };
const AJUDA_TEXTO = 'Formatação: "## subtítulo", "- item", "1. passo", "**destaque**".';

export default function POPForm({ popInicial = null, tiposTratativa = [], onSubmit, onCancel, isLoading }) {
  const editando = Boolean(popInicial?.id);
  const [form, setForm] = useState(() => ({
    codigo: popInicial?.codigo ?? '',
    titulo: popInicial?.titulo ?? '',
    categoria: popInicial?.categoria ?? CATEGORIAS_POP[1],
    ordem: popInicial?.ordem ?? 0,
    tipos_tratativa: popInicial?.tipos_tratativa ?? [],
    objetivo: popInicial?.objetivo ?? '',
    ferramentas: popInicial?.ferramentas ?? '',
    prazos: popInicial?.prazos?.length ? popInicial.prazos : [{ rotulo: '', valor: '' }],
    fluxo_operacional: popInicial?.fluxo_operacional ?? '',
    criterio_qualidade: popInicial?.criterio_qualidade ?? '',
    outras_informacoes: popInicial?.outras_informacoes ?? '',
    raci: popInicial?.raci?.length ? popInicial.raci : [{ ...RACI_VAZIA }],
    tipoVersao: 'ajuste',
    o_que_mudou: '',
    exige_ciencia: true,
  }));
  const validacao = useValidacao(form, editando ? REGRAS_EDICAO : REGRAS_NOVO);

  const set = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    validacao.aoMudar(campo, valor);
  };
  const setLinha = (lista, i, campo, valor) => setForm((f) => {
    const nova = [...f[lista]];
    nova[i] = { ...nova[i], [campo]: valor };
    return { ...f, [lista]: nova };
  });
  const addLinha = (lista, vazia) => setForm((f) => ({ ...f, [lista]: [...f[lista], { ...vazia }] }));
  const delLinha = (lista, i) => setForm((f) => ({ ...f, [lista]: f[lista].filter((_, j) => j !== i) }));

  const enviar = (e) => {
    e.preventDefault();
    if (!validacao.validarTudo()) return;
    const { tipoVersao, o_que_mudou, exige_ciencia, ...dados } = form;
    onSubmit({
      ...dados,
      ordem: Number(dados.ordem) || 0,
      prazos: dados.prazos.filter((p) => p.rotulo?.trim() || p.valor?.trim()),
      raci: dados.raci.filter((r) => r.atividade?.trim()),
    }, { tipoVersao, o_que_mudou: o_que_mudou.trim(), exige_ciencia });
  };

  const campoTexto = (campo, rotulo, linhas = 6, ajuda = AJUDA_TEXTO) => (
    <CampoFormulario id={`pop-${campo}`} rotulo={rotulo} ajuda={ajuda} erro={validacao.erro(campo)} obrigatorio={campo === 'objetivo'}>
      <Textarea id={`pop-${campo}`} rows={linhas} value={form[campo]} onChange={(e) => set(campo, e.target.value)} {...validacao.campo(campo)} />
    </CampoFormulario>
  );

  return (
    <form onSubmit={enviar} className="space-y-5" noValidate>
      <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
        <CampoFormulario id="pop-codigo" rotulo="Código" obrigatorio erro={validacao.erro('codigo')}>
          <Input id="pop-codigo" value={form.codigo} onChange={(e) => set('codigo', e.target.value)} {...validacao.campo('codigo')} placeholder="POP 22" />
        </CampoFormulario>
        <CampoFormulario id="pop-titulo" rotulo="Título" obrigatorio erro={validacao.erro('titulo')}>
          <Input id="pop-titulo" value={form.titulo} onChange={(e) => set('titulo', e.target.value)} {...validacao.campo('titulo')} />
        </CampoFormulario>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
        <CampoFormulario id="pop-categoria" rotulo="Categoria">
          <select
            id="pop-categoria"
            value={form.categoria}
            onChange={(e) => set('categoria', e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm"
          >
            {CATEGORIAS_POP.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </CampoFormulario>
        <CampoFormulario id="pop-ordem" rotulo="Ordem" ajuda="Posição na lista">
          <Input id="pop-ordem" type="number" value={form.ordem} onChange={(e) => set('ordem', e.target.value)} />
        </CampoFormulario>
      </div>

      {tiposTratativa.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Aparece no botão "Ver POP" das tratativas de</p>
          <div className="flex flex-wrap gap-2">
            {tiposTratativa.map((t) => {
              const marcado = form.tipos_tratativa.includes(t.chave);
              return (
                <label key={t.chave} className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs ${marcado ? 'border-primary bg-primary/10 text-foreground' : 'border-border text-muted-foreground'}`}>
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-[hsl(var(--primary))]"
                    checked={marcado}
                    onChange={(e) => set('tipos_tratativa', e.target.checked ? [...form.tipos_tratativa, t.chave] : form.tipos_tratativa.filter((k) => k !== t.chave))}
                  />
                  {t.nome}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {campoTexto('objetivo', 'Objetivo', 3, null)}
      <CampoFormulario id="pop-ferramentas" rotulo="Ferramentas">
        <Input id="pop-ferramentas" value={form.ferramentas} onChange={(e) => set('ferramentas', e.target.value)} />
      </CampoFormulario>

      <div className="space-y-2">
        <p className="text-sm font-medium">Prazos em destaque <span className="font-normal text-muted-foreground">— aparecem no topo do POP</span></p>
        {form.prazos.map((p, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_36px] gap-2">
            <Input aria-label={`Prazo ${i + 1}: o quê`} placeholder="1º contato com o cliente" value={p.rotulo} onChange={(e) => setLinha('prazos', i, 'rotulo', e.target.value)} />
            <Input aria-label={`Prazo ${i + 1}: valor`} placeholder="até 1h" value={p.valor} onChange={(e) => setLinha('prazos', i, 'valor', e.target.value)} />
            <Button type="button" variant="ghost" size="icon" onClick={() => delLinha('prazos', i)} aria-label={`Remover prazo ${i + 1}`}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => addLinha('prazos', { rotulo: '', valor: '' })}><Plus className="mr-1 h-4 w-4" /> Prazo</Button>
      </div>

      {campoTexto('fluxo_operacional', 'Fluxo operacional', 10)}
      {campoTexto('criterio_qualidade', 'Critérios de qualidade', 5)}
      {campoTexto('outras_informacoes', 'Outras informações', 5)}

      <div className="space-y-2">
        <p className="text-sm font-medium">Matriz RACI</p>
        {form.raci.map((r, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-border p-2 sm:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))_36px]">
            <Input aria-label="Atividade" placeholder="Atividade" value={r.atividade} onChange={(e) => setLinha('raci', i, 'atividade', e.target.value)} className="col-span-2 sm:col-span-1" />
            <Input aria-label="R — Responsável" placeholder="R" value={r.responsavel} onChange={(e) => setLinha('raci', i, 'responsavel', e.target.value)} />
            <Input aria-label="A — Aprovador" placeholder="A" value={r.aprovador} onChange={(e) => setLinha('raci', i, 'aprovador', e.target.value)} />
            <Input aria-label="C — Consultado" placeholder="C" value={r.consultado} onChange={(e) => setLinha('raci', i, 'consultado', e.target.value)} />
            <Input aria-label="I — Informado" placeholder="I" value={r.informado} onChange={(e) => setLinha('raci', i, 'informado', e.target.value)} />
            <Button type="button" variant="ghost" size="icon" onClick={() => delLinha('raci', i)} aria-label={`Remover linha ${i + 1}`}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => addLinha('raci', RACI_VAZIA)}><Plus className="mr-1 h-4 w-4" /> Atividade</Button>
      </div>

      {editando && (
        <div className="space-y-4 rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-sm font-semibold text-foreground">Nova versão</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" name="tipoVersao" checked={form.tipoVersao === 'ajuste'} onChange={() => set('tipoVersao', 'ajuste')} className="accent-[hsl(var(--primary))]" />
              Ajuste — v{proximaVersao(popInicial.versao, 'ajuste')}
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="tipoVersao" checked={form.tipoVersao === 'nova'} onChange={() => set('tipoVersao', 'nova')} className="accent-[hsl(var(--primary))]" />
              Muda regra, prazo ou fluxo — v{proximaVersao(popInicial.versao, 'nova')}
            </label>
          </div>
          <CampoFormulario id="pop-o_que_mudou" rotulo="O que mudou" obrigatorio erro={validacao.erro('o_que_mudou')} ajuda="Aparece para a equipe no aviso de nova versão">
            <Textarea id="pop-o_que_mudou" rows={2} value={form.o_que_mudou} onChange={(e) => set('o_que_mudou', e.target.value)} {...validacao.campo('o_que_mudou')} />
          </CampoFormulario>
          <div className="flex items-start gap-2">
            <input id="pop-ciencia" type="checkbox" checked={form.exige_ciencia} onChange={(e) => set('exige_ciencia', e.target.checked)} className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" />
            <Label htmlFor="pop-ciencia" className="font-normal">
              Pedir confirmação de leitura à equipe
              <span className="block text-xs text-muted-foreground">Entra na central de pendências da tela inicial de cada um</span>
            </Label>
          </div>
        </div>
      )}

      <RodapeFixo>
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando…' : editando ? `Publicar versão ${proximaVersao(popInicial.versao, form.tipoVersao)}` : 'Publicar POP'}
        </Button>
      </RodapeFixo>
    </form>
  );
}
