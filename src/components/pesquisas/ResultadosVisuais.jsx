import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Smile, 
  Meh, 
  Frown,
  TrendingUp,
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
        <CardContent className="p-6 text-center text-muted-foreground">
          Nenhuma resposta recebida ainda
        </CardContent>
      </Card>
    );
  }

  const getCorNota = (nota) => {
    if (nota >= 4) return 'text-success bg-success-soft';
    if (nota >= 3) return 'text-warning bg-warning-soft';
    return 'text-destructive bg-destructive/10';
  };

  const getEmojiNota = (nota) => {
    if (nota >= 4) return <Smile className="w-8 h-8 text-success" />;
    if (nota >= 3) return <Meh className="w-8 h-8 text-warning" />;
    return <Frown className="w-8 h-8 text-destructive" />;
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
                <p className="text-sm text-muted-foreground">CSAT - Satisfação Média</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-5xl font-bold ${getCorNota(stats.media)}`}>
                    {stats.media.toFixed(1)}
                  </span>
                  <span className="text-2xl text-muted-foreground">/5.0</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Respostas</p>
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
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
              <ThumbsUp className="w-5 h-5 text-success" />
              <span className="text-sm font-medium">Satisfeitos</span>
            </div>
            <Progress value={(stats.distribuicao.positivo / stats.total) * 100} className="flex-1 h-3" />
            <span className="text-sm font-bold text-success w-16 text-right">
              {((stats.distribuicao.positivo / stats.total) * 100).toFixed(0)}%
            </span>
            <span className="text-sm text-muted-foreground w-12 text-right">
              ({stats.distribuicao.positivo})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 w-32">
              <Minus className="w-5 h-5 text-warning" />
              <span className="text-sm font-medium">Neutros</span>
            </div>
            <Progress value={(stats.distribuicao.neutro / stats.total) * 100} className="flex-1 h-3" />
            <span className="text-sm font-bold text-warning w-16 text-right">
              {((stats.distribuicao.neutro / stats.total) * 100).toFixed(0)}%
            </span>
            <span className="text-sm text-muted-foreground w-12 text-right">
              ({stats.distribuicao.neutro})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 w-32">
              <ThumbsDown className="w-5 h-5 text-destructive" />
              <span className="text-sm font-medium">Insatisfeitos</span>
            </div>
            <Progress value={(stats.distribuicao.negativo / stats.total) * 100} className="flex-1 h-3" />
            <span className="text-sm font-bold text-destructive w-16 text-right">
              {((stats.distribuicao.negativo / stats.total) * 100).toFixed(0)}%
            </span>
            <span className="text-sm text-muted-foreground w-12 text-right">
              ({stats.distribuicao.negativo})
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Métrica Resumida */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-success-soft border-success/25">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-4 h-4 text-success" />
              <p className="text-xs font-medium text-success">Taxa de Satisfação</p>
            </div>
            <p className="text-2xl font-bold text-success">{percentualPositivo}%</p>
          </CardContent>
        </Card>

        <Card className="bg-info-soft border-info/25">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <p className="text-xs font-medium text-primary">Taxa de Resposta</p>
            </div>
            <p className="text-2xl font-bold text-primary">
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
        <CardContent className="p-6 text-center text-muted-foreground">
          Nenhuma resposta recebida ainda
        </CardContent>
      </Card>
    );
  }

  const getCorNPS = (nps) => {
    if (nps >= 75) return { cor: 'text-success', bg: 'bg-success-soft', label: 'Excelente', emoji: '' };
    if (nps >= 50) return { cor: 'text-success', bg: 'bg-success-soft', label: 'Muito Bom', emoji: '' };
    if (nps >= 0) return { cor: 'text-warning', bg: 'bg-warning-soft', label: 'Bom', emoji: '' };
    return { cor: 'text-destructive', bg: 'bg-destructive/10', label: 'Crítico', emoji: '' };
  };

  const classificacao = getCorNPS(stats.nps);

  return (
    <div className="space-y-4">
      {/* Card Principal - NPS */}
      <Card className="border-2">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Net Promoter Score (NPS)</p>
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
              <p className="text-sm text-muted-foreground">Respostas</p>
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
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
              <div className="w-3 h-3 rounded-full bg-success"></div>
              <span className="text-sm font-medium">Promotores</span>
            </div>
            <Progress value={(stats.promotores / stats.total) * 100} className="flex-1 h-3" />
            <span className="text-sm font-bold text-success w-16 text-right">
              {((stats.promotores / stats.total) * 100).toFixed(0)}%
            </span>
            <span className="text-sm text-muted-foreground w-12 text-right">
              ({stats.promotores})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 w-32">
              <div className="w-3 h-3 rounded-full bg-warning"></div>
              <span className="text-sm font-medium">Neutros</span>
            </div>
            <Progress value={(stats.neutros / stats.total) * 100} className="flex-1 h-3" />
            <span className="text-sm font-bold text-warning w-16 text-right">
              {((stats.neutros / stats.total) * 100).toFixed(0)}%
            </span>
            <span className="text-sm text-muted-foreground w-12 text-right">
              ({stats.neutros})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 w-32">
              <div className="w-3 h-3 rounded-full bg-destructive"></div>
              <span className="text-sm font-medium">Detratores</span>
            </div>
            <Progress value={(stats.detratores / stats.total) * 100} className="flex-1 h-3" />
            <span className="text-sm font-bold text-destructive w-16 text-right">
              {((stats.detratores / stats.total) * 100).toFixed(0)}%
            </span>
            <span className="text-sm text-muted-foreground w-12 text-right">
              ({stats.detratores})
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Legenda */}
      <Card className="bg-muted">
        <CardContent className="p-4 text-xs space-y-1">
          <p className="font-medium text-foreground">Classificação:</p>
          <p className="text-muted-foreground">• Promotores: Notas 9-10 (clientes leais)</p>
          <p className="text-muted-foreground">• Neutros: Notas 7-8 (satisfeitos, mas vulneráveis)</p>
          <p className="text-muted-foreground">• Detratores: Notas 0-6 (insatisfeitos, risco de churn)</p>
        </CardContent>
      </Card>
    </div>
  );
}