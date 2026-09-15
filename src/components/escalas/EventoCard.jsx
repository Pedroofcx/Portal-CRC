import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Home,
  Building2,
  Laptop,
  Plane,
  Coffee,
  X,
  BookOpen,
  Star,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

const eventoConfig = {
  home_office: {
    icon: Home,
    label: 'Home Office',
    bg: 'bg-gradient-to-br from-green-50 to-emerald-50',
    border: 'border-success/25',
    iconBg: 'bg-success-soft',
    iconColor: 'text-success',
    textColor: 'text-success',
    badgeBg: 'bg-success'
  },
  presencial: {
    icon: Building2,
    label: 'Presencial',
    bg: 'bg-gradient-to-br from-slate-50 to-gray-50',
    border: 'border-border',
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
    textColor: 'text-foreground',
    badgeBg: 'bg-slate-500'
  },
  hibrido: {
    icon: Laptop,
    label: 'Híbrido',
    bg: 'bg-gradient-to-br from-indigo-50 to-blue-50',
    border: 'border-indigo-200',
    iconBg: 'bg-info-soft',
    iconColor: 'text-primary',
    textColor: 'text-primary',
    badgeBg: 'bg-primary'
  },
  ferias: {
    icon: Plane,
    label: 'Férias',
    bg: 'bg-gradient-to-br from-cyan-50 to-sky-50',
    border: 'border-cyan-200',
    iconBg: 'bg-cyan-100',
    iconColor: 'text-info',
    textColor: 'text-cyan-900',
    badgeBg: 'bg-cyan-500'
  },
  day_off: {
    icon: Coffee,
    label: 'Day Off',
    bg: 'bg-gradient-to-br from-amber-50 to-yellow-50',
    border: 'border-warning/25',
    iconBg: 'bg-warning-soft',
    iconColor: 'text-warning',
    textColor: 'text-warning',
    badgeBg: 'bg-warning'
  },
  falta: {
    icon: X,
    label: 'Falta',
    bg: 'bg-gradient-to-br from-red-50 to-rose-50',
    border: 'border-destructive/25',
    iconBg: 'bg-destructive/10',
    iconColor: 'text-destructive',
    textColor: 'text-destructive',
    badgeBg: 'bg-destructive'
  },
  treinamento: {
    icon: BookOpen,
    label: 'Treinamento',
    bg: 'bg-gradient-to-br from-purple-50 to-violet-50',
    border: 'border-info/25',
    iconBg: 'bg-info-soft',
    iconColor: 'text-primary',
    textColor: 'text-primary',
    badgeBg: 'bg-primary'
  },
  evento_especial: {
    icon: Star,
    label: 'Evento Especial',
    bg: 'bg-gradient-to-br from-pink-50 to-rose-50',
    border: 'border-pink-200',
    iconBg: 'bg-info-soft',
    iconColor: 'text-primary',
    textColor: 'text-pink-900',
    badgeBg: 'bg-pink-500'
  }
};

export default function EventoCard({ atribuicao, colaborador, escala, compact = false }) {
  const config = eventoConfig[atribuicao.tipo_evento] || eventoConfig.presencial;
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={cn(
        'p-2 rounded-lg border-2 transition-all hover:shadow-md',
        config.bg,
        config.border
      )}>
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded-lg', config.iconBg)}>
            <Icon className={cn('w-3.5 h-3.5', config.iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn('text-xs font-semibold truncate', config.textColor)}>
              {colaborador?.nome_completo?.split(' ')[0]}
            </p>
            {atribuicao.hora_inicio && (
              <div className="flex items-center gap-1 text-[10px] opacity-70">
                <Clock className="w-2.5 h-2.5" />
                {atribuicao.hora_inicio}-{atribuicao.hora_fim}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'p-4 rounded-xl border-2 transition-all hover:shadow-lg hover:-translate-y-0.5',
      config.bg,
      config.border
    )}>
      <div className="flex items-start gap-3">
        <div className={cn('p-3 rounded-xl', config.iconBg)}>
          <Icon className={cn('w-6 h-6', config.iconColor)} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={cn('text-white text-xs font-semibold', config.badgeBg)}>
              {config.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-white">
              <AvatarImage src={colaborador?.foto_url} />
              <AvatarFallback className={cn('text-sm font-semibold', config.iconBg, config.iconColor)}>
                {colaborador?.nome_completo?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className={cn('font-semibold truncate', config.textColor)}>
                {colaborador?.nome_completo}
              </p>
              <p className="text-xs opacity-70">
                {escala?.nome}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EventoLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border border-border">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Legenda:</span>
      {Object.entries(eventoConfig).map(([key, config]) => {
        const Icon = config.icon;
        return (
          <div key={key} className="flex items-center gap-1.5">
            <div className={cn('p-1.5 rounded-lg', config.iconBg)}>
              <Icon className={cn('w-3.5 h-3.5', config.iconColor)} />
            </div>
            <span className="text-xs font-medium text-foreground">{config.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export { eventoConfig };