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
      <div className="p-4 bg-muted rounded-2xl mb-4">
        <Icon className="w-10 h-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-muted-foreground text-sm text-center max-w-sm mb-6">{description}</p>
      {action && (
        <Button onClick={action} className="bg-primary hover:bg-primary/90">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}