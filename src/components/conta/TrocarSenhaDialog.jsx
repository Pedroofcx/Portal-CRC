import React, { useMemo, useState } from 'react';
import db from '@/api/db';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CampoFormulario from '@/components/ui/CampoFormulario';
import { useValidacao } from '@/hooks/useValidacao';
import { Eye, EyeOff, KeyRound } from 'lucide-react';

const MINIMO = 8;
const VAZIO = { senha_atual: '', nova_senha: '', confirmar_senha: '' };

/**
 * Troca de senha — voluntária (pelo menu da conta) ou obrigatória (primeiro
 * acesso com senha provisória).
 *
 * Na versão obrigatória o diálogo não fecha: sem X, sem Esc, sem clique fora.
 * A senha provisória passou pela mão de outra pessoa, e o sistema tem salário
 * e dado de cliente. Mas a pessoa não fica presa — "Sair" continua ali.
 */
export default function TrocarSenhaDialog({ aberto, aoFechar, obrigatoria = false, aoConcluir }) {
  const [valores, setValores] = useState(VAZIO);
  const [mostrar, setMostrar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroServidor, setErroServidor] = useState({});

  /*
   * As mensagens não usam o `obrigatorio()` genérico: ele diz "é obrigatório",
   * no masculino, e "A senha atual é obrigatório" é o tipo de descuido que faz
   * o sistema parecer mal-acabado justamente na tela de segurança.
   *
   * O tamanho não passa por `minimoCaracteres`, que apara espaços — numa
   * senha, espaço é caractere válido.
   */
  const regras = useMemo(() => ({
    senha_atual: [(v) => (v ? null : 'Digite a sua senha atual.')],
    nova_senha: [
      (v) => (v ? null : 'Digite a nova senha.'),
      (v) => (!v || v.length >= MINIMO
        ? null
        : `A nova senha precisa ter pelo menos ${MINIMO} caracteres. Você digitou ${v.length}.`),
    ],
    confirmar_senha: [
      (v) => (v ? null : 'Digite a nova senha mais uma vez.'),
      (v) => (!v || v === valores.nova_senha
        ? null
        : 'As duas senhas não são iguais. Digite de novo com calma.'),
    ],
  }), [valores.nova_senha]);

  const f = useValidacao(valores, regras);

  const alterar = (nome) => (e) => {
    const valor = e.target.value;
    setValores((atual) => ({ ...atual, [nome]: valor }));
    setErroServidor((atual) => ({ ...atual, [nome]: null }));
    f.aoMudar(nome, valor);
  };

  // O erro do servidor (ex.: "senha atual não confere") tem prioridade sobre o
  // da validação local, e aparece no mesmo lugar: junto do campo.
  const erroDo = (nome) => erroServidor[nome] || f.erro(nome);

  const propsDoCampo = (nome, idAjuda) => ({
    id: nome,
    type: mostrar ? 'text' : 'password',
    value: valores[nome],
    onChange: alterar(nome),
    onBlur: () => f.aoSair(nome),
    'aria-invalid': erroDo(nome) ? true : undefined,
    'aria-describedby': erroDo(nome) ? `${nome}-erro` : idAjuda,
  });

  const fechar = () => {
    if (obrigatoria || salvando) return;
    setValores(VAZIO);
    setErroServidor({});
    f.limpar();
    aoFechar?.();
  };

  const enviar = async (e) => {
    e.preventDefault();
    if (!f.validarTudo()) return;

    setSalvando(true);
    try {
      await db.auth.trocarSenha(valores.senha_atual, valores.nova_senha);
      toast.success('Senha trocada. Use a nova no próximo acesso.');
      setValores(VAZIO);
      f.limpar();
      aoConcluir?.();
      if (!obrigatoria) aoFechar?.();
    } catch (erro) {
      if (erro.campo) setErroServidor({ [erro.campo]: erro.message });
      else toast.error(erro.message);
    } finally {
      setSalvando(false);
    }
  };

  const bloquearFechamento = obrigatoria ? (e) => e.preventDefault() : undefined;

  return (
    <Dialog open={aberto} onOpenChange={(v) => { if (!v) fechar(); }}>
      <DialogContent
        className="max-w-md"
        semBotaoFechar={obrigatoria}
        onEscapeKeyDown={bloquearFechamento}
        onInteractOutside={bloquearFechamento}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" aria-hidden="true" />
            {obrigatoria ? 'Crie a sua senha' : 'Trocar senha'}
          </DialogTitle>
          <DialogDescription>
            {obrigatoria
              ? 'Você entrou com uma senha provisória, que passou pela mão de outra pessoa. Antes de continuar, defina uma senha que só você conheça.'
              : 'Por segurança, confirme a senha atual antes de definir a nova.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-4" noValidate>
          <CampoFormulario
            id="senha_atual"
            rotulo={obrigatoria ? 'Senha provisória' : 'Senha atual'}
            erro={erroDo('senha_atual')}
            obrigatorio
          >
            <Input autoComplete="current-password" {...propsDoCampo('senha_atual')} />
          </CampoFormulario>

          <CampoFormulario
            id="nova_senha"
            rotulo="Nova senha"
            erro={erroDo('nova_senha')}
            ajuda={`Pelo menos ${MINIMO} caracteres. Uma frase curta é mais forte e mais fácil de lembrar do que uma palavra cheia de símbolos.`}
            obrigatorio
          >
            <Input autoComplete="new-password" {...propsDoCampo('nova_senha', 'nova_senha-ajuda')} />
          </CampoFormulario>

          <CampoFormulario
            id="confirmar_senha"
            rotulo="Repita a nova senha"
            erro={erroDo('confirmar_senha')}
            obrigatorio
          >
            <Input autoComplete="new-password" {...propsDoCampo('confirmar_senha')} />
          </CampoFormulario>

          <button
            type="button"
            onClick={() => setMostrar((v) => !v)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            aria-pressed={mostrar}
          >
            {mostrar
              ? <EyeOff className="h-4 w-4" aria-hidden="true" />
              : <Eye className="h-4 w-4" aria-hidden="true" />}
            {mostrar ? 'Esconder as senhas' : 'Mostrar as senhas'}
          </button>

          <DialogFooter className="gap-2 sm:gap-0">
            {obrigatoria ? (
              <Button type="button" variant="ghost" onClick={() => db.auth.logout()} disabled={salvando}>
                Sair
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={fechar} disabled={salvando}>
                Cancelar
              </Button>
            )}
            <Button type="submit" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar nova senha'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
