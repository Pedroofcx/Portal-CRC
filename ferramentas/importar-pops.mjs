/**
 * PORTAL CRC — PUBLICA OS POPs DA ESTRUTURA DE TRABALHO 2026 (V2)
 *
 * Uso:
 *   node ferramentas/importar-pops.mjs            mostra o que faria (não grava)
 *   node ferramentas/importar-pops.mjs --publicar grava
 *   ... --publicar --pedir-ciencia                grava e pede confirmação de leitura a cada agente
 *
 * O que faz (com --publicar):
 *   1. confere que a migration 18 rodou (colunas novas do POP);
 *   2. apaga os 2 POPs antigos, desativados e duplicados ("Reclamações
 *      Internas - SG - IP - AC"), como decidido em 21/09/2026;
 *   3. publica cada POP de ferramentas/pops/estrutura-2026.mjs como versão
 *      1.0, com histórico. Por padrão SEM pedir confirmação de leitura (seriam
 *      22 de uma vez para cada agente); --pedir-ciencia pede. POP que já
 *      exista ATIVO com o mesmo código é pulado — rodar de novo não duplica.
 *
 * Usa a chave service_role do .env.import, que fica na sua máquina.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { POPS } from './pops/estrutura-2026.mjs';
import { fotografia } from '../src/lib/pops.js';

const ler = (arq, nome) => readFileSync(arq, 'utf8')
  .match(new RegExp(String.raw`^${nome}\s*=\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
const sb = createClient(ler('.env.local', 'VITE_SUPABASE_URL'), ler('.env.import', 'SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const publicar = process.argv.includes('--publicar');
const pedirCiencia = process.argv.includes('--pedir-ciencia');
const falhar = (msg) => { console.error(`\n${msg}\n`); process.exit(1); };

const { error: semColunas } = await sb.from('pop').select('prazos, tipos_tratativa, exige_ciencia').limit(1);
if (semColunas) falhar(`A migration 18 ainda não rodou (${semColunas.message}). Rode supabase/migrations/18_pops_versao_e_leitura.sql no SQL Editor.`);
const { error: semTabela } = await sb.from('pop_versao').select('id').limit(1);
if (semTabela) falhar(`A tabela pop_versao não existe (${semTabela.message}). Rode a migration 18.`);

const { data: existentes } = await sb.from('pop').select('id, codigo, titulo, ativo');
const antigos = existentes.filter((p) => p.titulo === 'Reclamações Internas - SG - IP - AC' && p.ativo === false);
const ativosPorCodigo = new Map(existentes.filter((p) => p.ativo !== false).map((p) => [p.codigo, p]));
const { data: gestor } = await sb.from('colaborador_base').select('id, nome_completo').eq('papel', 'gestor').eq('ativo', true).limit(1).maybeSingle();

const agora = new Date().toISOString();
const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

console.log(`\nPOPs no arquivo: ${POPS.length} · já no banco (ativos): ${ativosPorCodigo.size} · antigos a apagar: ${antigos.length}`);
console.log(publicar ? 'Modo: PUBLICAR' : 'Modo: só mostrar (use --publicar para gravar)');
console.log(pedirCiencia ? 'Confirmação de leitura: PEDIDA a cada agente\n' : 'Confirmação de leitura: não pedida nesta primeira versão\n');

if (publicar && antigos.length) {
  const { error } = await sb.from('pop').delete().in('id', antigos.map((p) => p.id));
  if (error) falhar(`Não consegui apagar os POPs antigos: ${error.message}`);
  console.log(`  apagados ${antigos.length} POPs antigos`);
}

let criados = 0;
for (const pop of POPS) {
  if (ativosPorCodigo.has(pop.codigo)) { console.log(`  pulei   ${pop.codigo} — já existe ativo`); continue; }
  if (!publicar) { console.log(`  criaria ${pop.codigo} — ${pop.titulo}`); continue; }
  const registro = {
    ...pop,
    versao: '1.0',
    ativo: true,
    exige_ciencia: pedirCiencia,
    vigencia: hoje,
    data_criacao: agora,
    publicado_em: agora,
    publicado_por_nome: gestor?.nome_completo ?? null,
    o_que_mudou: 'Primeira versão no Portal, a partir da Estrutura de Trabalho CRC 2026 — V2.',
  };
  const { data: novo, error } = await sb.from('pop').insert(registro).select().single();
  if (error) falhar(`Falhou em ${pop.codigo}: ${error.message}`);
  const { error: erroVersao } = await sb.from('pop_versao').insert({
    pop_id: novo.id, versao: '1.0', snapshot: fotografia(novo), o_que_mudou: registro.o_que_mudou,
    publicado_em: agora, publicado_por_id: gestor?.id ?? null, publicado_por_nome: gestor?.nome_completo ?? null,
  });
  if (erroVersao) falhar(`O POP ${pop.codigo} foi criado, mas o histórico falhou: ${erroVersao.message}`);
  criados += 1;
  console.log(`  criado  ${pop.codigo} — ${pop.titulo}`);
}
console.log(`\n${publicar ? `Publicados: ${criados}` : 'Nada foi gravado.'}\n`);
