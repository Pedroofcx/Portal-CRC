import db from '@/api/db';
import { useQuery } from '@tanstack/react-query';

/**
 * Quem está logado, e se é gestor. Mesma consulta (currentUser + lista de
 * colaboradores) que cada página gestorOnly repetia à mão — e que, em pelo
 * menos 10 páginas, nunca chegou a ser usada pra travar o próprio conteúdo
 * (só o link do menu ficava escondido; a rota continuava aberta pra quem
 * digitasse a URL). Ver decisoes-de-regra.md, "Páginas gestorOnly sem
 * trava" (01/10/2026).
 */
export function useEu() {
  const { data: user, isLoading: carregandoUsuario } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => db.auth.me(),
  });
  const { data: colaboradores = [], isLoading: carregandoColaboradores } = useQuery({
    queryKey: ['colaboradores', "list()"],
    queryFn: () => db.entities.Colaborador.list(),
  });
  const eu = colaboradores.find((c) => c.email?.toLowerCase() === user?.email?.toLowerCase());
  return {
    eu,
    isGestor: eu?.papel === 'gestor',
    carregando: carregandoUsuario || carregandoColaboradores,
  };
}
