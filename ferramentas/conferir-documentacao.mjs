/**
 * PORTAL CRC — CONFERIR A DOCUMENTAÇÃO TÉCNICA
 *
 * A documentação (Configurações > Documentação Técnica) é escrita à mão, e o
 * sistema muda todo dia. A versão anterior ficou anos descrevendo coisas que
 * já não existiam (Base44, "sem RLS", arquivos apagados). Este conferidor
 * existe para isso não voltar a acontecer: ele falha quando a documentação
 * cita algo que não existe, ou quando algo que existe não está documentado.
 *
 *   npm run conferir-documentacao      (também roda dentro de `npm run lint`)
 *
 * O QUE CONFERE
 *   1. cada arquivo citado em `paginas` de um módulo existe (aceita `pasta/*.jsx`);
 *   2. cada entidade citada existe em src/api/tabelas.js;
 *   3. cada "migration NN" citada em qualquer texto existe em supabase/migrations;
 *   4. toda página de src/pages está em algum módulo (ou marcada como legado);
 *   5. toda tabela de src/api/tabelas.js está descrita na seção Banco de dados;
 *   6. toda função e gatilho criados nas migrations estão descritos;
 *   7. ids de módulo não se repetem e todo módulo tem objetivo e acesso.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const RAIZ = path.resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const caminho = (...p) => path.join(RAIZ, ...p);
const importar = (rel) => import(pathToFileURL(caminho(rel)).href);

const problemas = [];
const erro = (msg) => problemas.push(msg);

const { TABELAS } = await importar('src/api/tabelas.js');
const { modulosOperacoes } = await importar('src/components/documentacao/dadosOperacoes.js');
const { modulosGestaoPessoas } = await importar('src/components/documentacao/dadosGestaoPessoas.js');
const { modulosComunicacao } = await importar('src/components/documentacao/dadosComunicacao.js');
const { modulosSistema } = await importar('src/components/documentacao/dadosSistema.js');
const banco = await importar('src/components/documentacao/dadosBanco.js');
const arquitetura = await importar('src/components/documentacao/dadosArquitetura.js');
const regras = await importar('src/components/documentacao/dadosRegras.js');
const operacao = await importar('src/components/documentacao/dadosOperacao.js');

const MODULOS = [...modulosOperacoes, ...modulosGestaoPessoas, ...modulosComunicacao, ...modulosSistema];

/* ---------- 7. estrutura dos módulos ---------- */
const vistos = new Set();
for (const m of MODULOS) {
  if (vistos.has(m.id)) erro(`módulo repetido: ${m.id}`);
  vistos.add(m.id);
  for (const campo of ['categoria', 'nome', 'objetivo', 'acesso']) {
    if (!m[campo] || !String(m[campo]).trim()) erro(`módulo "${m.id}" sem "${campo}"`);
  }
  if (!Array.isArray(m.paginas) || m.paginas.length === 0) erro(`módulo "${m.id}" sem arquivos em "paginas"`);
}

/* ---------- 1. arquivos citados ---------- */
function existeCaminho(rel) {
  if (rel.includes('*')) {
    const pasta = rel.slice(0, rel.lastIndexOf('/'));
    const sufixo = rel.slice(rel.lastIndexOf('/') + 1).replace('*', '');
    if (!existsSync(caminho(pasta))) return false;
    return readdirSync(caminho(pasta)).some((f) => f.endsWith(sufixo));
  }
  return existsSync(caminho(rel));
}
for (const m of MODULOS) {
  for (const p of m.paginas ?? []) {
    if (!existeCaminho(p)) erro(`módulo "${m.id}": o arquivo "${p}" não existe`);
  }
}

/* ---------- 2. entidades citadas ---------- */
const ENTIDADES_FORA_DO_MAPA = /^(storage:|auth\.|funcao:|tabela:)/;
for (const m of MODULOS) {
  for (const e of m.entidades ?? []) {
    if (!TABELAS[e] && !ENTIDADES_FORA_DO_MAPA.test(e)) erro(`módulo "${m.id}": a entidade "${e}" não está em src/api/tabelas.js`);
  }
}

/* ---------- 3. migrations citadas ---------- */
const migracoes = readdirSync(caminho('supabase/migrations'))
  .map((f) => f.match(/^(\d+)_/)?.[1])
  .filter(Boolean)
  .map((n) => String(Number(n)));
const textoDeTudo = JSON.stringify([MODULOS, banco, arquitetura, regras, operacao]);
for (const m of textoDeTudo.matchAll(/migrations?\s+(\d+)(?:\s*(?:,|e|a)\s*(\d+))*/gi)) {
  const numeros = m[0].match(/\d+/g);
  for (const n of numeros) {
    if (!migracoes.includes(String(Number(n)))) erro(`a documentação cita "migration ${n}", que não existe`);
  }
}

/* ---------- 4. páginas ---------- */
const paginasDocumentadas = new Set(MODULOS.flatMap((m) => m.paginas ?? []).map((p) => p.split('/').pop()));
for (const f of readdirSync(caminho('src/pages'))) {
  if (!f.endsWith('.jsx')) continue;
  if (!paginasDocumentadas.has(f)) erro(`a página src/pages/${f} não está em nenhum módulo da documentação`);
}

/* ---------- 5. tabelas ---------- */
const tabelasDocumentadas = new Set(banco.gruposDeTabelas.flatMap((g) => g.tabelas.map((t) => t.entidade)));
for (const entidade of Object.keys(TABELAS)) {
  if (!tabelasDocumentadas.has(entidade)) erro(`a tabela "${entidade}" (${TABELAS[entidade]}) não está descrita em Banco de dados`);
}
for (const entidade of tabelasDocumentadas) {
  if (!TABELAS[entidade] && !ENTIDADES_FORA_DO_MAPA.test(entidade) && !banco.tabelasSemEntidade.includes(entidade)) {
    erro(`Banco de dados descreve "${entidade}", que não existe em src/api/tabelas.js`);
  }
}

/* ---------- 6. funções e gatilhos ---------- */
const sqlTodo = readdirSync(caminho('supabase/migrations'))
  .filter((f) => f.endsWith('.sql'))
  .map((f) => readFileSync(caminho('supabase/migrations', f), 'utf8').replace(/--[^\n]*/g, ''))
  .join('\n');
const funcoes = new Set([...sqlTodo.matchAll(/create or replace function\s+public\.([a-z_0-9]+)/gi)].map((m) => m[1]));
const gatilhos = new Set([...sqlTodo.matchAll(/create trigger\s+([a-z_0-9]+)/gi)].map((m) => m[1]));
const funcoesDocumentadas = new Set(banco.funcoesDoBanco.map((f) => f.nome));
const gatilhosDocumentados = new Set(banco.gatilhosDoBanco.map((g) => g.nome));
for (const f of funcoes) if (!funcoesDocumentadas.has(f)) erro(`a função public.${f}() não está descrita em Banco de dados`);
for (const g of gatilhos) if (!gatilhosDocumentados.has(g)) erro(`o gatilho ${g} não está descrito em Banco de dados`);
for (const f of funcoesDocumentadas) if (!funcoes.has(f)) erro(`Banco de dados descreve a função "${f}", que não existe nas migrations`);
for (const g of gatilhosDocumentados) if (!gatilhos.has(g)) erro(`Banco de dados descreve o gatilho "${g}", que não existe nas migrations`);

/* ---------- resultado ---------- */
if (problemas.length) {
  console.error(`Documentação técnica fora de sincronia (${problemas.length}):`);
  for (const p of problemas) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`Documentação técnica: ${MODULOS.length} módulos, ${Object.keys(TABELAS).length} tabelas, ${funcoes.size} funções e ${gatilhos.size} gatilhos conferidos.`);
