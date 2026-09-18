/**
 * PORTAL CRC — TESTE DA EDGE FUNCTION DE IA (Fase 04, item 5)
 *
 * Uso:
 *   node ferramentas/testar-ia.mjs <email> <senha>
 *
 * Confere as quatro coisas que precisam ser verdade ao mesmo tempo:
 * a função responde, respeita o formato pedido, recusa quem não está logado
 * (é o que impede terceiros de gastarem a chave) e recusa texto gigante.
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

const [email, senha] = process.argv.slice(2);
if (!email || !senha) {
  console.error('Uso: node ferramentas/testar-ia.mjs <email> <senha>');
  process.exit(1);
}

const URL_SB = ler('.env.local', 'VITE_SUPABASE_URL');
const ANON = ler('.env.local', 'VITE_SUPABASE_ANON_KEY');
const sb = createClient(URL_SB, ANON, { auth: { persistSession: false } });

let passou = 0, falhou = 0;
const registrar = (nome, ok, detalhe) => {
  if (ok) passou++; else falhou++;
  console.log(`  ${ok ? '✅' : '❌'} ${nome}`);
  if (detalhe) console.log(`       ${detalhe}`);
};

/** Chama a função e devolve { ok, corpo } com a mensagem de erro já extraída. */
async function chamar(corpo, token) {
  const resposta = await fetch(`${URL_SB}/functions/v1/invocar-llm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(corpo),
  });
  const dados = await resposta.json().catch(() => null);
  return { status: resposta.status, dados };
}

console.log('\n══ EDGE FUNCTION invocar-llm ══\n');

// --- 1) sem estar logado ----------------------------------------------------
console.log('1) Quem não está logado:\n');
const semLogin = await chamar({ prompt: 'oi' });
registrar(
  'a chamada é recusada',
  semLogin.status === 401 || semLogin.status === 403,
  `HTTP ${semLogin.status} — ${semLogin.dados?.error ?? semLogin.dados?.message ?? semLogin.dados?.msg ?? 'sem mensagem'}`,
);

// --- login ------------------------------------------------------------------
const { data: sessao, error: erroLogin } = await sb.auth.signInWithPassword({ email, password: senha });
if (erroLogin) { console.error('\nNão consegui entrar:', erroLogin.message); process.exit(1); }
const token = sessao.session.access_token;
console.log(`\nEntrou como ${email}\n`);

// --- 2) texto simples -------------------------------------------------------
console.log('2) Pedido de texto simples:\n');
const texto = await chamar({
  prompt: 'Responda apenas com a palavra FUNCIONANDO, sem pontuação e sem mais nada.',
}, token);

if (texto.status === 503) {
  console.log('       A função respondeu, mas o segredo GEMINI_API_KEY não está configurado.');
  console.log('       Veja documentacao/publicar-a-ia.md, passo 2.\n');
}

registrar(
  'voltou texto do modelo',
  texto.status === 200 && typeof texto.dados?.resultado === 'string' && texto.dados.resultado.length > 0,
  texto.status === 200
    ? `resposta: ${String(texto.dados?.resultado).trim().slice(0, 60)}`
    : `HTTP ${texto.status} — ${texto.dados?.error ?? 'sem mensagem'}`,
);

// --- 3) resposta com formato definido ---------------------------------------
console.log('\n3) Pedido com formato definido (o que o ResumoIAEtapa usa):\n');
const estruturado = await chamar({
  prompt: 'Dois clientes reclamaram de atraso na entrega. Resuma e proponha 3 ações.',
  response_json_schema: {
    type: 'object',
    properties: {
      resumo: { type: 'string' },
      plano_de_acao: { type: 'array', items: { type: 'string' } },
    },
    required: ['resumo', 'plano_de_acao'],
  },
}, token);

const r = estruturado.dados?.resultado;
registrar(
  'voltou objeto com resumo e plano_de_acao',
  estruturado.status === 200 && typeof r?.resumo === 'string' && Array.isArray(r?.plano_de_acao),
  estruturado.status === 200
    ? `${r?.plano_de_acao?.length ?? 0} ação(ões), resumo de ${String(r?.resumo ?? '').length} caracteres`
    : `HTTP ${estruturado.status} — ${estruturado.dados?.error ?? 'sem mensagem'}`,
);

// --- 4) texto acima do limite -----------------------------------------------
console.log('\n4) Texto acima do limite:\n');
const gigante = await chamar({ prompt: 'a'.repeat(40000) }, token);
registrar(
  'a chamada é recusada antes de chegar ao modelo',
  gigante.status === 413,
  `HTTP ${gigante.status} — ${gigante.dados?.error ?? 'sem mensagem'}`,
);

await sb.auth.signOut();

console.log('\n══════════════════════════════════════');
console.log(`${passou} passaram, ${falhou} falharam`);
if (falhou) {
  console.log('\nA IA ainda não está pronta. Veja documentacao/publicar-a-ia.md.\n');
  process.exit(1);
}
console.log('\nA IA roda no servidor, e a chave nunca sai de lá.\n');
