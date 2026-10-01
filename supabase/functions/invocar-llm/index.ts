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
 * Isso barra quem não está logado, mas não quem está: qualquer colaborador
 * ativo, pelo console do navegador com a sessão aberta, poderia chamar isto
 * em loop com prompt arbitrário. Por isso há também um teto de chamadas por
 * colaborador por dia (LIMITE_CHAMADAS_POR_DIA), registrado em
 * `log_invocacao_llm` (migration 31) — sem guardar o prompt nem a resposta,
 * só quem chamou e quando, o necessário para contar e auditar uso.
 *
 *
 * O CONTRATO É O DO BASE44, DE PROPÓSITO
 *
 * Entrada:  { prompt, response_json_schema? }
 * Saída:    objeto (quando há schema) ou string (quando não há)
 *
 * Quatro telas chamam isto — ResumoIAEtapa, PainelLeitura (Observações),
 * Visao360 (ORÁCULO) e RelatorioJornadaDiretoria — e continuam escritas do
 * mesmo jeito. O adaptador (src/api/db.js) chama esta função e devolve
 * exatamente a forma que o código já esperava.
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

/**
 * Teto de chamadas por colaborador por dia. Protege o orçamento contra uso
 * fora das quatro telas que legitimamente chamam isto (alguém script
 * batendo na função direto, pelo console, com a sessão aberta). Generoso o
 * bastante para o uso normal de relatório/resumo, baixo o bastante para não
 * deixar ninguém sozinho estourar a cota do dia para todo mundo.
 */
const LIMITE_CHAMADAS_POR_DIA = 60;

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

  // --- limite de uso do dia ---------------------------------------------------
  const inicioDoDia = new Date();
  inicioDoDia.setUTCHours(0, 0, 0, 0);
  const { count: chamadasHoje } = await sb
    .from('log_invocacao_llm')
    .select('id', { count: 'exact', head: true })
    .eq('colaborador_id', colaborador.id)
    .gte('criado_em', inicioDoDia.toISOString());

  if ((chamadasHoje ?? 0) >= LIMITE_CHAMADAS_POR_DIA) {
    return responder({
      error: `Você já usou a IA ${LIMITE_CHAMADAS_POR_DIA} vezes hoje, o teto diário por pessoa. Volta a liberar amanhã.`,
    }, 429);
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

  // --- a chamada ao modelo --------------------------------------------------
  /*
   * Falha 5xx do provedor costuma passar sozinha em segundos. Sem repetir, o
   * gestor clicaria, veria erro e concluiria que a IA não funciona. Três
   * tentativas, esperando 1s e 2s — dentro do tempo que alguém tolera olhando
   * para um botão. Só repete o que adianta repetir: 429 é cota esgotada e 4xx
   * é pedido malformado, e insistir não muda nenhum dos dois.
   *
   * Nota sobre a temperatura: não mexemos nela. Os modelos Gemini 3 são
   * afinados para a temperatura padrão, e reduzi-la (o reflexo natural de quem
   * quer resposta consistente) degrada o resultado em vez de melhorá-lo.
   */
  async function pedirAoModelo(comSchema: boolean) {
    const geracao: Record<string, unknown> = {};
    if (comSchema && schema) {
      geracao.responseMimeType = 'application/json';
      geracao.responseSchema = schema;
    } else if (schema) {
      // Sem o schema formal, o formato é pedido no próprio texto (ver adiante).
      geracao.responseMimeType = 'application/json';
    }

    const corpoModelo = JSON.stringify({
      contents: [{
        role: 'user',
        parts: [{
          text: comSchema || !schema
            ? prompt
            : `${prompt}

Responda SOMENTE com um JSON válido neste formato, sem texto ao redor e sem marcação de código:
${JSON.stringify(corpo.response_json_schema)}`,
        }],
      }],
      generationConfig: geracao,
    });

    let resposta!: Response;
    let dados: any = null;
    let falhaRede: string | null = null;

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
        falhaRede = null;
      } catch (e) {
        falhaRede = String(e);
        if (tentativa === 3) break;
        await new Promise((r) => setTimeout(r, tentativa * 1000));
        continue;
      }

      dados = await resposta.json().catch(() => null);

      // 5xx é problema do lado deles; 4xx é do pedido, e repetir não conserta.
      if (resposta.ok || resposta.status < 500 || tentativa === 3) break;
      await new Promise((r) => setTimeout(r, tentativa * 1000));
    }

    return { resposta, dados, falhaRede };
  }

  // Registra a tentativa antes de chamar o provedor: é o que de fato pode
  // custar, então é isso que entra na conta do teto diário.
  await sb.from('log_invocacao_llm').insert({ colaborador_id: colaborador.id });

  let via = schema ? 'schema' : 'texto';
  let { resposta, dados, falhaRede } = await pedirAoModelo(true);

  /*
   * SEGUNDA VIA, QUANDO O SCHEMA FORMAL É O PROBLEMA
   *
   * Nos testes, o pedido de texto simples passava e o pedido com
   * `responseSchema` falhava com 5xx, de forma repetida. Congestionamento não
   * escolhe requisição — então o suspeito é o schema formal, não a fila.
   *
   * Aqui o formato é pedido no próprio texto do prompt, mantendo
   * `responseMimeType: application/json`. O resultado é o mesmo objeto para
   * quem chamou; o que muda é quem garante o formato — o provedor ou a
   * instrução. Menos garantido, mas funcionando é melhor que perfeito e fora
   * do ar.
   */
  if (schema && !resposta?.ok && (falhaRede || resposta.status >= 500)) {
    const alternativa = await pedirAoModelo(false);
    if (alternativa.resposta?.ok) {
      ({ resposta, dados, falhaRede } = alternativa);
      via = 'prompt';
    }
  }

  if (falhaRede) {
    return responder({ error: `Não consegui falar com o provedor de IA: ${falhaRede}` }, 502);
  }

  if (!resposta.ok) {
    const detalhe = dados?.error?.message ?? `HTTP ${resposta.status}`;

    /*
     * 429 é o caso esperado no plano gratuito. Vale uma mensagem própria:
     * "cota esgotada" é acionável, "erro 429" não é.
     */
    if (resposta.status === 429) {
      return responder({ error: 'A cota gratuita de IA do dia acabou. Tente de novo mais tarde.' }, 429);
    }

    /*
     * Sobrecarga é do provedor, não do Portal, e some sozinha. Dizer isso
     * evita que alguém vá caçar defeito onde não há. O detalhe do provedor vai
     * junto: se não for sobrecarga de verdade, é por ele que se descobre.
     */
    if (resposta.status >= 500) {
      return responder({
        error: `O modelo de IA não conseguiu responder agora (${detalhe}). Costuma passar em alguns minutos — tente de novo.`,
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
    // Pela segunda via o modelo às vezes embrulha o JSON em ```json ... ```.
    const limpo = texto.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
    try {
      return responder({ resultado: JSON.parse(limpo), via });
    } catch {
      return responder({ error: 'O modelo devolveu um JSON inválido.' }, 502);
    }
  }

  return responder({ resultado: texto, via });
});
