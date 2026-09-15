import db from '@/api/db';
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { calculateTratativaPoints } from '@/components/utils/helpers';
import { tratativaNosCiclo } from '@/hooks/usePontuacaoAgente';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/ui/PageHeader';
import {
  ShieldCheck, Search, AlertTriangle, User, Star, ChevronDown, ChevronRight, Filter
} from 'lucide-react';
import { formatDateSP } from '@/components/utils/helpers';
import AuditoriaDetalheTabela from '@/components/auditoria/AuditoriaDetalheTabela';

const TIPOS_TRATATIVA = [
  { value: 'reclamacao_interna', label: 'Reclamação Interna', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'reclame_aqui', label: 'Reclame Aqui', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'google_meu_negocio', label: 'Google Meu Negócio', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'contestacao', label: 'Contestação', color: 'bg-red-100 text-red-700 border-red-300' },
];

export default function AuditoriaPontuacao() {
  const [busca, setBusca] = useState('');
  const [agenteExpandido, setAgenteExpandido] = useState(null);
  const [tiposFiltro, setTiposFiltro] = useState(TIPOS_TRATATIVA.map(t => t.value)); // todos selecionados por padrão

  const toggleTipo = (value) => {
    setTiposFiltro(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => db.entities.Colaborador.list(),
  });

  const { data: ciclos = [] } = useQuery({
    queryKey: ['ciclos-trimestrais'],
    queryFn: () => db.entities.CicloTrimestral.list(),
  });

  const cicloAtivo = useMemo(() => ciclos.find(c => c.ativo) || null, [ciclos]);

  const { data: todasTratativas = [], isLoading } = useQuery({
    queryKey: ['tratativas-auditoria'],
    queryFn: () => db.entities.Tratativa.filter({}, '-data_encerramento', 1000),
    staleTime: 60000,
  });

  // Para cada agente, monta o detalhamento completo dentro do ciclo
  const auditoria = useMemo(() => {
    if (!cicloAtivo) return [];
    const agentes = colaboradores.filter(c => c.papel === 'agente' && c.ativo !== false);

    return agentes.map(agente => {
      const tratativasDoCiclo = todasTratativas.filter(t =>
        t.agente_responsavel_id === agente.id &&
        (t.status === 'encerrada' || t.status === 'aguardando_confirmacao_reabertura') &&
        !t.excluida &&
        tratativaNosCiclo(t, cicloAtivo) &&
        tiposFiltro.includes(t.tipo_tratativa)
      );

      const tratativasForaDoCiclo = todasTratativas.filter(t =>
        t.agente_responsavel_id === agente.id &&
        (t.status === 'encerrada' || t.status === 'aguardando_confirmacao_reabertura') &&
        !t.excluida &&
        !tratativaNosCiclo(t, cicloAtivo)
      );

      let totalPontos = 0;
      const linhas = tratativasDoCiclo.map(t => {
        const { pontos, detalhes } = calculateTratativaPoints(t);
        totalPontos += pontos;
        return { tratativa: t, pontos, detalhes };
      }).sort((a, b) => b.pontos - a.pontos);

      return {
        agente,
        totalPontos,
        linhas,
        totalTratativas: tratativasDoCiclo.length,
        foraDosCiclo: tratativasForaDoCiclo.length,
        semPontos: linhas.filter(l => l.pontos === 0).length,
      };
    }).sort((a, b) => b.totalPontos - a.totalPontos);
  }, [colaboradores, todasTratativas, cicloAtivo, tiposFiltro]);

  const auditoriafiltrada = useMemo(() => {
    if (!busca) return auditoria;
    const b = busca.toLowerCase();
    return auditoria.filter(a => a.agente.nome_completo?.toLowerCase().includes(b));
  }, [auditoria, busca]);

  // Resumo geral
  const totalGeral = auditoria.reduce((a, b) => a + b.totalPontos, 0);
  const totalTratativas = auditoria.reduce((a, b) => a + b.totalTratativas, 0);
  const totalForaCiclo = auditoria.reduce((a, b) => a + b.foraDosCiclo, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoria de Pontuação"
        subtitle={cicloAtivo ? `Ciclo ativo: ${cicloAtivo.nome} (${cicloAtivo.data_inicio} → ${cicloAtivo.data_fim})` : 'Nenhum ciclo ativo'}
        icon={ShieldCheck}
      />

      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 text-center">
            <p className="text-3xl font-bold text-blue-600">{auditoria.length}</p>
            <p className="text-xs text-slate-500 mt-1">Agentes avaliados</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 text-center">
            <p className="text-3xl font-bold text-green-600">{totalTratativas}</p>
            <p className="text-xs text-slate-500 mt-1">Tratativas no ciclo</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 text-center">
            <p className="text-3xl font-bold text-amber-600">{totalGeral.toFixed(1)}</p>
            <p className="text-xs text-slate-500 mt-1">Pontos totais distribuídos</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 text-center">
            <p className={`text-3xl font-bold ${totalForaCiclo > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {totalForaCiclo}
            </p>
            <p className="text-xs text-slate-500 mt-1">Tratativas fora do ciclo (excluídas)</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de ciclo inativo */}
      {!cicloAtivo && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-amber-800 font-medium">
              Nenhum ciclo trimestral está ativo. Configure um ciclo em Configurações → Ciclos Trimestrais para que a pontuação seja calculada corretamente.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filtro de tipos de tratativa */}
      <Card className="border-0 shadow-sm">
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-500">
              <Filter className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">Filtrar por tipo:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TIPOS_TRATATIVA.map(tipo => {
                const ativo = tiposFiltro.includes(tipo.value);
                return (
                  <button
                    key={tipo.value}
                    onClick={() => toggleTipo(tipo.value)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                      ativo
                        ? tipo.color
                        : 'bg-white text-slate-400 border-slate-200 opacity-50'
                    }`}
                  >
                    {ativo ? '✓ ' : ''}{tipo.label}
                  </button>
                );
              })}
            </div>
            {tiposFiltro.length < TIPOS_TRATATIVA.length && (
              <button
                onClick={() => setTiposFiltro(TIPOS_TRATATIVA.map(t => t.value))}
                className="text-xs text-blue-600 hover:underline ml-auto"
              >
                Selecionar todos
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar agente..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Lista de agentes */}
      <div className="space-y-3">
        {isLoading ? (
          <p className="text-center text-slate-400 py-8">Calculando pontuações...</p>
        ) : auditoriafiltrada.map((item, idx) => (
          <Card key={item.agente.id} className="border-0 shadow-sm overflow-hidden">
            {/* Header do agente */}
            <button
              onClick={() => setAgenteExpandido(agenteExpandido === item.agente.id ? null : item.agente.id)}
              className="w-full text-left"
            >
              <CardHeader className="py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex-shrink-0">
                    {idx + 1}º
                  </div>
                  <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {item.agente.foto_url ? (
                      <img src={item.agente.foto_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-slate-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{item.agente.nome_completo}</p>
                    <p className="text-xs text-slate-500">
                      {item.totalTratativas} tratativas no ciclo
                      {item.foraDosCiclo > 0 && (
                        <span className="text-red-500 ml-2">· {item.foraDosCiclo} fora do ciclo (não contabilizadas)</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-500" />
                        <span className="text-xl font-bold text-amber-700">{item.totalPontos.toFixed(1)}</span>
                      </div>
                      <p className="text-xs text-slate-400">pontos</p>
                    </div>
                    {agenteExpandido === item.agente.id
                      ? <ChevronDown className="w-5 h-5 text-slate-400" />
                      : <ChevronRight className="w-5 h-5 text-slate-400" />
                    }
                  </div>
                </div>
              </CardHeader>
            </button>

            {/* Detalhe de tratativas */}
            {agenteExpandido === item.agente.id && (
              <CardContent className="pt-0 pb-4">
                <AuditoriaDetalheTabela
                  linhas={item.linhas}
                  totalPontos={item.totalPontos}
                  colaboradores={colaboradores}
                />
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}