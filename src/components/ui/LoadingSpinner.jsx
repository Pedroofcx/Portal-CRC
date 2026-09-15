import React from 'react';
import { Loader2 } from "lucide-react";

export default function LoadingSpinner({ text = "Carregando..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
      <p className="text-muted-foreground text-sm">{text}</p>
    </div>
  );
}