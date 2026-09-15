import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Calendar, Clock, Tag, DollarSign, Receipt } from 'lucide-react';
import {
  formatBRL,
  calcularTempoContratoMeses,
  formatarTempoContrato,
  calcularReceitaMensalEquivalente,
  calcularReceitaAnualEquivalente,
} from '@/components/utils/helpers';

// Card "Perfil Comercial do Cliente" exibido no topo da Jornada do Cliente.
// Recebe uma tratativa e apresenta seus dados comerciais.
// A fonte de verdade é sempre o contrato: Modalidade + Valor da Contratação do Plano Atual.
// Receitas mensal/anual equivalentes são calculadas em tempo de execução e
// identificadas visualmente como "Valores Equivalentes".
export default function PerfilComercialCliente({ tratativa }) {
  if (!tratativa) return null;

  const temDadosComerciais = tratativa.plano_cliente || tratativa.modalidade_plano ||
    tratativa.valor_contratacao_plano_atual || tratativa.data_primeira_contratacao ||
    tratativa.data_contratacao_plano_atual || tratativa.segmento_cliente;

  if (!temDadosComerciais) {
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
            Nenhum dado comercial registrado para este cliente.
          </p>
        </CardContent>
      </Card>
    );
  }

  const tempoMeses = calcularTempoContratoMeses(tratativa.data_primeira_contratacao);
  const temValorContratado = tratativa.modalidade_plano && tratativa.valor_contratacao_plano_atual;
  const receitaMensalEq = temValorContratado ? calcularReceitaMensalEquivalente(tratativa) : 0;
  const receitaAnualEq = temValorContratado ? calcularReceitaAnualEquivalente(tratativa) : 0;

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="w-5 h-5 text-emerald-600" />
          Perfil Comercial do Cliente
          <span className="text-sm font-normal text-slate-500 ml-2">{tratativa.nome_cliente}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="flex items-start gap-2">
            <Tag className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Plano</p>
              <p className="font-semibold text-slate-900">{tratativa.plano_cliente || '-'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Receipt className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Modalidade do Plano</p>
              <p className="font-semibold text-slate-900">{tratativa.modalidade_plano || '-'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Valor da Contratação do Plano Atual</p>
              <p className="font-semibold text-slate-900">{tratativa.valor_contratacao_plano_atual ? formatBRL(tratativa.valor_contratacao_plano_atual) : '-'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Tempo de Relacionamento</p>
              <p className="font-semibold text-slate-900">{tempoMeses !== null ? formatarTempoContrato(tempoMeses) : '-'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Building2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-500">Segmento</p>
              <p className="font-semibold text-slate-900">{tratativa.segmento_cliente || '-'}</p>
            </div>
          </div>
        </div>

        {/* Valores Equivalentes — calculados dinamicamente, não contratuais */}
        {temValorContratado && (
          <div className="mt-3 pt-3 border-t border-emerald-200">
            <p className="text-xs font-semibold text-emerald-700 uppercase mb-2">Valores Equivalentes (calculados)</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                <div>
                  <p className="text-xs text-slate-500">Receita Mensal Equivalente</p>
                  <p className="text-sm font-medium text-slate-700">{formatBRL(receitaMensalEq)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                <div>
                  <p className="text-xs text-slate-500">Receita Anual Equivalente</p>
                  <p className="text-sm font-medium text-slate-700">{formatBRL(receitaAnualEq)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Datas de contratação */}
        {(tratativa.data_primeira_contratacao || tratativa.data_contratacao_plano_atual) && (
          <div className="flex flex-wrap items-center gap-4 mt-3 pt-3 border-t border-emerald-200">
            {tratativa.data_primeira_contratacao && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs text-slate-600">
                  Primeira contratação: {new Date(tratativa.data_primeira_contratacao + 'T00:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
            {tratativa.data_contratacao_plano_atual && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs text-slate-600">
                  Plano atual desde: {new Date(tratativa.data_contratacao_plano_atual + 'T00:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}