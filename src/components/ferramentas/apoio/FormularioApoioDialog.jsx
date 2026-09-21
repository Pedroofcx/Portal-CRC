import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle } from 'lucide-react';
import { TIPOS_APOIO, formatMinutos, getMesReferencia } from './constants';
import PainelLateral from '@/components/ui/PainelLateral';

const FORM_VAZIO = {
  tipo_apoio: '', tipo_apoio_outro: '', tipo_zendesk: '',
  nome_cliente: '', cnpj_cliente: '', operador_nome: '',
  data_solicitacao: new Date().toISOString().split('T')[0],
  tratativa_id: '', vinculo_crc: '', descricao_justificativa: '', horas_solicitadas: '',
};

const maskCNPJ = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

export default function FormularioApoioDialog({ open, onOpenChange, onSubmit, disponivelMinutos, user, isGestor, tratativas = [], isSubmitting = false }) {
  const [form, setForm] = useState(FORM_VAZIO);

  useEffect(() => {
    if (open && user?.full_name) {
      setForm(_f => ({ ...FORM_VAZIO, operador_nome: user.full_name, data_solicitacao: new Date().toISOString().split('T')[0] }));
    }
    if (!open) setForm(FORM_VAZIO);
  }, [open, user]);

  const onChange = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const horasOptions = [1, 2, 3].filter(h => h * 60 <= disponivelMinutos);
  const horasNum = parseInt(form.horas_solicitadas) || 0;
  const saldoInsuficiente = horasNum > 0 && horasNum * 60 > disponivelMinutos;

  const handleSubmit = () => {
    if (!form.tipo_apoio || !form.nome_cliente || !form.descricao_justificativa || !form.horas_solicitadas) return;
    if (form.tipo_apoio === 'outro' && !form.tipo_apoio_outro) return;
    if (saldoInsuficiente) return;
    onSubmit({
      ...form,
      tipo_apoio_outro: form.tipo_apoio === 'outro' ? form.tipo_apoio_outro : '',
      tratativa_id: form.tratativa_id || '',
      horas_solicitadas: horasNum,
      minutos_solicitados: horasNum * 60,
      mes_referencia: getMesReferencia(new Date(form.data_solicitacao)),
      status: 'solicitada',
      historico_status: [{ status: 'solicitada', data: new Date().toISOString(), usuario: user?.full_name || '—' }],
    });
  };

  const canSubmit = form.tipo_apoio && form.nome_cliente && form.descricao_justificativa && form.horas_solicitadas &&
    (form.tipo_apoio !== 'outro' || form.tipo_apoio_outro) && !saldoInsuficiente;

  return (
    <PainelLateral
      open={open} onOpenChange={onOpenChange}
      largura="xl"
      titulo="Nova Solicitação de Apoio Especializado"
      rodape={<><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting} className="bg-primary hover:bg-primary">
            {isSubmitting ? 'Registrando...' : 'Criar Solicitação'}
          </Button></>}
    >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de Apoio <span className="text-destructive">*</span></Label>
            <Select value={form.tipo_apoio} onValueChange={v => onChange('tipo_apoio', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {TIPOS_APOIO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
            {form.tipo_apoio === 'outro' && (
              <Input placeholder="Especifique o tipo de apoio" value={form.tipo_apoio_outro} onChange={e => onChange('tipo_apoio_outro', e.target.value)} className="mt-2" />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Ticket Zendesk</Label>
              <Input placeholder="#123456" value={form.tipo_zendesk} onChange={e => onChange('tipo_zendesk', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Cliente <span className="text-destructive">*</span></Label>
              <Input placeholder="Nome do cliente" value={form.nome_cliente} onChange={e => onChange('nome_cliente', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">CNPJ</Label>
              <Input placeholder="00.000.000/0000-00" value={form.cnpj_cliente} onChange={e => onChange('cnpj_cliente', maskCNPJ(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Operador Responsável</Label>
              <Input value={form.operador_nome} onChange={e => onChange('operador_nome', e.target.value)} disabled={!isGestor} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Data da Solicitação</Label>
              <Input type="date" value={form.data_solicitacao} onChange={e => onChange('data_solicitacao', e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Tratativa CRC</Label>
              <Select value={form.tratativa_id || ''} onValueChange={v => {
                const t = tratativas.find(x => x.id === v);
                setForm(f => ({
                  ...f,
                  tratativa_id: v,
                  vinculo_crc: t?.id_interno || '',
                  nome_cliente: t?.nome_cliente || f.nome_cliente,
                  tipo_zendesk: t?.link_zendesk || f.tipo_zendesk,
                }));
              }}>
                <SelectTrigger><SelectValue placeholder="Buscar e selecionar tratativa CRC..." /></SelectTrigger>
                <SelectContent>
                  {tratativas.slice(0, 100).map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.id_interno ? `#${t.id_interno}` : `#${t.id.slice(0, 8)}`} — {t.nome_cliente || 'Sem nome'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.vinculo_crc && (
                <p className="text-xs text-primary">✓ Vinculado: {form.vinculo_crc}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Descrição / Justificativa <span className="text-destructive">*</span></Label>
            <Textarea rows={4} placeholder="Descreva: a dificuldade do cliente, por que o apoio é necessário, e o que precisa ser realizado pelo time especializado." value={form.descricao_justificativa} onChange={e => onChange('descricao_justificativa', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Quantidade de Horas Solicitadas <span className="text-destructive">*</span></Label>
            <Select value={form.horas_solicitadas} onValueChange={v => onChange('horas_solicitadas', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {horasOptions.map(h => (
                  <SelectItem key={h} value={String(h)}>{formatMinutos(h * 60)} ({h} {h === 1 ? 'hora' : 'horas'})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Disponível neste mês: {formatMinutos(disponivelMinutos)}</p>
            {saldoInsuficiente && (
              <div className="p-3 bg-destructive/10 border border-destructive/25 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive"><strong>Saldo insuficiente.</strong> Você possui apenas {formatMinutos(disponivelMinutos)} disponíveis neste mês. Reduza o tempo solicitado para continuar.</p>
              </div>
            )}
          </div>
        </div>
    </PainelLateral>
  );
}