import db from '@/api/db';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';

import { toast } from 'sonner';
import { construirContextoComercialIA } from '@/components/utils/helpers';

export default function ResumoIAEtapa({ etapa, tratativas }) {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);

  const gerarResumo = async () => {
    if (tratativas.length === 0) {
      toast.error('Nenhuma tratativa nesta etapa no período selecionado');
      return;
    }
    setLoading(true);
    try {
      const notas = tratativas
        .slice(0, 50)
        .map(t => `- Motivo: ${t.motivo_nome || 'N/D'} | Causa: ${t.causa_primaria || 'N/D'} | Solução: ${t.descricao_solucao || 'sem descrição'}`)
        .join('\n');

      // Contexto comercial agregado para enriquecer a análise da IA
      const contextoComercial = tratativas
        .map(t => construirContextoComercialIA(t))
        .filter(ctx => ctx)
        .slice(0, 10)
        .join('\n---\n');

      const res = await db.integrations.Core.InvokeLLM({
        prompt: `Você é um analista de operações de atendimento. Analise as tratativas abaixo, todas ocorridas na etapa "${etapa}" da jornada do cliente, e responda em português do Brasil:\n\n${notas}\n\n1. Gere um resumo claro e objetivo de "o que de fato aconteceu" nesta etapa.\n2. Sugira um plano de ação imediato (3 a 5 itens) para mitigar o problema e evitar retrabalho futuro.\n\nContexto comercial dos clientes impactados (use para priorizar ações com maior impacto financeiro):\n${contextoComercial || 'Sem dados comerciais disponíveis.'}`,
        response_json_schema: {
          type: 'object',
          properties: {
            resumo: { type: 'string' },
            plano_de_acao: { type: 'array', items: { type: 'string' } }
          },
          required: ['resumo', 'plano_de_acao']
        }
      });
      setResultado(res);
    } catch (e) {
      // A IA agora roda no servidor e pode recusar (cota do dia, sessão
      // expirada). Sem este aviso o botão apenas voltava ao normal, sem dizer
      // o que houve.
      toast.error(e?.message || 'Não consegui gerar o resumo agora.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>{etapa}</span>
          <Badge variant="outline">{tratativas.length} caso(s)</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!resultado && (
          <Button onClick={gerarResumo} disabled={loading} size="sm" variant="outline">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2 text-warning" />}
            Gerar Resumo & Plano de Ação (IA)
          </Button>
        )}
        {resultado && (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">O que aconteceu</p>
              <p className="text-sm text-foreground leading-relaxed">{resultado.resumo}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Plano de Ação Sugerido</p>
              <ul className="list-disc pl-5 space-y-1">
                {resultado.plano_de_acao?.map((item, i) => (
                  <li key={i} className="text-sm text-foreground">{item}</li>
                ))}
              </ul>
            </div>
            <Button onClick={gerarResumo} disabled={loading} size="sm" variant="ghost">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Gerar novamente
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}