import db from '@/api/db';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Trash2, Tag } from 'lucide-react';

export default function ConfigTiposObservacao() {
  const [novoTipo, setNovoTipo] = useState({ nome: '', descricao: '', cor: 'hsl(var(--chart-1))' });
  const queryClient = useQueryClient();

  const { data: tipos = [] } = useQuery({
    queryKey: ['tiposObservacao'],
    queryFn: () => db.entities.TipoObservacao.filter({ ativa: true }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.TipoObservacao.create({ ...data, ativa: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['tiposObservacao']);
      toast.success('Tipo criado');
      setNovoTipo({ nome: '', descricao: '', cor: 'hsl(var(--chart-1))' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.TipoObservacao.update(id, { ativa: false }),
    onSuccess: () => {
      queryClient.invalidateQueries(['tiposObservacao']);
      toast.success('Tipo removido');
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Tag className="w-5 h-5" />
          Tipos de Observação
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="Nome do tipo (ex: Elogio)"
            value={novoTipo.nome}
            onChange={(e) => setNovoTipo({ ...novoTipo, nome: e.target.value })}
          />
          <Input
            type="color"
            value={novoTipo.cor}
            onChange={(e) => setNovoTipo({ ...novoTipo, cor: e.target.value })}
            className="w-20"
          />
          <Button onClick={() => createMutation.mutate(novoTipo)} disabled={!novoTipo.nome}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {tipos.map(tipo => (
            <Badge 
              key={tipo.id} 
              variant="outline" 
              className="px-3 py-1.5 flex items-center gap-2"
              style={{ borderColor: tipo.cor, color: tipo.cor }}
            >
              {tipo.nome}
              <button onClick={() => deleteMutation.mutate(tipo.id)}>
                <Trash2 className="w-3 h-3 text-destructive" />
              </button>
            </Badge>
          ))}
        </div>

        {tipos.length === 0 && (
          <p className="text-muted-foreground text-center py-4">
            Padrão: Feedback, One-on-One, Registro Diário
          </p>
        )}
      </CardContent>
    </Card>
  );
}