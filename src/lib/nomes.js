/**
 * Primeiro nome de uma pessoa, para saudação: "Ana Flávia Guelber" -> "Ana".
 *
 * Vem do cadastro de colaborador, e NUNCA do e-mail. Cadastro em caixa alta
 * ("TEFÃO FURACÃO") vira "Tefão": saudação gritando não é saudação.
 *
 * Sem nome utilizável, devolve "Time" — "Boa tarde, Time." ainda é uma frase
 * que faz sentido, e um e-mail no lugar do nome não é.
 */
export function primeiroNome(nomeCompleto) {
  const primeiro = String(nomeCompleto ?? '').trim().split(/\s+/)[0] ?? '';
  if (!primeiro || primeiro.includes('@')) return 'Time';

  const tudoMaiusculo = primeiro === primeiro.toLocaleUpperCase('pt-BR')
    && primeiro !== primeiro.toLocaleLowerCase('pt-BR');
  if (!tudoMaiusculo) return primeiro;

  const minusculo = primeiro.toLocaleLowerCase('pt-BR');
  return minusculo.charAt(0).toLocaleUpperCase('pt-BR') + minusculo.slice(1);
}
