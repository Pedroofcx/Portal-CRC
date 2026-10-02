import { supabase } from '@/api/db';
import { useQuery } from '@tanstack/react-query';
import { useEu } from '@/hooks/useGestor';

/**
 * Permissões granulares (migration 35+). Busca minhas_permissoes() — a
 * lista de chaves que o usuário logado tem AGORA, já considerando exceções
 * (um gestor pode ter perdido uma permissão, um agente pode ter ganhado
 * uma) — uma vez por sessão.
 *
 * Isto é só pra GUIAR A TELA (esconder/mostrar um bloco, uma página). Quem
 * garante de verdade é o banco: a mesma `tem_permissao()` roda nas políticas e
 * nas views mascaradas, então mesmo que alguém force o componente a aparecer,
 * o dado sensível continua vindo null e a gravação é recusada.
 *
 * Enquanto a lista carrega, `temPermissao` responde pelo papel (gestor = sim):
 * o gestor, que é quase todo mundo que chega aqui, não vê a tela piscar em
 * "acesso restrito". `carregando` continua disponível para quem precisa esperar.
 */
export function usePermissoes() {
  const { isGestor, carregando: carregandoEu } = useEu();
  const { data: permissoes = [], isLoading } = useQuery({
    queryKey: ['minhas-permissoes'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('minhas_permissoes');
      if (error) throw new Error(error.message);
      return (data || []).map((linha) => (typeof linha === 'string' ? linha : linha.minhas_permissoes));
    },
    staleTime: 60000,
  });

  const carregando = isLoading || carregandoEu;
  const temPermissao = (chave) => (isLoading ? isGestor : permissoes.includes(chave));
  const temAlguma = (chaves = []) => chaves.some((chave) => temPermissao(chave));

  return { permissoes, temPermissao, temAlguma, carregando };
}
