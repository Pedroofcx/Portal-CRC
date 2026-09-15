import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Target, Wrench, ShieldCheck, GitBranch, Info, Users } from 'lucide-react';

const PARTICIPANTES = [
  'Agentes CSC',
  'Supervisor CSC',
  'Facilitador Interno',
  'Gestão / Diretoria',
  'Área Técnica',
];

const RACI_COLUNAS = ['responsavel', 'aprovador', 'consultado', 'informado'];
const RACI_LABELS = {
  responsavel: 'Responsável',
  aprovador: 'Aprovador',
  consultado: 'Consultado',
  informado: 'Informado',
};

function RaciSelect({ value, onChange }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
    >
      <option value="">—</option>
      {PARTICIPANTES.map((p) => (
        <option key={p} value={p}>{p}</option>
      ))}
    </select>
  );
}

export default function POPForm({ onSubmit, onCancel, isLoading }) {
  const [form, setForm] = useState({
    codigo: '',
    titulo: '',
    categoria: '',
    objetivo: '',
    ferramentas: '',
    criterio_qualidade: '',
    fluxo_operacional: '',
    outras_informacoes: '',
    raci: [{ atividade: '', responsavel: '', aprovador: '', consultado: '', informado: '' }],
  });

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const addRaciRow = () =>
    setForm((f) => ({
      ...f,
      raci: [...f.raci, { atividade: '', responsavel: '', aprovador: '', consultado: '', informado: '' }],
    }));

  const removeRaciRow = (i) =>
    setForm((f) => ({ ...f, raci: f.raci.filter((_, idx) => idx !== i) }));

  const updateRaci = (i, field, value) =>
    setForm((f) => {
      const raci = [...f.raci];
      raci[i] = { ...raci[i], [field]: value };
      return { ...f, raci };
    });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const SectionCard = ({ icon: Icon, title, color = 'slate', children }) => {
    const colors = {
      slate: 'border-border bg-muted text-foreground',
      blue: 'border-info/25 bg-info-soft text-primary',
      emerald: 'border-success/25 bg-success-soft text-success',
      amber: 'border-warning/25 bg-warning-soft text-warning',
      violet: 'border-info/25 bg-info-soft text-primary',
      indigo: 'border-primary/25 bg-info-soft text-primary',
    };
    return (
      <div className="space-y-3">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colors[color]}`}>
          <Icon className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-semibold tracking-wide">{title}</span>
        </div>
        {children}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identificação */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Código *</Label>
          <Input
            value={form.codigo}
            onChange={(e) => set('codigo', e.target.value)}
            placeholder="POP-001"
            className="mt-1"
            required
          />
        </div>
        <div className="col-span-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">Título *</Label>
          <Input
            value={form.titulo}
            onChange={(e) => set('titulo', e.target.value)}
            placeholder="Título do procedimento"
            className="mt-1"
            required
          />
        </div>
      </div>
      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Categoria</Label>
        <Input
          value={form.categoria}
          onChange={(e) => set('categoria', e.target.value)}
          placeholder="Ex: Atendimento, Contestação, Financeiro..."
          className="mt-1"
        />
      </div>

      {/* Objetivo */}
      <SectionCard icon={Target} title="Objetivo" color="blue">
        <Textarea
          value={form.objetivo}
          onChange={(e) => set('objetivo', e.target.value)}
          placeholder="Descreva a finalidade do procedimento, contexto operacional, resultado esperado e impacto para a operação ou cliente..."
          rows={4}
          required
        />
      </SectionCard>

      {/* Ferramentas */}
      <SectionCard icon={Wrench} title="Ferramentas Utilizadas" color="slate">
        <Textarea
          value={form.ferramentas}
          onChange={(e) => set('ferramentas', e.target.value)}
          placeholder="Ex: Zendesk, Planilhas Google, CRM, Portal CRC, WhatsApp Business, Sistemas internos..."
          rows={3}
        />
      </SectionCard>

      {/* Critério de Qualidade */}
      <SectionCard icon={ShieldCheck} title="Critério de Qualidade" color="emerald">
        <Textarea
          value={form.criterio_qualidade}
          onChange={(e) => set('criterio_qualidade', e.target.value)}
          placeholder="Defina os padrões mínimos de execução, regras de conformidade, critérios obrigatórios, boas práticas e status de ticket Zendesk utilizados..."
          rows={4}
        />
      </SectionCard>

      {/* Fluxo Operacional */}
      <SectionCard icon={GitBranch} title="Fluxo Operacional" color="violet">
        <Textarea
          value={form.fluxo_operacional}
          onChange={(e) => set('fluxo_operacional', e.target.value)}
          placeholder={"1. Receber solicitação\n2. Validar dados\n3. Realizar análise\n4. Registrar evidências\n5. Encerrar ticket"}
          rows={5}
        />
      </SectionCard>

      {/* Outras Informações */}
      <SectionCard icon={Info} title="Outras Informações, Padrões e Diretrizes" color="amber">
        <Textarea
          value={form.outras_informacoes}
          onChange={(e) => set('outras_informacoes', e.target.value)}
          placeholder="Observações importantes, exceções operacionais, regras internas, diretrizes da gestão, padrões de comunicação, políticas e cuidados críticos..."
          rows={4}
        />
      </SectionCard>

      {/* Tabela RACI */}
      <SectionCard icon={Users} title="Tabela RACI — Responsabilidades" color="indigo">
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-1/3">Atividade</th>
                {RACI_COLUNAS.map((col) => (
                  <th key={col} className="text-left px-2 py-2 font-semibold text-muted-foreground">
                    {RACI_LABELS[col]}
                  </th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {form.raci.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted">
                  <td className="px-2 py-2">
                    <Input
                      value={row.atividade}
                      onChange={(e) => updateRaci(i, 'atividade', e.target.value)}
                      placeholder={`Atividade ${i + 1}`}
                      className="text-xs h-8"
                    />
                  </td>
                  {RACI_COLUNAS.map((col) => (
                    <td key={col} className="px-2 py-2">
                      <RaciSelect
                        value={row[col]}
                        onChange={(val) => updateRaci(i, col, val)}
                      />
                    </td>
                  ))}
                  <td className="px-1 py-2">
                    {form.raci.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRaciRow(i)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRaciRow}
          className="gap-1.5 text-xs"
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar Linha
        </Button>
      </SectionCard>

      {/* Ações */}
      <div className="flex justify-end gap-3 pt-2 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" className="bg-muted superficie-escura hover:bg-muted" disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Salvar POP'}
        </Button>
      </div>
    </form>
  );
}