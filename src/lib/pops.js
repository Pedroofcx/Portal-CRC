/**
 * Regras dos POPs — versão, confirmação de leitura e organização da lista.
 * Funções puras, testadas em `npm run testar`.
 *
 * VERSÃO (o manual exige que toda alteração seja documentada e versionada):
 *   - ajuste (texto, correção, detalhe): 1.0 → 1.1 → 1.2
 *   - nova versão (muda regra, prazo, fluxo): 1.2 → 2.0
 *
 * CIÊNCIA: quando a versão atual pede (exige_ciencia), cada agente — o
 * gestor, que publica, não — confirma "li e compreendi" UMA vez por versão.
 * Vale a mesma regra de avisos e pesquisas: só o que foi publicado depois do
 * cadastro da pessoa.
 */
import { publicadoDepoisDoCadastro } from './pendencias.js';

export const CATEGORIAS_POP = ['Governança', 'Tratativas', 'Pessoas e rotina', 'Continuidade e tecnologia'];

/** Próxima versão: tipo 'ajuste' (1.2 → 1.3) ou 'nova' (1.2 → 2.0). */
export function proximaVersao(atual, tipo = 'ajuste') {
  const [maior, menor] = String(atual || '1.0').split('.').map((n) => parseInt(n, 10) || 0);
  return tipo === 'nova' ? `${maior + 1}.0` : `${maior}.${menor + 1}`;
}

/**
 * POPs que a pessoa ainda precisa confirmar (versão atual, ativa, que pede
 * ciência, publicada depois do cadastro dela e ainda não confirmada).
 */
export function popsParaCiencia({ pops = [], leituras = [], colaborador, tratados = new Set() }) {
  // O gestor publica os POPs — pedir a ele que confirme a própria publicação
  // seria ruído. A confirmação é da equipe.
  if (!colaborador?.id || colaborador.papel === 'gestor') return [];
  const lidas = new Set(leituras
    .filter((l) => l.colaborador_id === colaborador.id)
    .map((l) => `${l.pop_id}@${l.versao}`));
  return pops
    .filter((p) => p.ativo !== false && p.exige_ciencia !== false)
    .filter((p) => !lidas.has(`${p.id}@${p.versao}`) && !tratados.has(`${p.id}@${p.versao}`))
    .filter((p) => publicadoDepoisDoCadastro({ data_publicacao: p.publicado_em, created_date: p.created_date }, colaborador))
    .sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0));
}

const semAcento = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Busca em código, título, categoria e no texto inteiro do POP. */
export function popCorresponde(pop, busca) {
  const termo = semAcento(busca).trim();
  if (!termo) return true;
  const alvo = semAcento([pop.codigo, pop.titulo, pop.categoria, pop.objetivo, pop.fluxo_operacional,
    pop.criterio_qualidade, pop.outras_informacoes, ...(pop.prazos ?? []).map((p) => `${p.rotulo} ${p.valor}`)].join(' '));
  return termo.split(/\s+/).every((parte) => alvo.includes(parte));
}

/** [{ categoria, pops }] na ordem das categorias; categorias fora da lista vão para o fim. */
export function agruparPorCategoria(pops = [], busca = '') {
  const filtrados = pops.filter((p) => popCorresponde(p, busca));
  const nomes = [...CATEGORIAS_POP, ...new Set(filtrados.map((p) => p.categoria || 'Outros').filter((c) => !CATEGORIAS_POP.includes(c)))];
  return nomes
    .map((categoria) => ({
      categoria,
      pops: filtrados
        .filter((p) => (p.categoria || 'Outros') === categoria)
        .sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0) || String(a.codigo).localeCompare(String(b.codigo))),
    }))
    .filter((g) => g.pops.length);
}

/** Os POPs ligados a um tipo de tratativa (para o botão "Ver POP"). */
export const popsDoTipo = (pops = [], tipo) =>
  pops.filter((p) => p.ativo !== false && (p.tipos_tratativa ?? []).includes(tipo))
    .sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0));

/** O POP como ele fica guardado no histórico de versões. */
export function fotografia(pop) {
  const campos = ['codigo', 'titulo', 'categoria', 'ordem', 'tipos_tratativa', 'objetivo', 'ferramentas', 'prazos',
    'fluxo_operacional', 'criterio_qualidade', 'outras_informacoes', 'raci', 'versao', 'vigencia', 'o_que_mudou'];
  return Object.fromEntries(campos.map((c) => [c, pop?.[c] ?? null]));
}
