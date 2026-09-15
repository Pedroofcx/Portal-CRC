/**
 * PORTAL CRC — TESTE DE INVASÃO (Fase 03)
 *
 * Entra como um agente comum e tenta fazer o que um agente NÃO deveria
 * conseguir. Cada tentativa que der certo é uma falha de segurança.
 *
 * Uso:
 *   node ferramentas/testar-seguranca.mjs teste.agente@clickdigital.com.br SENHA
 *
 * O teste usa a mesma chave anon que vai no navegador dos 10 usuários — ou
 * seja, ele tem exatamente o poder que qualquer pessoa da equipe teria ao
 * abrir o DevTools. Não usa nenhum atalho de administrador.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const SALARIO_ALVO = 12345.67;   // o que preparar-teste-seguranca.sql gravou
const CUSTO_ALVO   = 987.65;     // idem, na tratativa de teste

const env = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const ler = (n) => env.match(new RegExp(`^${n}\\s*=\\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');

const URL_SUPABASE = ler('VITE_SUPABASE_URL');
const CHAVE_ANON = ler('VITE_SUPABASE_ANON_KEY');

const [email, senha] = process.argv.slice(2);
if (!email || !senha) {
  console.error('Uso: node ferramentas/testar-seguranca.mjs <email-do-agente> <senha>');
  process.exit(1);
}

/**
 * Um INSERT pode falhar por muitos motivos: coluna inexistente, tipo errado,
 * campo obrigatório em branco. Só um deles é segurança. Tratar qualquer erro
 * como "bloqueado" transforma um teste de invasão em teatro: ele passaria
 * igual com a segurança desligada.
 */
const ehBloqueioDeSeguranca = (error) => {
  if (!error) return false;
  const m = `${error.code || ''} ${error.message || ''}`.toLowerCase();
  return m.includes('42501')
      || m.includes('row-level security')
      || m.includes('permission denied')
      || m.includes('violates row-level');
};

const resultados = [];
const registrar = (nome, passou, detalhe) => {
  resultados.push({ nome, passou, detalhe });
  console.log(`  ${passou ? '✅ PASSOU ' : '❌ FALHOU '} ${nome}`);
  if (detalhe) console.log(`             ${detalhe}`);
};

console.log('\n══ TESTE DE SEGURANÇA — PORTAL CRC ══\n');

// ---------------------------------------------------------------- 1. anônimo
console.log('1) Sem login nenhum (visitante com a chave pública):');
{
  const anon = createClient(URL_SUPABASE, CHAVE_ANON);
  const { data, error } = await anon.from('colaborador').select('nome_completo, salario');
  const vazio = !data || data.length === 0;
  registrar(
    'Visitante não lê colaborador',
    vazio || Boolean(error),
    vazio ? 'nenhuma linha devolvida' : `LEU ${data.length} linha(s) sem login!`
  );
}

// ------------------------------------------------------------------ 2. login
console.log('\n2) Entrando como agente:');
const agente = createClient(URL_SUPABASE, CHAVE_ANON);
const { data: sessao, error: erroLogin } = await agente.auth.signInWithPassword({ email, password: senha });
if (erroLogin) {
  console.error(`\n  Não consegui entrar: ${erroLogin.message}`);
  console.error('  Confira o e-mail/senha e se o usuário foi criado com "Auto Confirm User".\n');
  process.exit(1);
}
console.log(`  Entrou como ${sessao.user.email}`);

const { data: papel } = await agente.rpc('papel_atual');
registrar('O sistema reconhece o papel como agente', papel === 'agente', `papel_atual() = ${papel ?? 'null'}`);
if (papel !== 'agente') {
  console.error('\n  O teste não faz sentido se o usuário não for agente. Rode o preparar-teste-seguranca.sql.\n');
  process.exit(1);
}

// --------------------------------------------------------- 3. ler o proibido
console.log('\n3) Tentando LER o que não pode:');
{
  const { data } = await agente.from('colaborador').select('nome_completo, email, salario');
  const comSalario = (data || []).filter(c => c.salario !== null);
  registrar(
    'Agente não vê salário de ninguém',
    comSalario.length === 0,
    comSalario.length
      ? `VIU ${comSalario.length}: ${comSalario.map(c => `${c.nome_completo}=${c.salario}`).join(', ')}`
      : `leu ${data?.length ?? 0} colaborador(es), todos com salario = null`
  );

  const achouAlvo = (data || []).some(c => Number(c.salario) === SALARIO_ALVO);
  registrar('O salário do gestor não vazou', !achouAlvo,
    achouAlvo ? `encontrou ${SALARIO_ALVO} — a máscara não está funcionando` : 'valor-alvo não aparece');

  const { data: promo } = await agente.from('colaborador').select('promocoes');
  const comPromo = (promo || []).filter(c => c.promocoes !== null);
  registrar('Agente não vê histórico de promoções', comPromo.length === 0,
    comPromo.length ? `VIU ${comPromo.length} registro(s)` : 'todos null');
}
{
  const { data } = await agente.from('tratativa').select('id, custo_operacional_reais');
  const comCusto = (data || []).filter(t => t.custo_operacional_reais !== null);
  if (!data || data.length === 0) {
    registrar('Agente não vê custo operacional', false,
      'INCONCLUSIVO: nenhuma tratativa no banco. Rode o preparar-teste-seguranca.sql atualizado.');
  } else {
    registrar('Agente não vê custo operacional', comCusto.length === 0,
      comCusto.length ? `VIU ${comCusto.length} com custo (alvo era ${CUSTO_ALVO})`
                      : `leu ${data.length} tratativa(s), custo sempre null`);
  }
}

// ------------------------------------------------- 4. escrever o proibido
console.log('\n4) Tentando ESCREVER o que não pode:');
{
  const { error } = await agente.from('pontuacao').insert({
    colaborador_id: 'teste-invasao',
    periodo_trimestre: '2026-Q3',
    colaborador_nome: 'INVASAO',
    total_pontos: 9999,
  });
  const bloqueado = ehBloqueioDeSeguranca(error);
  registrar(
    'Agente não cria pontuação para si',
    bloqueado,
    bloqueado ? 'bloqueado pelo RLS'
      : error ? `falhou pelo MOTIVO ERRADO (${error.code}: ${error.message.slice(0, 60)}) — não prova nada`
      : 'INSERIU 9999 PONTOS!'
  );
}
{
  // Sem maybeSingle(): ele estoura quando ha e-mail duplicado, e o bloco inteiro
  // era pulado em silencio — o teste sumia do relatorio sem ninguem notar.
  const { data: meus } = await agente.from('colaborador').select('id, papel').eq('email', email);
  if ((meus?.length ?? 0) > 1) {
    registrar('Cadastro do agente nao esta duplicado', false,
      `ACHOU ${meus.length} linhas com o e-mail ${email} — papel_atual() usa "limit 1" e escolheria uma ao acaso`);
  }
  const eu = meus?.[0];
  if (!eu) {
    registrar('Agente não se promove a gestor', false,
      'INCONCLUSIVO: não achei o cadastro do agente por e-mail.');
  } else {
    const { error } = await agente.from('colaborador').update({ papel: 'gestor' }).eq('id', eu.id);
    let virou = false;
    if (!error) {
      const { data: v } = await agente.from('colaborador').select('papel').eq('id', eu.id).maybeSingle();
      virou = v?.papel === 'gestor';
    }
    registrar('Agente não se promove a gestor', Boolean(error) || !virou,
      virou ? 'VIROU GESTOR SOZINHO!' : (error ? error.message.slice(0, 80) : 'alteração ignorada'));
  }
}
{
  const { data: linhas } = await agente.from('log_auditoria').select('id').limit(1);
  if (linhas?.length) {
    const { error } = await agente.from('log_auditoria').delete().eq('id', linhas[0].id);
    const { data: aindaLa } = await agente.from('log_auditoria').select('id').eq('id', linhas[0].id);
    const sobreviveu = (aindaLa?.length ?? 0) > 0;
    registrar('Agente não apaga trilha de auditoria', sobreviveu,
      sobreviveu ? (error ? 'bloqueado com erro' : 'exclusão ignorada, registro intacto') : 'APAGOU O REGISTRO!');
  } else {
    registrar('Agente não apaga trilha de auditoria', false,
      'INCONCLUSIVO: log_auditoria vazio. Rode o preparar-teste-seguranca.sql atualizado.');
  }
}

// -------------------------------------------------------------------- fim
await agente.auth.signOut();

const falhas = resultados.filter(r => !r.passou);
console.log('\n══════════════════════════════════════');
console.log(`${resultados.length - falhas.length} de ${resultados.length} testes passaram`);
if (falhas.length) {
  console.log(`\n${falhas.length} FALHA(S) DE SEGURANÇA:`);
  falhas.forEach(f => console.log(`  • ${f.nome} — ${f.detalhe}`));
  console.log('\nNÃO importe dados reais até isso estar resolvido.\n');
  process.exit(1);
}
console.log('\nNenhuma brecha encontrada. Fase 03 fechada.\n');
