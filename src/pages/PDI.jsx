import db from '@/api/db';
import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatDateSP } from '@/components/utils/helpers';
import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Target, CheckCircle, Clock, AlertCircle, Calendar } from 'lucide-react';

export default function PDIPage() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => db.auth.me(),
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => db.entities.Colaborador.list(),
  });

  const { data: pdis = [], isLoading } = useQuery({
    queryKey: ['pdis'],
    queryFn: () => db.entities.PDI.list('-created_date'),
  });

  const colaborador = React.useMemo(() => 
    colaboradores.find(c => c.email === user?.email),
    [colaboradores, user]
  );

  const meusPDIs = React.useMemo(() => {
    if (!colaborador?.id || !Array.isArray(pdis)) return [];
    return pdis.filter(p => p.colaborador_id === colaborador.id);
  }, [pdis, colaborador]);

  const pdiAtivo = React.useMemo(() => 
    meusPDIs.find(p => p.status === 'em_andamento'),
    [meusPDIs]
  );

  // Cleanup ao desmontar - CRITICAL
  React.useEffect(() => {
    return () => {
      // Cleanup de estados locais
    };
  }, []);

  if (!user) {
    return <LoadingSpinner />;
  }

  if (isLoading) {
    return <LoadingSpinner text="Carregando PDIs..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Meu Plano de Desenvolvimento Individual (PDI)"
        subtitle={`${meusPDIs.length} PDI(s) no total`}
        icon={Target}
      />

      {meusPDIs.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="text-center py-16">
            <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Nenhum PDI registrado
            </h3>
            <p className="text-slate-600">
              Seu gestor ainda não criou um PDI para você.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* PDI Ativo */}
          {pdiAtivo && (
            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-blue-50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Target className="w-6 h-6 text-purple-600" />
                      {pdiAtivo.titulo}
                    </CardTitle>
                    <Badge className="mt-2 bg-green-100 text-green-700 border-green-200">
                      Em Andamento
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 bg-white rounded-lg border border-purple-100">
                  <p className="text-sm font-medium text-slate-700 mb-2">Objetivo Geral</p>
                  <p className="text-slate-600">{pdiAtivo.objetivo_geral}</p>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-slate-700">Progresso Geral</span>
                    <span className="text-purple-600 font-bold">{pdiAtivo.percentual_conclusao || 0}%</span>
                  </div>
                  <Progress value={pdiAtivo.percentual_conclusao || 0} className="h-3" />
                </div>

                <div>
                  <p className="font-medium text-slate-900 mb-3">Etapas ({pdiAtivo.etapas?.length || 0})</p>
                  <div className="space-y-3">
                    {pdiAtivo.etapas?.map((etapa, idx) => (
                      <div 
                        key={idx} 
                        className={`p-4 rounded-lg border-2 ${
                          etapa.concluida 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                            etapa.concluida ? 'bg-green-500' : 'bg-slate-200'
                          }`}>
                            {etapa.concluida ? (
                              <CheckCircle className="w-4 h-4 text-white" />
                            ) : (
                              <Clock className="w-4 h-4 text-slate-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className={`font-medium mb-1 ${
                              etapa.concluida ? 'text-green-900 line-through' : 'text-slate-900'
                            }`}>
                              {etapa.titulo}
                            </p>
                            <p className="text-sm text-slate-600 mb-2">{etapa.descricao}</p>
                            {etapa.prazo && (
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <Calendar className="w-3 h-3" />
                                Prazo: {formatDateSP(etapa.prazo, 'DD/MM/YYYY')}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Histórico de PDIs */}
          {meusPDIs.filter(p => p.status !== 'em_andamento').length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Histórico de PDIs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {meusPDIs
                    .filter(p => p.status !== 'em_andamento')
                    .map(pdi => (
                      <div key={pdi.id} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-slate-900">{pdi.titulo}</p>
                            <p className="text-sm text-slate-600 mt-1">
                              {formatDateSP(pdi.data_criacao, 'DD/MM/YYYY')}
                            </p>
                          </div>
                          <Badge variant={pdi.status === 'concluido' ? 'default' : 'secondary'}>
                            {pdi.status === 'concluido' ? 'Concluído' : 'Cancelado'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}