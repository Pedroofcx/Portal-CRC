/**
 * PORTAL CRC — TESTE DE FRAUDE DE PONTUAÇÃO (Fase 04, item 4)
 *
 * Uso:
 *   node ferramentas/testar-pontuacao.mjs <email-do-agente> <senha>
 *
 * Entra como agente comum e tenta inflar a própria pontuação alterando os
 * campos que geram ponto numa tratativa já encerrada. Como a pontuação define
 * premiação, este era o caminho de fraude mais direto que restava.
 *
 * Cria a própria tratativa de trabalho e a remove no fim.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const ler = (arq, nome) => {
  const p = path.join(RAIZ, arq);
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8').match(new RegExp(`^${nome}\\s*=\\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
};

const [email, senha] = process.argv.slice(2);
if (!email || !senha) {
  console.error('Uso: node ferramentas/testar-pontuacao.mjs <email-do-agente> <senha>');
  process.exit(1);
}

const URL_SB = ler('.env.local', 'VITE_SUPABASE_URL');
const sb = createClient(URL_SB, ler('.env.local', 'VITE_SUPABASE_ANON_KEY'));
const admin = createClient(URL_SB, process.env.SUPABASE_SERVICE_ROLE_KEY || ler('.env.import', 'SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

let passou = 0, falhou = 0;
const registrar = (nome, ok, detalhe) => {
  if (ok) passou++; else falhou++;
  console.log(`  ${ok ? '✅' : '❌'} ${nome}`);
  if (detalhe) console.log(`       ${detalhe}`);
};

console.log('\n══ TENTATIVA DE FRAUDE DE PONTUAÇÃO ══\n');

const { error: erroLogin } = await sb.auth.signInWithPassword({ email, password: senha });
if (erroLogin) { console.error('Não consegui entrar:', erroLogin.message); process.exit(1); }

const { data: eu } = await admin.from('colaborador_base').select('id, nome_completo').eq('email', email).maybeSingle();
if (!eu) { console.error('Colaborador não encontrado para', email); process.exit(1); }
console.log(`Entrou como ${eu.nome_completo}\n`);

// --- tratativa encerrada, no nome do próprio agente -------------------------
const idTeste = 'TRT-PONTO-' + Date.now().toString().slice(-6);
const { data: t, error: erroCriar } = await admin.from('tratativa_base').insert({
  id_interno: idTeste,
  link_zendesk: 'https://exemplo.zendesk.com/tickets/1',
  link_intranet: 'https://intranet.exemplo/1',
  id_base_cliente: 'CLI-PONTO',
  nome_cliente: 'Cliente Teste Pontuação',
  tipo_tratativa: 'reclame_aqui',
  prioridade: 'media',
  status: 'encerrada',
  agente_responsavel_id: eu.id,
  data_registro: new Date(Date.now() - 3600000).toISOString(),
  data_encerramento: new Date().toISOString(),
  encerrado_no_sla: false,
  nota_reclame_aqui: 7,
  voltaria_fazer_negocio: false,
  solucao_replicavel: false,
}).select().single();

if (erroCriar) { console.error('Não consegui criar a tratativa:', erroCriar.message); process.exit(1); }

const estado = async () => {
  const { data } = await admin.from('tratativa_base')
    .select('encerrado_no_sla, nota_reclame_aqui, voltaria_fazer_negocio, solucao_replicavel, custo_operacional_reais, tempo_total_minutos, sla_atribuido')
    .eq('id', t.id).single();
  return data;
};
const pontos = async () => {
  const { data } = await admin.rpc('pontos_do_colaborador', {
    p_colaborador_id: eu.id, p_inicio: '2000-01-01', p_fim: '2099-12-31',
  });
  return data?.[0]?.pontos ?? null;
};

const antes = await estado();
const pontosAntes = await pontos();
console.log(`Tratativa ${idTeste} criada: nota 7, fora do SLA, sem solução replicável`);
console.log(`Pontuação total do agente antes: ${pontosAntes}\n`);

console.log('1) Campos que o SERVIDOR calcula:\n');
for (const [campo, valor, descricao] of [
  ['encerrado_no_sla', true, 'marcar como "dentro do SLA"'],
  ['tempo_total_minutos', 1, 'reduzir o tempo para 1 minuto'],
  ['sla_atribuido', 999, 'esticar o prazo para 999 horas'],
  ['custo_operacional_reais', 0, 'zerar o custo operacional'],
]) {
  await sb.from('tratativa').update({ [campo]: valor }).eq('id', t.id);
  const agora = await estado();
  const mudou = String(agora[campo]) !== String(antes[campo]);
  registrar(descricao, !mudou, mudou ? `ALTEROU! ${antes[campo]} → ${agora[campo]}` : `preservado em ${antes[campo]}`);
}

console.log('\n2) Campos que geram ponto, já encerrada:\n');
for (const [campo, valor, descricao] of [
  ['nota_reclame_aqui', 10, 'subir a nota do Reclame Aqui de 7 para 10'],
  ['voltaria_fazer_negocio', true, 'marcar "voltaria a fazer negócio"'],
  ['solucao_replicavel', true, 'marcar "solução replicável"'],
]) {
  await sb.from('tratativa').update({ [campo]: valor }).eq('id', t.id);
  const agora = await estado();
  const mudou = String(agora[campo]) !== String(antes[campo]);
  registrar(descricao, !mudou, mudou ? `ALTEROU! ${antes[campo]} → ${agora[campo]}` : `preservado em ${antes[campo]}`);
}

console.log('\n3) O placar final:\n');
const pontosDepois = await pontos();
registrar('A pontuação do agente não subiu', pontosAntes === pontosDepois,
  `antes ${pontosAntes}, depois ${pontosDepois}`);

await admin.from('tratativa_base').delete().eq('id', t.id);
await sb.auth.signOut();
console.log(`\nTratativa de teste ${idTeste} removida.`);

console.log('\n══════════════════════════════════════');
console.log(`${passou} passaram, ${falhou} falharam`);
if (falhou) {
  console.log('\nA pontuacao AINDA PODE ser inflada pelo agente. Rode a migration 12.\n');
  process.exit(1);
}
console.log('\nOs campos que viram nota estao protegidos.\n');
