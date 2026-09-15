import { useCallback, useState } from 'react';
import { validarCampo } from '@/lib/validacao';

/**
 * Validação de formulário no padrão que as regras pedem.
 *
 * TRÊS DECISÕES QUE VÊM DIRETO DA REGRA
 *
 * 1. Valida no `onBlur`, não enquanto digita. Acusar "e-mail inválido" na
 *    terceira letra é hostil: a pessoa ainda está escrevendo.
 *
 * 2. Depois que um campo já mostrou erro, ele passa a corrigir a mensagem a
 *    cada tecla. Isso não contradiz o item 1 — enquanto o erro está na tela,
 *    ver a mensagem sumir no momento em que a correção fica certa é a
 *    confirmação que a pessoa espera.
 *
 * 3. No envio, valida TODOS os campos de uma vez. O código atual retornava no
 *    primeiro erro, então preencher um formulário errado virava uma sequência
 *    de tentativas: corrige um campo, envia, descobre o próximo.
 *
 * Uso:
 *   const f = useValidacao(valores, { nome_cliente: [obrigatorio('O nome')] });
 *   <input {...f.campo('nome_cliente')} />
 *   {f.erro('nome_cliente') && <p>{f.erro('nome_cliente')}</p>}
 */
export function useValidacao(valores, regras) {
  const [erros, setErros] = useState({});
  const [tocados, setTocados] = useState({});

  const validar = useCallback((nome, valor) => {
    const mensagem = validarCampo(valor, regras[nome] || []);
    setErros((atual) => ({ ...atual, [nome]: mensagem }));
    return mensagem;
  }, [regras]);

  /** Chamado quando o campo perde o foco. */
  const aoSair = useCallback((nome) => {
    setTocados((atual) => ({ ...atual, [nome]: true }));
    validar(nome, valores[nome]);
  }, [valores, validar]);

  /** Chamado a cada mudança — só revalida se o campo JÁ mostrou erro. */
  const aoMudar = useCallback((nome, valor) => {
    if (erros[nome]) validar(nome, valor);
  }, [erros, validar]);

  /** Valida o formulário inteiro. Devolve true se estiver tudo certo. */
  const validarTudo = useCallback(() => {
    const novos = {};
    let ok = true;
    for (const nome of Object.keys(regras)) {
      const mensagem = validarCampo(valores[nome], regras[nome]);
      novos[nome] = mensagem;
      if (mensagem) ok = false;
    }
    setErros(novos);
    setTocados(Object.fromEntries(Object.keys(regras).map((n) => [n, true])));
    return ok;
  }, [valores, regras]);

  /** Mensagem a exibir — só depois que o campo foi tocado. */
  const erro = useCallback((nome) => (tocados[nome] ? erros[nome] : null) || null, [erros, tocados]);

  const limpar = useCallback(() => {
    setErros({});
    setTocados({});
  }, []);

  /** Props prontas para o input: acessibilidade e eventos já ligados. */
  const campo = useCallback((nome) => ({
    onBlur: () => aoSair(nome),
    'aria-invalid': erro(nome) ? true : undefined,
    'aria-describedby': erro(nome) ? `${nome}-erro` : undefined,
  }), [aoSair, erro]);

  /** Quantos campos estão com erro — para o aviso no topo do formulário. */
  const totalDeErros = Object.keys(regras).filter((n) => tocados[n] && erros[n]).length;

  return { erro, campo, aoSair, aoMudar, validarTudo, limpar, totalDeErros };
}
