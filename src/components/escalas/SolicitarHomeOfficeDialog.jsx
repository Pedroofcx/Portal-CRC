import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Calendar, CheckCircle2, Home } from 'lucide-react';

const diasSemanaLabels = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado'
};

export default function SolicitarHomeOfficeDialog({ 
  open, 
  onClose, 
  onSubmit, 
  configuracao,
  solicitacoesExistentes,
  colaboradorId,
  mesReferencia
}) {
  const [semanaInicio, setSemanaInicio] = useState('');
  const [diasSelecionados, setDiasSelecionados] = useState([]);
  const [justificativa, setJustificativa] = useState('');
  const [validacoes, setValidacoes] = useState(null);

  // Calcular semanas elegíveis do mês
  const semanasDoMes = useMemo(() => {
    if (!mesReferencia) return [];
    
    const [ano, mes] = mesReferencia.split('-').map(Number);
    const primeiroDia = new Date(ano, mes - 1, 1);
    const ultimoDia = new Date(ano, mes, 0);
    const semanas = [];
    
    let diaAtual = new Date(primeiroDia);
    // Ir para a primeira segunda-feira
    while (diaAtual.getDay() !== 1) {
      diaAtual.setDate(diaAtual.getDate() + 1);
    }
    
    while (diaAtual <= ultimoDia) {
      const inicioSemana = new Date(diaAtual);
      const fimSemana = new Date(diaAtual);
      fimSemana.setDate(fimSemana.getDate() + 4); // Sexta-feira
      
      if (fimSemana.getMonth() === mes - 1) {
        semanas.push({
          inicio: inicioSemana.toISOString().split('T')[0],
          fim: fimSemana.toISOString().split('T')[0],
          label: `${inicioSemana.getDate()}/${mes} a ${fimSemana.getDate()}/${mes}`
        });
      }
      
      diaAtual.setDate(diaAtual.getDate() + 7);
    }
    
    return semanas;
  }, [mesReferencia]);

  // Calcular dias da semana selecionada
  const diasDaSemana = useMemo(() => {
    if (!semanaInicio) return [];
    
    const inicio = new Date(semanaInicio + 'T00:00:00');
    const dias = [];
    
    for (let i = 0; i < 5; i++) {
      const dia = new Date(inicio);
      dia.setDate(dia.getDate() + i);
      const diaSemana = dia.getDay();
      
      // Verificar se é dia elegível
      const elegivel = configuracao?.dias_elegiveis_home_office?.includes(diaSemana);
      
      // Verificar se é Click Day
      const isClickDay = configuracao?.click_days?.some(cd => {
        const clickDayDate = new Date(cd + 'T00:00:00');
        return clickDayDate.toISOString().split('T')[0] === dia.toISOString().split('T')[0];
      });
      
      // Verificar se tem reunião obrigatória
      const temReuniao = configuracao?.reunioes_obrigatorias?.some(r => {
        const reuniaoDate = new Date(r.data + 'T00:00:00');
        return reuniaoDate.toISOString().split('T')[0] === dia.toISOString().split('T')[0];
      });
      
      dias.push({
        data: dia.toISOString().split('T')[0],
        diaSemana,
        label: diasSemanaLabels[diaSemana],
        elegivel: elegivel && !isClickDay && !temReuniao,
        motivoBloqueio: isClickDay ? 'Click Day' : temReuniao ? 'Reunião Obrigatória' : !elegivel ? 'Dia não elegível' : null
      });
    }
    
    return dias;
  }, [semanaInicio, configuracao]);

  // Validar solicitação ao mudar semana ou dias
  React.useEffect(() => {
    if (semanaInicio && diasSelecionados.length > 0) {
      validarSolicitacao();
    }
  }, [semanaInicio, diasSelecionados]);

  const validarSolicitacao = () => {
    const validacao = {
      regra_2_semanas_mes: true,
      regra_nao_consecutivas: true,
      regra_intervalo_5_dias: true,
      regra_dias_elegiveis: true,
      alertas: []
    };

    // Contar semanas já solicitadas no mês
    const semanasSolicitadas = solicitacoesExistentes?.filter(s => 
      s.colaborador_id === colaboradorId &&
      s.mes_referencia === mesReferencia &&
      ['pendente', 'aprovada'].includes(s.status)
    ).length || 0;

    validacao.regra_2_semanas_mes = semanasSolicitadas < (configuracao?.maximo_semanas_mes || 2);
    if (!validacao.regra_2_semanas_mes) {
      validacao.alertas.push('Você já atingiu o limite de semanas neste mês');
    }

    // Verificar dias elegíveis
    const todosElegiveis = diasSelecionados.every(d => 
      diasDaSemana.find(dia => dia.data === d)?.elegivel
    );
    validacao.regra_dias_elegiveis = todosElegiveis;
    if (!validacao.regra_dias_elegiveis) {
      validacao.alertas.push('Alguns dias selecionados não são elegíveis');
    }

    // Verificar semanas consecutivas
    if (solicitacoesExistentes?.length > 0) {
      const inicioAtual = new Date(semanaInicio);
      const temConsecutiva = solicitacoesExistentes.some(s => {
        if (s.colaborador_id !== colaboradorId || s.status === 'cancelada' || s.status === 'recusada') return false;
        const inicioExistente = new Date(s.semana_inicio);
        const diffDias = Math.abs((inicioAtual - inicioExistente) / (1000 * 60 * 60 * 24));
        return diffDias === 7;
      });
      validacao.regra_nao_consecutivas = !temConsecutiva;
      if (temConsecutiva) {
        validacao.alertas.push('Você não pode solicitar semanas consecutivas');
      }
    }

    // Verificar prazo mínimo
    const prazoMinimo = configuracao?.prazo_minimo_dias || 7;
    const hoje = new Date();
    const dataInicio = new Date(semanaInicio);
    const diasRestantes = Math.ceil((dataInicio - hoje) / (1000 * 60 * 60 * 24));
    
    if (diasRestantes < prazoMinimo) {
      validacao.alertas.push(`Solicitação fora do prazo mínimo de ${prazoMinimo} dias. Sujeita a análise especial.`);
    }

    setValidacoes(validacao);
  };

  const toggleDia = (data) => {
    setDiasSelecionados(prev => 
      prev.includes(data)
        ? prev.filter(d => d !== data)
        : [...prev, data]
    );
  };

  const handleSubmit = () => {
    if (!semanaInicio || diasSelecionados.length === 0) {
      return;
    }

    const semana = semanasDoMes.find(s => s.inicio === semanaInicio);
    
    const prazoMinimo = configuracao?.prazo_minimo_dias || 7;
    const hoje = new Date();
    const dataInicio = new Date(semanaInicio);
    const diasRestantes = Math.ceil((dataInicio - hoje) / (1000 * 60 * 60 * 24));
    const foraDoPrazo = diasRestantes < prazoMinimo;

    onSubmit({
      semana_inicio: semanaInicio,
      semana_fim: semana.fim,
      dias_escolhidos: diasSelecionados,
      dias_semana_escolhidos: diasSelecionados.map(d => new Date(d + 'T00:00:00').getDay()),
      justificativa,
      mes_referencia: mesReferencia,
      validacoes,
      fora_do_prazo: foraDoPrazo
    });
    
    // Reset
    setSemanaInicio('');
    setDiasSelecionados([]);
    setJustificativa('');
    setValidacoes(null);
  };

  const podeSubmeter = semanaInicio && 
                       diasSelecionados.length > 0 && 
                       diasSelecionados.length === 2 &&
                       validacoes?.regra_dias_elegiveis;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="w-5 h-5 text-primary" />
            Solicitar Home Office por Escolha
          </DialogTitle>
        </DialogHeader>

        {!configuracao?.ativo ? (
          <Alert>
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>
              O sistema de escolha de home office está temporariamente desativado.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-6 mt-4">
            {/* Informações das regras */}
            <Alert>
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-sm space-y-1">
                <p className="font-medium">Regras de Elegibilidade:</p>
                <ul className="list-disc list-inside text-xs space-y-0.5 ml-2">
                  <li>Máximo de {configuracao?.maximo_semanas_mes || 2} semanas por mês</li>
                  <li>Semanas não podem ser consecutivas</li>
                  <li>Você deve escolher exatamente 2 dias para home office</li>
                  <li>Prazo mínimo: {configuracao?.prazo_minimo_dias || 7} dias de antecedência</li>
                  <li>Dias elegíveis: {configuracao?.dias_elegiveis_home_office?.map(d => diasSemanaLabels[d]).join(', ')}</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Seleção de semana */}
            <div>
              <Label>Selecione a Semana</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {semanasDoMes.map(semana => (
                  <Button
                    key={semana.inicio}
                    type="button"
                    variant={semanaInicio === semana.inicio ? 'default' : 'outline'}
                    onClick={() => {
                      setSemanaInicio(semana.inicio);
                      setDiasSelecionados([]);
                    }}
                    className="justify-start"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    {semana.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Seleção de dias */}
            {semanaInicio && (
              <div>
                <Label>Escolha 2 Dias para Home Office</Label>
                <p className="text-xs text-muted-foreground mb-2">Você manterá 3 dias presenciais</p>
                <div className="space-y-2">
                  {diasDaSemana.map(dia => (
                    <div 
                      key={dia.data}
                      className={`
                        p-3 border rounded-lg flex items-center justify-between
                        ${!dia.elegivel ? 'bg-muted opacity-60' : 'hover:bg-info-soft cursor-pointer'}
                        ${diasSelecionados.includes(dia.data) ? 'border-primary/40 bg-info-soft' : ''}
                      `}
                      onClick={() => dia.elegivel && toggleDia(dia.data)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={diasSelecionados.includes(dia.data)}
                          disabled={!dia.elegivel}
                          onCheckedChange={() => dia.elegivel && toggleDia(dia.data)}
                        />
                        <div>
                          <p className="font-medium text-sm">{dia.label}</p>
                          <p className="text-xs text-muted-foreground">{dia.data}</p>
                        </div>
                      </div>
                      {!dia.elegivel && dia.motivoBloqueio && (
                        <Badge variant="destructive" className="text-xs">
                          {dia.motivoBloqueio}
                        </Badge>
                      )}
                      {dia.elegivel && diasSelecionados.includes(dia.data) && (
                        <Badge className="bg-primary text-xs">
                          <Home className="w-3 h-3 mr-1" />
                          Home Office
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
                {diasSelecionados.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {diasSelecionados.length} de 2 dias selecionados
                  </p>
                )}
              </div>
            )}

            {/* Validações */}
            {validacoes && validacoes.alertas.length > 0 && (
              <Alert variant={validacoes.alertas.some(a => a.includes('limite') || a.includes('consecutivas')) ? 'destructive' : 'default'}>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  <ul className="text-sm space-y-1">
                    {validacoes.alertas.map((alerta, idx) => (
                      <li key={idx}>• {alerta}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Justificativa */}
            <div>
              <Label>Justificativa (Opcional)</Label>
              <Textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Explique brevemente o motivo da solicitação..."
                rows={3}
              />
            </div>

            {/* Resumo */}
            {podeSubmeter && (
              <Alert className="bg-success-soft border-success/25">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <AlertDescription className="text-sm text-success">
                  <p className="font-medium mb-1">Resumo da sua solicitação:</p>
                  <ul className="text-xs space-y-0.5">
                    <li>• Semana: {semanasDoMes.find(s => s.inicio === semanaInicio)?.label}</li>
                    <li>• Home Office: {diasSelecionados.length} dias</li>
                    <li>• Presencial: 3 dias (restantes da semana)</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Ações */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!podeSubmeter}
                className="bg-primary hover:bg-primary/90"
              >
                Enviar Solicitação
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}