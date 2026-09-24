import React from 'react';
import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * Tela antiga que virou parte de outra. Quem tem o link salvo (ou o menu
 * antigo no navegador) cai no lugar certo em vez de ver um erro.
 */
export const redirecionarParaPagina = (pagina) => function TelaAntiga() {
  return <Navigate to={createPageUrl(pagina)} replace />;
};
