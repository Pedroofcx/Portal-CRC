import React from 'react';
import { Button } from "@/components/ui/button";
import { Inbox } from "lucide-react";

export default function EmptyState({ 
  icon: Icon = Inbox,
  title = "Nenhum registro encontrado",
  description = "Não há dados para exibir no momento.",
  action,
  actionLabel = "Criar novo"
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="p-4 bg-slate-100 rounded-2xl mb-4">
        <Icon className="w-10 h-10 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-slate-500 text-sm text-center max-w-sm mb-6">{description}</p>
      {action && (
        <Button onClick={action} className="bg-blue-600 hover:bg-blue-700">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}