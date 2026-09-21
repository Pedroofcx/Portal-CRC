/**
 * PRÉVIA da tela inicial do operador, com dados reais, sem login e sem publicar.
 *
 * O gestor não vê a tela do operador (ela só aparece para agentes). Para
 * conferir como fica a pontuação de alguém:
 *   1. npm run previa-operador -- email@clickdigital.com.br   (sem e-mail: quem mais encerrou no ciclo)
 *   2. npm run dev
 *   3. abrir http://localhost:5173/previas/operador.html
 *
 * Os dados ficam em previas/dados-operador.json, que o git ignora: é cópia do
 * banco, com nome de cliente. Esta página não entra no site publicado — o
 * build só monta o index.html.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';
import dados from './dados-operador.json';
import { calculateTratativaPoints } from '@/components/utils/helpers';
import { tratativaNosCiclo } from '@/hooks/usePontuacaoAgente';
import PainelMeuCiclo from '@/components/dashboard/operador/PainelMeuCiclo';
import FilaDoOperador from '@/components/dashboard/operador/FilaDoOperador';
import MeuTurnoCard from '@/components/turnos/MeuTurnoCard';
import CardRodizioDashboard from '@/components/rodizio/CardRodizioDashboard';
import AvisosDoOperador from '@/components/dashboard/operador/AvisosDoOperador';
import CardMinhasFerias from '@/components/dashboard/operador/CardMinhasFerias';
import AtalhosDoOperador from '@/components/dashboard/operador/AtalhosDoOperador';

const eu = dados.colaboradores.find((c) => c.id === dados.escolhidaId);
const ciclo = dados.ciclos.find((c) => c.ativo);
const minhas = dados.tratativas.filter((t) => t.agente_responsavel_id === eu.id);
const encerradas = minhas.filter((t) => (t.status === 'encerrada' || t.status === 'aguardando_confirmacao_reabertura') && !t.excluida && tratativaNosCiclo(t, ciclo));
const detalhamento = [];
let total = 0;
encerradas.forEach((t) => { const r = calculateTratativaPoints(t); total += r.pontos; r.detalhes.forEach((d) => detalhamento.push({ ...d, tipo_tratativa: t.tipo_tratativa, data_encerramento: t.data_encerramento })); });
const bonus = dados.pontuacoes.filter((p) => p.colaborador_id === eu.id && p.ciclo_id === ciclo.id && p.tipo === 'bonus_manual').reduce((a, p) => a + (p.total_pontos || 0), 0);

// Mesmas chaves que os componentes consultam, já preenchidas: nada vai ao servidor.
const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
qc.setQueryData(['colaboradores'], dados.colaboradores);
qc.setQueryData(['ciclos-trimestrais'], dados.ciclos);
qc.setQueryData(['pontuacoes'], dados.pontuacoes);
qc.setQueryData(['tratativas-encerradas-ranking'], dados.tratativas);
qc.setQueryData(['apuracoes-colaborador', eu.id], dados.apuracoes.filter((a) => a.colaborador_id === eu.id));

// Lateral: as mesmas chaves que cada componente consulta.
const ordenar = (lista, campo) => [...lista].sort((x, y) => String(y[campo] ?? '').localeCompare(String(x[campo] ?? '')));
qc.setQueryData(['escalas-turno'], ordenar(dados.escalas.filter((e) => e.ativa), 'created_date').slice(0, 5));
qc.setQueryData(['rodizio-lider-dashboard'], dados.lideres);
qc.setQueryData(['rodizio-n2-dashboard'], dados.agentesN2);
qc.setQueryData(['acionamentos-lider-dashboard'], ordenar(dados.acionamentosLider, 'data_acionamento').slice(0, 10));
qc.setQueryData(['acionamentos-n2-dashboard'], ordenar(dados.acionamentosN2, 'data_acionamento').slice(0, 10));
qc.setQueryData(['configuracoes'], dados.configuracoes);
// Anotações pessoais não entram na prévia: são privadas de cada pessoa.
qc.setQueryData(['anotacoes-pessoais', eu.id], []);

// Avisos: mesma regra do Dashboard — ativos, mais recentes, sem os já confirmados.
const avisosParaExibir = ordenar(dados.avisos.filter((a) => a.ativo), 'data_publicacao').slice(0, 20)
  .filter((a) => !dados.leituras.some((l) => l.aviso_id === a.id && l.confirmou === true));
const feriasPendentes = dados.ciclosFerias.flatMap((c) => c.fragmentos || []).filter((f) => f.status === 'pendente_validacao').length;

window.__previa = { nome: eu.nome_completo, total, bonus, encerradas: encerradas.length };

function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <div className="min-h-screen bg-background p-8">
          <div className="space-y-6">
            <PainelMeuCiclo colaborador={eu} cicloAtivo={ciclo} totalPontos={total + bonus} detalhamentoPontos={detalhamento}
              bonusManual={bonus} minhasTratativas={minhas} exigencias={dados.elegibilidades} rankingVisivel />
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <FilaDoOperador tratativas={minhas} />
              <div className="space-y-4">
                <MeuTurnoCard colaboradorId={eu.id} />
                <CardRodizioDashboard tipo="lider" />
                <CardRodizioDashboard tipo="n2" />
                <AvisosDoOperador avisosParaExibir={avisosParaExibir} leituras={dados.leituras} colaborador={eu} />
                <div className="rounded-xl border border-dashed border-border p-4 text-xs text-muted-foreground">
                  Minhas anotações — ficam de fora da prévia: são privadas de cada pessoa.
                </div>
                <CardMinhasFerias pendentes={feriasPendentes} aoAbrir={() => alert('No sistema, abre o diálogo de validação das férias.')} />
                <AtalhosDoOperador />
              </div>
            </div>
          </div>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
ReactDOM.createRoot(document.getElementById('raiz')).render(<App />);
