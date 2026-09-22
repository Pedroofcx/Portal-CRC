/**
 * PORTAL CRC — RECALCULA OS NÚMEROS DOS HANSEIS JÁ ENVIADOS
 *
 * Uso:
 *   node ferramentas/recalcular-hansei.mjs            mostra antes → depois (não grava)
 *   node ferramentas/recalcular-hansei.mjs --gravar   grava
 *
 * Os Hanseis guardam uma "foto" dos números no envio. A conta antiga errava
 * (CSAT sem os dias de 0%, dias em dobro, CX sempre 0, pontos da tabela
 * antiga). Decisão de Pedro em 22/09/2026: recalcular os já enviados com a
 * conta nova (src/lib/hanseiDados.js). Só `dados_consolidados` muda —
 * comentário do gestor, data de envio e visualização ficam como estão.
 *
 * Usa a chave service_role do .env.import, que fica na sua máquina.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { calcularDadosConsolidados } from '../src/lib/hanseiDados.js';

const ler = (arq, nome) => readFileSync(arq, 'utf8')
  .match(new RegExp(String.raw`^${nome}\s*=\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
const sb = createClient(ler('.env.local', 'VITE_SUPABASE_URL'), ler('.env.import', 'SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const gravar = process.argv.includes('--gravar');

const tudo = async (tabela, filtro) => {
  const linhas = [];
  for (let de = 0; ; de += 1000) {
    let q = sb.from(tabela).select('*').range(de, de + 999);
    if (filtro) q = filtro(q);
    const { data, error } = await q;
    if (error) throw new Error(`${tabela}: ${error.message}`);
    linhas.push(...data);
    if (data.length < 1000) return linhas;
  }
};

const [tratativas, apuracoes, bonus, ciclos, envios] = await Promise.all([
  tudo('tratativa_base'),
  tudo('apuracao'),
  tudo('pontuacao', (q) => q.eq('tipo', 'bonus_manual')),
  tudo('ciclo_trimestral'),
  tudo('hansei_envio'),
]);

const dia = (v) => String(v ?? '').slice(0, 10);
const fmt = (v) => (v === null || v === undefined ? '—' : String(v).replace('.', ','));
console.log(`\nHanseis enviados: ${envios.length}${gravar ? ' — GRAVANDO' : ' — só mostrando (use --gravar)'}\n`);

let gravados = 0;
for (const e of envios.sort((a, b) => String(a.data_envio).localeCompare(String(b.data_envio)))) {
  const antes = e.dados_consolidados ?? {};
  const depois = calcularDadosConsolidados(e.colaborador_id, dia(e.periodo_inicio), dia(e.periodo_fim), { tratativas, apuracoes, bonus, ciclos });
  console.log(`${(e.colaborador_nome ?? '').split(' ')[0].padEnd(10)} ${dia(e.periodo_inicio)} a ${dia(e.periodo_fim)}  `
    + `CSAT ${fmt(antes.csat_individual)} → ${fmt(depois.csat_individual)}  `
    + `perf ${fmt(antes.performance_percentual)} → ${fmt(depois.performance_percentual)}  `
    + `CX ${fmt(antes.cx_nota_media)} → ${fmt(depois.cx_nota_media)}  `
    + `pontos ${fmt(antes.pontuacao_trimestre)} → ${fmt(depois.pontuacao_trimestre)}`);
  if (!gravar) continue;
  const { error } = await sb.from('hansei_envio').update({ dados_consolidados: depois }).eq('id', e.id);
  if (error) { console.error(`  falhou: ${error.message}`); process.exitCode = 1; continue; }
  gravados += 1;
}
console.log(gravar ? `\nRecalculados: ${gravados} de ${envios.length}.\n` : '\nNada foi gravado.\n');
