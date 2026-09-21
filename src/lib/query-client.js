import { MutationCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { traduzirErro } from './erros.js';

/**
 * Gravação que falha nunca pode passar em silêncio. Das 101 gravações do
 * sistema, 34 não tinham tratamento de erro: se o banco recusasse (permissão,
 * campo inválido, sem conexão), a pessoa achava que tinha salvo. Aqui, toda
 * gravação SEM onError próprio mostra o motivo; as que têm continuam com a
 * mensagem delas.
 */
export function avisarErroDeGravacao(erro) {
	toast.error(`Não foi possível salvar: ${traduzirErro(erro)}`);
}

export const queryClientInstance = new QueryClient({
	mutationCache: new MutationCache({
		onError: (erro, _variaveis, _contexto, mutacao) => {
			if (mutacao.options.onError) return;
			avisarErroDeGravacao(erro);
		},
	}),
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 2,
			retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
			staleTime: 30000,
			gcTime: 300000,
		},
	},
});
