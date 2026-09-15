import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Users, UserCheck, BarChart3, AlertCircle, Clock } from 'lucide-react';
import { formatDateSP } from '@/components/utils/helpers';

export default function CardsAcompanhamento({
  titulo,
  icon: Icon,
  ultimoAcionado,
  proximo,
  totalCadastrados,
  totalAtivos,
  totalAcionamentosCiclo,
  acionamentosPorPessoa,
  naoAcionadosCount,
  statusLabels,
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-slate-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase mb-1">
              <Clock className="w-3.5 h-3.5" /> Último Acionado
            </div>
            {ultimoAcionado ? (
              <>
                <p className="text-lg font-bold text-slate-800 truncate">{ultimoAcionado.nome}</p>
                <p className="text-xs text-slate-400 mt-0.5">{ultimoAcionado.data ? formatDateSP(ultimoAcionado.data, 'DD/MM HH:mm') : '—'}</p>
              </>
            ) : (
              <p className="text-lg font-bold text-slate-300">—</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-violet-200 bg-violet-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-violet-600 text-xs font-semibold uppercase mb-1">
              <ArrowRight className="w-3.5 h-3.5" /> Próximo da Fila
            </div>
            {proximo ? (
              <>
                <p className="text-lg font-bold text-violet-800 truncate">{proximo.nome}</p>
                <p className="text-xs text-violet-500 mt-0.5">Posição #{proximo.ordem}</p>
              </>
            ) : (
              <p className="text-lg font-bold text-violet-300">Sem disponível</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase mb-1">
              <Users className="w-3.5 h-3.5" /> Cadastrados
            </div>
            <p className="text-2xl font-bold text-slate-800">{totalCadastrados}</p>
            <p className="text-xs text-slate-400 mt-0.5">{titulo}s no total</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-green-600 text-xs font-semibold uppercase mb-1">
              <UserCheck className="w-3.5 h-3.5" /> Ativos
            </div>
            <p className="text-2xl font-bold text-green-700">{totalAtivos}</p>
            <p className="text-xs text-green-500 mt-0.5">disponíveis no rodízio</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card className="border-slate-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase mb-1">
              <BarChart3 className="w-3.5 h-3.5" /> Acionamentos no Ciclo
            </div>
            <p className="text-2xl font-bold text-slate-800">{totalAcionamentosCiclo}</p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <AlertCircle className="w-3 h-3 text-amber-500" />
              <span className="text-amber-600">{naoAcionadosCount} ainda não acionado(s)</span>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-slate-200">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase mb-2">
              <BarChart3 className="w-3.5 h-3.5" /> Distribuição do Rodízio (ciclo atual)
            </div>
            {acionamentosPorPessoa.length === 0 || acionamentosPorPessoa.every(p => p.count === 0) ? (
              <p className="text-sm text-slate-400 py-2">Nenhum acionamento registrado no ciclo atual.</p>
            ) : (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {acionamentosPorPessoa.map((p, i) => {
                  const max = Math.max(...acionamentosPorPessoa.map(x => x.count), 1);
                  const pct = (p.count / max) * 100;
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-slate-600 w-32 truncate flex-shrink-0">#{p.ordem} {p.nome}</span>
                      <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
                        <div className="h-full bg-violet-400 rounded transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 w-6 text-right">{p.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}