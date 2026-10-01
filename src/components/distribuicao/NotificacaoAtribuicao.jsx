import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck } from 'lucide-react';
import db, { supabase } from '@/api/db';
import { toast } from 'sonner';
import { TIPOS_CONFIG, PRIORIDADE_CONFIG } from './distribuicaoUtils';

/**
 * Aviso simples pro agente quando o gestor vincula um ticket a ele em "Nova
 * Atribuição de Tratativa" (migration 32). Só atribuições feitas a partir da
 * migration aparecem aqui — o histórico anterior já nasce confirmado.
 *
 * Uma de cada vez: ao confirmar, a lista revalida e, se sobrar outra
 * pendente, o diálogo reabre com ela. Sem botão de fechar — tem que
 * confirmar pra sumir, igual a troca de senha obrigatória.
 */
export default function NotificacaoAtribuicao({ colaborador }) {
  const queryClient = useQueryClient();

  const { data: pendentes = [] } = useQuery({
    queryKey: ['atribuicoes-pendentes', colaborador?.id],
    queryFn: () => db.entities.DistribuicaoTratativa.filter(
      { agente_id: colaborador.id, confirmado_pelo_agente: false },
      '-created_date',
    ),
    enabled: !!colaborador?.id,
    staleTime: 30000,
  });

  const confirmarMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.rpc('confirmar_atribuicao', { id_atribuicao: id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['atribuicoes-pendentes', colaborador?.id] }),
    onError: () => toast.error('Não consegui confirmar. Tente de novo.'),
  });

  const atual = pendentes[0];
  if (!atual) return null;

  const tipo = TIPOS_CONFIG[atual.tipo_tratativa];
  const prioridade = PRIORIDADE_CONFIG[atual.prioridade];

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        className="max-w-sm"
        semBotaoFechar
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            Nova atribuição
          </DialogTitle>
          <DialogDescription>
            Você recebeu uma tratativa.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted p-3 text-sm space-y-1.5">
          <p className="font-mono font-semibold text-foreground">Ticket #{atual.ticket_id}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {tipo && <Badge className={tipo.color}>{tipo.label}</Badge>}
            {prioridade && <Badge variant="outline">{prioridade.label}</Badge>}
          </div>
          {atual.observacao && (
            <p className="text-muted-foreground">{atual.observacao}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            className="w-full"
            onClick={() => confirmarMutation.mutate(atual.id)}
            disabled={confirmarMutation.isPending}
          >
            {confirmarMutation.isPending ? 'Confirmando...' : 'OK'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
