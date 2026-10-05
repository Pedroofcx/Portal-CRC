import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

/**
 * Alternador do tema: um sol para o modo normal e uma lua para o modo escuro.
 * Os dois ficam à vista e o do modo atual aparece marcado, para ninguém ter
 * que adivinhar se o ícone mostra "onde estou" ou "para onde vou".
 *
 * A escolha é guardada no navegador de cada pessoa (next-themes, chave
 * portal_crc_tema) e aplicada antes da tela desenhar, sem piscar.
 * O modo escuro segue a paleta do Windows 11 (src/index.css, bloco .dark).
 */
export default function AlternarTema({ className = '' }) {
  const { resolvedTheme, setTheme } = useTheme();
  // Só se sabe o tema depois que o navegador carrega: antes, mostra o claro.
  const [pronto, setPronto] = useState(false);
  useEffect(() => setPronto(true), []);
  const escuro = pronto && resolvedTheme === 'dark';

  const opcao = (ativo, rotulo, Icone, tema) => (
    <button
      type="button"
      role="radio"
      aria-checked={ativo}
      aria-label={rotulo}
      title={rotulo}
      onClick={() => setTheme(tema)}
      className={`flex h-7 w-8 items-center justify-center rounded-full transition-colors ${
        ativo ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      <Icone className="h-4 w-4" aria-hidden="true" />
    </button>
  );

  return (
    <div
      role="radiogroup"
      aria-label="Aparência do sistema"
      className={`flex items-center gap-0.5 rounded-full border border-border bg-muted p-0.5 ${className}`}
    >
      {opcao(!escuro, 'Modo normal', Sun, 'light')}
      {opcao(escuro, 'Modo escuro', Moon, 'dark')}
    </div>
  );
}
