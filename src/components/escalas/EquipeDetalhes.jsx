import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { formatDateSP } from '@/components/utils/helpers';
import { cn } from '@/lib/utils';

const corPorTipo = {
  home_office: 'bg-success',
  presencial: 'bg-primary',
  hibrido: 'bg-primary',
  ferias: 'bg-cyan-500',
  day_off: 'bg-warning',
  falta: 'bg-destructive',
  treinamento: 'bg-primary',
  evento_especial: 'bg-pink-500'
};

const labelPorTipo = {
  home_office: 'Home Office',
  presencial: 'Presencial',
  hibrido: 'Híbrido',
  ferias: 'Férias',
  day_off: 'Day Off',
  falta: 'Falta',
  treinamento: 'Treinamento',
  evento_especial: 'Evento Especial'
};

export default function EquipeDetalhes({ 
  equipe, 
  colaboradores, 
  atribuicoes,
  escalas,
  onVoltar 
}) {
  const colaboradoresDaEquipe = colaboradores.filter(c => c.equipe_id === equipe.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onVoltar}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">{equipe.nome}</h2>
          <p className="text-muted-foreground">{colaboradoresDaEquipe.length} colaboradores</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {colaboradoresDaEquipe.map(colab => {
          const atribsColab = atribuicoes.filter(a => a.colaborador_id === colab.id);
          const atribAtual = atribsColab.find(a => {
            const hoje = new Date().toISOString().split('T')[0];
            const inicio = new Date(a.data_inicio).toISOString().split('T')[0];
            const fim = a.data_fim ? new Date(a.data_fim).toISOString().split('T')[0] : '9999-12-31';
            return hoje >= inicio && hoje <= fim;
          });

          const tipo = atribAtual?.tipo_evento || 'presencial';
          const cor = corPorTipo[tipo];
          const escala = escalas.find(e => e.id === atribAtual?.escala_id);

          return (
            <Card key={colab.id} className="border-0 shadow-md overflow-hidden">
              <div className={cn('h-1.5', cor)} />
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <Avatar className="h-12 w-12 ring-2 ring-white">
                    <AvatarImage src={colab.foto_url} />
                    <AvatarFallback className="bg-muted text-foreground">
                      {colab.nome_completo?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {colab.nome_completo}
                    </h3>
                    <p className="text-xs text-muted-foreground">{colab.cargo_atual}</p>
                  </div>
                </div>

                {atribAtual ? (
                  <div className="space-y-2">
                    <Badge className={cn('text-white text-xs font-semibold', cor)}>
                      {labelPorTipo[tipo]}
                    </Badge>
                    
                    {escala && (
                      <div className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {escala.nome}
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-muted-foreground">
                      {formatDateSP(atribAtual.data_inicio, 'DD/MM')}
                      {atribAtual.data_fim && ` - ${formatDateSP(atribAtual.data_fim, 'DD/MM')}`}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Sem escala ativa</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}