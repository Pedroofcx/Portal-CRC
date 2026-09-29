/**
 * PORTAL CRC — APAGAR TODOS OS DADOS DO HANSEI
 *
 * Uso:
 *   npm run apagar-hansei              mostra quantos registros seriam apagados, sem apagar nada
 *   npm run apagar-hansei -- --apagar  apaga de verdade (hansei_envio + hansei_comentario)
 *
 * Pedido de Pedro (29/09/2026): zera o Hansei inteiro -- os envios de
 * resultado e os comentários deixados neles. Não mexe em mais nada.
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

const APAGAR = process.argv.includes('--apagar');

const URL_SB = ler('.env.local', 'VITE_SUPABASE_URL');
const CHAVE = process.env.SUPABASE_SERVICE_ROLE_KEY || ler('.env.import', 'SUPABASE_SERVICE_ROLE_KEY');
if (!URL_SB || !CHAVE) {
  console.error('Faltam VITE_SUPABASE_URL (.env.local) ou SUPABASE_SERVICE_ROLE_KEY (.env.import).');
  process.exit(1);
}

const admin = createClient(URL_SB, CHAVE, { auth: { persistSession: false } });

async function contar(tabela) {
  const { count, error } = await admin.from(tabela).select('id', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

async function apagarTudo(tabela) {
  const { error } = await admin.from(tabela).delete().not('id', 'is', null);
  if (error) throw error;
}

const nComentario = await contar('hansei_comentario');
const nEnvio = await contar('hansei_envio');

console.log(`hansei_comentario: ${nComentario} registro(s)`);
console.log(`hansei_envio: ${nEnvio} registro(s)`);

if (!APAGAR) {
  console.log('\nNada apagado (modo de conferência). Rode com --apagar para apagar de verdade.');
  process.exit(0);
}

// Comentários primeiro -- se apontarem para envio_id, evita erro de chave estrangeira.
if (nComentario > 0) { await apagarTudo('hansei_comentario'); console.log(`hansei_comentario: ${nComentario} apagado(s).`); }
if (nEnvio > 0) { await apagarTudo('hansei_envio'); console.log(`hansei_envio: ${nEnvio} apagado(s).`); }
console.log('\nHansei zerado.');
