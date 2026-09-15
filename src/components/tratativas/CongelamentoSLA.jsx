import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Snowflake, Play, Clock, AlertTriangle } from 'lucide-react';
import { formatDateSP } from '@/components/utils/helpers';

export default function CongelamentoSLA({ tratativa, user, onCongelar, onDescongelar, isLoading }) {
  const [dataDefesa, setDataDefesa] = useState('');
  const [showForm, setShowForm] = useState(false);

  const congelamento = tratativa.congelamento_sla;
  const isCongelado = tratativa.status === 'aguardando_financeiro';
  const isContestacao = tratativa.tipo_tratativa === 'contestacao';

  if (!isContestacao) return null;

  // Calcula tempo congelado atual
  const getTempoCongeladoAtual = () => {
    if (!congelamento?.data_congelamento) return 0;
    const inicio = new Date(congelamento.data_congelamento);
    const fim = congelamento.data_descongelamento ? new Date(congelamento.data_descongelamento) : new Date();
    return Math.round((fim - inicio) / 60000);
  };

  const formatMinutos = (min) => {
    if (!min) return '-';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  const handleCongelar = () => {
    if (!dataDefesa) return;
    onCongelar(dataDefesa);
    setShowForm(false);
    setDataDefesa('');
  };

  // Card quando está congelado
  if (isCongelado) {
    return (
      <Card className="border-0 shadow-sm border-l-4 border-l-blue-400 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-blue-800">
            <Snowflake className="w-5 h-5 text-blue-500" />
            SLA Congelado — Aguardando Setor Financeiro
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 bg-white rounded-lg">
              <p className="text-xs text-slate-500">Congelado em</p>
              <p className="font-medium">{formatDateSP(congelamento?.data_congelamento)}</p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <p className="text-xs text-slate-500">Por</p>
              <p className="font-medium">{congelamento?.congelado_por_nome || '-'}</p>
            </div>
            <div className="p-3 bg-white rounded-lg">
              <p className="text-xs text-slate-500">Defesa enviada em</p>
              <p className="font-medium">{congelamento?.data_envio_defesa || '-'}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <p className="text-xs text-slate-500">Tempo congelado</p>
              <p className="font-bold text-blue-700">{formatMinutos(getTempoCongeladoAtual())}</p>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Esta tratativa está fora da fila de produtividade e SLA. A pontuação será atribuída após o desfecho final.
          </div>

          <Button
            onClick={onDescongelar}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 w-full"
          >
            <Play className="w-4 h-4 mr-2" />
            {isLoading ? 'Processando...' : 'Retorno do Financeiro — Reativar Tratativa'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Pode congelar (tratativa iniciada, em andamento ou dependencia)
  const podeCongelar = ['tratativa_iniciada', 'em_andamento', 'dependencia_externa'].includes(tratativa.status);

  if (!podeCongelar) return null;

  return (
    <Card className="border-0 shadow-sm border-l-4 border-l-slate-300">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-slate-700">
          <Snowflake className="w-5 h-5 text-slate-400" />
          Aguardar Retorno do Setor Financeiro
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!showForm ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Use quando a defesa já foi enviada e a tratativa aguarda resposta oficial do setor financeiro. O SLA será congelado durante esse período.
            </p>
            <Button variant="outline" onClick={() => setShowForm(true)} className="border-blue-300 text-blue-700 hover:bg-blue-50">
              <Snowflake className="w-4 h-4 mr-2" />
              Congelar SLA
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <strong>Atenção:</strong> O SLA será pausado. A tratativa sairá da fila de produtividade enquanto aguarda o financeiro.
            </div>
            <div>
              <Label>Data de Envio da Defesa *</Label>
              <Input
                type="date"
                value={dataDefesa}
                onChange={e => setDataDefesa(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="mt-1"
              />
              <p className="text-xs text-slate-500 mt-1">Obrigatório confirmar que a defesa foi enviada antes de congelar o SLA.</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCongelar}
                disabled={!dataDefesa || isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Snowflake className="w-4 h-4 mr-2" />
                {isLoading ? 'Congelando...' : 'Confirmar Congelamento'}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setDataDefesa(''); }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}