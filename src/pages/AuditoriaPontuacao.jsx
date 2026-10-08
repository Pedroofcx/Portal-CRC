import db from '@/api/db';
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { calculateTratativaPoints } from '@/components/utils/helpers';
import { tratativaNosCiclo } from '@/hooks/usePontuacaoAgente';
import { comReaberturaApurada, aberturasNoCiclo, cicloExigeRegistroDaEquipe, canaisLiberadosDaEquipe, PONTOS_POR_ABERTURA } from '@/lib/pontuacaoCiclo';
import { registrosNoCiclo } from '@/lib/cicloEquipe';
import { canalDe, CANAIS } from '@/lib/elegibilidade';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import PageHeader from '@/components/ui/PageHeader';
import {
  ShieldCheck, Search, AlertTriangle, User, Star, ChevronDown, ChevronRight, Filter
} from 'lucide-react';
import AuditoriaDetalheTabela from '@/components/auditoria/AuditoriaDetalheTabela';
import { usePermissoes } from '@/hooks/usePermissoes';

const TIPOS_TRATATIVA = [
  { value: 'reclamacao_interna', label: 'Reclamação Interna', color: 'bg-info-soft text-primary border-info/30' },
  { value: 'reclame_aqui', label: 'Reclame Aqui', color: 'bg-critical-soft text-critical border-critical/25' },
  { value: 'google_meu_negocio', label: 'Google Meu Negócio', color: 'bg-success-soft text-success border-success/25' },
  { value: 'contestacao', label: 'Contestação', color: 'bg-destructive/10 text-destructive border-destructive/30' },
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

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => db.auth.me() });
  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores', "list()"],
    queryFn: () => db.entities.Colaborador.list(),
  });
  const eu = colaboradores.find((c) => c.email === user?.email);
  const { temPermissao } = usePermissoes();
  const isGestor = temPermissao('gerenciar_premiacao');

  const { data: ciclos = [] } = useQuery({
    queryKey: ['ciclos-trimestrais', "list()"],
    queryFn: () => db.entities.CicloTrimestral.list(),
  });

  const cicloAtivo = useMemo(() => ciclos.find(c => c.ativo) || null, [ciclos]);

  const { data: todasTratativas = [], isLoading } = useQuery({
    // Todas (não as últimas 1000), a mesma busca do ranking.
    queryKey: ['tratativas', "list('-created_date')"],
    queryFn: () => db.entities.Tratativa.list('-created_date'),
    staleTime: 60000,
  });

  // Para cada agente, monta o detalhamento completo dentro do ciclo
  const auditoria = useMemo(() => {
    if (!cicloAtivo) return [];
    const agentes = colaboradores.filter(c => c.papel === 'agente' && c.ativo !== false);
    const aplicaRegra = cicloExigeRegistroDaEquipe(cicloAtivo);
    // A equipe libera (ou não) cada canal: todos os agentes ativos com registro precisam ter 1.
    const volumeDe = (id) => registrosNoCiclo(todasTratativas.filter(t => t.agente_responsavel_id === id), cicloAtivo);
    const liberacao = canaisLiberadosDaEquipe(agentes.map(a => ({ id: a.id, volume: volumeDe(a.id) })));
    const canaisBloqueados = aplicaRegra && liberacao.participantes > 0 ? CANAIS.filter(c => !liberacao.liberados.includes(c)) : [];

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

      // Canal que a equipe ainda não liberou (do Ciclo 3 em diante): os pontos
      // dele ficam retidos — a mesma regra do ranking.
      const volume = volumeDe(agente.id);
      const canaisSemRegistro = CANAIS.filter(c => (volume[c] ?? 0) < 1);
      const abaixoDoMinimo = (tipo) => canaisBloqueados.includes(canalDe(tipo));

      let totalPontos = 0;
      let pontosRetidos = 0;
      const linhas = tratativasDoCiclo.map(t => {
        // Reabertura apurada pelos dados, como no ranking.
        const { pontos, detalhes } = calculateTratativaPoints(comReaberturaApurada(t, todasTratativas), { ciclo: cicloAtivo });
        const retida = abaixoDoMinimo(t.tipo_tratativa);
        if (retida) pontosRetidos += pontos; else totalPontos += pontos;
        return { tratativa: t, pontos, detalhes, retida };
      }).sort((a, b) => b.pontos - a.pontos);

      // 0,5 por tratativa aberta no ciclo (do Ciclo 2 em diante).
      const abertasDoAgente = aberturasNoCiclo(todasTratativas, cicloAtivo)
        .filter(t => t.agente_responsavel_id === agente.id && tiposFiltro.includes(t.tipo_tratativa));
      const aberturasRetidas = abertasDoAgente.filter(t => abaixoDoMinimo(t.tipo_tratativa)).length;
      const aberturas = abertasDoAgente.length - aberturasRetidas;
      totalPontos += aberturas * PONTOS_POR_ABERTURA;
      pontosRetidos += aberturasRetidas * PONTOS_POR_ABERTURA;

      return {
        agente,
        totalPontos,
        linhas,
        aberturas,
        pontosRetidos,
        canaisSemRegistro,
        volume,
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

  if (!isGestor) {
    return (
      <div className="py-16 text-center">
        <h2 className="mb-2 text-xl font-semibold">Acesso restrito</h2>
        <p className="text-muted-foreground">Auditoria de pontuação é uma área da gestão.</p>
      </div>
    );
  }

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
            <p className="text-3xl font-bold text-primary">{auditoria.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Agentes avaliados</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 text-center">
            <p className="text-3xl font-bold text-success">{totalTratativas}</p>
            <p className="text-xs text-muted-foreground mt-1">Tratativas no ciclo</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 text-center">
            <p className="text-3xl font-bold text-warning">{totalGeral.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground mt-1">Pontos totais distribuídos</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-5 text-center">
            <p className={`text-3xl font-bold ${totalForaCiclo > 0 ? 'text-destructive' : 'text-success'}`}>
              {totalForaCiclo}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Tratativas fora do ciclo (excluídas)</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerta de ciclo inativo */}
      {!cicloAtivo && (
        <Card className="border-warning/30 bg-warning-soft">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <p className="text-sm text-warning font-medium">
              Nenhum ciclo trimestral está ativo. Configure um ciclo em Configurações → Ciclos Trimestrais para que a pontuação seja calculada corretamente.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Filtro de tipos de tratativa */}
      <Card className="border-0 shadow-sm">
        <CardContent className="py-3 px-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
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
                        : 'bg-card text-muted-foreground border-border opacity-50'
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
                className="text-xs text-primary hover:underline ml-auto"
              >
                Selecionar todos
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
          <p className="text-center text-muted-foreground py-8">Calculando pontuações...</p>
        ) : auditoriafiltrada.map((item, idx) => (
          <Card key={item.agente.id} className="border-0 shadow-sm overflow-hidden">
            {/* Header do agente */}
            <button
              onClick={() => setAgenteExpandido(agenteExpandido === item.agente.id ? null : item.agente.id)}
              className="w-full text-left"
            >
              <CardHeader className="py-4 hover:bg-muted transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-info-soft text-primary font-bold text-sm flex-shrink-0">
                    {idx + 1}º
                  </div>
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {item.agente.foto_url ? (
                      <img src={item.agente.foto_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground">{item.agente.nome_completo}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.totalTratativas} tratativas no ciclo
                      {item.aberturas > 0 && ` · ${item.aberturas} abertas (+${String(item.aberturas * PONTOS_POR_ABERTURA).replace('.', ',')} pts)`}
                      {item.pontosRetidos > 0 && (
                        <span className="text-warning ml-2">· {String(item.pontosRetidos).replace('.', ',')} pts retidos (canal ainda não liberado pela equipe)</span>
                      )}
                      {item.foraDosCiclo > 0 && (
                        <span className="text-destructive ml-2">· {item.foraDosCiclo} fora do ciclo (não contabilizadas)</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-warning" />
                        <span className="text-xl font-bold text-warning">{item.totalPontos.toFixed(1)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">pontos</p>
                    </div>
                    {agenteExpandido === item.agente.id
                      ? <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      : <ChevronRight className="w-5 h-5 text-muted-foreground" />
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