/**
 * PORTAL CRC — CONFERÊNCIA DE CORES (roda junto com o npm run lint)
 *
 * Três padrões que já apareceram no sistema e não podem voltar:
 *
 *   1. TEXTO DA COR DO FUNDO — `bg-warning` com `text-warning` no mesmo
 *      elemento: âmbar sobre âmbar, texto invisível. Aconteceu em 12 lugares
 *      depois da troca de cores da Fase 05 (o detalhamento de pontos da
 *      tratativa inteiro sumia).
 *   2. BRANCO SOBRE FUNDO CLARO — `text-white` com `bg-muted`/`bg-card`
 *      (a não ser na superfície escura, que escurece o próprio fundo).
 *   3. CARD INTEIRO DE COR CHEIA — contra a regra de cor suave
 *      (regras-ui-ux.md, seção 9): superfície neutra, cor só no detalhe.
 *
 * Olha o atributo className linha a linha. Não pega tudo — cor que vem de
 * variável escapa —, mas pega o jeito como esses erros de fato apareceram.
 *
 * As expressões usam String.raw: sem ele, "\b" dentro de crases vira o
 * caractere backspace, e a regra nunca casaria — o verificador passaria
 * sempre. Foi o que aconteceu na primeira versão deste arquivo.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const CORES = 'primary|warning|success|critical|info|destructive|chart-[1-5]';
const solido = () => new RegExp(String.raw`\bbg-(${CORES})(?![-/\w])`, 'g');
const textoDa = (cor) => new RegExp(String.raw`\btext-${cor}(?![-/\w])`);
const CLARO = /\bbg-(muted|card|background|secondary|accent)(?![-/\w])/;
const BRANCO = /\btext-white\b/;
const CLASSE = /className=(\{`[^`]*`\}|"[^"]*"|'[^']*')/g;

function arquivos(dir) {
  return readdirSync(dir).flatMap((nome) => {
    const p = path.join(dir, nome);
    return statSync(p).isDirectory() ? arquivos(p) : p.endsWith('.jsx') ? [p] : [];
  });
}

/**
 * As combinações que de fato chegam juntas ao elemento. Num template com
 * condição — `x ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'` —
 * o branco nunca encontra o fundo claro: cada ramo é somado à parte fixa e
 * conferido separado.
 */
function combinacoes(cls) {
  if (!cls.startsWith('{`')) return [cls];
  const ramos = [...cls.matchAll(/'[^']*'|"[^"]*"/g)].map((r) => r[0]);
  const fixo = cls.replace(/'[^']*'|"[^"]*"/g, ' ');
  return ramos.length ? ramos.map((r) => `${fixo} ${r}`) : [fixo];
}

export function conferirLinha(linha) {
  const achados = new Set();
  for (const m of linha.matchAll(CLASSE)) {
    for (const cls of combinacoes(m[1])) {
      for (const [, cor] of cls.matchAll(solido())) {
        if (textoDa(cor).test(cls)) achados.add(`texto da cor do fundo (${cor})`);
      }
      if (BRANCO.test(cls) && CLARO.test(cls) && !cls.includes('superficie-escura')) {
        achados.add('texto branco sobre fundo claro');
      }
    }
  }
  const classeDoCard = linha.match(/<Card\b[^>]*className=("[^"]*"|\{`[^`]*`\})/)?.[1];
  if (classeDoCard && solido().test(classeDoCard)) {
    achados.add('card inteiro de cor cheia — use o fundo -soft, ou cor só no detalhe');
  }
  return [...achados];
}

// Varre o projeto só quando rodado como comando — importado (pelos testes),
// expõe apenas conferirLinha.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const problemas = [];
  for (const arq of arquivos('src')) {
    readFileSync(arq, 'utf8').split('\n').forEach((linha, i) => {
      conferirLinha(linha).forEach((p) => problemas.push(`${arq}:${i + 1}  ${p}`));
    });
  }

  if (problemas.length) {
    console.error(`\nConferência de cores: ${problemas.length} problema(s)\n`);
    problemas.forEach((p) => console.error(`  ${p}`));
    console.error('\nVer documentacao/regras-ui-ux.md, seção 9.\n');
    process.exit(1);
  }
  console.log('Conferência de cores: nenhum problema.');
}
