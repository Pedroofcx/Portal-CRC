import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, DollarSign, Tag, TrendingUp } from 'lucide-react';
import {
  formatBRL,
  calcularTempoContratoMeses,
  formatarTempoContrato,
  calcularReceitaMensalEquivalente,
  calcularReceitaAnualEquivalente,
} from '@/components/utils/helpers';

// Card agregado "Perfil Comercial do Cliente" exibido no topo da Jornada do Cliente.
// Apresenta o contexto comercial consolidado de todas as tratativas: receita
// mensal e anual EQUIVALENTE (calculada dinamicamente), distribuição por plano
// e por segmento, e tempo médio de relacionamento.
// A fonte de verdade é sempre o contrato (modalidade + valor da contratação do plano atual).
export default function PerfilComercialClienteAgregado({ tratativas }) {
  const dados = useMemo(() => {
    const comPlano = tratativas.filter(t => t.plano_cliente);
    const comSegmento = tratativas.filter(t => t.segmento_cliente);
    const comContrato = tratativas.filter(t => t.modalidade_plano && t.valor_contratacao_plano_atual);
    const comContratacao = tratativas.filter(t => t.data_primeira_contratacao);

    // Receitas equivalentes somadas dinamicamente — nunca lê campos persistidos
    const receitaMensalTotal = comContrato.reduce((acc, t) => acc + calcularReceitaMensalEquivalente(t), 0);
    const receitaAnualTotal = comContrato.reduce((acc, t) => acc + calcularReceitaAnualEquivalente(t), 0);

    const porPlano = {};
    comPlano.forEach(t => { porPlano[t.plano_cliente] = (porPlano[t.plano_cliente] || 0) + 1; });

    const porSegmento = {};
    comSegmento.forEach(t => { porSegmento[t.segmento_cliente] = (porSegmento[t.segmento_cliente] || 0) + 1; });

    const tempos = comContratacao.map(t => calcularTempoContratoMeses(t.data_primeira_contratacao)).filter(v => v !== null);
    const tempoMedio = tempos.length > 0 ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length) : null;

    return {
      totalComercial: comPlano.length,
      receitaMensalTotal,
      receitaAnualTotal,
      porPlano: Object.entries(porPlano).sort(([, a], [, b]) => b - a),
      porSegmento: Object.entries(porSegmento).sort(([, a], [, b]) => b - a),
      tempoMedio,
    };
  }, [tratativas]);

  const temDados = dados.totalComercial > 0 || dados.receitaMensalTotal > 0 || dados.porSegmento.length > 0;

  if (!temDados) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-5 h-5 text-slate-400" />
            Perfil Comercial do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400 text-center py-4">
            Nenhum dado comercial registrado nas tratativas. Preencha os dados comerciais ao registrar novas tratativas ou importe via CSV.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="w-5 h-5 text-emerald-600" />
          Perfil Comercial do Cliente
          <span className="text-sm font-normal text-slate-500 ml-2">
            {dados.totalComercial} cliente(s) com dados comerciais
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid lg:grid-cols-4 gap-5">
          {/* Receita envolvida — valores equivalentes calculados dinamicamente */}
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Receita Mensal Equivalente</p>
                <p className="font-bold text-slate-900 text-lg">{formatBRL(dados.receitaMensalTotal)}</p>
                <p className="text-[10px] text-emerald-600 italic">calculado por modalidade</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Receita Anual Equivalente</p>
                <p className="font-bold text-slate-900 text-lg">{formatBRL(dados.receitaAnualTotal)}</p>
                <p className="text-[10px] text-emerald-600 italic">calculado por modalidade</p>
              </div>
            </div>
            {dados.tempoMedio !== null && (
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Tempo Médio de Relacionamento</p>
                  <p className="font-semibold text-slate-900">{formatarTempoContrato(dados.tempoMedio)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Distribuição por Plano */}
          <div className="lg:col-span-1">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Por Plano
            </p>
            <div className="space-y-1.5">
              {dados.porPlano.slice(0, 5).map(([plano, count]) => (
                <div key={plano} className="flex items-center justify-between text-sm">
                  <span className="text-slate-700 truncate">{plano}</span>
                  <Badge className="bg-emerald-100 text-emerald-700 text-xs">{count}</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Distribuição por Segmento */}
          <div className="lg:col-span-2">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Por Segmento
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {dados.porSegmento.map(([segmento, count]) => (
                <div key={segmento} className="flex items-center justify-between text-sm bg-white/60 rounded px-2 py-1">
                  <span className="text-slate-700 truncate">{segmento}</span>
                  <Badge variant="outline" className="text-xs">{count}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}