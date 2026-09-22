import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

// Lê o valor de uma chave dentro da lista de Configuracao (chave/valor genérico).
export function getConfigValor(configuracoes, chave, defaultValor = '') {
  const item = configuracoes.find(c => c.chave === chave);
  return item ? item.valor : defaultValor;
}

export default function ConfigFinanceiraJornada({ configuracoes, onSalvar, isPending }) {
  const [custoHora, setCustoHora] = useState(getConfigValor(configuracoes, 'jornada_custo_hora_equipe', '14'));
  const [toleranciaTipo, setToleranciaTipo] = useState(getConfigValor(configuracoes, 'jornada_tolerancia_tipo', 'percentual'));
  const [toleranciaValor, setToleranciaValor] = useState(getConfigValor(configuracoes, 'jornada_tolerancia_valor', '2'));
  const [faturamentoRef, setFaturamentoRef] = useState(getConfigValor(configuracoes, 'jornada_faturamento_referencia', '320000'));

  useEffect(() => {
    setCustoHora(getConfigValor(configuracoes, 'jornada_custo_hora_equipe', '14'));
    setToleranciaTipo(getConfigValor(configuracoes, 'jornada_tolerancia_tipo', 'percentual'));
    setToleranciaValor(getConfigValor(configuracoes, 'jornada_tolerancia_valor', '2'));
    setFaturamentoRef(getConfigValor(configuracoes, 'jornada_faturamento_referencia', '320000'));
  }, [configuracoes]);

  const handleSalvar = () => {
    onSalvar([
      { chave: 'jornada_custo_hora_equipe', valor: custoHora, tipo: 'numero', categoria: 'metas', descricao: 'Custo médio da hora de trabalho da equipe' },
      { chave: 'jornada_tolerancia_tipo', valor: toleranciaTipo, tipo: 'texto', categoria: 'metas', descricao: 'Tipo de tolerância de perda (valor_fixo ou percentual)' },
      { chave: 'jornada_tolerancia_valor', valor: toleranciaValor, tipo: 'numero', categoria: 'metas', descricao: 'Valor/percentual máximo de perda tolerado' },
      { chave: 'jornada_faturamento_referencia', valor: faturamentoRef, tipo: 'numero', categoria: 'metas', descricao: 'Faturamento de referência para cálculo percentual' },
    ]);
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          Parâmetros Financeiros da Jornada
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Define o custo/hora usado no Impacto Financeiro Direto e o limite de tolerância de perda da empresa.
        </p>
      </CardHeader>
      <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label className="text-xs mb-1 block">Custo Médio da Hora (R$)</Label>
          <Input type="number" step="0.01" value={custoHora} onChange={(e) => setCustoHora(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs mb-1 block">Tipo de Tolerância</Label>
          <Select value={toleranciaTipo} onValueChange={setToleranciaTipo}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="valor_fixo">Valor Fixo (R$)</SelectItem>
              <SelectItem value="percentual">Percentual do Faturamento</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs mb-1 block">
            {toleranciaTipo === 'percentual' ? 'Tolerância (%)' : 'Tolerância Máxima (R$)'}
          </Label>
          <Input type="number" step="0.01" value={toleranciaValor} onChange={(e) => setToleranciaValor(e.target.value)} />
        </div>
        {toleranciaTipo === 'percentual' && (
          <div>
            <Label className="text-xs mb-1 block">Faturamento de Referência (R$)</Label>
            <Input type="number" step="0.01" value={faturamentoRef} onChange={(e) => setFaturamentoRef(e.target.value)} />
          </div>
        )}
        <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
          <Button onClick={handleSalvar} disabled={isPending} size="sm" className="bg-primary hover:bg-primary/90">
            <Save className="w-4 h-4 mr-2" />
            Salvar Parâmetros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}