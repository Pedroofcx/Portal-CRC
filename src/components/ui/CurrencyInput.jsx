import React from 'react';
import { cn } from '@/lib/utils';

// Converte qualquer entrada (number, string formatada, null, '') para cents (int).
function toCents(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Math.round(value * 100);
  const digits = String(value).replace(/\D/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

// Formata cents no padrão brasileiro: R$ 1.234,56 (vazio quando zero).
function formatCents(cents) {
  if (!cents) return '';
  return `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Input monetário padronizado pt-BR (R$, vírgula decimal, ponto de milhar).
// Padrão "acumulador de centavos": cada dígito digitado é acrescentado como centavos.
//   "1" → R$ 0,01 | "10" → R$ 0,10 | "100" → R$ 1,00 | "1000" → R$ 10,00 | "123456" → R$ 1.234,56
//
// Contrato:
//   value: number (float em reais, ex: 1234.56) ou null/''/0 (vazio)
//   onChange(number): recebe o novo valor numérico em reais (float), ou 0 se vazio
const CurrencyInput = React.forwardRef(({ className, onChange, value, ...props }, ref) => {
  const display = formatCents(toCents(value));

  const handleChange = (e) => {
    const newCents = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
    if (onChange) onChange(newCents / 100);
  };

  const handleKeyDown = (e) => {
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (
      !allowedKeys.includes(e.key) &&
      !/[0-9]/.test(e.key) &&
      !e.ctrlKey &&
      !e.metaKey
    ) {
      e.preventDefault();
    }
  };

  return (
    <input
      type="text"
      ref={ref}
      inputMode="numeric"
      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      value={display}
      placeholder="R$ 0,00"
      {...props}
    />
  );
});
CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };