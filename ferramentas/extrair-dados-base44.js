/* ============================================================
   PORTAL CRC — EXTRAÇÃO DE DADOS DO BASE44
   ------------------------------------------------------------
   ATENÇÃO — A ABA CERTA:
   Este script precisa rodar NO PORTAL, não no construtor do Base44.

   ✓ CERTO  : https://preview--portal-crc-67e1ece8.base44.app/...
   ✗ ERRADO : https://app.base44.com/...   (é o construtor)

   Olhe a barra de endereço. Se estiver escrito "app.base44.com",
   é a aba errada e o script vai avisar você antes de rodar.

   COMO USAR:
   1. Abra o PORTAL (endereço que termina em .base44.app), LOGADO.
   2. Aperte F12 e clique na aba "Console".
   3. Se aparecer um aviso pedindo para digitar algo (tipo
      "allow pasting"), digite o que ele pede e dê Enter.
   4. Cole ESTE ARQUIVO INTEIRO no console e aperte Enter.
   5. Acompanhe o relatório que vai aparecendo na tela.
   6. No fim, o navegador baixa um arquivo .json com tudo.

   O script SÓ LÊ dados. Não cria, não altera e não apaga nada.
   ============================================================ */

(async () => {
  const APP_ID = '697358fe94df04d467e1ece8';
  const ENV = 'prod';
  const PORTAL = 'https://preview--portal-crc-67e1ece8.base44.app';

  // ---- Trava de aba --------------------------------------------------------
  // O construtor (app.base44.com) recusa essas requisições com HTTP 403.
  // Elas só funcionam a partir do próprio portal.
  if (!location.hostname.endsWith('.base44.app')) {
    console.log(
      '%c  ABA ERRADA — O SCRIPT NÃO RODOU  ',
      'background:#A83226;color:#fff;font-size:15px;padding:8px 14px;border-radius:3px'
    );
    console.log(`Você está em:  ${location.origin}   ← este é o construtor`);
    console.log(`Precisa estar: ${PORTAL}   ← este é o portal`);
    console.log('');
    console.log('%cO que fazer:', 'font-weight:bold;font-size:13px');
    console.log(`1. Abra uma aba nova em  ${PORTAL}`);
    console.log('2. Faça login, se ele pedir.');
    console.log('3. Abra o console (F12) NESSA aba e cole o script de novo.');
    console.log('');
    console.log('Nenhum dado foi lido e nada foi alterado.');
    return;
  }

  const BASE = `${location.origin}/api/apps/${APP_ID}/entities`;

  // As 47 entidades do Portal CRC
  const ENTIDADES = [
    'AcionamentoLiderTecnico', 'AcionamentoN2', 'AgenteN2', 'AnotacaoPessoal',
    'Apuracao', 'Aviso', 'AvisoLeitura', 'CategoriaTratativa', 'CicloFerias',
    'CicloTrimestral', 'Colaborador', 'ConfigEstorno', 'Configuracao',
    'ConfiguracaoHomeOffice', 'Curso', 'CursoMatricula', 'DistribuicaoTratativa',
    'ElegibilidadePremio', 'Equipe', 'Escala', 'EscalaAtribuicao', 'EscalaTurno',
    'EstornoParcial', 'EtapaJornada', 'FraseMotivacional', 'HanseiComentario',
    'HanseiEnvio', 'LiderTecnico', 'LogAuditoria', 'MotivoTratativa', 'Observacao',
    'OraculoLancamento', 'OraculoPalavra', 'PDI', 'POP', 'PermissaoModulo',
    'Pesquisa', 'PlanoSetorial', 'Pontuacao', 'RespostaPesquisa', 'SaldoFerias',
    'SkillMestre', 'SolicitacaoApoio', 'SolicitacaoFerias', 'SolicitacaoHomeOffice',
    'TipoObservacao', 'TipoTratativa', 'Tratativa'
  ];

  const PAGINA = 100;        // registros por requisição
  const PAUSA_MS = 150;      // respiro entre requisições (plano gratuito)
  const MAX_PAGINAS = 500;   // trava de segurança contra laço infinito

  const pausa = (ms) => new Promise(r => setTimeout(r, ms));

  // ---- Descobre como autenticar -------------------------------------------
  // Tenta primeiro com o cookie da sessão. Se o servidor recusar,
  // procura um token guardado pelo app e tenta de novo com ele.
  function acharToken() {
    const fontes = [localStorage, sessionStorage];
    for (const s of fontes) {
      for (let i = 0; i < s.length; i++) {
        const chave = s.key(i);
        if (!/token|auth|jwt|session|base44|b44/i.test(chave)) continue;
        const bruto = s.getItem(chave);
        if (!bruto) continue;
        // valor direto
        if (/^ey[A-Za-z0-9_-]+\./.test(bruto)) return bruto;
        // valor dentro de um JSON
        try {
          const obj = JSON.parse(bruto);
          for (const c of ['access_token', 'token', 'accessToken', 'id_token', 'jwt']) {
            if (typeof obj?.[c] === 'string' && obj[c].length > 20) return obj[c];
          }
        } catch (_) { /* não era JSON */ }
      }
    }
    return null;
  }

  const TOKEN = acharToken();
  let usarToken = false;

  async function buscar(url) {
    const cabecalhos = { 'Accept': 'application/json' };
    if (usarToken && TOKEN) cabecalhos['Authorization'] = `Bearer ${TOKEN}`;
    const r = await fetch(url, { credentials: 'include', headers: cabecalhos });
    if ((r.status === 401 || r.status === 403) && TOKEN && !usarToken) {
      usarToken = true;                 // repete uma vez, agora com token
      return buscar(url);
    }
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  // ---- Extração ------------------------------------------------------------
  console.log('%c  EXTRAÇÃO PORTAL CRC — INICIANDO  ',
    'background:#0B6B63;color:#fff;font-size:14px;padding:6px 12px;border-radius:3px');
  console.log(`Origem: ${location.origin}`);
  console.log(`Autenticação inicial: cookie de sessão${TOKEN ? ' (token reserva encontrado)' : ''}`);
  console.log('');

  const dados = {};
  const relatorio = [];
  const falhas = [];

  for (const nome of ENTIDADES) {
    const registros = [];
    const idsVistos = new Set();
    let pagina = 0;
    let erro = null;
    let paginacaoIgnorada = false;

    try {
      while (pagina < MAX_PAGINAS) {
        const url = `${BASE}/${nome}?base44_data_env=${ENV}&limit=${PAGINA}&skip=${pagina * PAGINA}`;
        const resposta = await buscar(url);

        // A API pode devolver uma lista direta ou um objeto embrulhando a lista
        const lote = Array.isArray(resposta)
          ? resposta
          : (resposta?.items || resposta?.data || resposta?.results || []);

        if (!lote.length) break;

        // Se a página nova só traz registros já vistos, a API ignorou o "skip".
        const novos = lote.filter(x => {
          const id = x?.id ?? x?._id;
          if (id == null) return true;
          if (idsVistos.has(id)) return false;
          idsVistos.add(id);
          return true;
        });

        if (pagina > 0 && novos.length === 0) { paginacaoIgnorada = true; break; }

        registros.push(...novos);
        if (lote.length < PAGINA) break;   // última página
        pagina++;
        await pausa(PAUSA_MS);
      }
    } catch (e) {
      erro = e.message;
    }

    if (erro) {
      falhas.push({ entidade: nome, erro });
      console.log(`  ✗  ${nome.padEnd(26)} FALHOU — ${erro}`);
    } else {
      dados[nome] = registros;
      relatorio.push({ entidade: nome, registros: registros.length });
      const aviso = paginacaoIgnorada ? '  ⚠ paginação ignorada pela API' : '';
      console.log(`  ✓  ${nome.padEnd(26)} ${String(registros.length).padStart(6)} registros${aviso}`);
    }
    await pausa(PAUSA_MS);
  }

  // ---- Relatório -----------------------------------------------------------
  const total = relatorio.reduce((s, r) => s + r.registros, 0);
  console.log('');
  console.log('%c  RESUMO  ', 'background:#13201F;color:#fff;font-size:13px;padding:5px 10px;border-radius:3px');
  console.table(relatorio);
  console.log(`Entidades extraídas: ${relatorio.length} de ${ENTIDADES.length}`);
  console.log(`Total de registros:  ${total.toLocaleString('pt-BR')}`);
  if (falhas.length) {
    console.log('%cEntidades que falharam:', 'color:#A83226;font-weight:bold');
    console.table(falhas);
  }

  // Se TUDO falhou, o problema é de acesso — não de dados.
  if (total === 0 && falhas.length === ENTIDADES.length) {
    const so403 = falhas.every(f => f.erro.includes('403'));
    console.log('');
    console.log('%c  NENHUM REGISTRO FOI LIDO  ',
      'background:#A83226;color:#fff;font-size:14px;padding:6px 12px;border-radius:3px');
    if (so403) {
      console.log('Todas as requisições voltaram 403 (acesso negado). Causas prováveis:');
      console.log('  • Sua sessão expirou — recarregue a página, confirme que está logado e rode de novo.');
      console.log('  • Seu usuário não tem permissão de leitura via API neste plano do Base44.');
    } else {
      console.log('Erros variados. Copie a tabela acima e me mande.');
    }
    console.log('Mande o resultado para eu ajustar antes de você tentar outra vez.');
  }

  // ---- Download ------------------------------------------------------------
  const pacote = {
    extraido_em: new Date().toISOString(),
    origem: location.origin,
    app_id: APP_ID,
    data_env: ENV,
    total_registros: total,
    contagem_por_entidade: Object.fromEntries(relatorio.map(r => [r.entidade, r.registros])),
    falhas,
    dados
  };

  const blob = new Blob([JSON.stringify(pacote, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `portalcrc-dados-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);

  const mb = (blob.size / 1048576).toFixed(2);
  console.log('');
  console.log(`%c  ARQUIVO BAIXADO: ${a.download}  (${mb} MB)  `,
    'background:#2E6B38;color:#fff;font-size:14px;padding:6px 12px;border-radius:3px');
  console.log('Confira na sua pasta Downloads e me avise o tamanho e o total de registros.');

  window.__PORTALCRC_DADOS__ = pacote;   // fica disponível no console, se precisar
})();
