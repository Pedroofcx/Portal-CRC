import React, { useState } from 'react';

const iniciais = (nome = '') => nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

/**
 * Foto da pessoa (ou as iniciais, quando não há foto ou ela não carrega).
 * O tamanho vem de `className` — quem usa decide a largura e a altura.
 */
export default function FotoDaPessoa({ colaborador, className = '', textoClassName = 'text-3xl' }) {
  const [falhou, setFalhou] = useState(false);
  const tem = colaborador.foto_url && !falhou;
  return (
    <div className={`overflow-hidden rounded-lg bg-muted ${className}`}>
      {tem ? (
        <img
          src={colaborador.foto_url}
          alt={`Foto de ${colaborador.nome_completo}`}
          loading="lazy"
          onError={() => setFalhou(true)}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <div className={`flex h-full w-full items-center justify-center font-semibold text-muted-foreground ${textoClassName}`}>
          {iniciais(colaborador.nome_completo)}
        </div>
      )}
    </div>
  );
}
