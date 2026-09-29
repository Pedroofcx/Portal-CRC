/**
 * PORTAL CRC — APAGAR TODOS OS DADOS DA APURAÇÃO
 *
 * Uso:
 *   npm run apagar-apuracao              mostra quantos registros seriam apagados, sem apagar nada
 *   npm run apagar-apuracao -- --apagar  apaga de verdade (Apuracao + ApuracaoMapeamento)
 *
 * Pedido de Pedro (29/09/2026), depois de testar a importação repetidas
 * vezes: zera a apuração inteira — os registros de CSAT/performance/CX
 * (`apuracao`) e o de-para de colunas e vínculos de agente que o sistema
 * lembra por fonte (`apuracao_mapeamento`). A próxima importação de cada
 * fonte pede tudo de novo, do zero.
 *
 * Não mexe em mais nada: colaboradores, pontuação, ciclos etc. continuam
 * intactos — só o que veio de arquivo importado na Apuração.
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
  // Sem WHERE, o PostgREST recusa o delete -- "id not is null" pega tudo.
  const { error } = await admin.from(tabela).delete().not('id', 'is', null);
  if (error) throw error;
}

const nApuracao = await contar('apuracao');
const nMapeamento = await contar('apuracao_mapeamento');

console.log(`apuracao: ${nApuracao} registro(s)`);
console.log(`apuracao_mapeamento: ${nMapeamento} registro(s)`);

if (!APAGAR) {
  console.log('\nNada apagado (modo de conferência). Rode com --apagar para apagar de verdade.');
  process.exit(0);
}

if (nApuracao > 0) { await apagarTudo('apuracao'); console.log(`apuracao: ${nApuracao} apagado(s).`); }
if (nMapeamento > 0) { await apagarTudo('apuracao_mapeamento'); console.log(`apuracao_mapeamento: ${nMapeamento} apagado(s).`); }
console.log('\nApuração zerada.');
