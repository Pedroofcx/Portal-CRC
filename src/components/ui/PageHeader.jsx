import React from 'react';
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PageHeader({ 
  title, 
  subtitle, 
  backTo, 
  actions,
  icon: Icon 
}) {
  return (
    <div className="mb-8">
      {backTo && (
        <Link to={createPageUrl(backTo)} className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Voltar
        </Link>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20">
              <Icon className="w-6 h-6" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
            {subtitle && <p className="text-slate-500 text-sm mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}