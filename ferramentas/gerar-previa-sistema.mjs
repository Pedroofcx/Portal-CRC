/**
 * PORTAL CRC — DADOS PARA A PRÉVIA DO SISTEMA INTEIRO
 *
 * Uso:
 *   npm run previa-sistema
 *
 * Copia TODAS as tabelas do banco (menos as anotações pessoais, que são
 * privadas) para previas/dados-sistema.json — ignorado pelo git. A prévia
 * previas/sistema.html usa essa cópia no lugar do banco: todas as telas, com o
 * layout de verdade e os dados de verdade, sem login e sem gravar nada.
 *
 * Só lê. Usa a chave service_role do .env.import, que fica na sua máquina.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';
import { TABELAS } from '../src/api/tabelas.js';

// String.raw: sem ele, "\s" dentro das crases vira só "s".
const ler = (arq, nome) => readFileSync(arq, 'utf8')
  .match(new RegExp(String.raw`^${nome}\s*=\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
const sb = createClient(ler('.env.local', 'VITE_SUPABASE_URL'),
  process.env.SUPABASE_SERVICE_ROLE_KEY || ler('.env.import', 'SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

// As tabelas com máscara (colaborador) são views: a cópia lê a tabela-base.
const FONTE = { colaborador: 'colaborador_base', tratativa: 'tratativa_base' };
const PRIVADAS = new Set(['anotacao_pessoal']);

const tudo = async (tabela) => {
  const linhas = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.from(FONTE[tabela] ?? tabela).select('*').range(de, de + 999);
    if (error) { console.error(`  ${tabela}: não consegui ler (${error.message})`); return []; }
    linhas.push(...data);
    if (data.length < 1000) return linhas;
  }
};

const dados = {};
for (const [entidade, tabela] of Object.entries(TABELAS)) {
  dados[entidade] = PRIVADAS.has(tabela) ? [] : await tudo(tabela);
}
const gestor = dados.Colaborador.find((c) => c.papel === 'gestor' && c.ativo !== false);

writeFileSync('previas/dados-sistema.json', JSON.stringify({ gestorEmail: gestor?.email ?? null, dados }));

const total = Object.values(dados).reduce((a, l) => a + l.length, 0);
console.log(`\nPrévia do sistema: ${Object.keys(dados).length} tabelas, ${total.toLocaleString('pt-BR')} registros`);
console.log(`  entrando como: ${gestor?.nome_completo ?? 'nenhum gestor ativo'}`);
console.log('\nAgora: npm run dev e abra http://localhost:5173/previas/sistema.html\n');
