import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Bell } from 'lucide-react';

export default function AgendamentoPesquisa({ agendamento = {}, onChange }) {
  const handleChange = (field, value) => {
    onChange({
      ...agendamento,
      [field]: value
    });
  };

  const getIntervaloEmDias = (tipo) => {
    switch (tipo) {
      case 'semanal': return 7;
      case 'quinzenal': return 15;
      case 'mensal': return 30;
      default: return agendamento.intervalo_dias || 7;
    }
  };

  return (
    <Card className="border-2 border-info/25 bg-info-soft/30">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={agendamento.ativo || false}
            onCheckedChange={(checked) => handleChange('ativo', checked)}
          />
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <Label className="text-sm font-medium">Agendar Envio Automático</Label>
          </div>
        </div>

        {agendamento.ativo && (
          <div className="space-y-3 pl-6 border-l-2 border-info/30">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo de Envio</Label>
                <Select
                  value={agendamento.tipo || 'unico'}
                  onValueChange={(value) => {
                    handleChange('tipo', value);
                    if (value !== 'personalizado') {
                      handleChange('intervalo_dias', getIntervaloEmDias(value));
                    }
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unico">Único (uma vez)</SelectItem>
                    <SelectItem value="semanal">Semanal</SelectItem>
                    <SelectItem value="quinzenal">Quinzenal</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="personalizado">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Data e Hora do Envio</Label>
                <Input
                  type="datetime-local"
                  className="h-9"
                  value={agendamento.data_hora_envio || ''}
                  onChange={(e) => handleChange('data_hora_envio', e.target.value)}
                />
              </div>
            </div>

            {agendamento.tipo === 'personalizado' && (
              <div>
                <Label className="text-xs">Intervalo Personalizado (dias)</Label>
                <Input
                  type="number"
                  min="1"
                  className="h-9"
                  value={agendamento.intervalo_dias || ''}
                  onChange={(e) => handleChange('intervalo_dias', parseInt(e.target.value))}
                  placeholder="Ex: 10 dias"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Prazo para Responder (dias)</Label>
                <Input
                  type="number"
                  min="1"
                  className="h-9"
                  value={agendamento.prazo_resposta_dias || 7}
                  onChange={(e) => handleChange('prazo_resposta_dias', parseInt(e.target.value))}
                />
              </div>

              <div className="flex items-end">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={agendamento.enviar_lembrete !== false}
                    onCheckedChange={(checked) => handleChange('enviar_lembrete', checked)}
                  />
                  <Label className="text-xs">Enviar Lembrete</Label>
                </div>
              </div>
            </div>

            {agendamento.enviar_lembrete !== false && (
              <div className="pl-4 border-l-2 border-warning/30 bg-warning-soft p-2 rounded">
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="w-3 h-3 text-warning" />
                  <Label className="text-xs font-medium text-warning">Configuração do Lembrete</Label>
                </div>
                <div>
                  <Label className="text-xs text-warning">Enviar lembrete X dias antes do prazo</Label>
                  <Input
                    type="number"
                    min="1"
                    className="h-8 mt-1"
                    value={agendamento.dias_antes_lembrete || 2}
                    onChange={(e) => handleChange('dias_antes_lembrete', parseInt(e.target.value))}
                  />
                </div>
              </div>
            )}

            {agendamento.tipo !== 'unico' && (
              <div className="p-2 bg-info-soft rounded text-xs text-primary">
                <p className="font-medium">Recorrência Ativa</p>
                <p className="text-primary mt-1">
                  Esta pesquisa será enviada automaticamente a cada{' '}
                  {agendamento.tipo === 'semanal' && '7 dias (semanalmente)'}
                  {agendamento.tipo === 'quinzenal' && '15 dias (quinzenalmente)'}
                  {agendamento.tipo === 'mensal' && '30 dias (mensalmente)'}
                  {agendamento.tipo === 'personalizado' && `${agendamento.intervalo_dias || '?'} dias`}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}