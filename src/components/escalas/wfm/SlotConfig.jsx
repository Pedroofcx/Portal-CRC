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
    border: 'border-green-400',
    badgeBg: 'bg-success',
    text: 'text-success',
    iconColor: 'text-success',
    headerBg: 'bg-success',
    ringColor: 'ring-green-400',
    hex: '#16A34A'
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
    ringColor: 'ring-blue-400',
    hex: '#2563EB'
  },
  tarde_atendimento: {
    label: 'T-ATEND',
    labelLong: 'Tarde · Atendimento',
    emoji: '',
    bg: 'bg-critical-soft',
    border: 'border-orange-400',
    badgeBg: 'bg-critical',
    text: 'text-critical',
    iconColor: 'text-critical',
    headerBg: 'bg-critical',
    ringColor: 'ring-orange-400',
    hex: '#EA580C'
  },
  tarde_analise: {
    label: 'T-ANÁL',
    labelLong: 'Tarde · Análise',
    emoji: '',
    bg: 'bg-info-soft',
    border: 'border-purple-400',
    badgeBg: 'bg-primary',
    text: 'text-primary',
    iconColor: 'text-primary',
    headerBg: 'bg-primary',
    ringColor: 'ring-purple-400',
    hex: '#7C3AED'
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