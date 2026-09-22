import React from 'react';
import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * Telas de relatório antigas que viraram grupos da página Relatórios
 * (22/09/2026). Quem tem o link antigo salvo cai no grupo certo.
 */
export const redirecionarPara = (grupo) => function RelatorioAntigo() {
  return <Navigate to={`${createPageUrl('Relatorios')}?grupo=${grupo}`} replace />;
};
