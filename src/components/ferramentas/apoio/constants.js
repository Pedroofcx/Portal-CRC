export const LIMITE_MENSAL_MINUTOS = 180; // 3 horas

export const TIPOS_APOIO = [
  { value: 'treinamento', label: 'Treinamento' },
  { value: 'consultoria', label: 'Consultoria' },
  { value: 'implantacao', label: 'Implantação' },
  { value: 'outro', label: 'Outro' },
];

export const STATUS_APOIO = [
  { value: 'solicitada', label: 'Solicitada', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'em_analise', label: 'Em análise', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'aprovada', label: 'Aprovada', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'em_execucao', label: 'Em execução', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { value: 'concluida', label: 'Concluída', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'cancelada', label: 'Cancelada', color: 'bg-red-100 text-red-700 border-red-200' },
];

export const getMesReferencia = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
};

export const formatMinutos = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}`;
};

export const getTipoApoioLabel = (value) => {
  if (value === 'outro') return 'Outro';
  return TIPOS_APOIO.find(t => t.value === value)?.label || value || '—';
};

export const getStatusInfo = (value) => {
  return STATUS_APOIO.find(s => s.value === value) || STATUS_APOIO[0];
};