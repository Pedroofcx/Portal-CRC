import { supabase } from '@/api/db';

/**
 * Chama a Edge Function. Erro da função vem com a mensagem útil no corpo da
 * resposta, não em error.message ("non-2xx status code").
 */
export async function sincronizarFeriasGestaoClick() {
  const { data, error } = await supabase.functions.invoke('sincronizar-gestaoclick', { body: {} });
  if (error) {
    let detalhe = error.message;
    try {
      const corpo = await error.context?.json();
      if (corpo?.erro) detalhe = corpo.erro;
    } catch { /* sem JSON: fica a mensagem original */ }
    throw new Error(detalhe);
  }
  if (data?.erro) throw new Error(data.erro);
  return data;
}
