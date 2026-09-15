import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

export default function ConfirmDialog({
  open,
  onOpenChange,
  title = "Confirmar ação",
  description = "Tem certeza que deseja continuar? Esta ação não pode ser desfeita.",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  variant = "danger" // danger, warning, info
}) {
  const variants = {
    danger: "bg-destructive hover:bg-destructive/90 text-white",
    warning: "bg-warning hover:bg-warning text-white",
    info: "bg-primary hover:bg-primary/90 text-white"
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-full ${variant === 'danger' ? 'bg-destructive/10' : variant === 'warning' ? 'bg-warning-soft' : 'bg-info-soft'}`}>
              <AlertTriangle className={`w-5 h-5 ${variant === 'danger' ? 'text-destructive' : variant === 'warning' ? 'text-warning' : 'text-primary'}`} />
            </div>
            <div>
              <AlertDialogTitle className="text-lg">{title}</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel className="border-border">{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={variants[variant]}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}