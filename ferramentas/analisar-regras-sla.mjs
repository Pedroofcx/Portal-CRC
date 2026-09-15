import { readFileSync } from 'node:fs';

const d = JSON.parse(readFileSync('dados-base44/portalcrc-dados-2026-09-15.json', 'utf8')).dados.Tratativa;
const enc = d.filter((t) => t.status === 'encerrada' && t.encerrado_no_sla != null);

const ms = (a, b) => (new Date(b) - new Date(a)) / 60000;

function intervalos(t) {
  const h = (t.historico_estados || []).filter(e => e.data_mudanca);
  const out = [];
  for (let i = 0; i < h.length; i++) {
    const ini = h[i].data_mudanca;
    const fim = h[i + 1] ? h[i + 1].data_mudanca : t.data_encerramento;
    if (!fim) continue;
    const dur = ms(ini, fim);
    if (dur > 0) out.push({ estado: h[i].estado_novo, dur });
  }
  return out;
}

const OPCOES = {
  'A · corrido (registro → encerramento)': (t) =>
    t.data_registro && t.data_encerramento ? Math.round(ms(t.data_registro, t.data_encerramento)) : null,

  'B · corrido menos SLA congelado': (t) => {
    if (!t.data_registro || !t.data_encerramento) return null;
    const total = ms(t.data_registro, t.data_encerramento);
    const congelado = intervalos(t).filter(x => x.estado === 'aguardando_financeiro')
      .reduce((s, x) => s + x.dur, 0);
    return Math.round(Math.max(0, total - congelado));
  },

  'C · corrido menos congelado e dependência externa': (t) => {
    if (!t.data_registro || !t.data_encerramento) return null;
    const total = ms(t.data_registro, t.data_encerramento);
    const parado = intervalos(t)
      .filter(x => ['aguardando_financeiro', 'dependencia_externa'].includes(x.estado))
      .reduce((s, x) => s + x.dur, 0);
    return Math.round(Math.max(0, total - parado));
  },

  'D · só tempo ativo (o que eu escrevi)': (t) =>
    Math.round(intervalos(t).filter(x => ['tratativa_iniciada', 'em_andamento'].includes(x.estado))
      .reduce((s, x) => s + x.dur, 0)),
};

console.log('\n' + enc.length + ' tratativas encerradas.\n');
console.log('Como cada regra reproduz o histórico, e o que cada uma diria hoje:\n');
console.log('  ' + 'regra'.padEnd(46) + 'reproduz  |  diria "dentro do SLA"');
console.log('  ' + '-'.repeat(46) + '--------- | ---------------------');

const gravadoDentro = enc.filter(t => t.encerrado_no_sla).length;

for (const [nome, fn] of Object.entries(OPCOES)) {
  let bate = 0, dentro = 0;
  for (const t of enc) {
    const min = fn(t);
    if (min == null) continue;
    const ok = min <= (t.sla_atribuido || 24) * 60;
    if (ok === t.encerrado_no_sla) bate++;
    if (ok) dentro++;
  }
  const pct = ((bate / enc.length) * 100).toFixed(0);
  const pctDentro = ((dentro / enc.length) * 100).toFixed(0);
  console.log('  ' + nome.padEnd(46) + String(pct).padStart(6) + '%   |   ' +
    String(dentro).padStart(3) + ' de ' + enc.length + '  (' + pctDentro + '%)');
}

console.log('\n  ' + 'o que o Base44 registrou'.padEnd(46) + '   100%   |   ' +
  String(gravadoDentro).padStart(3) + ' de ' + enc.length +
  '  (' + ((gravadoDentro / enc.length) * 100).toFixed(0) + '%)');

console.log('\nQuanto tempo, em média, cada estado consome:\n');
const soma = {};
for (const t of enc) for (const x of intervalos(t)) soma[x.estado] = (soma[x.estado] || 0) + x.dur;
const totalGeral = Object.values(soma).reduce((a, b) => a + b, 0);
Object.entries(soma).sort((a, b) => b[1] - a[1]).forEach(([e, m]) => {
  console.log('  ' + e.padEnd(36) + (m / 60 / 24).toFixed(0).padStart(6) + ' dias  (' +
    ((m / totalGeral) * 100).toFixed(1) + '% do tempo total)');
});
