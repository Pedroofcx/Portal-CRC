/**
 * PRÉVIA DO SISTEMA INTEIRO — todas as telas, com o layout de verdade e os
 * dados de verdade, sem login e SEM GRAVAR NADA NO BANCO.
 *   1. npm run previa-sistema
 *   2. npm run dev
 *   3. abrir http://localhost:5173/previas/sistema.html            (tela inicial)
 *      ou  http://localhost:5173/previas/sistema.html?p=Tratativas  (outra tela)
 *
 * Como: o `db` do app é trocado, aqui, por um banco em memória montado com a
 * cópia de previas/dados-sistema.json (que o git ignora — tem nome de
 * cliente). Criar, alterar e apagar mexem só nessa memória: recarregar a
 * página volta tudo ao original. Serve para conferir telas e medir layout
 * (tabelas que estouram, janelas altas) em todas as páginas de uma vez.
 *
 * Esta página não entra no site publicado — o build só monta o index.html.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import db from '@/api/db';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import copia from './dados-sistema.json';

// ------------------------------------------------------ banco em memória
const memoria = structuredClone(copia.dados);

// ?pops=novos: os POPs da Estrutura de Trabalho 2026 (ferramentas/pops),
// como se o importador já tivesse rodado — para testar antes da migration 18.
if (new URLSearchParams(window.location.search).get('pops') === 'novos') {
  const { POPS } = await import('../ferramentas/pops/estrutura-2026.mjs');
  const agora = new Date().toISOString();
  memoria.POP = POPS.map((pop, i) => ({
    ...pop, id: `pop-${i}`, versao: '1.0', ativo: true, exige_ciencia: true, created_date: agora,
    publicado_em: agora, publicado_por_nome: 'Pedro Henrique Soares', vigencia: agora.slice(0, 10),
    o_que_mudou: 'Primeira versão no Portal.',
  }));
  memoria.PopVersao = memoria.POP.map((pop) => ({ id: `v-${pop.id}`, pop_id: pop.id, versao: '1.0', publicado_em: agora, publicado_por_nome: 'Pedro Henrique Soares', o_que_mudou: pop.o_que_mudou }));
  memoria.PopLeitura = [];
}

const casa = (valor, condicao) => {
  if (condicao === null) return valor === null || valor === undefined;
  if (condicao && typeof condicao === 'object' && !Array.isArray(condicao)) {
    if (Array.isArray(condicao.$in)) return condicao.$in.includes(valor);
    if (Array.isArray(condicao.$nin)) return valor == null || !condicao.$nin.includes(valor);
  }
  return valor === condicao;
};

const ordenar = (lista, sort) => {
  if (!sort) return lista;
  const desc = sort.startsWith('-');
  const campo = desc ? sort.slice(1) : sort;
  return [...lista].sort((a, b) => {
    const x = a[campo];
    const y = b[campo];
    if (x == null && y == null) return 0;
    if (x == null) return 1; // nullsFirst: false, como no db.js
    if (y == null) return -1;
    const r = x < y ? -1 : x > y ? 1 : 0;
    return desc ? -r : r;
  });
};

const agoraIso = () => new Date().toISOString();
const novoId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));

const falsa = (entidade) => {
  const tabela = () => (memoria[entidade] ||= []);
  const buscar = async (where = {}, sort, limit) => {
    const filtradas = tabela().filter((r) => Object.entries(where || {}).every(([c, v]) => casa(r[c], v)));
    const ordenadas = ordenar(filtradas, sort);
    return structuredClone(limit == null ? ordenadas : ordenadas.slice(0, limit));
  };
  return {
    list: (sort, limit) => buscar({}, sort, limit),
    filter: (where, sort, limit) => buscar(where, sort, limit),
    get: async (id) => structuredClone(tabela().find((r) => r.id === id) ?? null),
    async create(dados) {
      const r = { id: novoId(), created_date: agoraIso(), updated_date: agoraIso(), ...dados };
      tabela().push(r);
      return structuredClone(r);
    },
    async update(id, dados) {
      const r = tabela().find((x) => x.id === id);
      if (r) Object.assign(r, dados, { updated_date: agoraIso() });
      return structuredClone(r ?? null);
    },
    async delete(id) {
      memoria[entidade] = tabela().filter((r) => r.id !== id);
      return { success: true };
    },
    async bulkCreate(registros = []) {
      return Promise.all(registros.map((d) => this.create(d)));
    },
  };
};

const cacheFalso = {};
// window.__db: o banco em memória, para montar cenários de teste pelo console.
window.__db = db;
db.entities = new Proxy({}, { get: (_, e) => (typeof e === 'string' ? (cacheFalso[e] ||= falsa(e)) : undefined) });

// ?como=email entra como outra pessoa (só aqui, no banco em memória).
const comoEmail = new URLSearchParams(window.location.search).get('como');
const gestor = copia.dados.Colaborador.find((c) => c.email === (comoEmail || copia.gestorEmail));
db.auth.me = async () => ({ id: gestor?.id, email: gestor?.email, full_name: gestor?.nome_completo, role: 'user', trocar_senha: false });
db.auth.logout = async () => {};
db.integrations.Core.InvokeLLM = async () => { throw new Error('A IA não roda na prévia.'); };

// A sequência de boas-vindas aparece uma vez a cada 24h: na prévia, pula.
try { localStorage.setItem('welcome_last_shown', String(Date.now())); } catch { /* sem armazenamento */ }

// --------------------------------------------------------------- telas
// Importadas DEPOIS da troca do db (import dinâmico), por garantia.
const { pagesConfig } = await import('@/pages.config');
const { Pages, Layout, mainPage } = pagesConfig;

// window.__ir('Tratativas'): troca de tela como um clique no menu.
function Navegador() {
  const ir = useNavigate();
  window.__ir = (nome) => { window.__telaAtual = nome; ir(`/${nome}`); };
  window.__paginas = Object.keys(Pages);
  return null;
}

// ------------------------------------------------ erros e avisos do console
// window.__erros: tudo o que sai como console.error/warn ou erro não tratado,
// com a tela em que aconteceu. Base da caça a bugs em execução.
window.__erros = [];
window.__telaAtual = '?';
for (const nivel of ['error', 'warn']) {
  const original = console[nivel].bind(console);
  console[nivel] = (...args) => {
    const msg = args.map((a) => (a instanceof Error ? `${a.message}` : typeof a === 'string' ? a : (() => { try { return JSON.stringify(a).slice(0, 200); } catch { return String(a); } })())).join(' ');
    window.__erros.push({ nivel, tela: window.__telaAtual, msg: msg.slice(0, 400) });
    original(...args);
  };
}
window.addEventListener('error', (e) => window.__erros.push({ nivel: 'uncaught', tela: window.__telaAtual, msg: `${e.message}` }));
window.addEventListener('unhandledrejection', (e) => window.__erros.push({ nivel: 'promise', tela: window.__telaAtual, msg: `${e.reason?.message ?? e.reason}` }));

// ---------------------------------------------------- auditoria de layout
// window.__auditar(['Tratativas', ...]) abre cada tela (e cada aba dela) e
// devolve o que fere as regras da seção 9: tabela que rola para o lado,
// card com rolagem por dentro, página inteira mais larga que a janela, tela
// que quebrou. `culpados` aponta o elemento que empurra a largura.
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const texto = (e, n) => (e?.innerText || '').replace(/\s+/g, ' ').slice(0, n);

function medir(onde) {
  const main = document.querySelector('main');
  if (!main) return [];
  const achados = [];
  for (const e of main.querySelectorAll('*')) {
    const cs = getComputedStyle(e);
    if (e.clientWidth > 0 && /(auto|scroll)/.test(cs.overflowX) && e.scrollWidth > e.clientWidth + 2) {
      achados.push({ tipo: 'rola para o lado', onde, px: e.scrollWidth - e.clientWidth, o_que: texto(e.querySelector('tr') || e, 70) });
    }
    if (e.clientHeight > 0 && /(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 2) {
      achados.push({ tipo: 'rolagem por dentro', onde, o_que: texto(e, 60) });
    }
  }
  if (/Algo deu errado/.test(main.innerText)) achados.push({ tipo: 'QUEBROU', onde });
  // Texto que denuncia conta ou dado errado aparecendo para a pessoa.
  const SUSPEITO = /\b(NaN|Infinity|undefined|null|Invalid Date)\b|\[object Object\]/;
  for (const no of main.querySelectorAll('*')) {
    if (no.children.length) continue;
    const t = (no.innerText || '').trim();
    if (t && SUSPEITO.test(t)) achados.push({ tipo: 'texto suspeito', onde, o_que: `${t.slice(0, 60)} ← ${texto(no.parentElement?.parentElement, 70)}` });
  }
  const W = document.documentElement.clientWidth;
  if (document.documentElement.scrollWidth > W) {
    const culpados = [...main.querySelectorAll('*')]
      .filter((e) => e.getBoundingClientRect().right > W + 1 && ![...e.children].some((c) => c.getBoundingClientRect().right > W + 1))
      .slice(0, 3).map((e) => `${e.tagName.toLowerCase()} "${texto(e, 40)}"`);
    achados.push({ tipo: 'página mais larga que a janela', onde, px: document.documentElement.scrollWidth - W, culpados });
  }
  return achados;
}

window.__auditar = async (paginas = Object.keys(Pages), { pausa = 1500 } = {}) => {
  const resultado = {};
  for (const p of paginas) {
    window.__ir(p);
    await espera(pausa);
    let achados = medir('início');
    for (const aba of [...document.querySelectorAll('main [role=tab]')].slice(0, 8)) {
      aba.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      aba.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      window.__telaAtual = `${p} › ${aba.innerText.trim().slice(0, 25)}`;
      aba.click();
      await espera(450);
      achados = achados.concat(medir(`aba ${aba.innerText.trim().slice(0, 25)}`));
    }
    if (achados.length) resultado[p] = achados;
  }
  return resultado;
};

// window.__abrir('Avisos', 'Novo Aviso'): abre a tela, clica no botão e mede a
// janela que abriu — altura, largura, se os botões de ação ficaram à vista e
// se há rolagem dentro de rolagem.
window.__abrir = async (pagina, textoBotao, { pausa = 1500 } = {}) => {
  window.__ir(pagina);
  await espera(pausa);
  const botao = [...document.querySelectorAll('main button, main a')].find((b) => b.innerText.trim().includes(textoBotao));
  if (!botao) return { pagina, erro: `botão "${textoBotao}" não encontrado` };
  botao.click();
  await espera(700);
  const d = document.querySelector('[role=dialog]');
  if (!d) return { pagina, erro: 'nenhuma janela abriu' };
  const r = d.getBoundingClientRect();
  const acoes = [...d.querySelectorAll('button')]
    .filter((b) => /salvar|criar|registrar|enviar|publicar|confirmar|lançar|adicionar|atribuir|solicitar|cancelar/i.test(b.innerText))
    .map((b) => { const q = b.getBoundingClientRect(); return `${b.innerText.trim().slice(0, 18)}${q.bottom <= innerHeight && q.top >= 0 ? '' : ' (FORA DA TELA)'}`; });
  const rolagens = [...d.querySelectorAll('*')].filter((e) => {
    const cs = getComputedStyle(e);
    return /(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 2;
  }).length;
  return {
    pagina,
    titulo: texto(d.querySelector('h2'), 50),
    tipo: r.height >= innerHeight - 1 && r.right >= innerWidth - 1 ? 'painel lateral' : 'janela',
    altura: Math.round(r.height),
    largura: Math.round(r.width),
    acoes,
    rolagens,
    quebrou: /Algo deu errado/.test(document.body.innerText),
  };
};

// O mesmo QueryClient do app (com o aviso central de gravação que falha).
const { queryClientInstance: qc } = await import('@/lib/query-client');
window.__qc = qc;
const inicial = new URLSearchParams(window.location.search).get('p') || mainPage;

function App() {
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/${inicial}`]}>
        <Navegador />
        <Routes>
          {Object.entries(Pages).map(([nome, Pagina]) => (
            <Route key={nome} path={`/${nome}`} element={<Layout currentPageName={nome}><Pagina /></Layout>} />
          ))}
          <Route path="*" element={<Layout currentPageName={mainPage}><p>Tela fora da prévia.</p></Layout>} />
        </Routes>
        <Toaster />
        <Sonner position="bottom-right" richColors closeButton />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById('raiz')).render(<App />);
