/**
 * PORTAL CRC — IMPORTADOR DO HISTÓRICO DO BASE44
 *
 * Uso:
 *   node ferramentas/importar-dados.mjs --teste     (não grava nada, só confere)
 *   node ferramentas/importar-dados.mjs             (grava de verdade)
 *
 * Precisa da chave service_role, que NÃO fica no .env.local (esse vai para o
 * navegador). Crie um .env.import com:
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *
 * Essa chave ignora todas as regras de segurança — é justamente o que a
 * importação exige, já que 20 tabelas só aceitam escrita de gestor e o
 * importador não é uma pessoa logada. Ela nunca pode ir para o frontend.
 *
 *
 * O PROBLEMA CENTRAL: OS IDENTIFICADORES
 *
 * No Base44 cada registro tem um id como "6aa9505d307daa2a4eb0c941", e os
 * vínculos apontam para ele: Tratativa.motivo_id guarda o id do MotivoTratativa.
 *
 * No banco novo o id é um uuid gerado pelo Postgres. Se importássemos os
 * vínculos como estão, Tratativa.motivo_id apontaria para um id que não existe
 * mais em lugar nenhum, e a tela de tratativas mostraria motivo em branco.
 *
 * Por isso a importação tem duas passagens: a primeira decide o uuid de cada
 * registro e monta o mapa id_antigo -> id_novo; a segunda reescreve todos os
 * vínculos usando esse mapa. O id antigo fica guardado em base44_id, que é o
 * que permite conferir depois se cada registro veio do lugar certo.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const TESTE = process.argv.includes('--teste');

// ---------------------------------------------------------------- credenciais
const lerEnv = (arquivo, nome) => {
  const p = path.join(RAIZ, arquivo);
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8').match(new RegExp(`^${nome}\\s*=\\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
};

const URL_SUPABASE = lerEnv('.env.local', 'VITE_SUPABASE_URL');
const CHAVE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || lerEnv('.env.import', 'SUPABASE_SERVICE_ROLE_KEY');

if (!URL_SUPABASE) { console.error('Falta VITE_SUPABASE_URL no .env.local'); process.exit(1); }
if (!CHAVE_SERVICE && !TESTE) {
  console.error('\nFalta a chave service_role.');
  console.error('Crie um arquivo .env.import na raiz do projeto com:');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=<a chave service_role do painel>\n');
  console.error('Painel > Project Settings > API > service_role. NUNCA coloque essa chave no .env.local.\n');
  process.exit(1);
}

// ------------------------------------------------------------------- entrada
const pastaDados = path.join(RAIZ, 'dados-base44');
const arquivo = process.argv.find(a => a.endsWith('.json'))
  || path.join(pastaDados, readdirSync(pastaDados).filter(f => f.endsWith('.json')).sort().pop());

console.log(`\n══ IMPORTAÇÃO ${TESTE ? '(MODO TESTE — nada será gravado)' : ''} ══\n`);
console.log(`Arquivo: ${path.basename(arquivo)}`);

const pacote = JSON.parse(readFileSync(arquivo, 'utf8'));
const dados = pacote.dados;

// ------------------------------------------------- colunas válidas por tabela
const COLUNAS_FIXAS = ['base44_id', 'created_date', 'updated_date', 'created_by', 'importado_em'];
const CAMPOS_SISTEMA = new Set(['id', 'created_date', 'updated_date', 'created_by', 'created_by_id']);

// As tabelas mascaradas foram renomeadas para <nome>_base. O importador grava
// direto nelas: gravar pela view passaria pelo gatilho, que só deixa gestor
// escrever salário — e o importador não é uma pessoa logada, então o salário
// chegaria nulo.
const MASCARADAS = { colaborador: 'colaborador_base', tratativa: 'tratativa_base' };

const snake = (n) => n
  .replace(/(?<=[a-z0-9])(?=[A-Z])/g, '_')
  .replace(/(?<=[A-Z])(?=[A-Z][a-z])/g, '_')
  .toLowerCase();

const esquemas = {};
for (const f of readdirSync(path.join(RAIZ, 'base44', 'entities'))) {
  const e = JSON.parse(readFileSync(path.join(RAIZ, 'base44', 'entities', f), 'utf8'));
  const nome = e.name || f.replace('.jsonc', '');
  esquemas[nome] = {
    tabela: MASCARADAS[snake(nome)] || snake(nome),
    colunas: new Set([...COLUNAS_FIXAS, ...Object.keys(e.properties || {}).filter(c => !CAMPOS_SISTEMA.has(c))]),
  };
}

// ------------------------------------- passagem 1: decidir os ids e mapeá-los
const mapaIds = new Map();     // id do Base44 -> uuid novo
for (const [entidade, registros] of Object.entries(dados)) {
  if (!esquemas[entidade]) continue;
  for (const r of registros) {
    if (r.id) mapaIds.set(r.id, randomUUID());
  }
}
console.log(`Identificadores mapeados: ${mapaIds.size.toLocaleString('pt-BR')}`);

// ------------------------------------------- passagem 2: transformar e enviar
/** Campos *_id que NÃO são vínculo entre entidades — não devem ser remapeados. */
const NAO_E_VINCULO = new Set(['id_interno', 'id_base_cliente', 'base44_id', 'entidade_id']);

const limpar = (v) => {
  // String vazia numa coluna de data ou número faz o Postgres recusar a linha.
  if (v === '') return null;
  return v;
};

const estatisticas = [];
let vinculosRemapeados = 0;
const naoResolvidos = new Map();   // "Entidade.campo" -> { n, exemplo }

function transformar(entidade, r) {
  const { colunas } = esquemas[entidade];
  const saida = {
    id: mapaIds.get(r.id),
    base44_id: r.id ?? null,
    importado_em: new Date().toISOString(),
  };

  for (const [campo, valor] of Object.entries(r)) {
    if (campo === 'id') continue;
    if (!colunas.has(campo)) continue;          // campo que não existe na tabela

    let v = limpar(valor);

    if (campo.endsWith('_id') && !NAO_E_VINCULO.has(campo) && typeof v === 'string' && v) {
      if (mapaIds.has(v)) { v = mapaIds.get(v); vinculosRemapeados++; }
      else {
        const chave = `${entidade}.${campo}`;
        const atual = naoResolvidos.get(chave) || { n: 0, exemplo: v };
        atual.n++;
        naoResolvidos.set(chave, atual);
      }
    }
    // Listas de vínculos (colaboradores_ids): cada item é trocado como um
    // _id. Sem isto, observacao.colaboradores_ids chegava com os ids antigos
    // e nenhuma tela achava os feedbacks de ninguém (migration 15).
    if (campo.endsWith('_ids') && Array.isArray(v)) {
      v = v.map((item) => {
        if (typeof item !== 'string' || !item) return item;
        if (mapaIds.has(item)) { vinculosRemapeados++; return mapaIds.get(item); }
        const chave = `${entidade}.${campo}[]`;
        const atual = naoResolvidos.get(chave) || { n: 0, exemplo: item };
        atual.n++;
        naoResolvidos.set(chave, atual);
        return item;
      });
    }
    saida[campo] = v;
  }
  return saida;
}

const supabase = CHAVE_SERVICE
  ? createClient(URL_SUPABASE, CHAVE_SERVICE, { auth: { persistSession: false } })
  : null;

console.log('');
for (const entidade of Object.keys(dados).sort()) {
  const registros = dados[entidade];
  if (!esquemas[entidade]) { console.log(`  ⚠️  ${entidade}: sem tabela correspondente, ignorado`); continue; }
  if (!registros.length) continue;

  const { tabela } = esquemas[entidade];
  const linhas = registros.map(r => transformar(entidade, r));

  if (TESTE) {
    estatisticas.push({ entidade, tabela, total: linhas.length, gravados: 0, erro: null });
    console.log(`  ○ ${entidade.padEnd(26)} ${String(linhas.length).padStart(5)} prontos`);
    continue;
  }

  let gravados = 0, erro = null;
  for (let i = 0; i < linhas.length; i += 200) {
    const lote = linhas.slice(i, i + 200);
    const { error } = await supabase.from(tabela).upsert(lote, { onConflict: 'base44_id' });
    if (error) { erro = error.message; break; }
    gravados += lote.length;
  }
  estatisticas.push({ entidade, tabela, total: linhas.length, gravados, erro });
  console.log(`  ${erro ? '✗' : '✓'} ${entidade.padEnd(26)} ${String(gravados).padStart(5)}/${linhas.length}${erro ? `  ERRO: ${erro.slice(0, 70)}` : ''}`);
}

// ---------------------------------------------------------------- relatório
console.log('\n══════════════════════════════════════');
console.log(`Vínculos entre entidades remapeados : ${vinculosRemapeados.toLocaleString('pt-BR')}`);
if (naoResolvidos.size) {
  // Um id do Base44 tem 24 caracteres hexadecimais. Valor fora desse formato
  // não é referência a entidade nenhuma — é número de ticket, marcador de
  // sistema ou id de usuário da plataforma, e deve continuar como está.
  const ehIdDeEntidade = (v) => /^[0-9a-f]{24}$/.test(v);
  const pendentes = [...naoResolvidos.entries()].sort((a, b) => b[1].n - a[1].n);
  const soltos = pendentes.filter(([, d]) => ehIdDeEntidade(d.exemplo));
  const inofensivos = pendentes.filter(([, d]) => !ehIdDeEntidade(d.exemplo));

  const somar = (lista) => lista.reduce((s, [, d]) => s + d.n, 0);

  console.log(`
Valores mantidos como estavam       : ${somar(inofensivos).toLocaleString('pt-BR')}`);
  console.log('  Não são referência a entidade — número de ticket, marcador, id da plataforma:');
  inofensivos.forEach(([campo, d]) => console.log(`    ${campo.padEnd(38)} ${String(d.n).padStart(4)}   ex: ${d.exemplo}`));

  if (soltos.length) {
    console.log(`
⚠️  Referências órfãs de verdade     : ${somar(soltos)}`);
    console.log('  Apontam para registros que já não existiam no Base44 (apagados lá).');
    console.log('  Vieram assim da origem; a importação preserva o valor em vez de inventar vínculo:');
    soltos.forEach(([campo, d]) => console.log(`    ${campo.padEnd(38)} ${String(d.n).padStart(4)}   ex: ${d.exemplo}`));
  }
}

const totalRegistros = estatisticas.reduce((s, e) => s + e.total, 0);
const totalGravados = estatisticas.reduce((s, e) => s + e.gravados, 0);
const falhas = estatisticas.filter(e => e.erro);

if (TESTE) {
  console.log(`\n${totalRegistros.toLocaleString('pt-BR')} registros prontos para importar, em ${estatisticas.length} tabelas.`);
  console.log('Nada foi gravado. Rode sem --teste para valer.\n');
} else {
  console.log(`\n${totalGravados.toLocaleString('pt-BR')} de ${totalRegistros.toLocaleString('pt-BR')} registros gravados.`);
  if (falhas.length) {
    console.log(`\n${falhas.length} tabela(s) com erro:`);
    falhas.forEach(f => console.log(`  • ${f.entidade} (${f.tabela}): ${f.erro}`));
    process.exit(1);
  }
  console.log('\nImportação concluída. Confira no app antes de aplicar o 99_restricoes_pos_importacao.sql.\n');
}
