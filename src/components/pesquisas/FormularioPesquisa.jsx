import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PainelLateral, { RodapeFixo } from '@/components/ui/PainelLateral';

/**
 * Criar ou editar uma pesquisa. O campo que faltava — e que Pedro pediu em
 * 23/09/2026 — é o anônima: com ele ligado, a resposta não guarda quem
 * respondeu; sem ele, guarda.
 */
const TIPOS = [
  { valor: 'personalizada', rotulo: 'Personalizada' },
  { valor: 'csat', rotulo: 'CSAT (satisfação, 1 a 5)' },
  { valor: 'nps', rotulo: 'NPS (0 a 10)' },
  { valor: 'ces', rotulo: 'CES (esforço)' },
  { valor: 'clima_organizacional', rotulo: 'Clima organizacional' },
  { valor: 'avd', rotulo: 'AVD (avaliação de desempenho setorial)' },
  { valor: 'kaizen', rotulo: 'Kaizen' },
];

const TIPOS_RESPOSTA = [
  { valor: 'texto', rotulo: 'Texto livre' },
  { valor: 'escala_1_5', rotulo: 'Escala de 1 a 5' },
  { valor: 'escala_0_10', rotulo: 'Escala de 0 a 10' },
  { valor: 'sim_nao', rotulo: 'Sim ou não' },
  { valor: 'multipla_escolha', rotulo: 'Escolha uma opção' },
  { valor: 'multipla_escolha_multipla', rotulo: 'Escolha várias opções' },
];

const COM_OPCOES = new Set(['multipla_escolha', 'multipla_escolha_multipla']);
const perguntaEmBranco = () => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, texto: '', tipo_resposta: 'texto', opcoes: [], obrigatoria: true });

const emBranco = () => ({
  titulo: '', descricao: '', tipo: 'personalizada', categoria: 'interna',
  data_inicio: '', data_fim: '', anonima: false, perguntas: [perguntaEmBranco()],
});

export default function FormularioPesquisa({ open, onOpenChange, pesquisa, onSalvar, salvando }) {
  const [form, setForm] = useState(emBranco);

  useEffect(() => {
    if (!open) return;
    setForm(pesquisa
      ? {
        titulo: pesquisa.titulo || '',
        descricao: pesquisa.descricao || '',
        tipo: pesquisa.tipo || 'personalizada',
        categoria: pesquisa.categoria || 'interna',
        data_inicio: String(pesquisa.data_inicio || '').slice(0, 10),
        data_fim: String(pesquisa.data_fim || '').slice(0, 10),
        anonima: !!pesquisa.anonima,
        perguntas: (pesquisa.perguntas || []).length ? pesquisa.perguntas : [perguntaEmBranco()],
      }
      : emBranco());
  }, [open, pesquisa]);

  const mudarPergunta = (indice, campo, valor) => setForm((f) => ({
    ...f,
    perguntas: f.perguntas.map((p, i) => (i === indice ? { ...p, [campo]: valor } : p)),
  }));

  const salvar = () => {
    if (!form.titulo.trim()) { toast.error('Dê um título à pesquisa.'); return; }
    const perguntas = form.perguntas.filter((p) => p.texto.trim());
    if (perguntas.length === 0) { toast.error('Escreva ao menos uma pergunta.'); return; }
    const semOpcao = perguntas.find((p) => COM_OPCOES.has(p.tipo_resposta) && (p.opcoes || []).filter(Boolean).length < 2);
    if (semOpcao) { toast.error(`"${semOpcao.texto}" precisa de ao menos duas opções.`); return; }
    onSalvar({
      ...form,
      perguntas: perguntas.map((p) => ({ ...p, opcoes: (p.opcoes || []).filter(Boolean) })),
      data_inicio: form.data_inicio || null,
      data_fim: form.data_fim || null,
      requer_confirmacao_leitura: true,
    });
  };

  return (
    <PainelLateral
      open={open}
      onOpenChange={onOpenChange}
      largura="2xl"
      titulo={pesquisa ? `Editar — ${pesquisa.titulo}` : 'Nova pesquisa'}
    >
      <div className="mt-2 space-y-5">
        <div>
          <Label>Título *</Label>
          <Input className="mt-1" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex.: Kaizen da semana" />
        </div>

        <div>
          <Label>Descrição</Label>
          <Textarea className="mt-1" rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="O que a equipe precisa saber antes de responder." />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Tipo</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => <SelectItem key={t.valor} value={t.valor}>{t.rotulo}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quem responde</Label>
            <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="interna">A equipe (interna)</SelectItem>
                <SelectItem value="cliente">Cliente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Começa em</Label>
            <Input type="date" className="mt-1" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
          </div>
          <div>
            <Label>Termina em</Label>
            <Input type="date" className="mt-1" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} />
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
          <Switch checked={form.anonima} onCheckedChange={(v) => setForm({ ...form, anonima: v })} />
          <div>
            <Label className="cursor-pointer">Pesquisa anônima</Label>
            <p className="text-xs text-muted-foreground">
              {form.anonima
                ? 'A resposta não guarda quem respondeu. Você continua vendo quem já respondeu e quem falta, mas não quem disse o quê.'
                : 'Cada resposta fica identificada com o nome de quem respondeu.'}
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>Perguntas</Label>
            <Button type="button" size="sm" variant="outline" onClick={() => setForm((f) => ({ ...f, perguntas: [...f.perguntas, perguntaEmBranco()] }))}>
              Adicionar pergunta
            </Button>
          </div>

          <div className="mt-2 space-y-3">
            {form.perguntas.map((p, i) => (
              <div key={p.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start gap-2">
                  <span className="mt-2 text-sm tabular-nums text-muted-foreground">{i + 1}.</span>
                  <div className="flex-1 space-y-2">
                    <Input value={p.texto} onChange={(e) => mudarPergunta(i, 'texto', e.target.value)} placeholder="Escreva a pergunta" />
                    <div className="flex flex-wrap items-center gap-3">
                      <Select value={p.tipo_resposta} onValueChange={(v) => mudarPergunta(i, 'tipo_resposta', v)}>
                        <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TIPOS_RESPOSTA.map((t) => <SelectItem key={t.valor} value={t.valor}>{t.rotulo}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                        <Switch checked={p.obrigatoria !== false} onCheckedChange={(v) => mudarPergunta(i, 'obrigatoria', v)} />
                        Obrigatória
                      </label>
                    </div>

                    {COM_OPCOES.has(p.tipo_resposta) && (
                      <div className="space-y-1.5">
                        {(p.opcoes || []).map((op, oi) => (
                          <div key={oi} className="flex gap-2">
                            <Input
                              value={op}
                              onChange={(e) => mudarPergunta(i, 'opcoes', (p.opcoes || []).map((x, xi) => (xi === oi ? e.target.value : x)))}
                              placeholder={`Opção ${oi + 1}`}
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => mudarPergunta(i, 'opcoes', (p.opcoes || []).filter((_, xi) => xi !== oi))}>
                              <Trash2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            </Button>
                          </div>
                        ))}
                        <Button type="button" size="sm" variant="outline" onClick={() => mudarPergunta(i, 'opcoes', [...(p.opcoes || []), ''])}>
                          Adicionar opção
                        </Button>
                      </div>
                    )}
                  </div>
                  {form.perguntas.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => setForm((f) => ({ ...f, perguntas: f.perguntas.filter((_, xi) => xi !== i) }))}>
                      <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <RodapeFixo>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar pesquisa'}</Button>
        </RodapeFixo>
      </div>
    </PainelLateral>
  );
}
