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
    danger: "bg-red-600 hover:bg-red-700 text-white",
    warning: "bg-amber-600 hover:bg-amber-700 text-white",
    info: "bg-blue-600 hover:bg-blue-700 text-white"
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-full ${variant === 'danger' ? 'bg-red-100' : variant === 'warning' ? 'bg-amber-100' : 'bg-blue-100'}`}>
              <AlertTriangle className={`w-5 h-5 ${variant === 'danger' ? 'text-red-600' : variant === 'warning' ? 'text-amber-600' : 'text-blue-600'}`} />
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
          <AlertDialogCancel className="border-slate-200">{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={variants[variant]}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}