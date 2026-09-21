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
import { MemoryRouter, Routes, Route, useLocation, useSearchParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import dados from './dados-gestor.json';
import FaixaVencidas from '@/components/dashboard/gestor/FaixaVencidas';
import PainelCicloGestor from '@/components/dashboard/gestor/PainelCicloGestor';
import CicloColaborador from '@/pages/CicloColaborador';
import Dashboard from '@/pages/Dashboard';
import { useCicloEquipe } from '@/hooks/useCicloEquipe';
import { STATUS_FECHADOS } from '@/lib/cicloEquipe';

const gestor = dados.colaboradores.find((c) => c.email === dados.gestorEmail);

// Mesmas chaves que os componentes consultam, já preenchidas: nada vai ao servidor.
const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
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

function ForaDaPrevia() {
  const { pathname, search } = useLocation();
  return <p className="text-sm text-muted-foreground">Na tela de verdade, este link abre {pathname}{search}.</p>;
}

const id = new URLSearchParams(window.location.search).get('id');
const inteira = new URLSearchParams(window.location.search).get('tela') === 'inteira';

function App() {
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[inteira ? '/Inteira' : id ? `/CicloColaborador${window.location.search}` : '/Dashboard']}>
        <div className="min-h-screen bg-background p-4 sm:p-8">
          <Routes>
            <Route path="/Dashboard" element={<Inicio />} />
            <Route path="/CicloColaborador" element={<CicloColaborador />} />
            {/* A tela inicial INTEIRA, como no sistema (?tela=inteira) — o que não foi
                copiado para a prévia vem vazio, porque o visitante não lê nada. */}
            <Route path="/Inteira" element={<Dashboard />} />
            <Route path="*" element={<ForaDaPrevia />} />
          </Routes>
        </div>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById('raiz')).render(<App />);
