import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, Calendar, AlertTriangle } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import StatusBadge from '@/components/ui/StatusBadge';

function fmtDate(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d; }
}

function parseDataLocal(d) {
  if (!d) return null;
  const [y, m, dia] = d.split('-').map(Number);
  return new Date(y, m - 1, dia);
}


export default function ColaboradorFeriasCard({ colaborador, cicloAtivo, onClick }) {
  const status = cicloAtivo?.status || 'em_aquisicao';
  const diasDireito = cicloAtivo?.dias_direito || 30;
  const abono = cicloAtivo?.abono_dias || 0;
  const utilizados = cicloAtivo?.dias_utilizados || 0;
  // Dias disponíveis para gozo = direito - abono vendido
  const diasParaGozo = diasDireito - abono;
  const restantes = Math.max(0, diasParaGozo - utilizados);
  const diasConcessivo = cicloAtivo?.concessivo_fim
    ? differenceInDays(parseDataLocal(cicloAtivo.concessivo_fim), new Date())
    : null;

  const barPercent = diasParaGozo > 0 ? Math.min(100, (utilizados / diasParaGozo) * 100) : 0;

  return (
    <Card
      className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <Avatar className="h-12 w-12 flex-shrink-0">
            <AvatarImage src={colaborador.foto_url} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold">
              {colaborador.nome_completo?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors text-sm">
                {colaborador.nome_completo}
              </h3>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0 ml-1" />
            </div>
            <p className="text-xs text-muted-foreground truncate">{colaborador.cargo_atual}</p>
            {colaborador.equipe_nome && (
              <p className="text-xs text-muted-foreground truncate">{colaborador.equipe_nome}</p>
            )}
          </div>
        </div>

        {cicloAtivo ? (
          <>
            <StatusBadge status={status} className=" text-xs mb-3" />

            <div className="grid grid-cols-3 gap-2 mb-3 text-center">
              <div className="bg-muted rounded-lg p-2">
                <p className="text-lg font-bold text-foreground">{diasDireito}</p>
                <p className="text-xs text-muted-foreground">direito</p>
              </div>
              <div className="bg-info-soft rounded-lg p-2">
                <p className="text-lg font-bold text-primary">{utilizados}</p>
                <p className="text-xs text-primary">gozados</p>
              </div>
              <div className={`rounded-lg p-2 ${restantes > 0 ? 'bg-success-soft' : 'bg-muted'}`}>
                <p className={`text-lg font-bold ${restantes > 0 ? 'text-success' : 'text-muted-foreground'}`}>{restantes}</p>
                <p className="text-xs text-muted-foreground">disponível</p>
              </div>
            </div>
            {abono > 0 && (
              <div className="flex items-center gap-1.5 mb-2 px-2 py-1.5 bg-warning-soft border border-warning/25 rounded-lg">
                <span className="text-warning text-xs"></span>
                <span className="text-xs text-warning font-medium">{abono} dias vendidos (abono pecuniário)</span>
              </div>
            )}

            {/* Barra de progresso */}
            <div className="w-full bg-muted rounded-full h-1.5 mb-2">
              <div
                className={`h-1.5 rounded-full transition-all ${barPercent >= 100 ? 'bg-slate-400' : barPercent > 60 ? 'bg-amber-400' : 'bg-primary'}`}
                style={{ width: `${barPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {fmtDate(cicloAtivo.aquisitivo_inicio)} — {fmtDate(cicloAtivo.aquisitivo_fim)}
              </span>
              {diasConcessivo !== null && diasConcessivo <= 90 && status !== 'utilizado' && (
                <span className="flex items-center gap-1 text-destructive">
                  <AlertTriangle className="w-3 h-3" />
                  {diasConcessivo < 0 ? 'vencido' : `${diasConcessivo}d`}
                </span>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-3">
            <p className="text-xs text-muted-foreground">Sem ciclo ativo cadastrado</p>
            {colaborador.data_admissao && (
              <p className="text-xs text-muted-foreground mt-1">Admissão: {fmtDate(colaborador.data_admissao)}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}