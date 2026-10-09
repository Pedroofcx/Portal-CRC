import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import db from '@/api/db';
import { traduzirErro } from '@/lib/erros';

/**
 * As tratativas que a pessoa fixou (migration 56). É pessoal: cada um vê só as
 * suas. `alternar(id)` fixa ou solta, e a lista muda na hora (a gravação
 * acontece em seguida; se falhar, volta ao que era e avisa).
 */
export default function useTratativasFixadas(colaboradorId) {
  const queryClient = useQueryClient();
  const chave = ['tratativas-fixadas', colaboradorId];

  const { data: linhas = [] } = useQuery({
    queryKey: chave,
    queryFn: () => db.entities.TratativaFixada.filter({ colaborador_id: colaboradorId }),
    enabled: Boolean(colaboradorId),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
  const fixadas = useMemo(() => new Set(linhas.map((l) => l.tratativa_id)), [linhas]);

  const alternarMutacao = useMutation({
    mutationFn: async ({ tratativaId, fixar }) => {
      if (fixar) {
        await db.entities.TratativaFixada.create({ colaborador_id: colaboradorId, tratativa_id: tratativaId });
        return;
      }
      const existentes = await db.entities.TratativaFixada.filter({ colaborador_id: colaboradorId, tratativa_id: tratativaId });
      await Promise.all(existentes.map((l) => db.entities.TratativaFixada.delete(l.id)));
    },
    onMutate: async ({ tratativaId, fixar }) => {
      await queryClient.cancelQueries({ queryKey: chave });
      const antes = queryClient.getQueryData(chave) ?? [];
      queryClient.setQueryData(chave, fixar
        ? [...antes, { id: `local-${tratativaId}`, colaborador_id: colaboradorId, tratativa_id: tratativaId }]
        : antes.filter((l) => l.tratativa_id !== tratativaId));
      return { antes };
    },
    onError: (e, _vars, contexto) => {
      queryClient.setQueryData(chave, contexto?.antes ?? []);
      toast.error(`Não consegui fixar: ${traduzirErro(e)}`);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: chave }),
  });

  return {
    fixadas,
    alternar: (tratativaId) => alternarMutacao.mutate({ tratativaId, fixar: !fixadas.has(tratativaId) }),
  };
}
