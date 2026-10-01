import { supabase } from '@/api/db';
import { useQuery } from '@tanstack/react-query';

/**
 * Permissões granulares (migration 35+). Busca minhas_permissoes() — a
 * lista de chaves que o usuário logado tem AGORA, já considerando exceções
 * (um gestor pode ter perdido uma permissão, um agente pode ter ganhado
 * uma) — uma vez por sessão.
 *
 * Isto é só pra GUIAR A TELA (esconder/mostrar um bloco, uma coluna). Quem
 * garante de verdade é o banco: a mesma `tem_permissao()` roda nas views
 * mascaradas, então mesmo que alguém force o componente a aparecer, o dado
 * sensível continua vindo null do servidor.
 */
export function usePermissoes() {
  const { data: permissoes = [], isLoading } = useQuery({
    queryKey: ['minhas-permissoes'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('minhas_permissoes');
      if (error) throw new Error(error.message);
      return (data || []).map((linha) => (typeof linha === 'string' ? linha : linha.minhas_permissoes));
    },
    staleTime: 60000,
  });

  const temPermissao = (chave) => permissoes.includes(chave);

  return { permissoes, temPermissao, carregando: isLoading };
}
