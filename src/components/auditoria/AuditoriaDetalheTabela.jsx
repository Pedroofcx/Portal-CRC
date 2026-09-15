import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { formatDateSP } from '@/components/utils/helpers';
import { ChevronDown, ChevronRight, Star, Clock, User, Shield } from 'lucide-react';

const TIPO_LABEL = {
  reclamacao_interna: 'Rec. Interna',
  reclame_aqui: 'Reclame Aqui',
  google_meu_negocio: 'Google',
  contestacao: 'Contestação',
};

const TIPO_COLOR = {
  reclamacao_interna: 'bg-info-soft text-primary',
  reclame_aqui: 'bg-critical-soft text-critical',
  google_meu_negocio: 'bg-warning-soft text-warning',
  contestacao: 'bg-destructive/10 text-destructive',
};

/**
 * Determina quem encerrou a tratativa com base no histórico.
 */
function quemEncerrou(tratativa) {
  const historico = tratativa.historico_estados || [];
  // Busca última transição para 'encerrada' ou 'aguardando_confirmacao_reabertura'
  const eventos = [...historico].reverse();
  const encerramento = eventos.find(h =>
    h.estado_novo === 'encerrada' || h.estado_novo === 'aguardando_confirmacao_reabertura'
  );
  return encerramento?.usuario || '—';
}

function tipoEncerrador(tratativa, colaboradores) {
  const historico = tratativa.historico_estados || [];
  const eventos = [...historico].reverse();
  const encerramento = eventos.find(h =>
    h.estado_novo === 'encerrada' || h.estado_novo === 'aguardando_confirmacao_reabertura'
  );
  if (!encerramento) return 'desconhecido';
  const nome = encerramento.usuario;
  const col = colaboradores?.find(c => c.nome_completo === nome);
  if (!col) return 'sistema';
  return col.papel === 'gestor' ? 'admin' : 'agente';
}

export default function AuditoriaDetalheTabela({ linhas, totalPontos, colaboradores = [] }) {
  const [expandido, setExpandido] = useState(null);

  if (linhas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Nenhuma tratativa com pontuação no ciclo ativo.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Tratativa</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Tipo</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Encerramento</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Encerrou</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Critérios</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Pontos</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map(({ tratativa, pontos, detalhes }) => {
            const encerrador = quemEncerrou(tratativa);
            const tipo = tipoEncerrador(tratativa, colaboradores);
            return (
              <React.Fragment key={tratativa.id}>
                <tr
                  className="border-b border-slate-50 hover:bg-muted cursor-pointer"
                  onClick={() => setExpandido(expandido === tratativa.id ? null : tratativa.id)}
                >
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1.5">
                      {expandido === tratativa.id
                        ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      }
                      <span className="font-mono text-xs text-muted-foreground">
                        {tratativa.id_interno || tratativa.id?.slice(-8)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-5 truncate max-w-[130px]">
                      {tratativa.nome_cliente}
                    </p>
                  </td>
                  <td className="py-2 px-3">
                    <Badge className={`text-xs ${TIPO_COLOR[tratativa.tipo_tratativa] || 'bg-muted text-muted-foreground'}`}>
                      {TIPO_LABEL[tratativa.tipo_tratativa] || tratativa.tipo_tratativa}
                    </Badge>
                  </td>
                  <td className="py-2 px-3 text-xs text-muted-foreground">
                    {formatDateSP(tratativa.data_encerramento, 'DD/MM/YYYY')}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      {tipo === 'admin'
                        ? <Shield className="w-3 h-3 text-primary" />
                        : <User className="w-3 h-3 text-primary" />
                      }
                      <span className="text-xs text-muted-foreground truncate max-w-[100px]" title={encerrador}>
                        {encerrador}
                      </span>
                    </div>
                    <span className={`text-xs ${tipo === 'admin' ? 'text-primary' : 'text-primary'}`}>
                      {tipo === 'admin' ? 'Admin' : tipo === 'agente' ? 'Agente' : 'Sistema'}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-1">
                      {detalhes.map((d, i) => (
                        <span key={i} className="text-xs bg-success-soft text-success border border-success/25 px-1.5 py-0.5 rounded">
                          {d.tipo} (+{d.pontos})
                        </span>
                      ))}
                      {detalhes.length === 0 && (
                        <span className="text-xs text-muted-foreground">Sem critérios pontuáveis</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className={`font-bold text-sm ${pontos > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                      {pontos > 0 ? `+${pontos.toFixed(1)}` : '0'}
                    </span>
                  </td>
                </tr>

                {/* Detalhe expandido */}
                {expandido === tratativa.id && (
                  <tr>
                    <td colSpan={6} className="px-6 py-3 bg-muted">
                      <div className="grid sm:grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1">
                          <p><span className="font-semibold text-muted-foreground">ID Interno:</span> {tratativa.id_interno || '-'}</p>
                          <p><span className="font-semibold text-muted-foreground">Cliente:</span> {tratativa.nome_cliente}</p>
                          <p><span className="font-semibold text-muted-foreground">Motivo:</span> {tratativa.motivo_nome || '-'}</p>
                          <p><span className="font-semibold text-muted-foreground">Encerrado no SLA:</span> {tratativa.encerrado_no_sla ? '✓ Sim' : '✗ Não'}</p>
                          <p><span className="font-semibold text-muted-foreground">Status reabertura:</span> {tratativa.status_reabertura || '-'}</p>
                          <p>
                            <span className="font-semibold text-muted-foreground">Encerrou:</span>{' '}
                            <span className={tipo === 'admin' ? 'text-primary' : 'text-primary'}>
                              {encerrador} ({tipo === 'admin' ? 'Admin' : tipo === 'agente' ? 'Agente' : 'Sistema'})
                            </span>
                          </p>
                          <p><span className="font-semibold text-muted-foreground">Data enc.:</span> {formatDateSP(tratativa.data_encerramento, 'DD/MM/YYYY HH:mm')}</p>
                        </div>
                        <div className="space-y-1">
                          {detalhes.length > 0 ? (
                            <>
                              <p className="font-semibold text-muted-foreground mb-1">Detalhamento dos pontos:</p>
                              {detalhes.map((d, i) => (
                                <p key={i} className="flex justify-between">
                                  <span className="text-muted-foreground">• {d.tipo}</span>
                                  <span className="font-bold text-warning">+{d.pontos}</span>
                                </p>
                              ))}
                              <p className="flex justify-between border-t border-border pt-1 mt-1">
                                <span className="font-semibold text-foreground">Total desta tratativa</span>
                                <span className="font-bold text-warning">+{pontos.toFixed(1)}</span>
                              </p>
                            </>
                          ) : (
                            <p className="text-muted-foreground">Esta tratativa não gerou pontos (critérios não atingidos).</p>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-border bg-muted">
            <td colSpan={5} className="py-2 px-3 text-sm font-semibold text-foreground">
              Total do agente no ciclo
            </td>
            <td className="py-2 px-3 text-right">
              <div className="flex items-center justify-end gap-1">
                <Star className="w-3.5 h-3.5 text-warning" />
                <span className="font-bold text-warning">{totalPontos.toFixed(1)}</span>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}