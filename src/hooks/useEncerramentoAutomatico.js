import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/api/db';

/** De quanto em quanto tempo, com o Portal aberto, confere se há algo para encerrar. */
const A_CADA_MS = 30 * 60 * 1000;

/**
 * Encerra as reclamações internas cujo prazo de 7 dias passou (função do
 * banco, migration 55). O banco também faz isso de hora em hora quando o
 * agendador está ligado; aqui é a garantia: roda quando alguém abre o Portal
 * e a cada 30 minutos aberto. A função só mexe no que já venceu, então
 * rodar de mais não custa nada.
 */
export default function useEncerramentoAutomatico(colaborador) {
  const queryClient = useQueryClient();
  const id = colaborador?.id;

  useEffect(() => {
    if (!id) return undefined;
    let cancelado = false;
    const rodar = async () => {
      try {
        const { data, error } = await supabase.rpc('encerrar_prazo_reabertura');
        if (error || cancelado) return;
        if (Number(data) > 0) queryClient.invalidateQueries({ queryKey: ['tratativas'] });
      } catch { /* sem conexão ou sem a função ainda: tenta de novo na próxima */ }
    };
    rodar();
    const timer = setInterval(rodar, A_CADA_MS);
    return () => { cancelado = true; clearInterval(timer); };
  }, [id, queryClient]);
}
