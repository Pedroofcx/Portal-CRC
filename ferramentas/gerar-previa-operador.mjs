/**
 * PORTAL CRC — DADOS PARA A PRÉVIA DA TELA DO OPERADOR
 *
 * Uso:
 *   npm run previa-operador                                  quem mais encerrou no ciclo
 *   npm run previa-operador -- sirlene.guedes@clickdigital.com.br
 *
 * Copia do banco o que a tela do operador precisa e grava em
 * previas/dados-operador.json (ignorado pelo git). Depois: npm run dev e
 * http://localhost:5173/previas/operador.html
 *
 * Só lê. Usa a chave service_role do .env.import, que fica na sua máquina.
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'node:fs';

const ler = (arq, nome) => readFileSync(arq, 'utf8').match(new RegExp(`^${nome}\s*=\s*(.+)$`, 'm'))?.[1].trim().replace(/^["']|["']$/g, '');
const sb = createClient(ler('.env.local', 'VITE_SUPABASE_URL'),
  process.env.SUPABASE_SERVICE_ROLE_KEY || ler('.env.import', 'SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

const tudo = async (tabela) => {
  const { data, error } = await sb.from(tabela).select('*');
  if (error) { console.error(`Não consegui ler ${tabela}: ${error.message}`); process.exit(1); }
  return data;
};

const [colaboradores, tratativas, ciclos, pontuacoes, exigencias, apuracoes] = await Promise.all(
  ['colaborador_base', 'tratativa_base', 'ciclo_trimestral', 'pontuacao', 'elegibilidade_premio', 'apuracao'].map(tudo));

const ciclo = ciclos.find((c) => c.ativo);
if (!ciclo) { console.error('Nenhum ciclo ativo: a tela mostraria só o aviso de ciclo ausente.'); }

const agentes = colaboradores.filter((c) => c.papel === 'agente' && c.ativo !== false);
const encerradasNoCiclo = (id) => !ciclo ? 0 : tratativas.filter((t) => t.agente_responsavel_id === id
  && t.status === 'encerrada' && (t.data_encerramento || '') >= ciclo.data_inicio
  && (t.data_encerramento || '') <= `${ciclo.data_fim}T23:59:59`).length;

const email = process.argv[2]?.trim().toLowerCase();
const escolhida = email
  ? agentes.find((a) => a.email?.toLowerCase() === email)
  : [...agentes].sort((a, b) => encerradasNoCiclo(b.id) - encerradasNoCiclo(a.id))[0];
if (!escolhida) {
  console.error(`Agente não encontrado: ${email}. Agentes ativos:\n  ${agentes.map((a) => a.email).join('\n  ')}`);
  process.exit(1);
}

writeFileSync('previas/dados-operador.json', JSON.stringify({
  colaboradores, tratativas, ciclos, pontuacoes,
  elegibilidades: exigencias.filter((e) => e.ativa), apuracoes, escolhidaId: escolhida.id,
}));

console.log(`\nPrévia de ${escolhida.nome_completo}`);
console.log(`  ciclo ativo: ${ciclo ? `${ciclo.nome} (${ciclo.data_inicio} a ${ciclo.data_fim})` : 'nenhum'}`);
console.log(`  encerradas no ciclo: ${encerradasNoCiclo(escolhida.id)}`);
console.log('\nAgora: npm run dev e abra http://localhost:5173/previas/operador.html\n');
