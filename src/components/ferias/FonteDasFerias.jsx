import React from 'react';
import { useConectorDeFerias } from '@/hooks/useSincronizacaoAutomatica';

const quando = (v) => (v ? new Date(v).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : null);

/**
 * Diz de onde vêm o saldo e os períodos de férias: do Gestão Click, quando o
 * conector está ligado, e quando foi a última atualização. Para a gestão,
 * lembra que férias aprovadas aqui precisam ser lançadas lá (o Portal não
 * escreve no Gestão Click e o saldo oficial é o de lá).
 */
export default function FonteDasFerias({ gestao = false }) {
  const { data: conector } = useConectorDeFerias();
  if (!conector?.ativo) return null;
  const quandoFoi = quando(conector.ultimo_sucesso_em);
  const falhou = conector.ultimo_resultado === 'erro';
  return (
    <p className="mb-4 text-xs text-muted-foreground">
      Saldos e períodos vêm do <span className="font-medium text-foreground">Gestão Click</span>
      {quandoFoi ? `, atualizados em ${quandoFoi}` : ', ainda não atualizados'}.
      {falhou && <span className="text-warning"> A última atualização falhou: os dados abaixo podem estar atrasados.</span>}
      {gestao && ' Férias aprovadas aqui precisam ser lançadas também no Gestão Click.'}
    </p>
  );
}
