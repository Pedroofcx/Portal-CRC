/**
 * PORTAL CRC — PUBLICA UMA NOVA VERSÃO DE UM POP A PARTIR DO ARQUIVO
 *
 * Uso:
 *   node ferramentas/atualizar-pop.mjs "POP 11" --mudou "o que mudou"            mostra o que faria
 *   node ferramentas/atualizar-pop.mjs "POP 11" --mudou "..." --publicar         grava (ajuste: 1.0 → 1.1)
 *   ... --nova                                                                  versão nova (1.1 → 2.0)
 *   ... --pedir-ciencia                                                         pede confirmação de leitura
 *
 * Faz o mesmo que editar o POP na tela: troca o conteúdo pelo de
 * ferramentas/pops/estrutura-2026.mjs, sobe a versão e guarda o histórico.
 * Usa a chave service_role do .env.import, que fica na sua máquina.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { POPS } from './pops/estrutura-2026.mjs';
import { fotografia, proximaVersao } from '../src/lib/pops.js';

const ler = (arq, nome) => readFileSync(arq, 'utf8')
  .match(new RegExp(String.raw`^${nome}\s*=\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
const sb = createClient(ler('.env.local', 'VITE_SUPABASE_URL'), ler('.env.import', 'SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const args = process.argv.slice(2);
const falhar = (msg) => { console.error(`\n${msg}\n`); process.exit(1); };

const codigo = args[0];
const mudou = args[args.indexOf('--mudou') + 1];
const publicar = args.includes('--publicar');
if (!codigo || !args.includes('--mudou') || !mudou || mudou.startsWith('--')) falhar('Uso: node ferramentas/atualizar-pop.mjs "POP 11" --mudou "o que mudou" [--publicar] [--nova] [--pedir-ciencia]');

const doArquivo = POPS.find((p) => p.codigo === codigo);
if (!doArquivo) falhar(`${codigo} não está em ferramentas/pops/estrutura-2026.mjs.`);

const { data: noBanco, error } = await sb.from('pop').select('*').eq('codigo', codigo).eq('ativo', true).maybeSingle();
if (error || !noBanco) falhar(`${codigo} ativo não encontrado no banco (${error?.message ?? 'nenhum'}).`);

const { data: gestor } = await sb.from('colaborador_base').select('id, nome_completo').eq('papel', 'gestor').eq('ativo', true).limit(1).maybeSingle();
const agora = new Date().toISOString();
const versao = proximaVersao(noBanco.versao, args.includes('--nova') ? 'nova' : 'ajuste');

// O banco guarda JSON com as chaves em outra ordem: compara com as chaves ordenadas.
const estavel = (v) => JSON.stringify(v ?? null, (_, x) => (x && typeof x === 'object' && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x));
const mudados = Object.keys(doArquivo).filter((c) => estavel(doArquivo[c]) !== estavel(noBanco[c]));
console.log(`\n${codigo} — ${noBanco.titulo}: ${noBanco.versao} → ${versao}`);
console.log(`Campos que mudam: ${mudados.join(', ') || 'nenhum'}`);
if (!mudados.length) falhar('Nada mudou no arquivo em relação ao banco.');
if (!publicar) { console.log('\nNada foi gravado (use --publicar).\n'); process.exit(0); }

const alteracao = {
  ...doArquivo,
  versao,
  vigencia: agora.slice(0, 10),
  o_que_mudou: mudou,
  exige_ciencia: args.includes('--pedir-ciencia'),
  publicado_em: agora,
  publicado_por_nome: gestor?.nome_completo ?? null,
};
const { data: atualizado, error: erro } = await sb.from('pop').update(alteracao).eq('id', noBanco.id).select().single();
if (erro) falhar(`Não gravou: ${erro.message}`);
const { error: erroVersao } = await sb.from('pop_versao').insert({
  pop_id: atualizado.id, versao, snapshot: fotografia(atualizado), o_que_mudou: mudou,
  publicado_em: agora, publicado_por_id: gestor?.id ?? null, publicado_por_nome: gestor?.nome_completo ?? null,
});
if (erroVersao) falhar(`O POP foi atualizado, mas o histórico falhou: ${erroVersao.message}`);
console.log(`\nPublicado: ${codigo} versão ${versao}.\n`);
