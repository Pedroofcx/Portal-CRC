/**
 * PORTAL CRC — DADOS PARA A PRÉVIA DA TELA DO GESTOR
 *
 * Uso:
 *   npm run previa-gestor
 *
 * Copia do banco o que a tela inicial do gestor e a página detalhada de cada
 * pessoa precisam, e grava em previas/dados-gestor.json (ignorado pelo git).
 * Depois: npm run dev e http://localhost:5173/previas/gestor.html
 *
 * Só lê. Usa a chave service_role do .env.import, que fica na sua máquina.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';

// String.raw: sem ele, "\s" dentro das crases vira só "s".
const ler = (arq, nome) => readFileSync(arq, 'utf8')
  .match(new RegExp(String.raw`^${nome}\s*=\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
const sb = createClient(ler('.env.local', 'VITE_SUPABASE_URL'),
  process.env.SUPABASE_SERVICE_ROLE_KEY || ler('.env.import', 'SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

const tudo = async (tabela) => {
  const linhas = [];
  for (let de = 0; ; de += 1000) {
    const { data, error } = await sb.from(tabela).select('*').range(de, de + 999);
    if (error) { console.error(`Não consegui ler ${tabela}: ${error.message}`); process.exit(1); }
    linhas.push(...data);
    if (data.length < 1000) return linhas;
  }
};

const [colaboradores, tratativas, ciclos, pontuacoes, exigencias, apuracoes, pdis, observacoes, hanseis, ciclosFerias] = await Promise.all(
  ['colaborador_base', 'tratativa_base', 'ciclo_trimestral', 'pontuacao', 'elegibilidade_premio', 'apuracao',
    'pdi', 'observacao', 'hansei_envio', 'ciclo_ferias'].map(tudo));
// As ANOTAÇÕES PESSOAIS ficam de fora de propósito: são privadas de cada pessoa.

const gestor = colaboradores.find((c) => c.papel === 'gestor' && c.ativo !== false);
const ciclo = ciclos.find((c) => c.ativo);

writeFileSync('previas/dados-gestor.json', JSON.stringify({
  gestorEmail: gestor?.email ?? null,
  colaboradores, tratativas, ciclos, pontuacoes, apuracoes, pdis, observacoes, hanseis, ciclosFerias,
  elegibilidades: exigencias.filter((e) => e.ativa),
}));

console.log(`\nPrévia do gestor (${gestor?.nome_completo ?? 'nenhum gestor ativo'})`);
console.log(`  ciclo ativo: ${ciclo ? `${ciclo.nome} (${ciclo.data_inicio} a ${ciclo.data_fim})` : 'nenhum'}`);
console.log(`  tratativas: ${tratativas.length}`);
console.log('\nAgora: npm run dev e abra http://localhost:5173/previas/gestor.html\n');
