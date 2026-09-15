/**
 * PORTAL CRC — TESTE DA MÁQUINA DE ESTADOS (Fase 04, item 1)
 *
 * Uso:
 *   node ferramentas/testar-fsm.mjs <email-do-agente> <senha>
 *
 * Entra como agente comum, com a MESMA chave que vai no navegador, e tenta
 * pular etapas do fluxo de uma tratativa. Antes da migration 08 isso
 * funcionava: a ordem dos estados existia só na tela.
 *
 * O teste cria a própria tratativa de trabalho e a exclui no fim, para não
 * mexer em caso real.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const lerEnv = (arq, nome) => {
  const p = path.join(RAIZ, arq);
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8').match(new RegExp(`^${nome}\\s*=\\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
};

const [email, senha] = process.argv.slice(2);
if (!email || !senha) {
  console.error('Uso: node ferramentas/testar-fsm.mjs <email-do-agente> <senha>');
  process.exit(1);
}

const sb = createClient(lerEnv('.env.local', 'VITE_SUPABASE_URL'), lerEnv('.env.local', 'VITE_SUPABASE_ANON_KEY'));
const admin = createClient(
  lerEnv('.env.local', 'VITE_SUPABASE_URL'),
  process.env.SUPABASE_SERVICE_ROLE_KEY || lerEnv('.env.import', 'SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false } }
);

let passou = 0, falhou = 0;
const registrar = (nome, ok, detalhe) => {
  if (ok) { passou++; console.log(`  ✅ ${nome}`); }
  else { falhou++; console.log(`  ❌ ${nome}\n       ${detalhe}`); }
  if (ok && detalhe) console.log(`       ${detalhe}`);
};

console.log('\n══ MÁQUINA DE ESTADOS DA TRATATIVA ══\n');

const { error: erroLogin } = await sb.auth.signInWithPassword({ email, password: senha });
if (erroLogin) {
  console.error('Não consegui entrar:', erroLogin.message);
  process.exit(1);
}
console.log(`Entrou como ${email}\n`);

// --- cria a tratativa de trabalho, como administrador -----------------------
const idTeste = 'TRT-FSM-' + Date.now().toString().slice(-6);
const { data: criada, error: erroCriar } = await admin.from('tratativa_base').insert({
  id_interno: idTeste,
  link_zendesk: 'https://exemplo.zendesk.com/tickets/999',
  link_intranet: 'https://intranet.exemplo/999',
  id_base_cliente: 'CLI-FSM',
  nome_cliente: 'Cliente de Teste FSM',
  tipo_tratativa: 'reclamacao_interna',
  prioridade: 'media',
  status: 'registrada',
}).select().single();

if (erroCriar) {
  console.error('Não consegui criar a tratativa de teste:', erroCriar.message);
  process.exit(1);
}
console.log(`Tratativa de teste criada: ${idTeste} (status: registrada)\n`);

const tentar = async (novoStatus) => {
  const { error } = await sb.from('tratativa').update({ status: novoStatus }).eq('id', criada.id);
  return error;
};
const statusAtual = async () => {
  const { data } = await admin.from('tratativa_base').select('status').eq('id', criada.id).single();
  return data?.status;
};

console.log('1) Saltos que o fluxo NÃO permite:\n');

for (const [alvo, descricao] of [
  ['encerrada', 'registrada → encerrada (pula o atendimento inteiro)'],
  ['aguardando_financeiro', 'registrada → aguardando_financeiro (congela sem ter começado)'],
  ['aguardando_confirmacao_reabertura', 'registrada → aguardando confirmação (sem ter encerrado)'],
]) {
  const erro = await tentar(alvo);
  const agora = await statusAtual();
  const bloqueado = Boolean(erro) && agora === 'registrada';
  registrar(descricao, bloqueado,
    bloqueado ? 'recusado pelo banco' : `PASSOU! status agora: ${agora}`);
}

console.log('\n2) O caminho legítimo continua funcionando:\n');

for (const [alvo, descricao] of [
  ['tratativa_iniciada', 'registrada → tratativa_iniciada'],
  ['em_andamento', 'tratativa_iniciada → em_andamento'],
  ['dependencia_externa', 'em_andamento → dependencia_externa'],
  ['encerrada', 'dependencia_externa → encerrada'],
]) {
  const erro = await tentar(alvo);
  const agora = await statusAtual();
  registrar(descricao, !erro && agora === alvo,
    erro ? `BLOQUEOU o que deveria permitir: ${erro.message.slice(0, 90)}` : `agora em ${agora}`);
}

console.log('\n3) Depois de encerrada, não se volta atrás:\n');
{
  const erro = await tentar('em_andamento');
  const agora = await statusAtual();
  const bloqueado = Boolean(erro) && agora === 'encerrada';
  registrar('encerrada → em_andamento (reabrir por fora do fluxo)', bloqueado,
    bloqueado ? 'recusado pelo banco' : `PASSOU! status agora: ${agora}`);
}

// --- limpeza ---------------------------------------------------------------
await admin.from('tratativa_base').delete().eq('id', criada.id);
await sb.auth.signOut();
console.log(`\nTratativa de teste ${idTeste} removida.`);

console.log('\n══════════════════════════════════════');
console.log(`${passou} passaram, ${falhou} falharam`);
if (falhou) {
  console.log('\nA maquina de estados NAO esta protegida. Rode a migration 08.\n');
  process.exit(1);
}
console.log('\nA ordem dos estados agora e garantida pelo banco.\n');
