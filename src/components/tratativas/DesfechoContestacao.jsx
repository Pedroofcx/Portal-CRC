import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Flag } from 'lucide-react';
import { formatDateSP } from '@/components/utils/helpers';

const DESFECHOS = [
  { value: 'favor_emissor', label: 'A favor do emissor (cliente ganhou)', color: 'bg-destructive/10 text-destructive' },
  { value: 'favor_estabelecimento', label: 'A favor do estabelecimento (empresa ganhou)', color: 'bg-success-soft text-success' },
  { value: 'protesto_recusado', label: 'Protesto recusado pelo cliente', color: 'bg-warning-soft text-warning' },
  { value: 'outros', label: 'Outros desfechos', color: 'bg-muted text-foreground' },
];

export default function DesfechoContestacao({ tratativa, onSalvar, isLoading }) {
  const [resultado, setResultado] = useState('');
  const [descricaoOutros, setDescricaoOutros] = useState('');

  const desfecho = tratativa.desfecho_contestacao;
  const jaDefinido = !!desfecho?.resultado;

  if (jaDefinido) {
    const d = DESFECHOS.find(d => d.value === desfecho.resultado);
    return (
      <Card className="border-0 shadow-sm bg-success-soft border-l-4 border-l-green-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-success">
            <CheckCircle className="w-5 h-5" />
            Desfecho Final Registrado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Badge className={d?.color || 'bg-muted text-foreground'}>{d?.label || desfecho.resultado}</Badge>
          {desfecho.descricao_outros && (
            <p className="text-foreground mt-2">{desfecho.descricao_outros}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Registrado por {desfecho.registrado_por} em {formatDateSP(desfecho.data_desfecho)}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Só exibe para contestações que retornaram do financeiro (status em_andamento após descongelamento)
  // ou qualquer contestação elegível para encerramento
  if (tratativa.tipo_tratativa !== 'contestacao') return null;
  if (!['em_andamento', 'dependencia_externa', 'tratativa_iniciada'].includes(tratativa.status)) return null;
  // Só exibe se passou pelo financeiro
  if (!tratativa.congelamento_sla?.data_descongelamento) return null;

  const podeSubmeter = resultado && (resultado !== 'outros' || descricaoOutros.trim().length >= 5);

  return (
    <Card className="border-0 shadow-sm border-l-4 border-l-purple-400 bg-info-soft">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-primary">
          <Flag className="w-5 h-5" />
          Definir Desfecho Final da Contestação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-primary">
          O retorno do setor financeiro foi recebido. Registre o desfecho final para liberar a pontuação.
        </p>

        <div>
          <Label>Resultado da Contestação *</Label>
          <Select value={resultado} onValueChange={setResultado}>
            <SelectTrigger className="mt-2 bg-card">
              <SelectValue placeholder="Selecione o resultado" />
            </SelectTrigger>
            <SelectContent>
              {DESFECHOS.map(d => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {resultado === 'outros' && (
          <div>
            <Label>Descreva o desfecho *</Label>
            <Textarea
              value={descricaoOutros}
              onChange={e => setDescricaoOutros(e.target.value)}
              placeholder="Descreva o desfecho específico desta contestação..."
              rows={3}
              className="mt-1 bg-card"
            />
          </div>
        )}

        <Button
          onClick={() => onSalvar({ resultado, descricao_outros: descricaoOutros })}
          disabled={!podeSubmeter || isLoading}
          className="bg-primary hover:bg-purple-700 w-full"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          {isLoading ? 'Salvando...' : 'Registrar Desfecho'}
        </Button>
      </CardContent>
    </Card>
  );
}