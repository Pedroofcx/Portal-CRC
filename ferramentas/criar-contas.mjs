/**
 * PORTAL CRC — CRIAR CONTAS DE LOGIN EM LOTE (Fase 06, passo 3)
 *
 * Uso:
 *   npm run criar-contas              mostra quem seria criado, sem criar nada
 *   npm run criar-contas -- --criar   cria de verdade
 *
 * Cria uma conta de login para cada colaborador ATIVO que ainda não tem uma,
 * com senha provisória aleatória e e-mail já confirmado.
 *
 *
 * POR QUE NÃO É SQL
 *
 * As contas ficam em `auth.users`, que pertence ao Supabase. Inserir ali à mão
 * exige hash de senha no formato certo, uma linha paralela em
 * `auth.identities` e campos internos preenchidos com texto vazio em vez de
 * nulo. Errar qualquer um não dá erro na criação — dá erro quando a pessoa
 * tenta entrar. A API de administração faz tudo isso por dentro.
 *
 *
 * AS SENHAS NÃO APARECEM NA TELA
 *
 * Vão para um arquivo em `senhas-provisorias/`, que o git ignora. Senha
 * impressa no terminal fica no histórico, em print de tela, em conversa
 * copiada. No arquivo, você distribui e apaga.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { randomInt } from 'node:crypto';
import path from 'node:path';

const RAIZ = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const ler = (arq, nome) => {
  const p = path.join(RAIZ, arq);
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8').match(new RegExp(`^${nome}\s*=\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
};

const CRIAR = process.argv.includes('--criar');

const URL_SB = ler('.env.local', 'VITE_SUPABASE_URL');
const CHAVE = process.env.SUPABASE_SERVICE_ROLE_KEY || ler('.env.import', 'SUPABASE_SERVICE_ROLE_KEY');
if (!URL_SB || !CHAVE) {
  console.error('Faltam VITE_SUPABASE_URL (.env.local) ou SUPABASE_SERVICE_ROLE_KEY (.env.import).');
  process.exit(1);
}

const admin = createClient(URL_SB, CHAVE, { auth: { persistSession: false } });

/*
 * Senha provisória: 14 caracteres de um alfabeto sem os que se confundem ao
 * ditar ou copiar à mão (0/O, 1/l/I). randomInt vem do gerador criptográfico —
 * Math.random seria previsível.
 */
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const gerarSenha = () => Array.from({ length: 14 }, () => ALFABETO[randomInt(ALFABETO.length)]).join('');

const norm = (e) => String(e || '').trim().toLowerCase();

const { data: contas, error: e1 } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (e1) { console.error('Não consegui listar as contas:', e1.message); process.exit(1); }

const { data: colaboradores, error: e2 } = await admin
  .from('colaborador_base').select('nome_completo, email, papel, ativo').order('papel');
if (e2) { console.error('Não consegui ler colaborador:', e2.message); process.exit(1); }

const jaTem = new Set(contas.users.map(u => norm(u.email)));

const semEmail = colaboradores.filter(c => c.ativo !== false && !norm(c.email));
const aCriar = colaboradores.filter(c => c.ativo !== false && norm(c.email) && !jaTem.has(norm(c.email)));

console.log(`\n══ CRIAR CONTAS DE LOGIN ${CRIAR ? '' : '— SIMULAÇÃO '}══\n`);

if (semEmail.length) {
  console.log('Colaboradores ativos SEM e-mail no cadastro (não dá para criar conta):');
  semEmail.forEach(c => console.log(`  ${c.nome_completo}`));
  console.log('');
}

if (!aCriar.length) {
  console.log('Nenhuma conta a criar: todo colaborador ativo já tem login.\n');
  process.exit(0);
}

console.log(`${aCriar.length} conta(s) ${CRIAR ? 'a criar' : 'seriam criadas'}:\n`);
aCriar.forEach(c => console.log(`  ${String(c.papel).padEnd(8)}${String(c.email).padEnd(40)}${c.nome_completo}`));

if (!CRIAR) {
  console.log('\nNada foi criado. Confira a lista — em especial o PAPEL de cada um, que');
  console.log('define o que a pessoa vai enxergar — e rode de novo com --criar:\n');
  console.log('  npm run criar-contas -- --criar\n');
  process.exit(0);
}

// --- criação ----------------------------------------------------------------
const criadas = [];
const falhas = [];

for (const c of aCriar) {
  const senha = gerarSenha();
  const { error } = await admin.auth.admin.createUser({
    email: norm(c.email),
    password: senha,
    // Sem isto a pessoa precisaria confirmar por e-mail — e o projeto ainda
    // não tem serviço de e-mail próprio. A conta nasceria inutilizável.
    email_confirm: true,
    // O Portal lê isto no login e exige a troca antes de liberar o sistema:
    // a senha provisória passou pela mão de outra pessoa.
    user_metadata: { trocar_senha: true },
  });
  if (error) falhas.push([c, error.message]);
  else criadas.push([c, senha]);
}

// --- as senhas vão para arquivo, não para a tela ---------------------------
if (criadas.length) {
  const pasta = path.join(RAIZ, 'senhas-provisorias');
  mkdirSync(pasta, { recursive: true });
  const quando = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const arquivo = path.join(pasta, `senhas-${quando}.txt`);

  const conteudo = [
    'PORTAL CRC — SENHAS PROVISÓRIAS',
    `Geradas em ${new Date().toLocaleString('pt-BR')}`,
    '',
    'Entregue cada senha à pessoa por um canal privado e APAGUE ESTE ARQUIVO',
    'depois. Ele não vai para o GitHub (a pasta está no .gitignore), mas',
    'continua no seu computador enquanto existir.',
    '',
    ...criadas.map(([c, s]) => `${c.nome_completo}\n  e-mail: ${norm(c.email)}\n  senha:  ${s}\n`),
  ].join('\n');

  writeFileSync(arquivo, conteudo, 'utf8');

  console.log(`\n✅ ${criadas.length} conta(s) criada(s), já confirmada(s).`);
  console.log(`\nAs senhas estão em:\n  ${arquivo}`);
  console.log('\nDistribua por canal privado e apague o arquivo depois.');
}

if (falhas.length) {
  console.log(`\n❌ ${falhas.length} falha(s):`);
  falhas.forEach(([c, msg]) => console.log(`  ${c.email}: ${msg}`));
}

console.log('\nPara conferir o resultado:  npm run conferir-contas\n');
if (falhas.length) process.exit(1);
