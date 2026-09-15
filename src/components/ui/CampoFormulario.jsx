import React from 'react';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';

/**
 * Campo de formulário com rótulo permanente e mensagem de erro no lugar certo.
 *
 * Conforme documentacao/regras-ui-ux.md:
 *   - o rótulo fica SEMPRE visível acima do campo; placeholder nunca faz as
 *     vezes dele, porque ele some assim que a pessoa começa a digitar — e
 *     quem volta ao formulário depois não sabe mais o que era aquele campo;
 *   - a mensagem de erro aparece junto do campo, não num toast no canto da
 *     tela, onde some sozinha e obriga a adivinhar qual campo reclamou;
 *   - o campo recebe `aria-invalid` e `aria-describedby`, então quem usa
 *     leitor de tela ouve o erro junto do campo, e não como um aviso solto.
 *
 * `children` recebe as props que o input precisa — deixa o componente
 * funcionar com Input, Textarea, Select ou qualquer outro.
 */
export default function CampoFormulario({
  id,
  rotulo,
  erro,
  obrigatorio = false,
  ajuda,
  children,
  className = '',
}) {
  const idErro = `${id}-erro`;
  const idAjuda = `${id}-ajuda`;

  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label htmlFor={id} className={erro ? 'text-destructive' : undefined}>
        {rotulo}
        {obrigatorio && (
          <span className="ml-0.5 text-destructive" aria-label="obrigatório">*</span>
        )}
      </Label>

      {typeof children === 'function'
        ? children({
            id,
            'aria-invalid': erro ? true : undefined,
            'aria-describedby': erro ? idErro : ajuda ? idAjuda : undefined,
          })
        : children}

      {ajuda && !erro && (
        <p id={idAjuda} className="text-xs text-muted-foreground">{ajuda}</p>
      )}

      {erro && (
        <p id={idErro} role="alert" className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{erro}</span>
        </p>
      )}
    </div>
  );
}
