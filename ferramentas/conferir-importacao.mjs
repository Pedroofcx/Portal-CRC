/**
 * PORTAL CRC — CONFERÊNCIA DA IMPORTAÇÃO
 *
 * Uso:  node ferramentas/conferir-importacao.mjs
 *
 * O importador relata o que ele acha que fez. Este script lê o banco e
 * compara com o arquivo de origem — se os dois discordarem, o banco manda.
 *
 * Confere três coisas:
 *   1. contagem por tabela, contra o arquivo do Base44
 *   2. se os vínculos remapeados realmente encontram destino no banco
 *   3. se os campos sensíveis chegaram inteiros (a máscara esconde na leitura
 *      de agente, mas o valor tem que estar gravado)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const lerEnv = (arq, nome) => {
  const p = path.join(RAIZ, arq);
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8').match(new RegExp(`^${nome}\\s*=\\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
};

const supabase = createClient(
  lerEnv('.env.local', 'VITE_SUPABASE_URL'),
  process.env.SUPABASE_SERVICE_ROLE_KEY || lerEnv('.env.import', 'SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false } }
);

const pasta = path.join(RAIZ, 'dados-base44');
const arquivo = path.join(pasta, readdirSync(pasta).filter(f => f.endsWith('.json')).sort().pop());
const dados = JSON.parse(readFileSync(arquivo, 'utf8')).dados;

const MASCARADAS = { colaborador: 'colaborador_base', tratativa: 'tratativa_base' };
const snake = (n) => n.replace(/(?<=[a-z0-9])(?=[A-Z])/g, '_').replace(/(?<=[A-Z])(?=[A-Z][a-z])/g, '_').toLowerCase();

let problemas = 0;

// -------------------------------------------------------- 1. contagens
console.log('\n══ CONFERÊNCIA DA IMPORTAÇÃO ══\n');
console.log('1) Contagem por tabela (banco × arquivo de origem):\n');

let totalBanco = 0, totalArquivo = 0;
for (const entidade of Object.keys(dados).sort()) {
  const esperado = dados[entidade].length;
  if (!esperado) continue;
  const tabela = MASCARADAS[snake(entidade)] || snake(entidade);

  // Conta só o que VEIO da importação: base44_id preenchido. Comparar o total
  // acusaria falsa divergência assim que alguém usasse o sistema, porque todo
  // registro novo entra sem base44_id.
  const { count, error } = await supabase.from(tabela)
    .select('*', { count: 'exact', head: true }).not('base44_id', 'is', null);
  if (error) { console.log(`  ✗ ${entidade.padEnd(26)} erro: ${error.message.slice(0, 50)}`); problemas++; continue; }

  const { count: novos } = await supabase.from(tabela)
    .select('*', { count: 'exact', head: true }).is('base44_id', null);

  totalBanco += count; totalArquivo += esperado;
  const ok = count === esperado;
  if (!ok) problemas++;
  const nota = novos ? `   (+${novos} criado(s) no sistema novo)` : '';
  console.log(`  ${ok ? '✓' : '✗'} ${entidade.padEnd(26)} importados ${String(count).padStart(5)}  origem ${String(esperado).padStart(5)}${ok ? nota : '   ← DIVERGE'}`);
}
console.log(`\n  Total: ${totalBanco.toLocaleString('pt-BR')} no banco, ${totalArquivo.toLocaleString('pt-BR')} na origem`);

// ------------------------------------------------- 2. vínculos remapeados
console.log('\n2) Os vínculos encontram destino no banco?\n');

const vinculos = [
  ['tratativa_base', 'motivo_id', 'motivo_tratativa'],
  ['tratativa_base', 'etapa_jornada_id', 'etapa_jornada'],
  ['tratativa_base', 'agente_responsavel_id', 'colaborador_base'],
  ['pontuacao', 'colaborador_id', 'colaborador_base'],
  ['escala_atribuicao', 'colaborador_id', 'colaborador_base'],
  ['apuracao', 'colaborador_id', 'colaborador_base'],
];

for (const [tabela, campo, alvo] of vinculos) {
  const { data: origem } = await supabase.from(tabela).select(campo);
  const { data: destino } = await supabase.from(alvo).select('id');
  const ids = new Set((destino || []).map(d => d.id));
  const usados = [...new Set((origem || []).map(o => o[campo]).filter(Boolean))];
  const orfaos = usados.filter(v => !ids.has(v));

  if (!usados.length) { console.log(`  – ${tabela}.${campo.padEnd(24)} sem valores preenchidos`); continue; }
  if (orfaos.length) problemas++;
  console.log(`  ${orfaos.length ? '✗' : '✓'} ${`${tabela}.${campo}`.padEnd(42)} ${usados.length} distinto(s), ${orfaos.length} órfão(s)`);
}

// --------------------------------------------- 3. campos sensíveis gravados
console.log('\n3) Os campos sensíveis chegaram inteiros?\n');

const { data: cols } = await supabase.from('colaborador_base').select('nome_completo, salario, papel');
const comSalario = (cols || []).filter(c => c.salario !== null && Number(c.salario) > 0);
console.log(`  ${comSalario.length ? '✓' : '✗'} colaborador.salario gravado em ${comSalario.length} de ${cols?.length ?? 0} cadastros`);
if (!comSalario.length) problemas++;

const { data: trats } = await supabase.from('tratativa_base').select('id, historico_estados');
const comHistorico = (trats || []).filter(t => Array.isArray(t.historico_estados) && t.historico_estados.length);
console.log(`  ${comHistorico.length ? '✓' : '✗'} tratativa.historico_estados em ${comHistorico.length} de ${trats?.length ?? 0} tratativas`);
if (!comHistorico.length) problemas++;

// ------------------------------------------------------ gestores no sistema
console.log('\n4) Quem tem poder de gestor agora:\n');
(cols || []).filter(c => c.papel === 'gestor').forEach(c => console.log(`     ${c.nome_completo}`));

console.log('\n══════════════════════════════════════');
if (problemas) {
  console.log(`${problemas} divergência(s) encontrada(s). Não aplique o 99_restricoes ainda.\n`);
  process.exit(1);
}
console.log('Importação conferida contra o banco. Nenhuma divergência.\n');
