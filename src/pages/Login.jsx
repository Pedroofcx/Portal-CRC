/**
 * Tela de entrada.
 *
 * O Portal CRC nunca teve uma: no Base44 o login era uma página da plataforma,
 * fora do sistema. Com a migração, ele passa a ser nosso.
 *
 * Duas metades, com papéis opostos:
 *   - à esquerda, o painel com a equipe, o lema e uma frase — o ÚNICO lugar
 *     do sistema com animação contínua (regras-ui-ux.md, seção 8);
 *   - à direita, o formulário, que segue as regras de sempre e pode ser usado
 *     no instante em que a tela abre — ninguém espera animação para entrar.
 *
 * O que ficou de fora da referência, de propósito:
 *   - "Criar conta": o cadastro aberto está desligado; conta só nasce pelo
 *     administrador (npm run criar-contas).
 *   - "Manter conectado": o Supabase já mantém a sessão. Uma caixinha que não
 *     muda nada seria mentira na interface.
 *   - "Esqueci a senha" como link: o projeto ainda não tem serviço de e-mail
 *     próprio. O texto diz a verdade: quem redefine é o administrador.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/api/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CampoFormulario from '@/components/ui/CampoFormulario';
import PainelBoasVindas from '@/components/login/PainelBoasVindas';
import { useValidacao } from '@/hooks/useValidacao';
import { email as emailValido } from '@/lib/validacao';
import { saudacao } from '@/lib/saudacao';
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

/** Traduz os erros do Supabase, que vêm em inglês e sem contexto. */
function mensagemDoErro(bruto) {
  const m = (bruto || '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos. Confira os dois e tente de novo.';
  if (m.includes('email not confirmed')) return 'Este e-mail ainda não foi confirmado. Fale com o administrador do Portal.';
  if (m.includes('too many requests') || m.includes('rate limit')) {
    return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'Sem conexão com o servidor. Verifique sua internet.';
  }
  return bruto || 'Não foi possível entrar. Tente novamente.';
}

export default function Login() {
  const [valores, setValores] = useState({ email: '', senha: '' });
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const regras = useMemo(() => ({
    email: [
      (v) => (String(v || '').trim() ? null : 'Digite o seu e-mail corporativo.'),
      emailValido,
    ],
    senha: [(v) => (v ? null : 'Digite a sua senha.')],
  }), []);

  const f = useValidacao(valores, regras);

  // Reconfere a cada minuto: quem deixa a tela aberta às 11:58 vê "Boa
  // tarde" quando passar do meio-dia, sem precisar recarregar.
  const [ola, setOla] = useState(() => saudacao());
  useEffect(() => {
    const t = setInterval(() => setOla(saudacao()), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const alterar = (nome) => (e) => {
    const valor = e.target.value;
    setValores((atual) => ({ ...atual, [nome]: valor }));
    setErro(null);
    f.aoMudar(nome, valor);
  };

  const entrar = async (e) => {
    e.preventDefault();
    setErro(null);
    if (!f.validarTudo()) return;

    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: valores.email.trim(),
      password: valores.senha,
    });
    if (error) {
      setErro(mensagemDoErro(error.message));
      setEnviando(false);
    }
    // Em caso de sucesso o AuthContext percebe a sessão e troca a tela sozinho.
  };

  return (
    <div className="flex min-h-screen bg-card">
      <PainelBoasVindas />

      <main className="flex flex-1 items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">

          {/* Marca, só quando o painel da esquerda está escondido (tela estreita). */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
              C
            </span>
            <span className="text-lg font-semibold text-foreground">Portal CRC</span>
          </div>

          <div className="entrada-surgir mb-8 space-y-2">
            <p className="text-sm font-medium text-primary">{ola}!</p>
            <h1 className="text-4xl font-semibold tracking-tight text-foreground">
              Olá, Time!
            </h1>
            <p className="text-sm text-muted-foreground">
              Entre com o seu e-mail corporativo para acessar o Portal CRC.
            </p>
          </div>

          <form onSubmit={entrar} className="space-y-5" noValidate>
            <CampoFormulario id="email" rotulo="E-mail corporativo" erro={f.erro('email')}>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                autoFocus
                placeholder="nome@clickdigital.com.br"
                className="h-11"
                value={valores.email}
                onChange={alterar('email')}
                {...f.campo('email')}
              />
            </CampoFormulario>

            <CampoFormulario id="senha" rotulo="Senha" erro={f.erro('senha')}>
              <div className="relative">
                <Input
                  id="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="h-11 pr-11"
                  value={valores.senha}
                  onChange={alterar('senha')}
                  {...f.campo('senha')}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={mostrarSenha ? 'Esconder a senha' : 'Mostrar a senha'}
                  aria-pressed={mostrarSenha}
                >
                  {mostrarSenha
                    ? <EyeOff className="h-4 w-4" aria-hidden="true" />
                    : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </CampoFormulario>

            {erro && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{erro}</span>
              </div>
            )}

            <Button type="submit" className="h-11 w-full text-base" disabled={enviando}>
              {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {enviando ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <p className="mt-8 text-sm text-muted-foreground">
            Esqueceu a senha? Fale com o administrador do Portal.
          </p>
        </div>
      </main>
    </div>
  );
}
