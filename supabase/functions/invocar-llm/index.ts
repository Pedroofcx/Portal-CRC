/**
 * PORTAL CRC — INVOCAR LLM (Fase 04, item 5)
 *
 * Edge Function que substitui o `InvokeLLM` do Base44.
 *
 *
 * POR QUE ISTO NÃO PODE RODAR NO NAVEGADOR
 *
 * Chamar o modelo direto do frontend exigiria a chave da API dentro do pacote
 * JavaScript — e tudo que chega ao navegador é legível. Qualquer pessoa com o
 * sistema aberto copiaria a chave e gastaria na conta da empresa, sem limite e
 * sem rastro. A chave fica aqui, como segredo do projeto (GEMINI_API_KEY), e
 * nunca sai do servidor.
 *
 *
 * QUEM PODE CHAMAR
 *
 * O Supabase exige JWT válido por padrão nas Edge Functions, então só entra
 * quem está logado no Portal. Além disso esta função confere que o usuário
 * existe em `colaborador` e está ativo — conta de autenticação sem colaborador
 * correspondente não consome o orçamento de IA.
 *
 *
 * O CONTRATO É O DO BASE44, DE PROPÓSITO
 *
 * Entrada:  { prompt, response_json_schema? }
 * Saída:    objeto (quando há schema) ou string (quando não há)
 *
 * As duas telas que usam isto — ResumoIAEtapa e RelatorioJornadaDiretoria —
 * continuam escritas do mesmo jeito. O adaptador (src/api/db.js) chama esta
 * função e devolve exatamente a forma que o código já esperava.
 */

/*
 * O modelo tem data de validade. Em setembro de 2026 o Google passou a recusar
 * `gemini-2.5-flash` para contas novas, apontando o substituto na própria
 * mensagem de erro. Quando isso acontecer de novo, dá para trocar sem
 * republicar a função: basta criar o segredo GEMINI_MODELO no Supabase.
 */
const MODELO = Deno.env.get('GEMINI_MODELO') ?? 'gemini-3.6-flash';
const CHAVE = Deno.env.get('GEMINI_API_KEY');

const URL_SUPABASE = Deno.env.get('SUPABASE_URL')!;
const CHAVE_ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

/** Teto de prompt. Protege o orçamento contra um envio acidental gigante. */
const LIMITE_PROMPT = 30_000;

const cabecalhosCors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const responder = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: { ...cabecalhosCors, 'Content-Type': 'application/json' },
  });

/**
 * O Gemini aceita um subconjunto do JSON Schema (o da OpenAPI): os tipos vão
 * em maiúsculas e campos desconhecidos derrubam a requisição. Esta função
 * traduz o schema que o frontend já escreve, em vez de obrigar as telas a
 * conhecerem o formato do provedor.
 */
function traduzirSchema(schema: any): any {
  if (!schema || typeof schema !== 'object') return undefined;

  const saida: Record<string, unknown> = {};

  if (typeof schema.type === 'string') saida.type = schema.type.toUpperCase();
  if (typeof schema.description === 'string') saida.description = schema.description;
  if (Array.isArray(schema.enum)) saida.enum = schema.enum;
  if (Array.isArray(schema.required)) saida.required = schema.required;
  if (schema.items) saida.items = traduzirSchema(schema.items);

  if (schema.properties && typeof schema.properties === 'object') {
    const props: Record<string, unknown> = {};
    for (const [nome, sub] of Object.entries(schema.properties)) {
      props[nome] = traduzirSchema(sub);
    }
    saida.properties = props;
  }

  return saida;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cabecalhosCors });
  if (req.method !== 'POST') return responder({ error: 'Use POST.' }, 405);

  if (!CHAVE) {
    return responder({
      error: 'A chave da IA não está configurada. Defina o segredo GEMINI_API_KEY no projeto do Supabase.',
    }, 503);
  }

  // --- quem está chamando ---------------------------------------------------
  const autorizacao = req.headers.get('Authorization') ?? '';
  if (!autorizacao.startsWith('Bearer ')) {
    return responder({ error: 'Sem credencial. Entre no Portal novamente.' }, 401);
  }

  const { createClient } = await import('jsr:@supabase/supabase-js@2');
  const sb = createClient(URL_SUPABASE, CHAVE_ANON, {
    global: { headers: { Authorization: autorizacao } },
    auth: { persistSession: false },
  });

  const { data: { user }, error: erroUsuario } = await sb.auth.getUser();
  if (erroUsuario || !user) {
    return responder({ error: 'Sessão inválida ou expirada. Entre no Portal novamente.' }, 401);
  }

  const { data: colaborador } = await sb
    .from('colaborador')
    .select('id, ativo')
    .eq('email', user.email)
    .maybeSingle();

  if (!colaborador || colaborador.ativo === false) {
    return responder({ error: 'Usuário sem colaborador ativo no Portal.' }, 403);
  }

  // --- o pedido -------------------------------------------------------------
  let corpo: any;
  try {
    corpo = await req.json();
  } catch {
    return responder({ error: 'Corpo da requisição não é JSON válido.' }, 400);
  }

  const prompt = typeof corpo?.prompt === 'string' ? corpo.prompt.trim() : '';
  if (!prompt) return responder({ error: 'Faltou o campo `prompt`.' }, 400);
  if (prompt.length > LIMITE_PROMPT) {
    return responder({
      error: `O texto enviado tem ${prompt.length} caracteres e o limite é ${LIMITE_PROMPT}. Reduza o período ou a quantidade de casos.`,
    }, 413);
  }

  const schema = traduzirSchema(corpo?.response_json_schema);

  const geracao: Record<string, unknown> = { temperature: 0.3 };
  if (schema) {
    geracao.responseMimeType = 'application/json';
    geracao.responseSchema = schema;
  }

  // --- a chamada ao modelo --------------------------------------------------
  /*
   * Sobrecarga do provedor (503) é a falha mais comum e a mais boba: passa
   * sozinha em segundos. Sem repetição, o gestor clicaria, veria erro e
   * concluiria que a IA não funciona. Três tentativas, esperando 1s e depois
   * 2s — dentro do tempo que alguém tolera olhando para um botão.
   *
   * Só repete o que adianta repetir. 429 é cota esgotada e 400 é pedido
   * malformado: repetir não muda nada, só gasta tempo.
   */
  const corpoModelo = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: geracao,
  });

  let resposta!: Response;
  let dados: any = null;

  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      resposta = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': CHAVE },
          body: corpoModelo,
        },
      );
    } catch (e) {
      if (tentativa === 3) {
        return responder({ error: `Não consegui falar com o provedor de IA: ${String(e)}` }, 502);
      }
      await new Promise((r) => setTimeout(r, tentativa * 1000));
      continue;
    }

    dados = await resposta.json().catch(() => null);

    // 5xx é problema do lado deles; 4xx é do pedido, e repetir não conserta.
    const vaiPassarSozinho = resposta.status >= 500;
    if (resposta.ok || !vaiPassarSozinho || tentativa === 3) break;

    await new Promise((r) => setTimeout(r, tentativa * 1000));
  }

  if (!resposta.ok) {
    /*
     * 429 é o caso esperado no plano gratuito. Vale uma mensagem própria:
     * "cota esgotada" é acionável, "erro 429" não é.
     */
    const detalhe = dados?.error?.message ?? `HTTP ${resposta.status}`;

    if (resposta.status === 429) {
      return responder({ error: 'A cota gratuita de IA do dia acabou. Tente de novo mais tarde.' }, 429);
    }

    /*
     * Sobrecarga é do provedor, não do Portal, e some sozinha. Dizer isso
     * evita que alguém vá caçar defeito onde não há.
     */
    if (resposta.status === 503) {
      return responder({
        error: 'O modelo de IA está sobrecarregado neste momento. Isso costuma passar em alguns minutos — tente de novo.',
        sobrecarga: true,
      }, 503);
    }

    return responder({ error: `O provedor de IA recusou o pedido: ${detalhe}` }, 502);
  }

  const texto = dados?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  if (!texto) {
    /*
     * Resposta vazia costuma ser bloqueio do filtro de segurança do provedor,
     * não falha de rede. Dizer isso poupa uma investigação inútil.
     */
    const motivo = dados?.candidates?.[0]?.finishReason ?? dados?.promptFeedback?.blockReason;
    return responder({
      error: motivo
        ? `O modelo não devolveu texto (motivo: ${motivo}).`
        : 'O modelo não devolveu texto.',
    }, 502);
  }

  // Com schema o contrato do Base44 é objeto; sem schema, é string.
  if (schema) {
    try {
      return responder({ resultado: JSON.parse(texto) });
    } catch {
      return responder({ error: 'O modelo devolveu um JSON inválido.' }, 502);
    }
  }

  return responder({ resultado: texto });
});
