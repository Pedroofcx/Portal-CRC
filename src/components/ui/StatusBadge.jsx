import React from 'react';
import { Badge } from "@/components/ui/badge";

/**
 * Selo de estado — fonte única de verdade sobre o rótulo e a cor de cada
 * estado do sistema.
 *
 * Conforme documentacao/regras-ui-ux.md.
 *
 * DOIS TIPOS DE COR, E A DIFERENÇA IMPORTA
 *
 * Severidade responde "isso está bem ou mal?" — encerrada é bom, fora do SLA
 * é ruim. Usa a paleta semântica (sucesso, atenção, crítico).
 *
 * Categoria responde "isso é de que tipo?" — home office e presencial não são
 * melhores nem piores um que o outro. Usa a paleta categórica, derivada das
 * cores de gráfico, que distingue sem hierarquizar.
 *
 * Pintar categoria com cor de severidade é o erro que estava nos três arquivos
 * de escala: "Home Office" aparecia em verde e "Falta" em vermelho, sugerindo
 * que trabalhar de casa é um acerto e faltar é um erro — quando ambos são
 * apenas registros de onde a pessoa estava.
 */

/** Fundo suave — o selo comum, sobre fundo claro. */
const TONS = {
  neutro:     "bg-neutral-soft  text-neutral  border-neutral/20",
  info:       "bg-info-soft     text-info     border-info/20",
  atencao:    "bg-warning-soft  text-warning  border-warning/25",
  critico:    "bg-critical-soft text-critical border-critical/25",
  sucesso:    "bg-success-soft  text-success  border-success/20",
  destrutivo: "bg-destructive/10 text-destructive border-destructive/25",
  // Categóricas: distinguem sem hierarquizar.
  cat1: "bg-chart-1/10 text-chart-1 border-chart-1/25",
  cat2: "bg-chart-2/10 text-chart-2 border-chart-2/25",
  cat3: "bg-chart-3/10 text-chart-3 border-chart-3/25",
  cat4: "bg-chart-4/10 text-chart-4 border-chart-4/25",
  cat5: "bg-chart-5/10 text-chart-5 border-chart-5/25",
};

/** Preenchimento sólido — para blocos de calendário e grades de escala. */
const SOLIDOS = {
  neutro:     "bg-neutral text-neutral-foreground",
  info:       "bg-info text-info-foreground",
  atencao:    "bg-warning text-warning-foreground",
  critico:    "bg-critical text-critical-foreground",
  sucesso:    "bg-success text-success-foreground",
  destrutivo: "bg-destructive text-destructive-foreground",
  cat1: "bg-chart-1 text-white",
  cat2: "bg-chart-2 text-white",
  cat3: "bg-chart-3 text-white",
  cat4: "bg-chart-4 text-white",
  cat5: "bg-chart-5 text-white",
};

const statusConfig = {
  // --- Tratativas: do registro ao encerramento (severidade) ---------------
  registrada:                        { label: "Registrada",             tom: "neutro"     },
  tratativa_iniciada:                { label: "Tratativa Iniciada",     tom: "info"       },
  em_andamento:                      { label: "Em Andamento",           tom: "info"       },
  dependencia_externa:               { label: "Dependência Externa",    tom: "atencao"    },
  aguardando_financeiro:             { label: "Aguard. Financeiro",     tom: "atencao"    },
  aguardando_confirmacao_reabertura: { label: "Aguardando Confirmação", tom: "atencao"    },
  encerrada:                         { label: "Encerrada",              tom: "sucesso"    },
  excluida:                          { label: "Excluída",               tom: "destrutivo" },

  // --- Prioridades: escala de atenção, sem vermelho -----------------------
  baixa:   { label: "Baixa",   tom: "neutro"  },
  media:   { label: "Média",   tom: "info"    },
  alta:    { label: "Alta",    tom: "atencao" },
  critica: { label: "Crítica", tom: "critico" },

  // --- Solicitações: home office, apoio, férias (severidade) --------------
  em_analise:          { label: "Em análise",       tom: "atencao"    },
  pendente:            { label: "Pendente",         tom: "atencao"    },
  pendente_validacao:  { label: "Pendente de validação", tom: "atencao" },
  aprovada:            { label: "Aprovada",         tom: "sucesso"    },
  recusada:            { label: "Recusada",         tom: "destrutivo" },
  cancelada:           { label: "Cancelada",        tom: "neutro"     },
  cancelado:           { label: "Cancelado",        tom: "neutro"     },
  sugestao_nova_data:  { label: "Nova data sugerida", tom: "info"     },

  // --- Ciclos de férias (severidade: é sobre prazo vencendo) --------------
  em_aquisicao:           { label: "Em Aquisição",           tom: "neutro"  },
  disponivel:             { label: "Disponível",             tom: "sucesso" },
  parcialmente_utilizado: { label: "Parcialmente Utilizado", tom: "info"    },
  utilizado:              { label: "Utilizado",              tom: "neutro"  },
  vencendo:      { label: "Vencendo",     tom: "atencao" },
  vencido:       { label: "Vencido",      tom: "critico" },
  agendado:      { label: "Agendado",     tom: "neutro"  },
  em_execucao:   { label: "Em execução",  tom: "info"    },
  gozado:        { label: "Gozado",       tom: "sucesso" },

  // --- Modalidade de trabalho: CATEGORIA, não severidade ------------------
  presencial:      { label: "Presencial",   tom: "cat1" },
  home_office:     { label: "Home Office",  tom: "cat2" },
  hibrido:         { label: "Híbrido",      tom: "cat3" },
  ferias:          { label: "Férias",       tom: "cat4" },
  treinamento:     { label: "Treinamento",  tom: "cat5" },
  evento_especial: { label: "Evento",       tom: "cat3" },
  day_off:         { label: "Day Off",      tom: "neutro" },
  falta:           { label: "Falta",        tom: "destrutivo" },

  // --- PDI e cursos -------------------------------------------------------
  concluido: { label: "Concluído", tom: "sucesso" },
  concluida: { label: "Concluída", tom: "sucesso" },
  inscrito:  { label: "Inscrito",  tom: "info"    },

  // --- Genéricos ----------------------------------------------------------
  ativo:   { label: "Ativo",   tom: "sucesso" },
  ativa:   { label: "Ativa",   tom: "sucesso" },
  inativo: { label: "Inativo", tom: "neutro"  },
  inativa: { label: "Inativa", tom: "neutro"  },
};

const PADRAO = { label: '—', tom: 'neutro' };

/** Configuração de um estado, com fallback que não quebra a tela. */
export function configDoStatus(status) {
  if (statusConfig[status]) return statusConfig[status];
  // Aceita o nome do tom diretamente, para quem já calculou a severidade
  // (ex.: saturação de carga do agente, que não é um estado de entidade).
  if (TONS[status]) return { label: status, tom: status };
  return { label: status || '—', tom: PADRAO.tom };
}

/** Rótulo em português de um estado, sem renderizar nada. */
export function rotuloDoStatus(status) {
  return configDoStatus(status).label;
}

/** Classes de cor suave — para quem monta o próprio elemento. */
export function classesDoStatus(status) {
  return TONS[configDoStatus(status).tom];
}

/** Classes de preenchimento sólido — blocos de calendário e grades. */
export function classesSolidasDoStatus(status) {
  return SOLIDOS[configDoStatus(status).tom];
}

export default function StatusBadge({ status, customLabel, solido = false, className = '' }) {
  const config = configDoStatus(status);
  const cores = solido ? SOLIDOS[config.tom] : TONS[config.tom];

  return (
    <Badge
      variant="outline"
      className={`${cores} border font-medium whitespace-nowrap ${className}`}
    >
      {customLabel || config.label}
    </Badge>
  );
}

export { statusConfig };
