/**
 * Saudação pela hora de quem está abrindo a tela.
 *
 *   00:00 até 12:00  Bom dia
 *   12:01 até 18:00  Boa tarde
 *   18:01 até 23:59  Boa noite
 *
 * Os limites são inclusivos no fim — 12:00 ainda é "bom dia", 18:00 ainda é
 * "boa tarde" —, por isso a conta é em minutos e com `<=`. Os limites estão
 * no `npm run testar`, porque trocar `<=` por `<` quebra isso em silêncio.
 */
export function saudacao(agora = new Date()) {
  const minutos = agora.getHours() * 60 + agora.getMinutes();
  if (minutos <= 12 * 60) return 'Bom dia';
  if (minutos <= 18 * 60) return 'Boa tarde';
  return 'Boa noite';
}
