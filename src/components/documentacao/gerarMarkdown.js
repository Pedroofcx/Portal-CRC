// Junta os arquivos dados*.js e gera o Markdown da Documentação Técnica.
import { modulosOperacoes } from './dadosOperacoes';
import { modulosGestaoPessoas } from './dadosGestaoPessoas';
import { modulosComunicacao } from './dadosComunicacao';
import { modulosSistema } from './dadosSistema';
import { resumoDoSistema, secoesArquitetura } from './dadosArquitetura';
import { secoesDeRegras } from './dadosRegras';
import { secoesDeOperacao, legadoParaRemover } from './dadosOperacao';
import {
  gruposDeTabelas, tabelasSemEntidade, funcoesDoBanco, gatilhosDoBanco,
  objetosEspeciais, migracoes, pontosDeAtencao,
} from './dadosBanco';

export const CATEGORIAS = ['Operações', 'Gestão de Pessoas', 'Comunicação', 'Sistema'];

export const TODOS_MODULOS = [
  ...modulosOperacoes,
  ...modulosGestaoPessoas,
  ...modulosComunicacao,
  ...modulosSistema,
];

export {
  resumoDoSistema, secoesArquitetura, secoesDeRegras, secoesDeOperacao, legadoParaRemover,
  gruposDeTabelas, tabelasSemEntidade, funcoesDoBanco, gatilhosDoBanco, objetosEspeciais,
  migracoes, pontosDeAtencao,
};

const celula = (t) => String(t ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

function tabelaMd(tabela) {
  if (!tabela) return '';
  let md = `| ${tabela.colunas.map(celula).join(' | ')} |\n|${tabela.colunas.map(() => '---').join('|')}|\n`;
  tabela.linhas.forEach((l) => { md += `| ${l.map(celula).join(' | ')} |\n`; });
  return `${md}\n`;
}

/** Uma seção { titulo, fonte?, paragrafos?, itens?, tabela? } em Markdown. */
export function secaoEmMarkdown(secao, nivel = 3) {
  const marca = '#'.repeat(nivel);
  let md = `${marca} ${secao.titulo}\n\n`;
  if (secao.fonte) md += `*Fonte no código: ${secao.fonte}*\n\n`;
  (secao.paragrafos ?? []).forEach((p) => { md += `${p}\n\n`; });
  (secao.itens ?? []).forEach((i) => { md += `- **${i.rotulo}:** ${i.texto}\n`; });
  if (secao.itens?.length) md += '\n';
  md += tabelaMd(secao.tabela);
  return md;
}

export function moduloEmMarkdown(m) {
  let md = `### ${m.nome}\n\n**Acesso:** ${m.acesso}\n\n`;
  if (m.objetivo) md += `**Objetivo:** ${m.objetivo}\n\n`;
  if (m.paginas?.length) md += `**Arquivos:**\n\n${m.paginas.map((p) => `- \`${p}\``).join('\n')}\n\n`;
  if (m.entidades?.length) md += `**Tabelas (entidades):** ${m.entidades.map((e) => `\`${e}\``).join(', ')}\n\n`;
  if (m.fluxo) md += `**Fluxo:** ${m.fluxo}\n\n`;
  if (m.campos_chave?.length) md += `**Campos-chave:**\n\n${m.campos_chave.map((c) => `- \`${c.campo}\` — ${c.descricao}`).join('\n')}\n\n`;
  if (m.regras_negocio?.length) md += `**Regras de negócio:**\n\n${m.regras_negocio.map((r) => `- ${r}`).join('\n')}\n\n`;
  if (m.integracoes?.length) md += `**Integrações:**\n\n${m.integracoes.map((r) => `- ${r}`).join('\n')}\n\n`;
  return md;
}

export function bancoEmMarkdown() {
  let md = '';
  gruposDeTabelas.forEach((g) => {
    md += `### ${g.nome}\n\n`;
    md += tabelaMd({
      colunas: ['Entidade', 'Tabela', 'O que guarda', 'Quem lê', 'Quem escreve'],
      linhas: g.tabelas.map((t) => [t.entidade, t.tabela, t.descricao, t.leitura, t.escrita]),
    });
  });
  md += `### Tabelas sem entidade na API\n\n${tabelasSemEntidade.map((t) => `- \`${t}\``).join('\n')}\n\n`;
  md += `### Funções\n\n${funcoesDoBanco.map((f) => `- \`${f.nome}\` (migration ${f.migration}): ${f.descricao}`).join('\n')}\n\n`;
  md += `### Gatilhos\n\n${gatilhosDoBanco.map((g) => `- \`${g.nome}\` em \`${g.tabela}\`, ${g.quando} (migration ${g.migration}): ${g.descricao}`).join('\n')}\n\n`;
  md += `### Objetos especiais\n\n${objetosEspeciais.map((o) => `- **${o.nome}:** ${o.descricao}`).join('\n')}\n\n`;
  md += `### Migrations\n\n${migracoes.map((m) => `- **${m.n}. ${m.titulo}:** ${m.descricao}`).join('\n')}\n\n`;
  md += `### Pontos de atenção\n\n${pontosDeAtencao.map((p) => `- ${p}`).join('\n')}\n\n`;
  return md;
}

export function gerarMarkdown() {
  const quando = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  let md = `# Documentação Técnica — ${resumoDoSistema.nome}\n\n> ${resumoDoSistema.descricao}\n\n`;
  md += `**Gerado em:** ${quando}  \n**Módulos:** ${TODOS_MODULOS.length}\n\n---\n\n`;

  md += `## Arquitetura\n\n${secoesArquitetura.map((s) => secaoEmMarkdown(s)).join('')}---\n\n`;

  md += `## Módulos\n\n`;
  CATEGORIAS.forEach((cat) => {
    const mods = TODOS_MODULOS.filter((m) => m.categoria === cat);
    if (!mods.length) return;
    md += `## ${cat}\n\n${mods.map(moduloEmMarkdown).join('')}`;
  });
  md += `---\n\n## Banco de dados\n\n${bancoEmMarkdown()}---\n\n`;
  md += `## Regras de negócio\n\n${secoesDeRegras.map((s) => secaoEmMarkdown(s)).join('')}---\n\n`;
  md += `## Operação\n\n${secoesDeOperacao.map((s) => secaoEmMarkdown(s)).join('')}`;
  md += `### Legado para remover\n\n${legadoParaRemover.map((l) => `- **${l.item}:** ${l.motivo}`).join('\n')}\n\n`;
  md += `---\n\n*Fim da documentação técnica.*\n`;
  return md;
}

export function gerarJson() {
  return {
    sistema: resumoDoSistema,
    arquitetura: secoesArquitetura,
    modulos: TODOS_MODULOS,
    banco: { grupos: gruposDeTabelas, tabelasSemEntidade, funcoes: funcoesDoBanco, gatilhos: gatilhosDoBanco, objetosEspeciais, migracoes, pontosDeAtencao },
    regras: secoesDeRegras,
    operacao: { secoes: secoesDeOperacao, legado: legadoParaRemover },
  };
}
