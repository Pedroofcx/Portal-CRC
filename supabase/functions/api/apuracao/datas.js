/**
 * Datas dos arquivos de apuração. Cada fonte escreve a data de um jeito —
 * 55PBX manda DD/MM/AAAA, o Zendesk manda AAAA-MM-DD com hora junto, e a
 * planilha de CX depende de quem digitou. Aqui tudo vira "AAAA-MM-DD".
 */

/** Normaliza a data do arquivo. Devolve null quando não dá para entender. */
export function normalizarData(valor) {
  if (!valor) return null;
  const texto = String(valor).trim().replace(/["\r\n]/g, '');
  if (!texto) return null;

  let d;
  let m;
  let a;

  if (texto.includes('/')) {
    const partes = texto.split(' ')[0].split('/');
    if (partes.length !== 3) return null;
    [d, m, a] = partes.map((p) => p.trim());
    // AAAA/MM/DD chega com o ano na frente.
    if (parseInt(d, 10) > 31) [a, m, d] = [d, m, a];
    if (a.length === 2) a = parseInt(a, 10) >= 50 ? `19${a}` : `20${a}`;
  } else if (texto.includes('-')) {
    const partes = texto.split('T')[0].split(' ')[0].split('-');
    if (partes.length !== 3) return null;
    if (partes[0].length === 4) [a, m, d] = partes;
    else {
      [d, m, a] = partes;
      if (a.length === 2) a = parseInt(a, 10) >= 50 ? `19${a}` : `20${a}`;
    }
  } else return null;

  const di = parseInt(d, 10);
  const mi = parseInt(m, 10);
  const ai = parseInt(a, 10);
  if (Number.isNaN(di) || Number.isNaN(mi) || Number.isNaN(ai)) return null;
  if (mi < 1 || mi > 12 || di < 1 || di > 31) return null;

  return `${ai}-${String(mi).padStart(2, '0')}-${String(di).padStart(2, '0')}`;
}

/** Nome comparável: sem acento, sem pontuação, minúsculo, espaço simples. */
export const nomeComparavel = (nome) => String(nome ?? '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^a-zA-Z\s]/g, ' ')
  .trim()
  .replace(/\s+/g, ' ')
  .toLowerCase();
