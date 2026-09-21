import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { configDoStatus, classesSolidasDoStatus } from '@/components/ui/StatusBadge';
import PainelLateral, { RodapeFixo } from '@/components/ui/PainelLateral';

/**
 * Os rótulos e cores vêm do StatusBadge, que é a fonte única do sistema.
 * Este arquivo mantinha uma cópia própria do mapa — a mesma, palavra por
 * palavra, que existia em CalendarioEquipes e DiaDetalheDialog. Três cópias
 * do mesmo mapa significam que mudar a cor de "Férias" exigia lembrar de
 * três lugares.
 *
 * `cor` e `text` continuam existindo para o JSX abaixo não precisar mudar.
 */
const statusConfig = new Proxy({}, {
  get(_, chave) {
    if (typeof chave !== 'string') return undefined;
    const { label } = configDoStatus(chave);
    return { label, cor: classesSolidasDoStatus(chave), text: '' };
  },
});

const ColaboradorItem = React.memo(({ colab, isSelected, onToggle }) => {
  return (
    <div
      className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer transition-colors"
      onClick={() => onToggle(colab.id)}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => {}}
        className="w-4 h-4 rounded border-border text-primary focus:ring-ring"
      />
      <div className="flex-1">
        <p className="font-medium text-sm">{colab.nome_completo}</p>
        <p className="text-xs text-muted-foreground">{colab.equipe_nome || 'Sem equipe'}</p>
      </div>
      {colab.equipe_nome && (
        <Badge variant="outline" className="text-xs">{colab.equipe_nome}</Badge>
      )}
    </div>
  );
});

ColaboradorItem.displayName = 'ColaboradorItem';

export default function AtribuicaoDialog({ 
  open, 
  onOpenChange, 
  colaboradores, 
  onSubmit 
}) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [form, setForm] = useState({
    dataInicio: '',
    dataFim: '',
    tipoEvento: 'presencial'
  });

  const handleToggle = useCallback((colabId) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(colabId)) {
        newSet.delete(colabId);
      } else {
        newSet.add(colabId);
      }
      return newSet;
    });
  }, []);

  const handleRemove = useCallback((colabId) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(colabId);
      return newSet;
    });
  }, []);

  const selectedColabs = useMemo(() => {
    return colaboradores.filter(c => selectedIds.has(c.id));
  }, [colaboradores, selectedIds]);

  const handleSubmit = () => {
    onSubmit({
      colaboradoresIds: Array.from(selectedIds),
      dataInicio: form.dataInicio,
      dataFim: form.dataFim,
      tipoEvento: form.tipoEvento
    });
    setSelectedIds(new Set());
    setForm({ dataInicio: '', dataFim: '', tipoEvento: 'presencial' });
  };

  const handleClose = () => {
    onOpenChange(false);
    setSelectedIds(new Set());
    setForm({ dataInicio: '', dataFim: '', tipoEvento: 'presencial' });
  };

  return (
    <PainelLateral
      open={open} onOpenChange={handleClose}
      largura="xl"
      titulo="Atribuir Escala"
    >
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data Início *</Label>
              <Input
                type="date"
                value={form.dataInicio}
                onChange={(e) => setForm(prev => ({ ...prev, dataInicio: e.target.value }))}
              />
            </div>
            <div>
              <Label>Data Fim (opcional)</Label>
              <Input
                type="date"
                value={form.dataFim}
                onChange={(e) => setForm(prev => ({ ...prev, dataFim: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>Status/Tipo de Escala *</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {Object.entries(statusConfig).map(([tipo, config]) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, tipoEvento: tipo }))}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    form.tipoEvento === tipo 
                      ? `${config.cor} text-white border-transparent` 
                      : 'bg-card border-border hover:border-border'
                  }`}
                >
                  <span className="font-medium text-sm">{config.label}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedIds.size > 0 && (
            <div className="flex flex-wrap gap-2 p-3 bg-info-soft rounded-lg">
              {selectedColabs.map(colab => (
                <Badge key={colab.id} variant="secondary" className="gap-1">
                  {colab.nome_completo}
                  <button
                    type="button"
                    onClick={() => handleRemove(colab.id)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <div>
            <Label>Colaboradores ({selectedIds.size} selecionados)</Label>
            <div className="mt-2 max-h-64 overflow-y-auto border rounded-lg p-3 space-y-1">
              {colaboradores.map(colab => (
                <ColaboradorItem
                  key={colab.id}
                  colab={colab}
                  isSelected={selectedIds.has(colab.id)}
                  onToggle={handleToggle}
                />
              ))}
            </div>
          </div>

          <RodapeFixo>
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!form.dataInicio || selectedIds.size === 0}
              className="bg-primary hover:bg-primary/90"
            >
              Atribuir
            </Button>
          </RodapeFixo>
        </div>
    </PainelLateral>
  );
}