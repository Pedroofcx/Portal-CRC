/**
 * Tela de login.
 *
 * O Portal CRC nunca teve uma: no Base44 o login era uma página da plataforma,
 * fora do sistema. Com a migração, ele passa a ser nosso.
 */

import React, { useState } from 'react';
import { supabase } from '@/api/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';

/** Traduz os erros do Supabase, que vêm em inglês e sem contexto. */
function mensagemDoErro(bruto) {
  const m = (bruto || '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Este e-mail ainda não foi confirmado.';
  if (m.includes('too many requests') || m.includes('rate limit')) {
    return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
  }
  if (m.includes('failed to fetch') || m.includes('network')) {
    return 'Sem conexão com o servidor. Verifique sua internet.';
  }
  return bruto || 'Não foi possível entrar. Tente novamente.';
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const entrar = async (e) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) {
      setErro(mensagemDoErro(error.message));
      setEnviando(false);
    }
    // Em caso de sucesso o AuthContext percebe a sessão e troca a tela sozinho.
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 superficie-escura p-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="space-y-1 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-xl font-bold text-white">
            C
          </div>
          <h1 className="pt-3 text-xl font-semibold text-white">Portal CRC</h1>
          <p className="text-sm text-muted-foreground">Central de Relacionamento</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={entrar} className="space-y-4">

              <div className="space-y-2">
                <Label htmlFor="email">E-mail corporativo</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@empresa.com.br"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>

              {erro && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{erro}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={enviando}>
                {enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {enviando ? 'Entrando...' : 'Entrar'}
              </Button>

            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Esqueceu a senha? Fale com o administrador do Portal.
        </p>

      </div>
    </div>
  );
}
