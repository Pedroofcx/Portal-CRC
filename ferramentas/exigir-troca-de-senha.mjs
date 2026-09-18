/**
 * PORTAL CRC — EXIGIR TROCA DE SENHA NO PRÓXIMO ACESSO
 *
 * Uso:
 *   npm run exigir-troca-de-senha                 contas que nunca entraram
 *   npm run exigir-troca-de-senha -- email@x.com  uma conta específica
 *
 * Marca a conta para que o Portal exija uma senha nova antes de liberar o
 * sistema. Não mexe na senha em si, e ninguém vê senha nenhuma aqui.
 *
 * Sem argumento, marca só quem NUNCA entrou: é quem ainda está com a senha
 * provisória com certeza. Para uma conta que já foi usada — alguém que acha
 * que a senha vazou, por exemplo —, passe o e-mail.
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

const admin = createClient(
  ler('.env.local', 'VITE_SUPABASE_URL'),
  process.env.SUPABASE_SERVICE_ROLE_KEY || ler('.env.import', 'SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false } },
);

const alvo = process.argv[2]?.trim().toLowerCase();

const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (error) { console.error('Não consegui listar as contas:', error.message); process.exit(1); }

const contas = alvo
  ? data.users.filter(u => u.email?.toLowerCase() === alvo)
  : data.users.filter(u => !u.last_sign_in_at);

if (!contas.length) {
  console.log(alvo ? `\nNenhuma conta com o e-mail ${alvo}.\n` : '\nTodas as contas já entraram pelo menos uma vez.\n');
  process.exit(alvo ? 1 : 0);
}

console.log(`\nExigindo troca de senha no próximo acesso:\n`);
let falhas = 0;
for (const u of contas) {
  // user_metadata é mesclado com o que já existe; os outros campos ficam.
  const { error: e } = await admin.auth.admin.updateUserById(u.id, {
    user_metadata: { ...(u.user_metadata || {}), trocar_senha: true },
  });
  if (e) { falhas++; console.log(`  ❌ ${u.email}: ${e.message}`); }
  else console.log(`  ✅ ${u.email}`);
}
console.log('');
if (falhas) process.exit(1);
