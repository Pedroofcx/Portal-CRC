import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import db from '@/api/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Cartao } from '@/components/ui/Cartao';
import { traduzirErro } from '@/lib/erros';
import { formatDateSP } from '@/components/utils/helpers';
import {
  LIMITE_RESUMO, situacaoParaCliente,
} from '../../../supabase/functions/api/politica.js';

const CODIGO = /^[A-Za-z0-9._-]*$/;

/**
 * Atendimento ao cliente na tratativa: os números dos tickets (Zendesk e
 * ClickDesk) e o "resumo para o cliente", o texto que o cliente recebe quando
 * pergunta pela tratativa no WhatsApp (API de acompanhamento).
 *
 * O resumo é escrito PARA o cliente: nada interno (prazo, valores, nome de
 * colega, motivo). Sem resumo, a API responde com uma frase padrão do estado.
 */
export default function AtendimentoAoCliente({ tratativa, colaborador }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ticket_zendesk: '', ticket_clickdesk: '', resumo_whatsapp: '' });

  useEffect(() => {
    setForm({
      ticket_zendesk: tratativa.ticket_zendesk ?? '',
      ticket_clickdesk: tratativa.ticket_clickdesk ?? '',
      resumo_whatsapp: tratativa.resumo_whatsapp ?? '',
    });
  }, [tratativa.id, tratativa.ticket_zendesk, tratativa.ticket_clickdesk, tratativa.resumo_whatsapp]);

  const salvar = useMutation({
    mutationFn: () => {
      const resumo = form.resumo_whatsapp.trim();
      const mudouResumo = resumo !== (tratativa.resumo_whatsapp ?? '');
      return db.entities.Tratativa.update(tratativa.id, {
        ticket_zendesk: form.ticket_zendesk.trim() || null,
        ticket_clickdesk: form.ticket_clickdesk.trim() || null,
        resumo_whatsapp: resumo || null,
        ...(mudouResumo ? { resumo_whatsapp_por_nome: resumo ? colaborador?.nome_completo ?? null : null } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tratativa', tratativa.id] });
      queryClient.invalidateQueries({ queryKey: ['tratativas'] });
      toast.success('Atendimento ao cliente salvo.');
    },
    onError: (e) => toast.error(`Não consegui salvar: ${traduzirErro(e)}`),
  });

  const codigosOk = CODIGO.test(form.ticket_zendesk) && CODIGO.test(form.ticket_clickdesk);
  const restantes = LIMITE_RESUMO - form.resumo_whatsapp.length;
  const mudou = form.ticket_zendesk !== (tratativa.ticket_zendesk ?? '')
    || form.ticket_clickdesk !== (tratativa.ticket_clickdesk ?? '')
    || form.resumo_whatsapp !== (tratativa.resumo_whatsapp ?? '');
  const padrao = situacaoParaCliente(tratativa.status);
  const vistoPeloCliente = form.resumo_whatsapp.trim() || padrao.mensagem;

  return (
    <Cartao titulo="Atendimento ao cliente (WhatsApp e tickets)">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="ticket_zendesk" className="text-xs text-muted-foreground">Ticket no Zendesk</Label>
            <Input id="ticket_zendesk" className="mt-1" value={form.ticket_zendesk} placeholder="Ex: 1089224"
              onChange={(e) => setForm({ ...form, ticket_zendesk: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="ticket_clickdesk" className="text-xs text-muted-foreground">Ticket no ClickDesk</Label>
            <Input id="ticket_clickdesk" className="mt-1" value={form.ticket_clickdesk} placeholder="Ex: CD-5521"
              onChange={(e) => setForm({ ...form, ticket_clickdesk: e.target.value })} />
          </div>
        </div>
        {!codigosOk && <p className="text-xs text-destructive">O número do ticket só pode ter letras, números, ponto, hífen e sublinhado.</p>}

        <div>
          <div className="flex items-baseline justify-between gap-3">
            <Label htmlFor="resumo_whatsapp" className="text-xs text-muted-foreground">Resumo para o cliente (WhatsApp)</Label>
            <span className={`text-xs tabular-nums ${restantes < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{restantes}</span>
          </div>
          <Textarea id="resumo_whatsapp" rows={3} className="mt-1" value={form.resumo_whatsapp}
            placeholder="Ex: Estamos ajustando a cobrança e damos retorno até amanhã."
            onChange={(e) => setForm({ ...form, resumo_whatsapp: e.target.value })} />
          <p className="mt-1 text-xs text-muted-foreground">
            É o que o cliente lê quando pergunta pela tratativa no WhatsApp. Escreva para o cliente: nada de prazo interno,
            valores, nomes de colegas ou motivo. Vazio, ele recebe a frase padrão do estado.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted p-3 text-sm">
          <p className="text-xs text-muted-foreground">O cliente vê agora: <span className="font-medium text-foreground">{padrao.situacao}</span></p>
          <p className="mt-1 text-foreground">{vistoPeloCliente}</p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {tratativa.resumo_whatsapp_atualizado_em
              ? `Resumo atualizado em ${formatDateSP(tratativa.resumo_whatsapp_atualizado_em)}${tratativa.resumo_whatsapp_por_nome ? ` por ${tratativa.resumo_whatsapp_por_nome}` : ''}`
              : 'Ainda sem resumo próprio.'}
          </p>
          <Button onClick={() => salvar.mutate()} disabled={!mudou || !codigosOk || restantes < 0 || salvar.isPending}>
            {salvar.isPending ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </div>
    </Cartao>
  );
}
