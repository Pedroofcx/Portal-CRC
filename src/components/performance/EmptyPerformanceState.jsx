import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, Target, MessageSquare, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function EmptyPerformanceState() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="border-0 shadow-lg max-w-2xl w-full">
        <CardContent className="p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <Award className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Bem-vindo à sua Performance!
          </h2>
          <p className="text-slate-600 mb-8 max-w-md mx-auto">
            Sua jornada de crescimento começa aqui. Complete tratativas, participe de apurações e acompanhe seu desenvolvimento.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-blue-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-blue-900">Encerre Tratativas</p>
              <p className="text-xs text-blue-600 mt-1">Acumule pontos</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <Target className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-purple-900">PDI Ativo</p>
              <p className="text-xs text-purple-600 mt-1">Desenvolva habilidades</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg">
              <MessageSquare className="w-6 h-6 text-amber-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-amber-900">Feedbacks</p>
              <p className="text-xs text-amber-600 mt-1">Receba orientações</p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Link to={createPageUrl('Tratativas')}>
              <Button className="bg-blue-600 hover:bg-blue-700">
                Criar Primeira Tratativa
              </Button>
            </Link>
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="outline">
                Voltar ao Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}