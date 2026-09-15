import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { History, Search } from 'lucide-react';
import { TIPOS_APOIO, STATUS_APOIO, formatMinutos, getTipoApoioLabel, getStatusInfo } from './constants';

export default function HistoricoApoio({ solicitacoes, onStatusChange }) {
  const [filtroMes, setFiltroMes] = useState('all');
  const [filtroOperador, setFiltroOperador] = useState('all');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('all');
  const [filtroStatus, setFiltroStatus] = useState('all');

  const mesesDisponiveis = useMemo(() => {
    const set = new Set(solicitacoes.map(s => s.mes_referencia).filter(Boolean));
    return ['all', ...Array.from(set).sort().reverse()];
  }, [solicitacoes]);

  const operadoresDisponiveis = useMemo(() => {
    const set = new Set(solicitacoes.map(s => s.operador_nome).filter(Boolean));
    return ['all', ...Array.from(set).sort()];
  }, [solicitacoes]);

  const filtradas = useMemo(() => {
    return solicitacoes
      .filter(s => {
        if (filtroMes !== 'all' && s.mes_referencia !== filtroMes) return false;
        if (filtroOperador !== 'all' && s.operador_nome !== filtroOperador) return false;
        if (filtroCliente && !(s.nome_cliente || '').toLowerCase().includes(filtroCliente.toLowerCase())) return false;
        if (filtroTipo !== 'all' && s.tipo_apoio !== filtroTipo) return false;
        if (filtroStatus !== 'all' && s.status !== filtroStatus) return false;
        return true;
      })
      .sort((a, b) => new Date(b.data_solicitacao || b.created_date) - new Date(a.data_solicitacao || a.created_date));
  }, [solicitacoes, filtroMes, filtroOperador, filtroCliente, filtroTipo, filtroStatus]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          Histórico de Solicitações
          <Badge variant="outline">{filtradas.length} registro(s)</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <Select value={filtroMes} onValueChange={setFiltroMes}>
            <SelectTrigger className="text-xs"><SelectValue placeholder="Mês" /></SelectTrigger>
            <SelectContent>
              {mesesDisponiveis.map(m => <SelectItem key={m} value={m}>{m === 'all' ? 'Todos os meses' : m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroOperador} onValueChange={setFiltroOperador}>
            <SelectTrigger className="text-xs"><SelectValue placeholder="Operador" /></SelectTrigger>
            <SelectContent>
              {operadoresDisponiveis.map(o => <SelectItem key={o} value={o}>{o === 'all' ? 'Todos os operadores' : o}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input placeholder="Cliente..." value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} className="pl-8 text-xs" />
          </div>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {TIPOS_APOIO.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {STATUS_APOIO.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {filtradas.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">Nenhuma solicitação encontrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-left">
                  <th className="py-2 px-2 font-semibold">Data</th>
                  <th className="py-2 px-2 font-semibold">Cliente</th>
                  <th className="py-2 px-2 font-semibold">CNPJ</th>
                  <th className="py-2 px-2 font-semibold">Operador</th>
                  <th className="py-2 px-2 font-semibold">Tipo</th>
                  <th className="py-2 px-2 font-semibold">Zendesk</th>
                  <th className="py-2 px-2 font-semibold">Vínculo CRC</th>
                  <th className="py-2 px-2 font-semibold">Horas</th>
                  <th className="py-2 px-2 font-semibold">Status</th>
                  <th className="py-2 px-2 font-semibold">Observações</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map(s => {
                  const statusInfo = getStatusInfo(s.status);
                  return (
                    <tr key={s.id} className="border-b border-border hover:bg-muted">
                      <td className="py-2 px-2 whitespace-nowrap">{s.data_solicitacao ? new Date(s.data_solicitacao + 'T00:00:00').toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="py-2 px-2">{s.nome_cliente || '—'}</td>
                      <td className="py-2 px-2 whitespace-nowrap">{s.cnpj_cliente || '—'}</td>
                      <td className="py-2 px-2 whitespace-nowrap">{s.operador_nome || '—'}</td>
                      <td className="py-2 px-2 whitespace-nowrap">{getTipoApoioLabel(s.tipo_apoio)}{s.tipo_apoio === 'outro' && s.tipo_apoio_outro ? ` (${s.tipo_apoio_outro})` : ''}</td>
                      <td className="py-2 px-2 whitespace-nowrap">{s.tipo_zendesk || '—'}</td>
                      <td className="py-2 px-2 whitespace-nowrap">{s.vinculo_crc || '—'}</td>
                      <td className="py-2 px-2 whitespace-nowrap font-mono font-semibold">{formatMinutos(s.minutos_solicitados || 0)}</td>
                      <td className="py-2 px-2">
                        <Select value={s.status} onValueChange={v => onStatusChange(s, v)}>
                          <SelectTrigger className="h-7 w-auto border-0 bg-transparent p-0 hover:bg-muted rounded-md shadow-none">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-xs font-semibold ${statusInfo.color}`}>
                              {statusInfo.label}
                            </span>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_APOIO.map(st => <SelectItem key={st.value} value={st.value}>{st.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-2 px-2 max-w-[200px] truncate text-muted-foreground" title={s.descricao_justificativa || s.observacoes || ''}>
                        {s.descricao_justificativa || s.observacoes || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}