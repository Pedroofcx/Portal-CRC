import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/api/db';
import { traduzirErro } from '@/lib/erros';

/**
 * Quando o gestor contesta a solução replicável, o agente que atendeu vê o
 * parecer aqui, edita a solução e reenvia: ela volta para "pendente" e o
 * gestor decide de novo (se aprovar, o +0,5 entra na pontuação). Só quem
 * atendeu a tratativa vê isto; o banco confere de novo (migration 48).
 */
export default function ReenviarSolucaoReplicavel({ tratativa }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(tratativa.descricao_solucao ?? '');
  useEffect(() => { setTexto(tratativa.descricao_solucao ?? ''); }, [tratativa.id, tratativa.descricao_solucao]);

  const reenviar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('reenviar_solucao_replicavel', { p_tratativa_id: tratativa.id, p_descricao: texto });
      if (error) throw error;
    },
    onSuccess: () => {
      ['tratativa', 'tratativas', 'replicaveis-contestadas-sino', 'replicaveis-sino'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      setEditando(false);
      toast.success('Solução reenviada. O gestor vai analisar de novo.');
    },
    onError: (e) => toast.error(`Não consegui reenviar: ${traduzirErro(e)}`),
  });

  const semTexto = !texto.trim();

  if (!editando) {
    return (
      <div className="mt-3 rounded-lg border border-warning/25 bg-warning-soft p-3">
        <p className="text-sm text-foreground">
          O gestor contestou esta solução replicável, então o +0,5 não conta por enquanto. Você pode editar a solução e reenviar para uma nova análise.
        </p>
        <Button size="sm" className="mt-2" onClick={() => setEditando(true)}>Editar e reenviar</Button>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2 rounded-lg border border-border p-3">
      <label htmlFor="solucao-reenvio" className="text-sm font-medium text-foreground">Solução (ajuste o que o parecer pediu)</label>
      <Textarea id="solucao-reenvio" rows={5} value={texto} onChange={(e) => setTexto(e.target.value)} />
      {semTexto && <p className="text-sm text-destructive">Escreva a solução antes de reenviar.</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => !semTexto && reenviar.mutate()} disabled={reenviar.isPending}>
          {reenviar.isPending ? 'Reenviando…' : 'Reenviar para análise'}
        </Button>
        <Button size="sm" variant="outline" onClick={() => { setEditando(false); setTexto(tratativa.descricao_solucao ?? ''); }}>Cancelar</Button>
      </div>
    </div>
  );
}
