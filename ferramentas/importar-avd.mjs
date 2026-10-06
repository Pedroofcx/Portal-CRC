/**
 * Importa o histórico das AVDs (planilhas do Google Forms) para o Portal.
 *
 *   node ferramentas/importar-avd.mjs                 só mostra a prévia (não grava nada)
 *   node ferramentas/importar-avd.mjs --gravar        grava no banco
 *   node ferramentas/importar-avd.mjs --apagar        apaga o que foi importado daqui
 *   node ferramentas/importar-avd.mjs --pasta <dir>   pasta dos CSV (padrão: Downloads)
 *
 * Pode rodar de novo sem duplicar: cada AVD e cada resposta têm uma chave fixa
 * (avd-AAAA-MM e avd-AAAA-MM-<e-mail>), e gravar de novo só atualiza.
 *
 * Regras (combinadas com Pedro, 06/10/2026): nota acima de 10 vale 10; o mês de
 * referência vem do carimbo (até o dia 15 conta o mês anterior); linhas iguais
 * em dois arquivos (mesmo e-mail e mesmo carimbo) entram uma vez só.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  PERGUNTAS_AVD, competenciaDoEnvio, lerCarimbo, respostasDaLinha, notasDaResposta, tituloDaAvd, rotuloDaCompetencia,
} from '../src/lib/avd.js';

const args = process.argv.slice(2);
const GRAVAR = args.includes('--gravar');
const APAGAR = args.includes('--apagar');
const pastaArg = args.indexOf('--pasta');
const PASTA = pastaArg >= 0 ? args[pastaArg + 1] : path.join(os.homedir(), 'Downloads');
const MESES = { JANEIRO: 1, FEVEREIRO: 2, MARÇO: 3, ABRIL: 4, MAIO: 5, JUNHO: 6, JULHO: 7, AGOSTO: 8, SETEMBRO: 9, OUTUBRO: 10, NOVEMBRO: 11, DEZEMBRO: 12 };

/** CSV com aspas, vírgulas e quebras de linha dentro do campo. */
function lerCsv(texto) {
  const linhas = []; let linha = []; let campo = ''; let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; } else if (c === '"') aspas = false; else campo += c;
    } else if (c === '"') aspas = true;
    else if (c === ',') { linha.push(campo); campo = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo); campo = ''; linhas.push(linha); linha = [];
    } else campo += c;
  }
  if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas;
}

const ultimoDia = (ano, mes) => `${ano}-${String(mes).padStart(2, '0')}-${String(new Date(ano, mes, 0).getDate()).padStart(2, '0')}`;

function lerArquivos() {
  const achados = readdirSync(PASTA).filter((f) => /^AVDs \(([^)]+)\) CRC.*\.csv$/i.test(f));
  const linhas = new Map(); // email|dia|hora -> linha
  const relatorio = { arquivos: [], repetidas: [], carimboInvalido: [], foraDoMesDoArquivo: [] };
  for (const arquivo of achados) {
    const mesNome = arquivo.match(/^AVDs \(([^)]+)\)/i)[1].toUpperCase();
    const mesArquivo = MESES[mesNome];
    if (!mesArquivo) continue;
    const referencia = ultimoDia(2026, mesArquivo);
    const linhasCsv = lerCsv(readFileSync(path.join(PASTA, arquivo), 'utf8').replace(/^﻿/, ''));
    let n = 0;
    for (const colunas of linhasCsv) {
      if (!/^\d{1,2}\/\d{1,2}\/\d{4}\s/.test(colunas[0] ?? '')) continue;
      const email = String(colunas[1] ?? '').trim().toLowerCase();
      const carimbo = lerCarimbo(colunas[0], referencia);
      if (!email || !carimbo) { relatorio.carimboInvalido.push({ arquivo, carimbo: colunas[0], email }); continue; }
      n += 1;
      const chave = `${email}|${carimbo.dia}|${carimbo.hora}`;
      const competencia = competenciaDoEnvio(carimbo.dia);
      if (linhas.has(chave)) { relatorio.repetidas.push({ email, carimbo: `${carimbo.dia} ${carimbo.hora}`, arquivos: [linhas.get(chave).arquivo, arquivo] }); continue; }
      if (Number(competencia.slice(5, 7)) !== mesArquivo) relatorio.foraDoMesDoArquivo.push({ email, carimbo: `${carimbo.dia} ${carimbo.hora}`, arquivo, competencia });
      linhas.set(chave, { arquivo, email, carimbo, competencia, colunas: colunas.slice(2) });
    }
    relatorio.arquivos.push({ arquivo, linhas: n });
  }
  return { linhas: [...linhas.values()], relatorio };
}

function lerEnv(arquivo, nome) {
  const p = path.join(process.cwd(), arquivo);
  if (!existsSync(p)) return null;
  return readFileSync(p, 'utf8').match(new RegExp(`^${nome}\\s*=\\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '') ?? null;
}

const { linhas, relatorio } = lerArquivos();
const comRespostas = linhas.map((l) => ({ ...l, ...respostasDaLinha(l.colunas) }));

// duas respostas da mesma pessoa no mesmo mês: fica a mais recente
const porPessoaMes = new Map();
const conflitos = [];
for (const l of comRespostas.sort((a, b) => `${a.carimbo.dia} ${a.carimbo.hora}`.localeCompare(`${b.carimbo.dia} ${b.carimbo.hora}`))) {
  const k = `${l.competencia}|${l.email}`;
  if (porPessoaMes.has(k)) conflitos.push({ email: l.email, competencia: l.competencia, descartada: `${porPessoaMes.get(k).carimbo.dia}`, mantida: l.carimbo.dia });
  porPessoaMes.set(k, l);
}
const finais = [...porPessoaMes.values()];
const competencias = [...new Set(finais.map((l) => l.competencia))].sort();
const emails = [...new Set(finais.map((l) => l.email))].sort();

console.log(`Pasta: ${PASTA}`);
console.log(`Arquivos lidos: ${relatorio.arquivos.length}`);
for (const a of relatorio.arquivos) console.log(`  ${String(a.linhas).padStart(2)} linhas  ${a.arquivo}`);
console.log(`\nRespostas únicas: ${finais.length} (de ${relatorio.arquivos.reduce((s, a) => s + a.linhas, 0)} linhas nos arquivos)`);
if (relatorio.repetidas.length) {
  console.log(`\nLinhas repetidas em dois arquivos (entram uma vez só): ${relatorio.repetidas.length}`);
  for (const r of relatorio.repetidas) console.log(`  ${r.email.split('@')[0]}  ${r.carimbo}`);
}
if (relatorio.foraDoMesDoArquivo.length) {
  console.log('\nLinhas que estão num arquivo de um mês e pertencem a outro (vale a data):');
  for (const r of relatorio.foraDoMesDoArquivo) console.log(`  ${r.email.split('@')[0]}  enviada em ${r.carimbo}, está no arquivo de ${r.arquivo.match(/\(([^)]+)\)/)[1]} e vira ${rotuloDaCompetencia(r.competencia)}`);
}
if (conflitos.length) { console.log('\nMais de uma resposta da mesma pessoa no mesmo mês (fica a mais recente):'); console.log(conflitos); }
if (relatorio.carimboInvalido.length) { console.log('\nCarimbo que não consegui ler (ficam de fora):'); console.log(relatorio.carimboInvalido); }

console.log('\nMês a mês (n respostas, quem respondeu):');
for (const c of competencias) {
  const doMes = finais.filter((l) => l.competencia === c);
  const geral = doMes.map((l) => notasDaResposta(l.respostas).geral).filter((v) => v !== null);
  console.log(`  ${rotuloDaCompetencia(c)}  ${doMes.length} resp.  média geral ${(geral.reduce((s, v) => s + v, 0) / geral.length).toFixed(1)}  ${doMes.map((l) => l.email.split('@')[0]).sort().join(', ')}`);
}
const ajustes = finais.flatMap((l) => l.ajustes.map((a) => ({ pessoa: l.email.split('@')[0], mes: rotuloDaCompetencia(l.competencia), ...a })));
console.log(`\nNotas acima de 10 que viraram 10: ${ajustes.length}`);
for (const a of ajustes) console.log(`  ${a.pessoa} ${a.mes}  ${a.pergunta}: ${a.de} -> ${a.para}`);
console.log(`\nPerguntas do modelo: ${PERGUNTAS_AVD.length}`);

if (!GRAVAR && !APAGAR) { console.log('\nPrévia. Nada foi gravado. Para gravar: node ferramentas/importar-avd.mjs --gravar'); process.exit(0); }

const url = lerEnv('.env.local', 'VITE_SUPABASE_URL');
const chave = lerEnv('.env.import', 'SUPABASE_SERVICE_ROLE_KEY');
if (!url || !chave) { console.error('Faltam VITE_SUPABASE_URL (.env.local) e SUPABASE_SERVICE_ROLE_KEY (.env.import).'); process.exit(1); }
const sb = createClient(url, chave, { auth: { persistSession: false } });

if (APAGAR) {
  const r1 = await sb.from('resposta_pesquisa').delete().like('base44_id', 'avd-%');
  const r2 = await sb.from('pesquisa_participacao').delete().in('pesquisa_id', ((await sb.from('pesquisa').select('id').like('base44_id', 'avd-%')).data ?? []).map((p) => p.id));
  const r3 = await sb.from('pesquisa').delete().like('base44_id', 'avd-%');
  console.log('Apagado:', r1.error?.message ?? 'respostas ok', '|', r2.error?.message ?? 'participações ok', '|', r3.error?.message ?? 'AVDs ok');
  process.exit(0);
}

const { data: colaboradores, error: eCol } = await sb.from('colaborador_base').select('id,email,nome_completo');
if (eCol) { console.error('Não consegui ler os colaboradores:', eCol.message); process.exit(1); }
const porEmail = new Map(colaboradores.map((c) => [String(c.email ?? '').toLowerCase(), c]));
const semCadastro = emails.filter((e) => !porEmail.has(e));
if (semCadastro.length) { console.error('Sem colaborador com estes e-mails (nada foi gravado):', semCadastro); process.exit(1); }

const idDaPesquisa = new Map();
for (const comp of competencias) {
  const doMes = finais.filter((l) => l.competencia === comp);
  const fim = new Date(`${ultimoDia(Number(comp.slice(0, 4)), Number(comp.slice(5, 7)))}T12:00:00-03:00`).toISOString();
  const { data, error } = await sb.from('pesquisa').upsert({
    base44_id: `avd-${comp}`,
    titulo: tituloDaAvd(comp),
    descricao: 'Importada das planilhas do Google Forms.',
    tipo: 'avd', categoria: 'interna', competencia: comp,
    perguntas: PERGUNTAS_AVD, ativa: false, publicada: true, anonima: false, requer_confirmacao_leitura: false,
    data_publicacao: fim, created_date: fim,
  }, { onConflict: 'base44_id' }).select('id').single();
  if (error) { console.error(`AVD ${comp}:`, error.message); process.exit(1); }
  idDaPesquisa.set(comp, data.id);
  const linhasDb = doMes.map((l) => {
    const col = porEmail.get(l.email);
    const enviada = new Date(`${l.carimbo.dia}T${l.carimbo.hora}-03:00`).toISOString();
    const geral = notasDaResposta(l.respostas).geral;
    return {
      base44_id: `avd-${comp}-${l.email}`, pesquisa_id: data.id, pesquisa_titulo: tituloDaAvd(comp), pesquisa_tipo: 'avd',
      colaborador_id: col.id, colaborador_nome: col.nome_completo, respostas: l.respostas,
      confirmou_leitura: true, data_leitura: enviada, data_resposta: enviada, created_date: enviada,
      nota_calculada: geral === null ? null : Math.round(geral * 100) / 100, contribuiu_health_score: false,
    };
  });
  const r = await sb.from('resposta_pesquisa').upsert(linhasDb, { onConflict: 'base44_id' });
  if (r.error) { console.error(`Respostas de ${comp}:`, r.error.message); process.exit(1); }
  const p = await sb.from('pesquisa_participacao').upsert(linhasDb.map((x) => ({
    pesquisa_id: data.id, colaborador_id: x.colaborador_id, colaborador_nome: x.colaborador_nome, respondida_em: x.data_resposta, created_date: x.data_resposta,
  })), { onConflict: 'pesquisa_id,colaborador_id' });
  if (p.error) { console.error(`Participações de ${comp}:`, p.error.message); process.exit(1); }
  console.log(`  gravado ${rotuloDaCompetencia(comp)}: ${linhasDb.length} respostas`);
}
console.log('\nPronto. Rode de novo à vontade: só atualiza.');
