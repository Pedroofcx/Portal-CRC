/**
 * LEITOR DE CSV — o de verdade.
 *
 * O leitor antigo da Apuração era um `split(',' ou ';')` por linha. Qualquer
 * campo com vírgula dentro (uma observação, um motivo, o nome de um cliente)
 * empurrava todas as colunas daquela linha para o lado, sem erro nenhum na
 * tela: o número saía errado e ninguém via.
 *
 * Aqui o texto é lido caractere a caractere, respeitando:
 *   - aspas, inclusive com o separador, quebra de linha e aspas duplas ("")
 *     dentro do campo;
 *   - separador , ou ; descoberto pelo cabeçalho (o Excel brasileiro usa ;);
 *   - quebras \r\n, \n e \r;
 *   - o BOM que o Excel põe no começo do arquivo.
 */

const BOM = '﻿';

/** Descobre o separador olhando a primeira linha fora de aspas. */
export function descobrirSeparador(texto) {
  let dentroDeAspas = false;
  const contagem = { ',': 0, ';': 0, '\t': 0 };
  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i];
    if (c === '"') { dentroDeAspas = !dentroDeAspas; continue; }
    if (dentroDeAspas) continue;
    if (c === '\n' || c === '\r') break;
    if (contagem[c] !== undefined) contagem[c] += 1;
  }
  const [melhor] = Object.entries(contagem).sort((a, b) => b[1] - a[1]);
  return melhor && melhor[1] > 0 ? melhor[0] : ',';
}

/** Quebra o texto em uma matriz de células, respeitando aspas. */
export function celulasDoCsv(texto, separador) {
  const linhas = [];
  let linha = [];
  let campo = '';
  let dentroDeAspas = false;

  const fecharCampo = () => { linha.push(campo.trim()); campo = ''; };
  const fecharLinha = () => { fecharCampo(); linhas.push(linha); linha = []; };

  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i];

    if (dentroDeAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i += 1; } // "" é uma aspa
        else dentroDeAspas = false;
      } else campo += c;
      continue;
    }

    if (c === '"') { dentroDeAspas = true; continue; }
    if (c === separador) { fecharCampo(); continue; }
    if (c === '\r') { if (texto[i + 1] === '\n') i += 1; fecharLinha(); continue; }
    if (c === '\n') { fecharLinha(); continue; }
    campo += c;
  }

  if (campo !== '' || linha.length > 0) fecharLinha();
  return linhas.filter((l) => l.some((celula) => celula !== ''));
}

/**
 * Lê o CSV inteiro.
 * @returns { colunas, linhas, separador, avisos } — `linhas` são objetos
 *   { [coluna]: valor }; colunas repetidas ganham sufixo (" (2)").
 */
export function lerCsv(texto) {
  const avisos = [];
  const limpo = String(texto ?? '').replace(BOM, '');
  if (!limpo.trim()) return { colunas: [], linhas: [], separador: ',', avisos: ['O arquivo está vazio.'] };

  const separador = descobrirSeparador(limpo);
  const matriz = celulasDoCsv(limpo, separador);
  if (matriz.length === 0) return { colunas: [], linhas: [], separador, avisos: ['O arquivo está vazio.'] };

  const vistas = new Map();
  const colunas = matriz[0].map((nome, i) => {
    const base = nome || `coluna ${i + 1}`;
    const repetida = vistas.get(base) ?? 0;
    vistas.set(base, repetida + 1);
    return repetida ? `${base} (${repetida + 1})` : base;
  });

  const linhas = [];
  let tortas = 0;
  matriz.slice(1).forEach((celulas) => {
    if (celulas.length !== colunas.length) tortas += 1;
    const linha = {};
    colunas.forEach((coluna, i) => { linha[coluna] = celulas[i] ?? ''; });
    linhas.push(linha);
  });

  if (tortas > 0) {
    avisos.push(`${tortas} linha(s) com um número de colunas diferente do cabeçalho — confira o arquivo antes de salvar.`);
  }
  return { colunas, linhas, separador, avisos };
}
