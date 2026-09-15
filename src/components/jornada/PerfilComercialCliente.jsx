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
            <Building2 className="w-5 h-5 text-muted-foreground" />
            Perfil Comercial do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
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
          <Building2 className="w-5 h-5 text-success" />
          Perfil Comercial do Cliente
          <span className="text-sm font-normal text-muted-foreground ml-2">{tratativa.nome_cliente}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="flex items-start gap-2">
            <Tag className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Plano</p>
              <p className="font-semibold text-foreground">{tratativa.plano_cliente || '-'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Receipt className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Modalidade do Plano</p>
              <p className="font-semibold text-foreground">{tratativa.modalidade_plano || '-'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <DollarSign className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Valor da Contratação do Plano Atual</p>
              <p className="font-semibold text-foreground">{tratativa.valor_contratacao_plano_atual ? formatBRL(tratativa.valor_contratacao_plano_atual) : '-'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Tempo de Relacionamento</p>
              <p className="font-semibold text-foreground">{tempoMeses !== null ? formatarTempoContrato(tempoMeses) : '-'}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Building2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Segmento</p>
              <p className="font-semibold text-foreground">{tratativa.segmento_cliente || '-'}</p>
            </div>
          </div>
        </div>

        {/* Valores Equivalentes — calculados dinamicamente, não contratuais */}
        {temValorContratado && (
          <div className="mt-3 pt-3 border-t border-emerald-200">
            <p className="text-xs font-semibold text-success uppercase mb-2">Valores Equivalentes (calculados)</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-success" />
                <div>
                  <p className="text-xs text-muted-foreground">Receita Mensal Equivalente</p>
                  <p className="text-sm font-medium text-foreground">{formatBRL(receitaMensalEq)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-success" />
                <div>
                  <p className="text-xs text-muted-foreground">Receita Anual Equivalente</p>
                  <p className="text-sm font-medium text-foreground">{formatBRL(receitaAnualEq)}</p>
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
                <Calendar className="w-3.5 h-3.5 text-success" />
                <span className="text-xs text-muted-foreground">
                  Primeira contratação: {new Date(tratativa.data_primeira_contratacao + 'T00:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
            {tratativa.data_contratacao_plano_atual && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-success" />
                <span className="text-xs text-muted-foreground">
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