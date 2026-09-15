/**
 * Configuração visual dos slots WFM
 * Sistema de Tags/Cores para leitura em < 2 segundos
 */

export const SLOT_CONFIG = {
  manha_atendimento: {
    label: 'M-ATEND',
    labelLong: 'Manhã · Atendimento',
    emoji: '📞',
    // Tailwind literal classes (não dinâmicas)
    bg: 'bg-green-50',
    border: 'border-green-400',
    badgeBg: 'bg-green-600',
    text: 'text-green-900',
    iconColor: 'text-green-600',
    headerBg: 'bg-green-600',
    ringColor: 'ring-green-400',
    hex: '#16A34A'
  },
  manha_analise: {
    label: 'M-ANÁL',
    labelLong: 'Manhã · Análise',
    emoji: '🔍',
    bg: 'bg-blue-50',
    border: 'border-blue-400',
    badgeBg: 'bg-blue-600',
    text: 'text-blue-900',
    iconColor: 'text-blue-600',
    headerBg: 'bg-blue-600',
    ringColor: 'ring-blue-400',
    hex: '#2563EB'
  },
  tarde_atendimento: {
    label: 'T-ATEND',
    labelLong: 'Tarde · Atendimento',
    emoji: '📞',
    bg: 'bg-orange-50',
    border: 'border-orange-400',
    badgeBg: 'bg-orange-600',
    text: 'text-orange-900',
    iconColor: 'text-orange-600',
    headerBg: 'bg-orange-600',
    ringColor: 'ring-orange-400',
    hex: '#EA580C'
  },
  tarde_analise: {
    label: 'T-ANÁL',
    labelLong: 'Tarde · Análise',
    emoji: '🔍',
    bg: 'bg-purple-50',
    border: 'border-purple-400',
    badgeBg: 'bg-purple-600',
    text: 'text-purple-900',
    iconColor: 'text-purple-600',
    headerBg: 'bg-purple-600',
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