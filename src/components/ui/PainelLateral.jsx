import React from 'react';
import * as Primitivo from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Painel lateral de altura cheia — o padrão para janelas altas
 * (regras-ui-ux.md, seção 9, padrão C).
 *
 * Uma janela no meio da tela com 20 campos vira uma caixa com rolagem própria,
 * e o botão de salvar some lá embaixo. Aqui:
 *   - o painel ocupa a altura inteira, à direita — a lista de onde a pessoa
 *     veio continua à vista, esmaecida, à esquerda;
 *   - o TÍTULO fica fixo em cima e os BOTÕES fixos embaixo: só os campos
 *     rolam, e "Salvar" está sempre a um clique;
 *   - com `aoEnviar`, corpo e rodapé ficam dentro de um <form>: Enter envia e
 *     o botão type="submit" do rodapé funciona como antes.
 *
 * Janela curta (confirmação, 3 ou 4 campos) continua sendo Dialog.
 */
const LARGURAS = {
  md: 'sm:max-w-md',
  lg: 'sm:max-w-xl',
  xl: 'sm:max-w-2xl',
  '2xl': 'sm:max-w-3xl',
  '4xl': 'sm:max-w-5xl',
};

/**
 * A linha de botões de um formulário DENTRO do painel: gruda no fim da área
 * que rola, então "Salvar" continua à vista enquanto os campos passam por
 * trás. Serve quando os botões moram dentro de um <form> que o painel não
 * controla (formulário dentro de uma aba, por exemplo).
 */
export function RodapeFixo({ className, children }) {
  return (
    <div className={cn('sticky bottom-0 z-10 -mx-6 -mb-5 mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-card px-6 py-3', className)}>
      {children}
    </div>
  );
}

export default function PainelLateral({
  open,
  onOpenChange,
  titulo,
  descricao,
  icone: Icone,
  rodape,
  aoEnviar,
  largura = 'xl',
  semBotaoFechar = false,
  className,
  children,
}) {
  const corpoERodape = (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      {rodape && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-card px-6 py-3">
          {rodape}
        </div>
      )}
    </>
  );

  return (
    <Primitivo.Root open={open} onOpenChange={onOpenChange}>
      <Primitivo.Portal>
        <Primitivo.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Primitivo.Content
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col border-l border-border bg-background shadow-lg',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right data-[state=closed]:duration-200 data-[state=open]:duration-300',
            LARGURAS[largura] ?? LARGURAS.xl,
            className,
          )}
        >
          <div className="flex items-start gap-3 border-b border-border bg-card px-6 py-4 pr-12">
            {Icone && (
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icone className="h-4 w-4" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0">
              <Primitivo.Title className="text-lg font-semibold leading-tight text-foreground">{titulo}</Primitivo.Title>
              {descricao ? (
                <Primitivo.Description className="mt-1 text-sm text-muted-foreground">{descricao}</Primitivo.Description>
              ) : (
                <Primitivo.Description className="sr-only">{typeof titulo === 'string' ? titulo : 'Painel'}</Primitivo.Description>
              )}
            </div>
          </div>

          {aoEnviar ? (
            <form onSubmit={aoEnviar} className="flex min-h-0 flex-1 flex-col" noValidate>
              {corpoERodape}
            </form>
          ) : corpoERodape}

          {!semBotaoFechar && (
            <Primitivo.Close className="absolute right-4 top-4 rounded-sm p-1 text-muted-foreground opacity-80 transition-opacity hover:bg-muted hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </Primitivo.Close>
          )}
        </Primitivo.Content>
      </Primitivo.Portal>
    </Primitivo.Root>
  );
}
