import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Sparkles } from 'lucide-react';

const isEncerradaEfetiva = (t) => !t.excluida && (t.status === 'encerrada' || t.status === 'aguardando_confirmacao_reabertura');

export default function MatrizEsforcoImpacto({ tratativas, motivos }) {
  const linhas = useMemo(() => {
    const mapa = {};
    tratativas.filter(isEncerradaEfetiva).forEach((t) => {
      if (!t.motivo_id) return;
      if (!mapa[t.motivo_id]) mapa[t.motivo_id] = { custoTotal: 0, casos: 0 };
      mapa[t.motivo_id].custoTotal +=
        (parseFloat(t.custo_operacional_reais) || 0) +
        (parseFloat(t.valor_devolvido_cliente) || 0) +
        (parseFloat(t.valor_perda_receita) || 0);
      mapa[t.motivo_id].casos += 1;
    });

    const comValores = Object.entries(mapa)
      .map(([motivoId, dados]) => {
        const motivo = motivos.find((m) => m.id === motivoId);
        return {
          motivoId,
          nome: motivo?.motivo || 'Motivo removido',
          esforco: motivo?.esforco_correcao_ti || 'Não definido',
          ...dados,
        };
      })
      .filter((l) => l.custoTotal > 0)
      .sort((a, b) => b.custoTotal - a.custoTotal);

    const media = comValores.length
      ? comValores.reduce((acc, l) => acc + l.custoTotal, 0) / comValores.length
      : 0;

    return comValores.map((l) => ({
      ...l,
      altoCusto: l.custoTotal >= media,
      quickWin: l.esforco === 'Baixo' && l.custoTotal >= media,
    }));
  }, [tratativas, motivos]);

  const formatarReais = (valor) => `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const esforcoBadgeClass = {
    Baixo: 'bg-green-100 text-green-700 border-green-300',
    Medio: 'bg-amber-100 text-amber-700 border-amber-300',
    Alto: 'bg-red-100 text-red-700 border-red-300',
  };

  if (linhas.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-10 text-center text-slate-500">
          Nenhum motivo com custo financeiro apurado ainda. Configure o "Esforço de Correção (TI)" em cada motivo para habilitar a matriz.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-600" />
          Matriz de Esforço x Impacto
        </CardTitle>
        <p className="text-sm text-slate-500 mt-1">
          Cruza o esforço de correção (TI/Produto) de cada motivo com o custo financeiro total que ele gera.
          <Badge className="ml-2 bg-green-100 text-green-700 align-middle">
            <Sparkles className="w-3 h-3 mr-1" />
            Quick Win = alto custo + baixo esforço
          </Badge>
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {linhas.map((linha) => (
            <div
              key={linha.motivoId}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                linha.quickWin ? 'bg-green-50 border-green-300' : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{linha.nome}</p>
                  <p className="text-xs text-slate-500">{linha.casos} caso(s)</p>
                </div>
                {linha.quickWin && (
                  <Badge className="bg-green-600 text-white flex items-center gap-1 flex-shrink-0">
                    <Sparkles className="w-3 h-3" />
                    Quick Win
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <Badge variant="outline" className={esforcoBadgeClass[linha.esforco] || ''}>
                  Esforço: {linha.esforco}
                </Badge>
                <span className="font-semibold text-slate-900 w-28 text-right">
                  {formatarReais(linha.custoTotal)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}