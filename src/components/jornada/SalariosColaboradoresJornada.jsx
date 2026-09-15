import db from '@/api/db';
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Wallet } from 'lucide-react';
import { toast } from 'sonner';

// Painel gestor-only para conferir/editar o salário de cada colaborador,
// garantindo que o custo operacional da Jornada do Cliente use valores reais.
export default function SalariosColaboradoresJornada({ colaboradores }) {
  const queryClient = useQueryClient();
  const [editando, setEditando] = useState({});

  const updateMutation = useMutation({
    mutationFn: ({ id, salario }) => db.entities.Colaborador.update(id, { salario }),
    onSuccess: () => {
      queryClient.invalidateQueries(['colaboradores']);
      toast.success('Salário atualizado');
    },
    onError: () => toast.error('Erro ao atualizar salário'),
  });

  const colaboradoresAtivos = colaboradores.filter(c => c.ativo !== false);

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-success" />
          Salário dos Colaboradores
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Necessário para o cálculo correto do custo operacional (horas trabalhadas) em cada tratativa.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {colaboradoresAtivos.map((c) => {
            const valorEditando = editando[c.id] !== undefined ? editando[c.id] : c.salario;
            return (
              <div key={c.id} className="p-3 bg-muted border border-border rounded-lg">
                <Label className="text-xs text-muted-foreground">{c.nome_completo}</Label>
                <CurrencyInput
                  className="mt-1"
                  value={valorEditando || 0}
                  onChange={(num) => setEditando({ ...editando, [c.id]: num })}
                  onBlur={() => {
                    const novoValor = editando[c.id];
                    if (novoValor !== undefined && novoValor !== c.salario && novoValor !== 0) {
                      updateMutation.mutate({ id: c.id, salario: novoValor });
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}