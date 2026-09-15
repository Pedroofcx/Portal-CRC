/**
 * Contexto de autenticação — Supabase.
 *
 * Substitui a versão do Base44, que falava com /api/apps/public/... e usava um
 * createAxiosClient que o exportador removeu. Sem isso, isLoadingPublicSettings
 * nunca virava false e o app ficava preso em "Carregando...".
 *
 * O contrato exposto é o mesmo de antes, campo por campo, para App.jsx,
 * ProtectedRoute.jsx e NavigationTracker.jsx continuarem funcionando sem
 * alteração. Os campos que só existiam no Base44 (appPublicSettings) ficam
 * como valores fixos.
 */

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { supabase } from '@/api/db';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);

  /** Converte o usuário do Supabase para o formato que o app já esperava. */
  const formatar = (u) => {
    if (!u) return null;
    const meta = u.user_metadata || {};
    return {
      id: u.id,
      email: u.email,
      full_name: meta.full_name || meta.nome_completo || u.email,
      role: u.app_metadata?.role || meta.role || 'user',
    };
  };

  const aplicarSessao = useCallback((sessao) => {
    if (sessao?.user) {
      setUser(formatar(sessao.user));
      setIsAuthenticated(true);
      setAuthError(null);
    } else {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: 'É preciso entrar para usar o Portal CRC.' });
    }
    setIsLoadingAuth(false);
    setAuthChecked(true);
  }, []);

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    const { data: { session } } = await supabase.auth.getSession();
    aplicarSessao(session);
    return session;
  }, [aplicarSessao]);

  useEffect(() => {
    checkUserAuth();

    // Mantém o app em dia com login, logout e renovação de token em outra aba.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      aplicarSessao(sessao);
    });
    return () => subscription?.unsubscribe();
  }, [checkUserAuth, aplicarSessao]);

  const logout = async () => {
    await supabase.auth.signOut();
    // onAuthStateChange devolve o app para a tela de login sozinho.
  };

  const navigateToLogin = () => {
    setAuthError({ type: 'auth_required', message: 'É preciso entrar para usar o Portal CRC.' });
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,  // não existe mais: era conceito do Base44
      appPublicSettings: null,         // idem
      authChecked,
      authError,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState: checkUserAuth,    // nome antigo, mesmo comportamento
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth precisa estar dentro de um AuthProvider');
  }
  return context;
};
