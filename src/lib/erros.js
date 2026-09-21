/**
 * Erro do banco em português, para aparecer para quem usa o sistema.
 * Usado pelo aviso central de gravação que falha (query-client.js).
 */
// As recusas mais comuns do banco, na língua de quem usa o sistema.
const TRADUCOES = [
	[/row-level security|permission denied|42501/i, 'você não tem permissão para esta ação.'],
	[/duplicate key|23505|unique/i, 'já existe um registro igual.'],
	[/check constraint|23514/i, 'algum valor está fora do permitido.'],
	[/not-null|23502|null value/i, 'falta preencher um campo obrigatório.'],
	[/failed to fetch|networkerror|network request failed/i, 'sem conexão com o servidor. Confira a internet e tente de novo.'],
];

export function traduzirErro(erro) {
	const bruto = erro?.message ? String(erro.message).replace(/^\[[^\]]+\]\s*/, '') : '';
	const traducao = TRADUCOES.find(([padrao]) => padrao.test(bruto));
	return traducao ? traducao[1] : (bruto || 'erro desconhecido.');
}
