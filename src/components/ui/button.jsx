import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

/**
 * Botões — três níveis, conforme documentacao/regras-ui-ux.md:
 *
 *   PRIMÁRIO   (default)   azul sólido, texto branco. Uma ação principal por tela.
 *   SECUNDÁRIO (outline)   fundo transparente, borda e texto em azul. Apoio.
 *   TERCIÁRIO  (ghost)     só texto, com hover sutil. Cancelar, voltar.
 *
 * As sombras saíram de todas as variantes: a regra proíbe sombra decorativa,
 * e num botão ela não comunica nada que a cor já não comunique.
 *
 * `destructive` continua vermelho — é a exceção que a regra prevê para ação
 * destrutiva, e o único lugar do sistema onde o vermelho comanda um botão.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-primary/40 bg-transparent text-primary hover:bg-info-soft",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded px-3 text-xs",
        lg: "h-10 rounded px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
