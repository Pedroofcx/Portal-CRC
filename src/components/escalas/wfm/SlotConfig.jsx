/**
 * Configuração visual dos slots WFM
 * Sistema de Tags/Cores para leitura em < 2 segundos
 */

export const SLOT_CONFIG = {
  manha_atendimento: {
    label: 'M-ATEND',
    labelLong: 'Manhã · Atendimento',
    emoji: '',
    // Tailwind literal classes (não dinâmicas)
    bg: 'bg-success-soft',
    border: 'border-success/40',
    badgeBg: 'bg-success',
    text: 'text-success',
    iconColor: 'text-success',
    headerBg: 'bg-success',
    ringColor: 'ring-ring'
  },
  manha_analise: {
    label: 'M-ANÁL',
    labelLong: 'Manhã · Análise',
    emoji: '',
    bg: 'bg-info-soft',
    border: 'border-primary/40',
    badgeBg: 'bg-primary',
    text: 'text-primary',
    iconColor: 'text-primary',
    headerBg: 'bg-primary',
    ringColor: 'ring-ring'
  },
  tarde_atendimento: {
    label: 'T-ATEND',
    labelLong: 'Tarde · Atendimento',
    emoji: '',
    bg: 'bg-critical-soft',
    border: 'border-critical/40',
    badgeBg: 'bg-critical',
    text: 'text-critical',
    iconColor: 'text-critical',
    headerBg: 'bg-critical',
    ringColor: 'ring-ring'
  },
  tarde_analise: {
    label: 'T-ANÁL',
    labelLong: 'Tarde · Análise',
    emoji: '',
    bg: 'bg-info-soft',
    border: 'border-primary/40',
    badgeBg: 'bg-primary',
    text: 'text-primary',
    iconColor: 'text-primary',
    headerBg: 'bg-primary',
    ringColor: 'ring-ring'
  }
};

export const DIAS_LABEL = {
  segunda: 'Seg',
  terca: 'Ter',
  quarta: 'Qua',
  quinta: 'Qui',
  sexta: 'Sex'
};

export const DIAS_FULL = {
  segunda: 'Segunda-feira',
  terca: 'Terça-feira',
  quarta: 'Quarta-feira',
  quinta: 'Quinta-feira',
  sexta: 'Sexta-feira'
};

export function getSlotKey(periodo, slot) {
  return `${periodo}_${slot}`;
}

export function getSlotConfig(periodo, slot) {
  return SLOT_CONFIG[getSlotKey(periodo, slot)] || SLOT_CONFIG.manha_atendimento;
}