import React from 'react';
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

/**
 * Cabeçalho de página — presente em 30 das 38 telas.
 *
 * Conforme documentacao/regras-ui-ux.md:
 *   - saíram o gradiente, o `shadow-lg` e o `rounded-xl` do ícone
 *   - o título é o H1 da tela, na hierarquia tipográfica do sistema
 *   - o bloco de ações fica à direita, na mesma linha, porque a regra pede
 *     aproveitamento do espaço horizontal e a ação não deve exigir rolagem
 *
 * A régua superior em azul institucional marca o início da área de trabalho
 * sem custar altura: é 2px, não um banner.
 */
export default function PageHeader({
  title,
  subtitle,
  backTo,
  actions,
  icon: Icon,
}) {
  return (
    <header className="mb-6 border-b border-border pb-4">
      {backTo && (
        <Link
          to={createPageUrl(backTo)}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar
        </Link>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="flex min-w-[180px] flex-1 items-center gap-3">
          {Icon && (
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-primary/20 bg-info-soft text-primary"
              aria-hidden="true"
            >
              <Icon className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>

        {actions && (
          // min-w-[180px] no bloco do titulo (nao shrink-0): com muitos botoes
          // (Jornada do Cliente), o titulo dividia espaco com eles e truncava
          // pra "Jornad...". Com piso minimo + flex-wrap no container pai, as
          // acoes quebram pra linha de baixo quando nao cabem mais ao lado, e
          // o subtitulo longo (Solucoes Replicaveis) continua quebrando linha
          // normalmente dentro do espaco que o titulo tem.
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
        )}
      </div>
    </header>
  );
}
