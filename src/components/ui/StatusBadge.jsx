import React from 'react';
import { Badge } from "@/components/ui/badge";

const statusConfig = {
  // Tratativas
  registrada: { label: "Registrada", color: "bg-slate-100 text-slate-700 border-slate-200" },
  tratativa_iniciada: { label: "Tratativa Iniciada", color: "bg-blue-100 text-blue-700 border-blue-200" },
  em_andamento: { label: "Em Andamento", color: "bg-amber-100 text-amber-700 border-amber-200" },
  dependencia_externa: { label: "Dependência Externa", color: "bg-purple-100 text-purple-700 border-purple-200" },
  aguardando_financeiro: { label: "🧊 Aguard. Financeiro", color: "bg-sky-100 text-sky-800 border-sky-300" },
  encerrada: { label: "Encerrada", color: "bg-green-100 text-green-700 border-green-200" },
  aguardando_confirmacao_reabertura: { label: "Aguardando Confirmação", color: "bg-amber-100 text-amber-700 border-amber-200" },
  excluida: { label: "Excluída", color: "bg-red-100 text-red-700 border-red-200" },
  
  // Prioridades
  baixa: { label: "Baixa", color: "bg-slate-100 text-slate-600 border-slate-200" },
  media: { label: "Média", color: "bg-amber-100 text-amber-700 border-amber-200" },
  alta: { label: "Alta", color: "bg-orange-100 text-orange-700 border-orange-200" },
  critica: { label: "Crítica", color: "bg-red-100 text-red-700 border-red-200" },
  
  // PDI
  concluido: { label: "Concluído", color: "bg-green-100 text-green-700 border-green-200" },
  cancelado: { label: "Cancelado", color: "bg-red-100 text-red-700 border-red-200" },
  
  // Cursos
  inscrito: { label: "Inscrito", color: "bg-blue-100 text-blue-700 border-blue-200" },
  
  // Genérico
  ativo: { label: "Ativo", color: "bg-green-100 text-green-700 border-green-200" },
  inativo: { label: "Inativo", color: "bg-slate-100 text-slate-500 border-slate-200" },
  pendente: { label: "Pendente", color: "bg-amber-100 text-amber-700 border-amber-200" },
};

export default function StatusBadge({ status, customLabel }) {
  const config = statusConfig[status] || { label: status, color: "bg-slate-100 text-slate-600 border-slate-200" };
  
  return (
    <Badge variant="outline" className={`${config.color} font-medium border`}>
      {customLabel || config.label}
    </Badge>
  );
}