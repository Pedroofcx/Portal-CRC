import React from 'react';
import { Badge } from "@/components/ui/badge";

/**
 * Selo de estado — a fonte única de verdade sobre a cor de cada status.
 *
 * Conforme documentacao/regras-ui-ux.md. Três mudanças:
 *
 * 1. As cores deixam de ser escolhidas aqui e passam a ser SIGNIFICADOS.
 *    Antes conviviam slate, blue, amber, purple, sky, green, red e orange —
 *    oito famílias para quinze estados, sem regra de correspondência.
 *
 * 2. O vermelho recuou. As regras o restringem a ações destrutivas, e
 *    "prioridade crítica" não é uma delas: crítica agora é âmbar escuro,
 *    que escala a atenção sem gerar ansiedade. Vermelho ficou só em
 *    "Excluída", que relata de fato um registro destruído.
 *
 * 3. O emoji saiu do rótulo de "Aguardando Financeiro" — as regras
 *    proíbem emojis na interface.
 *
 * Só 4 das 30 telas que exibem status usam este componente hoje. Adotá-lo
 * nas outras 26 é o que faz a paleta valer no sistema inteiro — e depois
 * disso, mudar a cor de um status passa a ser mudar uma linha aqui.
 */

const TONS = {
  neutro:     "bg-neutral-soft  text-neutral  border-neutral/20",
  info:       "bg-info-soft     text-info     border-info/20",
  atencao:    "bg-warning-soft  text-warning  border-warning/25",
  critico:    "bg-critical-soft text-critical border-critical/25",
  sucesso:    "bg-success-soft  text-success  border-success/20",
  destrutivo: "bg-destructive/10 text-destructive border-destructive/25",
};

const statusConfig = {
  // Tratativas — do registro ao encerramento
  registrada:                        { label: "Registrada",             tom: "neutro"  },
  tratativa_iniciada:                { label: "Tratativa Iniciada",     tom: "info"    },
  em_andamento:                      { label: "Em Andamento",           tom: "info"    },
  dependencia_externa:               { label: "Dependência Externa",    tom: "atencao" },
  aguardando_financeiro:             { label: "Aguard. Financeiro",     tom: "atencao" },
  aguardando_confirmacao_reabertura: { label: "Aguardando Confirmação", tom: "atencao" },
  encerrada:                         { label: "Encerrada",              tom: "sucesso" },
  excluida:                          { label: "Excluída",               tom: "destrutivo" },

  // Prioridades — escala de atenção, sem vermelho
  baixa:   { label: "Baixa",   tom: "neutro"  },
  media:   { label: "Média",   tom: "info"    },
  alta:    { label: "Alta",    tom: "atencao" },
  critica: { label: "Crítica", tom: "critico" },

  // PDI
  concluido: { label: "Concluído", tom: "sucesso" },
  cancelado: { label: "Cancelado", tom: "neutro"  },

  // Cursos
  inscrito: { label: "Inscrito", tom: "info" },

  // Genéricos
  ativo:    { label: "Ativo",    tom: "sucesso" },
  inativo:  { label: "Inativo",  tom: "neutro"  },
  pendente: { label: "Pendente", tom: "atencao" },
};

export default function StatusBadge({ status, customLabel }) {
  const config = statusConfig[status] || { label: status, tom: "neutro" };

  return (
    <Badge
      variant="outline"
      className={`${TONS[config.tom]} border font-medium whitespace-nowrap`}
    >
      {customLabel || config.label}
    </Badge>
  );
}

/** Exportado para quem precisa do rótulo sem renderizar o selo. */
export { statusConfig };
