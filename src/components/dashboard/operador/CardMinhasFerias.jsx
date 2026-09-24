import db from '@/api/db';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Palmtree } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { saldoDoCiclo, hojeSP } from '@/lib/ferias';

/**
 * "Minhas férias" na lateral do operador: quantos dias ele tem, se algum
 * período está vencendo e se há pedido esperando a gestão. O pedido em si é
 * feito na tela de Férias (decisão de Pedro, 23/09/2026).
 */
export default function CardMinhasFerias({ colaboradorId }) {
  const hoje = hojeSP();

  const { data: ciclos = [] } = useQuery({
    queryKey: ['ciclos-ferias'],
    queryFn: () => db.entities.CicloFerias.list('-created_date'),
    enabled: !!colaboradorId,
    staleTime: 120000,
  });

  const { data: solicitacoes = [] } = useQuery({
    queryKey: ['solicitacoes-ferias'],
    queryFn: () => db.entities.SolicitacaoFerias.list('-data_inicio', 500),
    enabled: !!colaboradorId,
    staleTime: 60000,
  });

  const meusCiclos = ciclos.filter((c) => c.colaborador_id === colaboradorId);
  const dias = meusCiclos.reduce((soma, c) => soma + saldoDoCiclo(c, hoje).restantes, 0);
  const vencendo = meusCiclos.some((c) => {
    const s = saldoDoCiclo(c, hoje);
    return s.vencendo || s.vencido;
  });
  const meusPedidos = solicitacoes.filter((s) => s.colaborador_id === colaboradorId);
  const emAnalise = meusPedidos.filter((s) => s.status === 'em_analise').length;
  const sugestoes = meusPedidos.filter((s) => s.status === 'sugestao_nova_data').length;
  const chamaAtencao = vencendo || sugestoes > 0;

  const recado = sugestoes > 0
    ? 'a gestão sugeriu outra data — ver'
    : emAnalise > 0
      ? `${emAnalise} pedido(s) esperando a gestão`
      : vencendo
        ? 'tem período vencendo — marque logo'
        : `${dias} dia(s) disponíveis`;

  return (
    <Link
      to={createPageUrl('GestaoFerias')}
      className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:bg-muted/60 ${
        chamaAtencao ? 'border-warning/40 bg-warning-soft' : 'border-border bg-card'}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Palmtree className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">Minhas férias</span>
        <span className={`block text-xs ${chamaAtencao ? 'font-medium text-warning' : 'text-muted-foreground'}`}>{recado}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}
