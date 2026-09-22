import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const tiposEvento = [
  { value: 'home_office', label: 'Home Office' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'hibrido', label: 'Híbrido' },
  { value: 'ferias', label: 'Férias' },
  { value: 'day_off', label: 'Day Off' },
  { value: 'falta', label: 'Falta' },
  { value: 'treinamento', label: 'Treinamento' },
  { value: 'evento_especial', label: 'Evento Especial' },
];

export default function FerramentasLancamentoColetivo({ colaboradores, equipes, onAplicar, onLimpar, isPending }) {
  const [tipoAlvo, setTipoAlvo] = useState('equipe');
  const [equipeId, setEquipeId] = useState('');
  const [colaboradorIds, setColaboradorIds] = useState([]);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tipoEvento, setTipoEvento] = useState('presencial');
  const [confirmLimparOpen, setConfirmLimparOpen] = useState(false);

  const colaboradoresAtivos = useMemo(() => colaboradores.filter(c => c.ativo !== false), [colaboradores]);

  const toggleColaborador = (id) => {
    setColaboradorIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const resolverColaboradorIds = () => {
    if (tipoAlvo === 'equipe') {
      return colaboradoresAtivos.filter(c => c.equipe_id === equipeId).map(c => c.id);
    }
    return colaboradorIds;
  };

  const validar = () => {
    const ids = resolverColaboradorIds();
    if (ids.length === 0) {
      toast.error('Selecione uma equipe ou ao menos um colaborador');
      return null;
    }
    if (!dataInicio || !dataFim) {
      toast.error('Defina o período (data início e fim)');
      return null;
    }
    return ids;
  };

  const handleAplicar = () => {
    const ids = validar();
    if (!ids) return;
    onAplicar({ colaboradorIds: ids, dataInicio, dataFim, tipoEvento });
  };

  const handleConfirmarLimpar = () => {
    const ids = resolverColaboradorIds();
    onLimpar({ colaboradorIds: ids, dataInicio, dataFim });
    setConfirmLimparOpen(false);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Ferramentas de Lançamento Coletivo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs mb-1 block">Aplicar para</Label>
          <Select value={tipoAlvo} onValueChange={setTipoAlvo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="equipe">Equipe inteira</SelectItem>
              <SelectItem value="colaboradores">Colaboradores selecionados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {tipoAlvo === 'equipe' ? (
          <div>
            <Label className="text-xs mb-1 block">Equipe</Label>
            <Select value={equipeId} onValueChange={setEquipeId}>
              <SelectTrigger><SelectValue placeholder="Selecione a equipe" /></SelectTrigger>
              <SelectContent>
                {equipes.map(eq => (
                  <SelectItem key={eq.id} value={eq.id}>{eq.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div>
            <Label className="text-xs mb-2 block">Colaboradores</Label>
            <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
              {colaboradoresAtivos.map(c => (
                <label key={c.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                  <Checkbox
                    checked={colaboradorIds.includes(c.id)}
                    onCheckedChange={() => toggleColaborador(c.id)}
                  />
                  {c.nome_completo}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-1 block">Data Início</Label>
            <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs mb-1 block">Data Fim</Label>
            <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
        </div>

        <div>
          <Label className="text-xs mb-1 block">Modalidade</Label>
          <Select value={tipoEvento} onValueChange={setTipoEvento}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {tiposEvento.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={handleAplicar} disabled={isPending} className="bg-primary hover:bg-primary/90">
            Aplicar Escala em Massa
          </Button>
          <Button
            onClick={() => setConfirmLimparOpen(true)}
            disabled={isPending}
            variant="destructive"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Agendamentos do Período
          </Button>
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirmLimparOpen}
        onOpenChange={setConfirmLimparOpen}
        title="Limpar Agendamentos do Período"
        description={`Tem certeza que deseja apagar todos os registros de escala de ${dataInicio || '?'} até ${dataFim || '?'} para os colaboradores selecionados?`}
        confirmLabel="Apagar"
        onConfirm={handleConfirmarLimpar}
        variant="danger"
      />
    </Card>
  );
}