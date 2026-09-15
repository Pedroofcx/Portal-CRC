import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Smile, 
  Meh, 
  Frown,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

export function ResultadosVisuaisCSAT({ respostas }) {
  const calcularEstatisticas = () => {
    if (!respostas || respostas.length === 0) return null;

    const notas = respostas
      .map(r => parseFloat(r.nota_calculada))
      .filter(n => !isNaN(n));

    if (notas.length === 0) return null;

    const media = notas.reduce((a, b) => a + b, 0) / notas.length;
    const distribuicao = {
      positivo: notas.filter(n => n >= 4).length,
      neutro: notas.filter(n => n === 3).length,
      negativo: notas.filter(n => n < 3).length
    };

    return { media, total: notas.length, distribuicao };
  };

  const stats = calcularEstatisticas();
  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-slate-500">
          Nenhuma resposta recebida ainda
        </CardContent>
      </Card>
    );
  }

  const getCorNota = (nota) => {
    if (nota >= 4) return 'text-green-600 bg-green-50';
    if (nota >= 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getEmojiNota = (nota) => {
    if (nota >= 4) return <Smile className="w-8 h-8 text-green-600" />;
    if (nota >= 3) return <Meh className="w-8 h-8 text-yellow-600" />;
    return <Frown className="w-8 h-8 text-red-600" />;
  };

  const percentualPositivo = ((stats.distribuicao.positivo / stats.total) * 100).toFixed(1);

  return (
    <div className="space-y-4">
      {/* Card Principal - Nota Média */}
      <Card className="border-2">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getEmojiNota(stats.media)}
              <div>
                <p className="text-sm text-slate-600">CSAT - Satisfação Média</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-5xl font-bold ${getCorNota(stats.media)}`}>
                    {stats.media.toFixed(1)}
                  </span>
                  <span className="text-2xl text-slate-400">/5.0</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Respostas</p>
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Distribuição de Sentimentos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição de Satisfação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 w-32">
              <ThumbsUp className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">Satisfeitos</span>
            </div>
            <Progress value={(stats.distribuicao.positivo / stats.total) * 100} className="flex-1 h-3" />
            <span className="text-sm font-bold text-green-600 w-16 text-right">
              {((stats.distribuicao.positivo / stats.total) * 100).toFixed(0)}%
            </span>
            <span className="text-sm text-slate-500 w-12 text-right">
              ({stats.distribuicao.positivo})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 w-32">
              <Minus className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium">Neutros</span>
            </div>
            <Progress value={(stats.distribuicao.neutro / stats.total) * 100} className="flex-1 h-3" />
            <span className="text-sm font-bold text-yellow-600 w-16 text-right">
              {((stats.distribuicao.neutro / stats.total) * 100).toFixed(0)}%
            </span>
            <span className="text-sm text-slate-500 w-12 text-right">
              ({stats.distribuicao.neutro})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 w-32">
              <ThumbsDown className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium">Insatisfeitos</span>
            </div>
            <Progress value={(stats.distribuicao.negativo / stats.total) * 100} className="flex-1 h-3" />
            <span className="text-sm font-bold text-red-600 w-16 text-right">
              {((stats.distribuicao.negativo / stats.total) * 100).toFixed(0)}%
            </span>
            <span className="text-sm text-slate-500 w-12 text-right">
              ({stats.distribuicao.negativo})
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Métrica Resumida */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-green-700" />
              <p className="text-xs font-medium text-green-700">Taxa de Satisfação</p>
            </div>
            <p className="text-2xl font-bold text-green-900">{percentualPositivo}%</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-700" />
              <p className="text-xs font-medium text-blue-700">Taxa de Resposta</p>
            </div>
            <p className="text-2xl font-bold text-blue-900">
              {stats.total > 0 ? '100%' : '0%'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ResultadosVisuaisNPS({ respostas }) {
  const calcularNPS = () => {
    if (!respostas || respostas.length === 0) return null;

    const notas = respostas
      .map(r => parseFloat(r.nota_calculada))
      .filter(n => !isNaN(n));

    if (notas.length === 0) return null;

    const promotores = notas.filter(n => n >= 9).length;
    const neutros = notas.filter(n => n >= 7 && n < 9).length;
    const detratores = notas.filter(n => n < 7).length;

    const nps = ((promotores - detratores) / notas.length) * 100;

    return { 
      nps: Math.round(nps), 
      total: notas.length, 
      promotores, 
      neutros, 
      detratores 
    };
  };

  const stats = calcularNPS();
  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-slate-500">
          Nenhuma resposta recebida ainda
        </CardContent>
      </Card>
    );
  }

  const getCorNPS = (nps) => {
    if (nps >= 75) return { cor: 'text-green-600', bg: 'bg-green-50', label: 'Excelente', emoji: '' };
    if (nps >= 50) return { cor: 'text-green-600', bg: 'bg-green-50', label: 'Muito Bom', emoji: '' };
    if (nps >= 0) return { cor: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Bom', emoji: '' };
    return { cor: 'text-red-600', bg: 'bg-red-50', label: 'Crítico', emoji: '' };
  };

  const classificacao = getCorNPS(stats.nps);

  return (
    <div className="space-y-4">
      {/* Card Principal - NPS */}
      <Card className="border-2">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-2">Net Promoter Score (NPS)</p>
              <div className="flex items-baseline gap-3">
                <span className={`text-6xl font-bold ${classificacao.cor}`}>
                  {stats.nps}
                </span>
                <div>
                  <span className="text-4xl">{classificacao.emoji}</span>
                  <p className={`text-sm font-medium ${classificacao.cor} mt-1`}>
                    {classificacao.label}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Respostas</p>
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Distribuição NPS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuição NPS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 w-32">
              <div className="w-3 h-3 rounded-full bg-green-600"></div>
              <span className="text-sm font-medium">Promotores</span>
            </div>
            <Progress value={(stats.promotores / stats.total) * 100} className="flex-1 h-3" />
            <span className="text-sm font-bold text-green-600 w-16 text-right">
              {((stats.promotores / stats.total) * 100).toFixed(0)}%
            </span>
            <span className="text-sm text-slate-500 w-12 text-right">
              ({stats.promotores})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 w-32">
              <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
              <span className="text-sm font-medium">Neutros</span>
            </div>
            <Progress value={(stats.neutros / stats.total) * 100} className="flex-1 h-3" />
            <span className="text-sm font-bold text-yellow-600 w-16 text-right">
              {((stats.neutros / stats.total) * 100).toFixed(0)}%
            </span>
            <span className="text-sm text-slate-500 w-12 text-right">
              ({stats.neutros})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 w-32">
              <div className="w-3 h-3 rounded-full bg-red-600"></div>
              <span className="text-sm font-medium">Detratores</span>
            </div>
            <Progress value={(stats.detratores / stats.total) * 100} className="flex-1 h-3" />
            <span className="text-sm font-bold text-red-600 w-16 text-right">
              {((stats.detratores / stats.total) * 100).toFixed(0)}%
            </span>
            <span className="text-sm text-slate-500 w-12 text-right">
              ({stats.detratores})
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Legenda */}
      <Card className="bg-slate-50">
        <CardContent className="p-4 text-xs space-y-1">
          <p className="font-medium text-slate-700">Classificação:</p>
          <p className="text-slate-600">• Promotores: Notas 9-10 (clientes leais)</p>
          <p className="text-slate-600">• Neutros: Notas 7-8 (satisfeitos, mas vulneráveis)</p>
          <p className="text-slate-600">• Detratores: Notas 0-6 (insatisfeitos, risco de churn)</p>
        </CardContent>
      </Card>
    </div>
  );
}