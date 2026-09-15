import React from 'react';
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function StatCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  color = "blue" 
}) {
  const colors = {
    blue: "from-blue-500 to-blue-600 shadow-blue-500/20",
    green: "from-green-500 to-green-600 shadow-green-500/20",
    amber: "from-amber-500 to-amber-600 shadow-amber-500/20",
    red: "from-red-500 to-red-600 shadow-red-500/20",
    purple: "from-purple-500 to-purple-600 shadow-purple-500/20",
    slate: "from-slate-500 to-slate-600 shadow-slate-500/20",
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-slate-500';

  return (
    <Card className="p-5 bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          {trendValue !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendColor}`}>
              <TrendIcon className="w-3 h-3" />
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 bg-gradient-to-br ${colors[color]} rounded-xl text-white shadow-lg`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </Card>
  );
}