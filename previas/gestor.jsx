/**
 * PRÉVIA da tela inicial do gestor e da página detalhada de cada pessoa, com
 * dados reais, sem login e sem publicar.
 *   1. npm run previa-gestor
 *   2. npm run dev
 *   3. abrir http://localhost:5173/previas/gestor.html
 *      (ou .../gestor.html?id=<id do agente> para abrir direto numa pessoa)
 *
 * Os dados ficam em previas/dados-gestor.json, que o git ignora: é cópia do
 * banco, com nome de cliente. Esta página não entra no site publicado — o
 * build só monta o index.html.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { MemoryRouter, Routes, Route, useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import dados from './dados-gestor.json';
import FaixaVencidas from '@/components/dashboard/gestor/FaixaVencidas';
import PainelCicloGestor from '@/components/dashboard/gestor/PainelCicloGestor';
import CicloColaborador from '@/pages/CicloColaborador';
import Dashboard from '@/pages/Dashboard';
import { pagesConfig } from '@/pages.config';
import { useCicloEquipe } from '@/hooks/useCicloEquipe';
import { STATUS_FECHADOS } from '@/lib/cicloEquipe';

const gestor = dados.colaboradores.find((c) => c.email === dados.gestorEmail);

// Mesmas chaves que os componentes consultam, já preenchidas: nada vai ao servidor.
const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
// ?lento=1: os dados chegam um a um, em ordem aleatória, como no sistema de
// verdade — para achar erro que só aparece enquanto parte ainda carrega.
if (new URLSearchParams(window.location.search).get('lento')) {
  const original = qc.setQueryData.bind(qc);
  qc.setQueryData = (chave, valor) => setTimeout(() => original(chave, valor), 300 + Math.random() * 3000);
}
qc.setQueryData(['currentUser'], { email: gestor?.email, full_name: gestor?.nome_completo });
qc.setQueryData(['colaboradores'], dados.colaboradores);
qc.setQueryData(['ciclos-trimestrais'], dados.ciclos);
qc.setQueryData(['bonus-manual'], dados.pontuacoes.filter((p) => p.tipo === 'bonus_manual'));
qc.setQueryData(['tratativas-encerradas-ranking'], dados.tratativas);
qc.setQueryData(['tratativas-abertas-equipe'], dados.tratativas.filter((t) => !STATUS_FECHADOS.includes(t.status)));
qc.setQueryData(['tratativas-registros'], dados.tratativas);
qc.setQueryData(['apuracoes-equipe'], dados.apuracoes);
qc.setQueryData(['elegibilidades'], dados.elegibilidades);
qc.setQueryData(['observacoes'], dados.observacoes);
// Tela inicial inteira: as mesmas chaves, ordens e filtros do Dashboard.
const ordenar = (lista, campo) => [...(lista || [])].sort((x, y) => String(y[campo] ?? '').localeCompare(String(x[campo] ?? '')));
qc.setQueryData(['tratativas'], ordenar(dados.tratativas, 'created_date').slice(0, 500));
qc.setQueryData(['avisos-todos'], ordenar(dados.avisos.filter((a) => a.ativo), 'data_publicacao').slice(0, 20));
qc.setQueryData(['avisoLeituras'], ordenar(dados.leituras, 'created_date').slice(0, 1000));
qc.setQueryData(['pesquisas-ativas'], dados.pesquisas.filter((p) => p.ativa));
qc.setQueryData(['respostas-pesquisa'], dados.respostas);
qc.setQueryData(['hansei-envios'], ordenar(dados.hanseis, 'data_envio').slice(0, 10));
qc.setQueryData(['ciclos-ferias-dashboard'], ordenar(dados.ciclosFerias, 'created_date').slice(0, 50));
qc.setQueryData(['solicitacoes-apoio-dashboard'], ordenar(dados.solicitacoesApoio, 'created_date').slice(0, 500));
qc.setQueryData(['configuracoes'], dados.configuracoes);
qc.setQueryData(['frases-motivacionais'], dados.frases.filter((f) => f.ativa));
qc.setQueryData(['rodizio-lider-dashboard'], dados.lideres);
qc.setQueryData(['rodizio-n2-dashboard'], dados.agentesN2);
qc.setQueryData(['acionamentos-lider-dashboard'], ordenar(dados.acionamentosLider, 'data_acionamento').slice(0, 10));
qc.setQueryData(['acionamentos-n2-dashboard'], ordenar(dados.acionamentosN2, 'data_acionamento').slice(0, 10));
qc.setQueryData(['distribuicoes-tratativas'], ordenar(dados.distribuicoes, 'created_date').slice(0, 500));

for (const c of dados.colaboradores) {
  qc.setQueryData(['pdis-colaborador', c.id], dados.pdis.filter((p) => p.colaborador_id === c.id));
  qc.setQueryData(['hansei-colaborador', c.id], dados.hanseis.filter((h) => h.colaborador_id === c.id));
  qc.setQueryData(['ciclos-ferias-colaborador', c.id], dados.ciclosFerias.filter((f) => f.colaborador_id === c.id));
}

function Inicio() {
  const [parametros, setParametros] = useSearchParams();
  const e = useCicloEquipe(parametros.get('ciclo'));
  window.__previa = { retrato: { abertas: e.retrato.abertas, vencidas: e.retrato.vencidas, venceHoje: e.retrato.venceHoje },
    agentes: e.agentes.map((a) => ({ nome: a.nome, pontos: a.totalPontos, vencidas: a.vencidas, pendencias: a.pendencias })) };
  return (
    <div className="space-y-6">
      <FaixaVencidas retrato={e.retrato} isLoading={e.isLoading} />
      <PainelCicloGestor ciclo={e.ciclo} cicloAtivo={e.cicloAtivo} ciclos={e.ciclos}
        aoEscolherCiclo={(id) => setParametros(id === e.cicloAtivo?.id ? {} : { ciclo: id })}
        agentes={e.agentes} exigencias={e.exigencias} equipe={e.equipe} agora={e.agora}
        isLoading={e.isLoading} gestor={gestor} />
    </div>
  );
}

// window.__ir('/Pagina/ComoFunciona'): troca de página como um clique no menu,
// para achar erro que só acontece NA TROCA (a tela anterior desmontando).
function Navegador() {
  window.__ir = useNavigate();
  return null;
}

function PaginaPorNome() {
  const { pathname } = useLocation();
  const P = pagesConfig.Pages[pathname.split('/')[2]];
  return P ? <P /> : null;
}

function ForaDaPrevia() {
  const { pathname, search } = useLocation();
  return <p className="text-sm text-muted-foreground">Na tela de verdade, este link abre {pathname}{search}.</p>;
}

const id = new URLSearchParams(window.location.search).get('id');
const inteira = new URLSearchParams(window.location.search).get('tela') === 'inteira';
// ?pagina=Nome abre qualquer página do sistema, como o gestor, para conferir sem login.
const pagina = new URLSearchParams(window.location.search).get('pagina');
const Pagina = pagina ? pagesConfig.Pages[pagina] : null;

function App() {
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[Pagina ? '/Pagina' : inteira ? '/Inteira' : id ? `/CicloColaborador${window.location.search}` : '/Dashboard']}>
        <Navegador />
        <div className="min-h-screen bg-background p-4 sm:p-8">
          <Routes>
            <Route path="/Dashboard" element={<Inicio />} />
            <Route path="/CicloColaborador" element={<CicloColaborador />} />
            {/* A tela inicial INTEIRA, como no sistema (?tela=inteira) — o que não foi
                copiado para a prévia vem vazio, porque o visitante não lê nada. */}
            <Route path="/Inteira" element={<Dashboard />} />
            {Pagina && <Route path="/Pagina" element={<Pagina />} />}
            <Route path="/Pagina/:nome" element={<PaginaPorNome />} />
            <Route path="*" element={<ForaDaPrevia />} />
          </Routes>
        </div>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById('raiz')).render(<App />);
