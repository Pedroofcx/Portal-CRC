import { readFileSync } from 'node:fs';

const raw = JSON.parse(readFileSync('dados-base44/portalcrc-dados-2026-09-15.json', 'utf8')).dados;
const tratativas = raw.Tratativa;
const colaboradores = raw.Colaborador;
const nome = Object.fromEntries(colaboradores.map(c => [c.id, c.nome_completo]));

const ATIVOS = ['tratativa_iniciada', 'em_andamento'];

/** Intervalos ativos de uma tratativa: [{ini, fim}] em ms. */
function intervalosAtivos(t) {
  const h = (t.historico_estados || []).filter(e => e.data_mudanca);
  const out = [];
  for (let i = 0; i < h.length; i++) {
    if (!ATIVOS.includes(h[i].estado_novo)) continue;
    const ini = new Date(h[i].data_mudanca).getTime();
    const fim = h[i + 1]
      ? new Date(h[i + 1].data_mudanca).getTime()
      : (t.data_encerramento ? new Date(t.data_encerramento).getTime() : Date.now());
    if (fim > ini) out.push({ ini, fim, t });
  }
  return out;
}

// --- agrupa por agente ------------------------------------------------------
const porAgente = new Map();
for (const t of tratativas) {
  if (!t.agente_responsavel_id) continue;
  const ints = intervalosAtivos(t);
  if (!ints.length) continue;
  if (!porAgente.has(t.agente_responsavel_id)) porAgente.set(t.agente_responsavel_id, []);
  porAgente.get(t.agente_responsavel_id).push(...ints);
}

console.log('\nCARGA SIMULTÂNEA POR AGENTE');
console.log('Quantas tratativas o agente tinha em atendimento ao mesmo tempo,\n' +
            'ponderado pelo tempo — não é a média simples de casos abertos.\n');
console.log('  ' + 'agente'.padEnd(30) + 'tratativas   horas ativas   carga média   pico');
console.log('  ' + '-'.repeat(30) + '-----------   ------------   -----------   ----');

let somaPonderada = 0, somaPeso = 0;
const cargaPorAgente = new Map();

for (const [agenteId, ints] of porAgente) {
  // Varredura de eventos: +1 ao abrir, -1 ao fechar.
  const eventos = [];
  for (const iv of ints) { eventos.push([iv.ini, 1]); eventos.push([iv.fim, -1]); }
  eventos.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  let ativos = 0, anterior = null;
  let tempoTotal = 0, tempoPonderado = 0, pico = 0;

  for (const [instante, delta] of eventos) {
    if (anterior !== null && ativos > 0 && instante > anterior) {
      const dur = instante - anterior;
      tempoTotal += dur;
      tempoPonderado += dur * ativos;
    }
    ativos += delta;
    pico = Math.max(pico, ativos);
    anterior = instante;
  }

  const carga = tempoTotal > 0 ? tempoPonderado / tempoTotal : 1;
  cargaPorAgente.set(agenteId, carga);
  somaPonderada += carga * tempoTotal;
  somaPeso += tempoTotal;

  const nTrat = new Set(ints.map(i => i.t.id)).size;
  console.log(
    '  ' + (nome[agenteId] || agenteId.slice(0, 8)).slice(0, 29).padEnd(30) +
    String(nTrat).padStart(10) +
    (tempoTotal / 3600000).toFixed(0).padStart(15) +
    carga.toFixed(2).padStart(14) +
    String(pico).padStart(7)
  );
}

const cargaGeral = somaPeso > 0 ? somaPonderada / somaPeso : 1;
console.log('\n  CARGA MÉDIA DA OPERAÇÃO: ' + cargaGeral.toFixed(2) + ' tratativas simultâneas por agente');

// --- impacto no custo -------------------------------------------------------
console.log('\nIMPACTO NO CUSTO\n');
const salario = Object.fromEntries(colaboradores.map(c => [c.id, Number(c.salario) || 0]));

let custoBruto = 0, custoAjustado = 0;
for (const t of tratativas) {
  if (t.status !== 'encerrada' || !t.agente_responsavel_id) continue;
  const s = salario[t.agente_responsavel_id];
  if (!s) continue;
  const minutos = intervalosAtivos(t).reduce((acc, iv) => acc + (iv.fim - iv.ini) / 60000, 0);
  const custoMinuto = ((s * 1.6) / 220) / 60;
  custoBruto += custoMinuto * minutos;
  custoAjustado += (custoMinuto * minutos) / (cargaPorAgente.get(t.agente_responsavel_id) || 1);
}

const brl = (v) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
console.log('  custo sem ajuste (dedicação exclusiva): ' + brl(custoBruto));
console.log('  custo dividido pela carga simultânea:   ' + brl(custoAjustado));
console.log('  redução: ' + ((1 - custoAjustado / custoBruto) * 100).toFixed(0) + '%');
