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
  reclamacao_interna: 'bg-blue-100 text-blue-700',
  reclame_aqui: 'bg-orange-100 text-orange-700',
  google_meu_negocio: 'bg-yellow-100 text-yellow-700',
  contestacao: 'bg-red-100 text-red-700',
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
      <p className="text-sm text-slate-400 text-center py-4">
        Nenhuma tratativa com pontuação no ciclo ativo.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Tratativa</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Tipo</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Encerramento</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Encerrou</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Critérios</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500">Pontos</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map(({ tratativa, pontos, detalhes }) => {
            const encerrador = quemEncerrou(tratativa);
            const tipo = tipoEncerrador(tratativa, colaboradores);
            return (
              <React.Fragment key={tratativa.id}>
                <tr
                  className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                  onClick={() => setExpandido(expandido === tratativa.id ? null : tratativa.id)}
                >
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1.5">
                      {expandido === tratativa.id
                        ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      }
                      <span className="font-mono text-xs text-slate-600">
                        {tratativa.id_interno || tratativa.id?.slice(-8)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 pl-5 truncate max-w-[130px]">
                      {tratativa.nome_cliente}
                    </p>
                  </td>
                  <td className="py-2 px-3">
                    <Badge className={`text-xs ${TIPO_COLOR[tratativa.tipo_tratativa] || 'bg-slate-100 text-slate-600'}`}>
                      {TIPO_LABEL[tratativa.tipo_tratativa] || tratativa.tipo_tratativa}
                    </Badge>
                  </td>
                  <td className="py-2 px-3 text-xs text-slate-500">
                    {formatDateSP(tratativa.data_encerramento, 'DD/MM/YYYY')}
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-1">
                      {tipo === 'admin'
                        ? <Shield className="w-3 h-3 text-purple-500" />
                        : <User className="w-3 h-3 text-blue-500" />
                      }
                      <span className="text-xs text-slate-600 truncate max-w-[100px]" title={encerrador}>
                        {encerrador}
                      </span>
                    </div>
                    <span className={`text-xs ${tipo === 'admin' ? 'text-purple-500' : 'text-blue-500'}`}>
                      {tipo === 'admin' ? 'Admin' : tipo === 'agente' ? 'Agente' : 'Sistema'}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-1">
                      {detalhes.map((d, i) => (
                        <span key={i} className="text-xs bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded">
                          {d.tipo} (+{d.pontos})
                        </span>
                      ))}
                      {detalhes.length === 0 && (
                        <span className="text-xs text-slate-400">Sem critérios pontuáveis</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span className={`font-bold text-sm ${pontos > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {pontos > 0 ? `+${pontos.toFixed(1)}` : '0'}
                    </span>
                  </td>
                </tr>

                {/* Detalhe expandido */}
                {expandido === tratativa.id && (
                  <tr>
                    <td colSpan={6} className="px-6 py-3 bg-slate-50">
                      <div className="grid sm:grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1">
                          <p><span className="font-semibold text-slate-600">ID Interno:</span> {tratativa.id_interno || '-'}</p>
                          <p><span className="font-semibold text-slate-600">Cliente:</span> {tratativa.nome_cliente}</p>
                          <p><span className="font-semibold text-slate-600">Motivo:</span> {tratativa.motivo_nome || '-'}</p>
                          <p><span className="font-semibold text-slate-600">Encerrado no SLA:</span> {tratativa.encerrado_no_sla ? '✓ Sim' : '✗ Não'}</p>
                          <p><span className="font-semibold text-slate-600">Status reabertura:</span> {tratativa.status_reabertura || '-'}</p>
                          <p>
                            <span className="font-semibold text-slate-600">Encerrou:</span>{' '}
                            <span className={tipo === 'admin' ? 'text-purple-700' : 'text-blue-700'}>
                              {encerrador} ({tipo === 'admin' ? 'Admin' : tipo === 'agente' ? 'Agente' : 'Sistema'})
                            </span>
                          </p>
                          <p><span className="font-semibold text-slate-600">Data enc.:</span> {formatDateSP(tratativa.data_encerramento, 'DD/MM/YYYY HH:mm')}</p>
                        </div>
                        <div className="space-y-1">
                          {detalhes.length > 0 ? (
                            <>
                              <p className="font-semibold text-slate-600 mb-1">Detalhamento dos pontos:</p>
                              {detalhes.map((d, i) => (
                                <p key={i} className="flex justify-between">
                                  <span className="text-slate-600">• {d.tipo}</span>
                                  <span className="font-bold text-amber-600">+{d.pontos}</span>
                                </p>
                              ))}
                              <p className="flex justify-between border-t border-slate-200 pt-1 mt-1">
                                <span className="font-semibold text-slate-700">Total desta tratativa</span>
                                <span className="font-bold text-amber-700">+{pontos.toFixed(1)}</span>
                              </p>
                            </>
                          ) : (
                            <p className="text-slate-400">Esta tratativa não gerou pontos (critérios não atingidos).</p>
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
          <tr className="border-t border-slate-200 bg-slate-50">
            <td colSpan={5} className="py-2 px-3 text-sm font-semibold text-slate-700">
              Total do agente no ciclo
            </td>
            <td className="py-2 px-3 text-right">
              <div className="flex items-center justify-end gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-bold text-amber-700">{totalPontos.toFixed(1)}</span>
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}