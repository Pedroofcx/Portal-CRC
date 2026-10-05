/**
 * PORTAL CRC — TESTE DE PONTA A PONTA DA API DE INTEGRAÇÕES
 *
 * Uso:   node ferramentas/testar-api.mjs
 *
 * Chama a Edge Function "api" de verdade (a publicada no Supabase) com uma
 * integração e uma chave DESCARTÁVEIS criadas na hora, e confere:
 *   - as travas, na ordem: chave geral, chave, integração, recurso/ação, limite;
 *   - consultar, gravar e atualizar liberados separadamente;
 *   - que nada interno sai (custo, salário, e-mail, histórico);
 *   - o acompanhamento do WhatsApp com o CNPJ como senha e a trava por tentativas;
 *   - o registro de uso.
 *
 * ATENÇÃO: roda contra o banco REAL. Cria UMA tratativa de teste (que ocupa por
 * alguns segundos o próximo número TRT) e apaga tudo pelo id no final, conferindo
 * o resultado e devolvendo a chave geral ao estado em que estava. Não rode
 * enquanto alguém está registrando tratativa.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { sha256hex } from '../supabase/functions/api/politica.js';

const ler = (a, n) => readFileSync(a, 'utf8').match(new RegExp(`^${n}\\s*=\\s*(.+)$`, 'm'))[1].trim().replace(/^["']|["']$/g, '');
const URL = ler('.env.local', 'VITE_SUPABASE_URL');
const admin = createClient(URL, ler('.env.import', 'SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const BASE = `${URL}/functions/v1/api/v1`;

const NOME = 'ZZ Teste API descartavel';
const chaveTexto = 'crc_' + [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('');
const chaveRuim = 'crc_' + '0'.repeat(48);

let passou = 0, falhou = 0;
const ver = (rotulo, ok, detalhe = '') => { ok ? passou++ : falhou++; console.log(`${ok ? '  OK    ' : '  FALHA '}${rotulo}${detalhe ? '  -> ' + detalhe : ''}`); };

async function chamar(metodo, caminho, { chave = chaveTexto, corpo, cabecalhos = {} } = {}) {
  const h = { ...(chave ? { Authorization: `Bearer ${chave}` } : {}), ...cabecalhos };
  if (corpo !== undefined) h['Content-Type'] = 'application/json';
  const r = await fetch(`${BASE}${caminho}`, { method: metodo, headers: h, body: corpo !== undefined ? JSON.stringify(corpo) : undefined });
  let json = null; try { json = await r.json(); } catch { /* sem corpo */ }
  return { status: r.status, json, headers: r.headers };
}
const codigo = (r) => r.json?.erro?.codigo ?? '';

let integracaoId = null, chaveId = null;
const idsTratativas = [];
const geralAntes = (await admin.from('integracao_geral').select('habilitada').eq('id', 1).single()).data.habilitada;

const setGeral = (v) => admin.from('integracao_geral').update({ habilitada: v }).eq('id', 1);
const setInteg = (dados) => admin.from('integracao').update(dados).eq('id', integracaoId);
const setChave = (dados) => admin.from('integracao_chave').update(dados).eq('id', chaveId);

try {
  // --- montagem: integração e chave descartáveis (hash igual ao que a função calcula) ---
  const { data: i, error: e1 } = await admin.from('integracao').insert({ nome: NOME, sentido: 'entrada', ativa: true, limite_por_minuto: 100, recursos: { tratativas: { ler: true, gravar: false, atualizar: false } } }).select('id').single();
  if (e1) throw e1; integracaoId = i.id;
  const { data: c, error: e2 } = await admin.from('integracao_chave').insert({ integracao_id: integracaoId, nome: 'teste', prefixo: chaveTexto.slice(0, 8) }).select('id').single();
  if (e2) throw e2; chaveId = c.id;
  await admin.from('integracao_chave_segredo').insert({ chave_id: chaveId, hash: await sha256hex(chaveTexto) });

  console.log('\n== 1. chave geral ==');
  await setGeral(false);
  let r = await chamar('GET', '/ping');
  ver('chave geral desligada derruba (503)', r.status === 503 && codigo(r) === 'integracoes_desligadas', `${r.status} ${codigo(r)}`);
  await setGeral(true);

  console.log('\n== 2. quem chama ==');
  r = await chamar('GET', '/ping');
  ver('ping com chave certa (200)', r.status === 200 && r.json?.ok === true && r.json?.integracao === NOME, `${r.status}`);
  ver('ping mostra os recursos liberados', r.json?.recursos?.tratativas?.ler === true);
  r = await chamar('GET', '/ping', { chave: chaveRuim });
  ver('chave inexistente (401)', r.status === 401 && codigo(r) === 'chave_invalida', `${r.status} ${codigo(r)}`);
  r = await chamar('GET', '/ping', { chave: null });
  ver('sem chave (401)', r.status === 401, `${r.status} ${codigo(r)}`);
  r = await chamar('GET', '/ping', { chave: null, cabecalhos: { 'x-api-key': chaveTexto } });
  ver('chave por x-api-key (200)', r.status === 200, `${r.status}`);
  await setChave({ ativa: false });
  r = await chamar('GET', '/ping');
  ver('chave desativada (401)', r.status === 401 && codigo(r) === 'chave_desativada', `${r.status} ${codigo(r)}`);
  await setChave({ ativa: true, expira_em: new Date(Date.now() - 60000).toISOString() });
  r = await chamar('GET', '/ping');
  ver('chave vencida (401)', r.status === 401 && codigo(r) === 'chave_expirada', `${r.status} ${codigo(r)}`);
  await setChave({ expira_em: null });
  await setInteg({ ativa: false });
  r = await chamar('GET', '/ping');
  ver('integracao desligada (403)', r.status === 403 && codigo(r) === 'integracao_desligada', `${r.status} ${codigo(r)}`);
  await setInteg({ ativa: true });
  r = await chamar('GET', '/ping');
  ver('religada volta a funcionar', r.status === 200, `${r.status}`);

  console.log('\n== 3. consultar (ler) ==');
  r = await chamar('GET', '/tratativas?limite=3');
  ver('lista tratativas (200)', r.status === 200 && Array.isArray(r.json?.dados) && r.json.dados.length === 3, `${r.status} n=${r.json?.dados?.length}`);
  const campos = Object.keys(r.json?.dados?.[0] ?? {});
  ver('nao vaza custo operacional nem historico', !campos.some((k) => /custo|perda|churn|historico/.test(k)), campos.length + ' campos');
  ver('paginacao informa o total', typeof r.json?.paginacao?.total === 'number', JSON.stringify(r.json?.paginacao));
  r = await chamar('GET', '/tratativas?status=banana');
  ver('filtro invalido (400)', r.status === 400 && codigo(r) === 'parametro_invalido', `${r.status}`);
  r = await chamar('GET', '/tratativas?tipo=procon&limite=2');
  ver('filtro por tipo', r.status === 200 && r.json.dados.every((t) => t.tipo_tratativa === 'procon'), `n=${r.json?.dados?.length}`);
  r = await chamar('GET', '/tratativas/TRT-0363');
  ver('uma tratativa pelo numero TRT', r.status === 200 && r.json?.dados?.id_interno === 'TRT-0363', `${r.status}`);
  r = await chamar('GET', '/colaboradores');
  ver('colaboradores sem permissao (403)', r.status === 403 && codigo(r) === 'sem_permissao', `${r.status} ${codigo(r)}`);
  await setInteg({ recursos: { tratativas: { ler: true }, colaboradores: { ler: true }, ciclos: { ler: true } } });
  r = await chamar('GET', '/colaboradores');
  ver('colaboradores liberado (200), sem salario nem e-mail', r.status === 200 && r.json.dados.length > 0 && !Object.keys(r.json.dados[0]).some((k) => /salario|email|promocoes/.test(k)), `${r.status} campos=${Object.keys(r.json?.dados?.[0] ?? {}).join(',')}`);
  r = await chamar('GET', '/ciclos');
  ver('ciclos (200)', r.status === 200 && r.json.dados.length > 0, `${r.status}`);

  console.log('\n== 4. gravar e atualizar separados ==');
  const novo = { nome_cliente: 'ZZ TESTE API', cnpj_cliente: '11.222.333/0001-81', tipo_tratativa: 'reclame_aqui', prioridade: 'media', ticket_zendesk: 'ZZ9001' };
  r = await chamar('POST', '/tratativas', { corpo: novo });
  ver('criar sem permissao de gravar (403)', r.status === 403 && codigo(r) === 'sem_permissao', `${r.status} ${codigo(r)}`);
  await setInteg({ recursos: { tratativas: { ler: true, gravar: true, atualizar: false }, acompanhamento: { ler: true } } });
  r = await chamar('POST', '/tratativas', { corpo: { nome_cliente: 'x' } });
  ver('criar com dados invalidos (422)', r.status === 422 && codigo(r) === 'dados_invalidos', `${r.status} ${JSON.stringify(r.json?.erro?.detalhes)?.slice(0, 90)}`);
  r = await chamar('POST', '/tratativas', { corpo: { ...novo, custo_operacional_reais: 5 } });
  ver('campo proibido e recusado (422)', r.status === 422 && JSON.stringify(r.json?.erro?.detalhes).includes('campos não aceitos'), `${r.status}`);
  r = await chamar('POST', '/tratativas', { corpo: { ...novo, cnpj_cliente: undefined } });
  ver('sem CNPJ e sem marcar recusa (422)', r.status === 422 && JSON.stringify(r.json?.erro?.detalhes).includes('cnpj_cliente'), `${r.status}`);
  r = await chamar('POST', '/tratativas', { corpo: novo });
  ver('criar valida (201)', r.status === 201 && r.json?.dados?.id, `${r.status} ${JSON.stringify(r.json?.dados)}`);
  const idNova = r.json?.dados?.id; const numero = r.json?.dados?.id_interno;
  if (idNova) idsTratativas.push(idNova);

  const { data: base } = await admin.from('tratativa_base').select('*').eq('id', idNova).single();
  ver('gravou status registrada e prazo de 48h (servidor define)', base?.status === 'registrada' && Number(base?.sla_atribuido) === 48, `${base?.status} ${base?.sla_atribuido}`);
  ver('gravou o CNPJ so com digitos e o ticket', base?.cnpj_cliente === '11222333000181' && base?.ticket_zendesk === 'ZZ9001', `${base?.cnpj_cliente} ${base?.ticket_zendesk}`);
  ver('historico registra a origem da API', JSON.stringify(base?.historico_estados).includes(`API: ${NOME}`) && base?.created_by === `api:${NOME}`);

  r = await chamar('GET', `/tratativas/${numero}`);
  ver('le a tratativa criada pelo numero', r.status === 200 && r.json?.dados?.nome_cliente === 'ZZ TESTE API', `${r.status} ${numero}`);
  r = await chamar('GET', '/tratativas/ZZ9001');
  ver('le pelo ticket do Zendesk', r.status === 200 && r.json?.dados?.id_interno === numero, `${r.status}`);

  r = await chamar('PATCH', `/tratativas/${numero}`, { corpo: { resumo_whatsapp: 'Estamos analisando.' } });
  ver('atualizar sem permissao (403)', r.status === 403 && codigo(r) === 'sem_permissao', `${r.status} ${codigo(r)}`);
  await setInteg({ recursos: { tratativas: { ler: true, gravar: true, atualizar: true }, acompanhamento: { ler: true } } });
  r = await chamar('PATCH', `/tratativas/${numero}`, { corpo: { status: 'encerrada' } });
  ver('nao muda status por PATCH (422)', r.status === 422, `${r.status}`);
  r = await chamar('PATCH', `/tratativas/${numero}`, { corpo: { resumo_whatsapp: 'Estamos analisando o seu caso e damos retorno amanhã.', ticket_clickdesk: 'CD-ZZ1', dados_clickdesk: { fila: 'suporte', prioridade: 'alta' } } });
  ver('atualizar com permissao (200)', r.status === 200 && r.json?.dados?.atualizados?.length === 3, `${r.status} ${JSON.stringify(r.json?.dados)}`);
  const { data: depois } = await admin.from('tratativa_base').select('resumo_whatsapp,resumo_whatsapp_por_nome,resumo_whatsapp_atualizado_em,ticket_clickdesk,dados_clickdesk,status').eq('id', idNova).single();
  ver('gravou resumo, ticket e dados do ClickDesk', depois?.ticket_clickdesk === 'CD-ZZ1' && depois?.dados_clickdesk?.fila === 'suporte' && depois?.resumo_whatsapp?.startsWith('Estamos analisando'));
  ver('carimbou quem e quando, e o status ficou', depois?.resumo_whatsapp_por_nome === `API: ${NOME}` && !!depois?.resumo_whatsapp_atualizado_em && depois?.status === 'registrada');
  r = await chamar('PATCH', '/tratativas/TRT-0000000', { corpo: { resumo_whatsapp: 'x' } });
  ver('atualizar tratativa inexistente (404)', r.status === 404, `${r.status}`);

  console.log('\n== 5. acompanhamento do cliente (WhatsApp) ==');
  r = await chamar('GET', `/acompanhamento/${numero}`);
  ver('sem CNPJ (400)', r.status === 400 && codigo(r) === 'cnpj_obrigatorio', `${r.status} ${codigo(r)}`);
  r = await chamar('GET', `/acompanhamento/${numero}?cnpj=11222333000182`);
  ver('CNPJ invalido (400)', r.status === 400 && codigo(r) === 'cnpj_invalido', `${r.status} ${codigo(r)}`);
  r = await chamar('GET', `/acompanhamento/${numero}?cnpj=62781329000194`);
  ver('CNPJ valido de outro cliente (404)', r.status === 404 && codigo(r) === 'nao_encontrada', `${r.status} ${codigo(r)}`);
  r = await chamar('GET', `/acompanhamento/${numero}?cnpj=11.222.333/0001-81`);
  ver('codigo + CNPJ certo (200)', r.status === 200, `${r.status}`);
  ver('devolve so situacao e resumo do atendente', r.json?.dados?.situacao === 'Recebida' && r.json?.dados?.resumo?.startsWith('Estamos analisando') && r.json?.dados?.resumo_do_atendente === true, JSON.stringify(r.json?.dados));
  ver('nao vaza nome, agente, valores nem historico', !/ZZ TESTE|historico|agente|custo|valor|cnpj/i.test(JSON.stringify(r.json?.dados).replace(/"ticket_[a-z]+"/g, '')), Object.keys(r.json?.dados ?? {}).join(','));
  r = await chamar('GET', `/acompanhamento/ZZ9001?cnpj=11222333000181`);
  ver('pelo ticket do Zendesk (200)', r.status === 200 && r.json?.dados?.codigo === numero, `${r.status}`);
  r = await chamar('GET', `/acompanhamento/CD-ZZ1?cnpj=11222333000181`);
  ver('pelo ticket do ClickDesk (200)', r.status === 200 && r.json?.dados?.codigo === numero, `${r.status}`);
  r = await chamar('GET', `/acompanhamento/TRT-0363?cnpj=11222333000181`);
  ver('tratativa antiga sem CNPJ nunca e entregue (404)', r.status === 404, `${r.status}`);

  await admin.from('tratativa_base').update({ resumo_whatsapp: null }).eq('id', idNova);
  r = await chamar('GET', `/acompanhamento/${numero}?cnpj=11222333000181`);
  ver('sem resumo: frase padrao do estado', r.status === 200 && r.json?.dados?.resumo_do_atendente === false && /fila para atendimento/.test(r.json?.dados?.resumo), r.json?.dados?.resumo);

  // trava por tentativas erradas no mesmo codigo
  let ultimo = null;
  for (let k = 0; k < 6; k++) ultimo = await chamar('GET', `/acompanhamento/ZZ-NAO-EXISTE?cnpj=62781329000194`);
  ver('varias tentativas erradas no mesmo codigo travam (429)', ultimo.status === 429 && codigo(ultimo) === 'tentativas_excedidas', `${ultimo.status} ${codigo(ultimo)}`);

  console.log('\n== 6. acompanhamento isolado das tratativas ==');
  await setInteg({ recursos: { acompanhamento: { ler: true } } });
  r = await chamar('GET', `/acompanhamento/${numero}?cnpj=11222333000181`);
  ver('so acompanhamento liberado: acompanhamento (200)', r.status === 200, `${r.status}`);
  r = await chamar('GET', '/tratativas');
  ver('so acompanhamento liberado: tratativas fechadas (403)', r.status === 403, `${r.status}`);

  console.log('\n== 7. limite por minuto e rotas ==');
  await setInteg({ limite_por_minuto: 4, recursos: { tratativas: { ler: true } } });
  let statusFinal = 0; const vistos = [];
  for (let k = 0; k < 8; k++) { r = await chamar('GET', '/ping'); vistos.push(r.status); statusFinal = r.status; if (r.status === 429) break; }
  ver('passa do limite por minuto (429 com Retry-After)', statusFinal === 429 && r.headers.get('retry-after') === '60', vistos.join(','));
  await setInteg({ limite_por_minuto: 100 });
  r = await chamar('GET', '/rota-que-nao-existe');
  ver('rota inexistente (404)', r.status === 404 && codigo(r) === 'rota_inexistente', `${r.status}`);
  r = await chamar('DELETE', '/tratativas');
  ver('metodo nao permitido (405)', r.status === 405, `${r.status}`);
  const op = await fetch(`${BASE}/ping`, { method: 'OPTIONS' });
  ver('OPTIONS responde 204', op.status === 204, `${op.status}`);

  console.log('\n== 8. registro de uso ==');
  const { data: log } = await admin.from('integracao_log').select('resultado,status_http,motivo,caminho,duracao_ms').eq('integracao_id', integracaoId);
  const aceitas = log.filter((l) => l.resultado === 'aceita').length, recusadas = log.filter((l) => l.resultado === 'recusada').length;
  ver('registrou chamadas aceitas e recusadas', aceitas > 10 && recusadas > 5, `aceitas ${aceitas}, recusadas ${recusadas}`);
  ver('registro tem motivo das recusas', log.some((l) => l.motivo === 'sem_permissao') && log.some((l) => l.motivo === 'limite_excedido'));
  ver('o CNPJ nao aparece no registro (so o caminho)', !log.some((l) => /cnpj|11222333/i.test(l.caminho ?? '')));
  const { data: chaveDepois } = await admin.from('integracao_chave').select('ultimo_uso').eq('id', chaveId).single();
  ver('marcou o ultimo uso da chave', !!chaveDepois?.ultimo_uso);
} catch (e) {
  falhou++; console.log('  ERRO NO TESTE:', e?.message ?? e);
} finally {
  // --- limpeza: tudo o que foi criado, pelo id, com conferência ---
  for (const id of idsTratativas) await admin.from('tratativa_base').delete().eq('id', id);
  await admin.from('integracao_log').delete().eq('integracao_nome', NOME);
  if (integracaoId) await admin.from('integracao').delete().eq('id', integracaoId);
  await admin.from('integracao_geral').update({ habilitada: geralAntes }).eq('id', 1);

  const { data: restoT } = await admin.from('tratativa_base').select('id').or('nome_cliente.eq.ZZ TESTE API,ticket_zendesk.eq.ZZ9001');
  const { data: restoI } = await admin.from('integracao').select('id').eq('nome', NOME);
  const { data: restoC } = await admin.from('integracao_chave').select('id').eq('id', chaveId ?? '00000000-0000-0000-0000-000000000000');
  const { data: restoS } = await admin.from('integracao_chave_segredo').select('chave_id').eq('chave_id', chaveId ?? '00000000-0000-0000-0000-000000000000');
  const { data: restoL } = await admin.from('integracao_log').select('id').eq('integracao_nome', NOME);
  const { data: g } = await admin.from('integracao_geral').select('habilitada').eq('id', 1).single();
  const { data: todas } = await admin.from('tratativa_base').select('id_interno').not('id_interno', 'is', null);
  const maior = Math.max(...todas.map((x) => parseInt(String(x.id_interno).match(/TRT-(\d+)/)?.[1] ?? '0', 10)));
  console.log('\n== limpeza ==');
  console.log(`tratativas de teste restantes: ${restoT.length} | integracoes: ${restoI.length} | chaves: ${restoC.length} | segredos: ${restoS.length} | logs: ${restoL.length}`);
  console.log(`chave geral voltou para: ${g.habilitada} (era ${geralAntes}) | maior numero de tratativa: ${maior} -> proximo TRT-${String(maior + 1).padStart(4, '0')}`);
  console.log(`\nRESULTADO: ${passou} ok, ${falhou} falhas`);
  process.exit(falhou ? 1 : 0);
}
