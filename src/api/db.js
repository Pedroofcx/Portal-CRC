/**
 * PORTAL CRC — ADAPTADOR SUPABASE
 *
 * Reproduz a interface do SDK do Base44 sobre o Postgres do Supabase.
 * É o único arquivo do sistema que sabe que o banco mudou: as 38 páginas
 * continuam chamando db.entities.Tratativa.filter(...) exatamente como antes.
 *
 * Superfície reproduzida (levantada do código real, nada a mais):
 *   entities.<Entidade>.list(sort?, limit?)
 *   entities.<Entidade>.filter(where, sort?, limit?)
 *   entities.<Entidade>.get(id)
 *   entities.<Entidade>.create(dados)
 *   entities.<Entidade>.update(id, dados)
 *   entities.<Entidade>.delete(id)
 *   entities.<Entidade>.bulkCreate([dados])
 *   auth.me() | auth.isAuthenticated() | auth.logout() | auth.redirectToLogin()
 *   integrations.Core.UploadFile({ file })
 *   integrations.Core.InvokeLLM(...)
 */

import { createClient } from '@supabase/supabase-js';
import { vazioViraNulo } from '../lib/camposVazios.js';
import { TABELAS } from './tabelas';

const URL = import.meta.env.VITE_SUPABASE_URL;
const CHAVE = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!URL || !CHAVE) {
  throw new Error(
    'Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local. ' +
    'Copie .env.local.example e preencha com os valores do painel do Supabase ' +
    '(Project Settings > API).'
  );
}

export const supabase = createClient(URL, CHAVE, {
  auth: { persistSession: true, autoRefreshToken: true },
});

/** Teto do PostgREST por requisição. Acima disso é preciso paginar. */
const PAGINA = 1000;

/**
 * Traduz o sort do Base44 ('-created_date') para o do PostgREST.
 * Prefixo '-' significa decrescente.
 */
function aplicarOrdem(consulta, sort) {
  if (!sort) return consulta;
  const desc = sort.startsWith('-');
  const campo = desc ? sort.slice(1) : sort;
  return consulta.order(campo, { ascending: !desc, nullsFirst: false });
}

/**
 * Uma condição do `where`. Igualdade, como sempre; e os dois operadores de
 * lista que o SDK do Base44 aceitava: { status: { $in: [...] } } e
 * { status: { $nin: [...] } }. Com $nin, NULL também passa — "status fora da
 * lista" inclui quem não tem status, como era no Base44.
 */
function aplicarCondicao(consulta, campo, valor) {
  if (valor === null) return consulta.is(campo, null);
  if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
    if (Array.isArray(valor.$in)) return consulta.in(campo, valor.$in);
    if (Array.isArray(valor.$nin)) {
      const lista = valor.$nin.map((v) => `"${String(v).replace(/"/g, '')}"`).join(',');
      return consulta.or(`${campo}.is.null,${campo}.not.in.(${lista})`);
    }
  }
  return consulta.eq(campo, valor);
}

/**
 * Remove chaves com valor undefined. O Base44 ignorava; o PostgREST
 * transformaria em NULL e apagaria o valor que já estava gravado.
 */
function limpar(dados) {
  const saida = {};
  for (const [k, v] of Object.entries(dados || {})) {
    if (v !== undefined) saida[k] = v;
  }
  delete saida.id;            // o id é do banco, nunca do cliente
  delete saida.criado_em;
  delete saida.atualizado_em;
  return saida;
}

function erro(acao, entidade, e) {
  const msg = e?.message || String(e);
  throw new Error(`[${entidade}.${acao}] ${msg}`);
}

function criarEntidade(entidade) {
  const tabela = TABELAS[entidade];

  /**
   * Busca paginada.
   *
   * Detalhe que importa: 85 chamadas no código usam list() SEM limite.
   * No Base44 isso trazia tudo. No PostgREST, o teto é 1000 por requisição —
   * sem paginar, uma tela mostraria dados parciais em silêncio, que é a
   * pior forma de erro possível num sistema de indicadores.
   */
  async function buscar({ where, sort, limit, acao }) {
    const linhas = [];
    let inicio = 0;

    while (true) {
      const restante = limit == null ? PAGINA : Math.min(PAGINA, limit - linhas.length);
      if (restante <= 0) break;

      let consulta = supabase.from(tabela).select('*');
      if (where) {
        for (const [campo, valor] of Object.entries(where)) {
          consulta = aplicarCondicao(consulta, campo, valor);
        }
      }
      consulta = aplicarOrdem(consulta, sort);
      consulta = consulta.range(inicio, inicio + restante - 1);

      const { data, error } = await consulta;
      if (error) erro(acao, entidade, error);

      linhas.push(...data);
      if (data.length < restante) break;   // acabaram os registros
      inicio += data.length;
    }

    return linhas;
  }

  return {
    list: (sort, limit) => buscar({ sort, limit, acao: 'list' }),

    filter: (where = {}, sort, limit) => buscar({ where, sort, limit, acao: 'filter' }),

    async get(id) {
      const { data, error } = await supabase
        .from(tabela).select('*').eq('id', id).maybeSingle();
      if (error) erro('get', entidade, error);
      return data;
    },

    async create(dados) {
      const { data, error } = await supabase
        .from(tabela).insert(limpar(vazioViraNulo(entidade, dados))).select().single();
      if (error) erro('create', entidade, error);
      return data;
    },

    async update(id, dados) {
      const { data, error } = await supabase
        .from(tabela)
        .update({ ...limpar(vazioViraNulo(entidade, dados)), updated_date: new Date().toISOString(), atualizado_em: new Date().toISOString() })
        .eq('id', id).select().single();
      if (error) erro('update', entidade, error);
      return data;
    },

    async delete(id) {
      const { error } = await supabase.from(tabela).delete().eq('id', id);
      if (error) erro('delete', entidade, error);
      return { success: true };
    },

    async bulkCreate(registros) {
      if (!registros?.length) return [];
      const criados = [];
      // Em lotes, para não estourar o limite de tamanho da requisição.
      for (let i = 0; i < registros.length; i += 500) {
        const lote = registros.slice(i, i + 500).map((r) => limpar(vazioViraNulo(entidade, r)));
        const { data, error } = await supabase.from(tabela).insert(lote).select();
        if (error) erro('bulkCreate', entidade, error);
        criados.push(...data);
      }
      return criados;
    },
  };
}

/** Cache das entidades já construídas. */
const cache = {};

export const entities = new Proxy({}, {
  get(_, entidade) {
    if (typeof entidade !== 'string') return undefined;
    if (!TABELAS[entidade]) {
      throw new Error(
        `Entidade desconhecida: "${entidade}". ` +
        `As entidades válidas estão em src/api/tabelas.js, gerado a partir de base44/entities/.`
      );
    }
    return (cache[entidade] ||= criarEntidade(entidade));
  },
});

/* ------------------------------------------------------------------ *
 * AUTENTICAÇÃO
 * ------------------------------------------------------------------ */

export const auth = {
  /**
   * Devolve o usuário no formato que o app espera: { id, email, full_name, role }.
   *
   * Sobre o `role`: no código ele aparece sempre como `papel === 'gestor' ||
   * role === 'admin'` — nunca sozinho. Então o padrão 'user' nunca tira acesso
   * de ninguém; ele só deixa de conceder a escalada extra de administrador da
   * plataforma. Quem for admin de fato precisa ser marcado explicitamente no
   * metadata do usuário, porque isso é decisão de segurança e não se adivinha.
   */
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    const meta = user.user_metadata || {};

    /*
     * O NOME VEM DO CADASTRO DE COLABORADOR.
     *
     * As contas de login não têm nome: quem cria é o `criar-contas`, e o nome
     * de verdade mora em `colaborador`. Antes disto, `full_name` caía no
     * e-mail — e ele não é só exibido: é GRAVADO como autor no histórico de
     * status, nos acionamentos de N2 e Líder Técnico, no Hansei e na exclusão
     * de tratativa. O Apoio Especializado ainda filtra por ele. Cada uso de
     * uma conta nova registraria "fulano@clickdigital.com.br" como pessoa.
     */
    const { data: cadastro } = await supabase
      .from('colaborador')
      .select('nome_completo')
      // ilike para ignorar maiúsculas; "_" e "%" escapados, porque no LIKE
      // eles são curingas e "a_b@x" casaria com "axb@x".
      .ilike('email', user.email.replace(/[%_\\]/g, (c) => `\\${c}`))
      .maybeSingle();

    return {
      id: user.id,
      email: user.email,
      full_name: cadastro?.nome_completo || meta.full_name || meta.nome_completo || user.email,
      role: user.app_metadata?.role || meta.role || 'user',
      // Marcado pelo criar-contas: a pessoa está com a senha provisória, que
      // passou pela mão de outra pessoa. O Layout exige a troca antes de seguir.
      trocar_senha: meta.trocar_senha === true,
    };
  },

  async isAuthenticated() {
    const { data: { session } } = await supabase.auth.getSession();
    return Boolean(session);
  },

  async logout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  },

  redirectToLogin() {
    window.location.href = '/login';
  },

  /** Usados pela tela de login do sistema novo. */
  async signIn(email, senha) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Troca a senha de quem está logado.
   *
   * Confere a senha ATUAL antes. O Supabase aceitaria trocar só com a sessão
   * aberta — o que quer dizer que qualquer pessoa diante de um computador
   * desbloqueado trocaria a senha de quem saiu para o café, e o dono ficaria
   * trancado para fora da própria conta.
   *
   * Limite honesto: a conferência roda no navegador. Ela barra quem usa a
   * tela, que é o caso real; alguém com a sessão aberta e conhecimento técnico
   * chamaria o Supabase direto pelo console. Mas essa mesma pessoa já leria
   * todos os dados daquela sessão — trocar a senha seria o menor dos males.
   *
   * Os erros saem com `campo`, para o formulário mostrar a mensagem junto do
   * campo certo em vez de num aviso solto (regras-ui-ux.md).
   */
  async trocarSenha(senhaAtual, novaSenha) {
    const erroNoCampo = (campo, mensagem) => Object.assign(new Error(mensagem), { campo });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Sua sessão expirou. Entre de novo para trocar a senha.');

    const { error: erroAtual } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: senhaAtual,
    });
    if (erroAtual) {
      throw erroAtual.status === 429
        ? new Error('Muitas tentativas seguidas. Espere alguns minutos e tente de novo.')
        : erroNoCampo('senha_atual', 'A senha atual não confere. Confira e digite de novo.');
    }

    const { error } = await supabase.auth.updateUser({
      password: novaSenha,
      data: { trocar_senha: false },
    });

    if (error) {
      if (error.code === 'same_password') {
        throw erroNoCampo('nova_senha', 'A nova senha precisa ser diferente da atual.');
      }
      if (error.code === 'weak_password') {
        throw erroNoCampo('nova_senha',
          'Essa senha é fácil de adivinhar. Misture letras, números e símbolos, ou use uma frase.');
      }
      throw new Error(`Não consegui trocar a senha: ${error.message}`);
    }
  },
};

/* ------------------------------------------------------------------ *
 * INTEGRAÇÕES
 * ------------------------------------------------------------------ */

const BUCKET = 'arquivos';

export const integrations = {
  Core: {
    /** Sobe o arquivo para o Storage e devolve { file_url }, como o Base44 fazia. */
    async UploadFile({ file }) {
      if (!file) throw new Error('UploadFile: nenhum arquivo recebido.');
      const ext = file.name?.split('.').pop() || 'bin';
      const caminho = `${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from(BUCKET).upload(caminho, file, { cacheControl: '3600', upsert: false });
      if (error) throw new Error(`UploadFile: ${error.message}`);

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);
      return { file_url: data.publicUrl };
    },

    /**
     * Chama o modelo pela Edge Function `invocar-llm`.
     *
     * A chave da API fica como segredo do projeto no Supabase e nunca chega ao
     * navegador — se chegasse, qualquer usuário com o Portal aberto poderia
     * lê-la e gastar na conta da empresa.
     *
     * Devolve a mesma forma que o Base44 devolvia, para as telas não mudarem:
     * objeto quando há `response_json_schema`, texto quando não há.
     */
    async InvokeLLM({ prompt, response_json_schema } = {}) {
      const { data, error } = await supabase.functions.invoke('invocar-llm', {
        body: { prompt, response_json_schema },
      });

      /*
       * Erro de Edge Function vem com a mensagem útil dentro do corpo da
       * resposta, não em error.message (que diz apenas "non-2xx status code").
       * Sem isto, "cota esgotada" chegaria ao usuário como erro genérico.
       */
      if (error) {
        let detalhe = error.message;
        try {
          const corpo = await error.context?.json();
          if (corpo?.error) detalhe = corpo.error;
        } catch { /* resposta sem JSON: fica a mensagem original */ }
        throw new Error(detalhe);
      }

      if (data?.error) throw new Error(data.error);
      return data?.resultado;
    },
  },
};

export const db = { entities, auth, integrations };
export const base44 = db;
export default db;
