// Utilitários do rodízio de Agentes N2

export function getPosicaoAtualN2(configuracoes) {
  const conf = configuracoes.find(c => c.chave === 'rodizio_n2_posicao');
  return conf ? (parseInt(conf.valor) || 0) : 0;
}

export function findNextN2(agentes, posicaoAtual) {
  const ativos = agentes
    .filter(a => a.ativo !== false)
    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

  if (ativos.length === 0) return null;

  const idxInicial = ((posicaoAtual % ativos.length) + ativos.length) % ativos.length;

  for (let i = 0; i < ativos.length; i++) {
    const idx = (idxInicial + i) % ativos.length;
    if (ativos[idx].status === 'permitido') {
      return {
        agente: ativos[idx],
        proximaPosicao: (idx + 1) % ativos.length,
      };
    }
  }

  return null;
}

export const STATUS_N2_LABELS = {
  permitido: { label: 'Permitido', color: 'bg-green-100 text-green-700 border-green-200' },
  ferias: { label: 'Férias', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  bloqueado: { label: 'Bloqueado', color: 'bg-red-100 text-red-700 border-red-200' },
};

export const TIPO_N2_LABELS = {
  rodizio: { label: 'Rodízio', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  supervisor: { label: 'Supervisor', color: 'bg-purple-100 text-purple-700 border-purple-200' },
};