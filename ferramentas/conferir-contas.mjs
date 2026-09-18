/**
 * PORTAL CRC — CONFERIR CONTAS DE LOGIN (Fase 06, passo 3)
 *
 * Uso:
 *   npm run conferir-contas
 *
 * Cruza as contas de login (auth) com o cadastro em colaborador e diz o que
 * falta. Não altera nada: só lê e compara.
 *
 * Desde a migration 13 as duas coisas precisam existir e combinar. Quem tem
 * conta mas não tem cadastro ativo entra e não enxerga nada — e a queixa que
 * chega não é "não tenho permissão", é "o sistema está vazio", que manda
 * procurar defeito no lugar errado. Este script transforma isso numa lista.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const ler = (arq, nome) => {
  const p = path.join(RAIZ, arq);
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8').match(new RegExp(`^${nome}\s*=\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
};

const URL_SB = ler('.env.local', 'VITE_SUPABASE_URL');
const CHAVE = process.env.SUPABASE_SERVICE_ROLE_KEY || ler('.env.import', 'SUPABASE_SERVICE_ROLE_KEY');

if (!URL_SB || !CHAVE) {
  console.error('Faltam VITE_SUPABASE_URL (.env.local) ou SUPABASE_SERVICE_ROLE_KEY (.env.import).');
  process.exit(1);
}

const admin = createClient(URL_SB, CHAVE, { auth: { persistSession: false } });

const { data: contas, error: erroContas } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (erroContas) { console.error('Não consegui listar as contas:', erroContas.message); process.exit(1); }

const { data: colaboradores, error: erroCol } = await admin
  .from('colaborador_base')
  .select('nome_completo, email, papel, ativo')
  .order('papel');
if (erroCol) { console.error('Não consegui ler colaborador:', erroCol.message); process.exit(1); }

const norm = (e) => String(e || '').trim().toLowerCase();
const porEmail = new Map(contas.users.map(u => [norm(u.email), u]));
const cadastrados = new Set(colaboradores.map(c => norm(c.email)));

const ativos = colaboradores.filter(c => c.ativo !== false);
const inativos = colaboradores.filter(c => c.ativo === false);

console.log('\n══ CONTAS DE LOGIN × CADASTRO ══\n');

// --- quem está pronto para usar ---------------------------------------------
const prontos = [], semConta = [], naoConfirmados = [];
for (const c of ativos) {
  const u = porEmail.get(norm(c.email));
  if (!u) semConta.push(c);
  else if (!u.email_confirmed_at) naoConfirmados.push(c);
  else prontos.push(c);
}

console.log(`Colaboradores ativos: ${ativos.length}   |   Contas de login: ${contas.users.length}\n`);

const linha = (c, extra = '') =>
  `  ${String(c.papel).padEnd(8)}${String(c.email).padEnd(38)}${c.nome_completo}${extra}`;

console.log(`PRONTOS PARA ENTRAR (${prontos.length})`);
prontos.forEach(c => console.log(linha(c)));

if (naoConfirmados.length) {
  console.log(`\nCONTA CRIADA MAS E-MAIL NÃO CONFIRMADO (${naoConfirmados.length})`);
  console.log('  Estas pessoas não conseguem entrar. No painel, em Authentication > Users,');
  console.log('  abra cada uma e confirme, ou recrie marcando "Auto Confirm User".');
  naoConfirmados.forEach(c => console.log(linha(c)));
}

if (semConta.length) {
  console.log(`\nFALTA CRIAR A CONTA DE LOGIN (${semConta.length})`);
  console.log('  Painel > Authentication > Users > Add user > Create new user,');
  console.log('  com o MESMO e-mail abaixo e "Auto Confirm User" marcado.');
  semConta.forEach(c => console.log(linha(c)));
}

// --- contas que não levam a lugar nenhum -------------------------------------
const orfas = contas.users.filter(u => {
  const c = colaboradores.find(x => norm(x.email) === norm(u.email));
  return !c || c.ativo === false;
});

if (orfas.length) {
  console.log(`\nCONTAS SEM CADASTRO ATIVO (${orfas.length})`);
  console.log('  Estas contas entram mas não enxergam NADA. Ou falta cadastrar a pessoa');
  console.log('  em colaborador, ou a conta deve ser apagada em Authentication > Users.');
  orfas.forEach(u => {
    const c = colaboradores.find(x => norm(x.email) === norm(u.email));
    console.log(`  ${String(u.email).padEnd(46)}${c ? 'cadastro INATIVO' : 'sem cadastro'}`);
  });
}

if (inativos.length) {
  console.log(`\nCADASTROS INATIVOS, SEM ACESSO POR DEFINIÇÃO (${inativos.length})`);
  inativos.forEach(c => console.log(linha(c, porEmail.has(norm(c.email)) ? '  [tem conta de login]' : '')));
}

// --- e-mails parecidos, que são a armadilha silenciosa -----------------------
/*
 * O vínculo é o e-mail, comparado em minúsculas. Um espaço sobrando ou uma
 * letra trocada faz a pessoa entrar e não ver nada, sem mensagem de erro.
 */
const suspeitos = contas.users.filter(u => !cadastrados.has(norm(u.email)))
  .map(u => {
    const quase = colaboradores.find(c => norm(c.email).split('@')[0] === norm(u.email).split('@')[0]);
    return quase ? [u.email, quase.email] : null;
  })
  .filter(Boolean);

if (suspeitos.length) {
  console.log('\nE-MAILS QUASE IGUAIS — provável erro de digitação');
  suspeitos.forEach(([conta, cadastro]) => console.log(`  conta "${conta}"  ×  cadastro "${cadastro}"`));
}

console.log('\n══════════════════════════════════════');
if (semConta.length === 0 && naoConfirmados.length === 0 && orfas.length === 0) {
  console.log('Todo colaborador ativo tem conta, e toda conta leva a um cadastro ativo.\n');
} else {
  console.log(`Pendências: ${semConta.length} sem conta, ${naoConfirmados.length} não confirmada(s), ${orfas.length} órfã(s).\n`);
}
