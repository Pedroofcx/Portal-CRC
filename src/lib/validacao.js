/**
 * Validadores de campo.
 *
 * Conforme documentacao/regras-ui-ux.md: a mensagem diz o que está errado e
 * o que fazer — "O CPF precisa ter 11 dígitos", não "Campo inválido".
 *
 * Cada validador devolve `null` quando está tudo certo, ou a mensagem. Essa
 * convenção deixa a checagem legível: `const erro = validar(...)`.
 */

const apenasDigitos = (v) => String(v ?? '').replace(/\D/g, '');

export const obrigatorio = (rotulo) => (valor) => {
  const vazio = valor === null || valor === undefined || String(valor).trim() === ''
    || (Array.isArray(valor) && valor.length === 0);
  return vazio ? `${rotulo} é obrigatório.` : null;
};

export const email = (valor) => {
  if (!valor) return null;
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(valor).trim());
  return ok ? null : 'Digite um e-mail completo, no formato nome@empresa.com.br.';
};

/**
 * E-mail do domínio da empresa. Compara o que vem DEPOIS do "@", e não o fim
 * do texto: `x@falsoclickdigital.com.br` termina igual, mas é outro domínio.
 * Maiúsculas e espaços nas pontas não contam — o navegador e o celular
 * costumam inserir os dois sem a pessoa perceber.
 */
export const emailCorporativo = (dominio) => (valor) => {
  if (!valor) return null;
  const texto = String(valor).trim().toLowerCase();
  const doDominio = texto.split('@').length === 2 && texto.split('@')[1] === dominio.toLowerCase();
  return doDominio ? null : `Use o seu e-mail corporativo, terminado em @${dominio}.`;
};

export const url = (rotulo = 'O endereço') => (valor) => {
  if (!valor) return null;
  const texto = String(valor).trim();
  if (!/^https?:\/\//i.test(texto)) {
    return `${rotulo} precisa começar com http:// ou https://`;
  }
  try {
    new URL(texto);
    return null;
  } catch {
    return `${rotulo} não é um endereço válido.`;
  }
};

export const cpf = (valor) => {
  if (!valor) return null;
  const d = apenasDigitos(valor);
  if (d.length !== 11) return `O CPF precisa ter 11 dígitos. Você digitou ${d.length}.`;
  if (/^(\d)\1{10}$/.test(d)) return 'Este CPF não existe — todos os dígitos são iguais.';

  const digito = (ate) => {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(d[i]) * (ate + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  if (digito(9) !== Number(d[9]) || digito(10) !== Number(d[10])) {
    return 'Este CPF não é válido. Confira os números digitados.';
  }
  return null;
};

export const cnpj = (valor) => {
  if (!valor) return null;
  const d = apenasDigitos(valor);
  if (d.length !== 14) return `O CNPJ precisa ter 14 dígitos. Você digitou ${d.length}.`;
  if (/^(\d)\1{13}$/.test(d)) return 'Este CNPJ não existe — todos os dígitos são iguais.';

  const digito = (ate) => {
    let peso = ate - 7;
    let soma = 0;
    for (let i = 0; i < ate; i++) {
      soma += Number(d[i]) * peso--;
      if (peso < 2) peso = 9;
    }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  if (digito(12) !== Number(d[12]) || digito(13) !== Number(d[13])) {
    return 'Este CNPJ não é válido. Confira os números digitados.';
  }
  return null;
};

export const minimoCaracteres = (n, rotulo) => (valor) => {
  if (!valor) return null;
  const tamanho = String(valor).trim().length;
  return tamanho < n
    ? `${rotulo} precisa ter pelo menos ${n} caracteres. Você digitou ${tamanho}.`
    : null;
};

export const maximoCaracteres = (n, rotulo) => (valor) => {
  if (!valor) return null;
  const tamanho = String(valor).length;
  return tamanho > n
    ? `${rotulo} pode ter no máximo ${n} caracteres. Você digitou ${tamanho}.`
    : null;
};

export const numeroPositivo = (rotulo) => (valor) => {
  if (valor === '' || valor === null || valor === undefined) return null;
  const n = Number(String(valor).replace(',', '.'));
  if (Number.isNaN(n)) return `${rotulo} precisa ser um número.`;
  return n <= 0 ? `${rotulo} precisa ser maior que zero.` : null;
};

export const dataNaoFutura = (rotulo) => (valor) => {
  if (!valor) return null;
  const texto = String(valor);

  /*
   * "AAAA-MM-DD" é o que o <input type="date"> entrega, e representa um DIA
   * civil, sem hora. O JavaScript interpreta essa string como meia-noite em
   * UTC — que, no horário de Brasília, é o dia anterior às 21h. O efeito era
   * uma data de amanhã passar como se fosse hoje.
   *
   * Para dia civil, a comparação correta é de texto: no formato AAAA-MM-DD a
   * ordem alfabética coincide com a cronológica, e nenhum fuso entra na
   * conta.
   */
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const agora = new Date();
    const hoje = `${agora.getFullYear()}-`
      + `${String(agora.getMonth() + 1).padStart(2, '0')}-`
      + `${String(agora.getDate()).padStart(2, '0')}`;
    return texto > hoje ? `${rotulo} não pode ser uma data futura.` : null;
  }

  const d = new Date(texto);
  if (Number.isNaN(d.getTime())) return `${rotulo} não é uma data válida.`;
  const limite = new Date();
  limite.setHours(23, 59, 59, 999);
  return d > limite ? `${rotulo} não pode ser uma data futura.` : null;
};

export const maximoItens = (n, rotulo) => (valor) => {
  if (!Array.isArray(valor)) return null;
  return valor.length > n
    ? `Selecione no máximo ${n} ${rotulo}. Você selecionou ${valor.length}.`
    : null;
};

/** Aplica os validadores em ordem e devolve a primeira mensagem. */
export function validarCampo(valor, validadores = []) {
  for (const v of validadores) {
    const erro = v(valor);
    if (erro) return erro;
  }
  return null;
}
