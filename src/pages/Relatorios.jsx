import db from '@/api/db';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BarChart3 } from 'lucide-react';

import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Cartao } from '@/components/ui/Cartao';
import { FiltroPeriodo } from '@/components/relatorios/hub/Pecas';
import Financeiro from '@/components/relatorios/grupos/Financeiro';
import Pessoas from '@/components/relatorios/grupos/Pessoas';
import Operacao from '@/components/relatorios/grupos/Operacao';
import Canais from '@/components/relatorios/grupos/Canais';

/**
 * Relatórios — organizados por PERGUNTA (padrão aprovado por Pedro em
 * 22/09/2026). Seis grupos; cada relatório diz no topo o que responde e tem
 * um "como calculamos" em português. O grupo e o período ficam na URL
 * (?grupo=financeiro), para dar para mandar o link.
 */
export const GRUPOS = [
  { chave: 'operacao', rotulo: 'Operação', pergunta: 'Como está a fila hoje?' },
  { chave: 'canais', rotulo: 'Canais', pergunta: 'Como estamos em cada canal?' },
  { chave: 'qualidade', rotulo: 'Qualidade', pergunta: 'Como os clientes nos avaliam?' },
  { chave: 'pessoas', rotulo: 'Pessoas e premiação', pergunta: 'Como cada pessoa está?' },
  { chave: 'financeiro', rotulo: 'Financeiro', pergunta: 'Quanto custa e quanto recuperamos?' },
  { chave: 'jornada', rotulo: 'Jornada do cliente', pergunta: 'Onde o cliente sofre?' },
];

export default function Relatorios() {
  const { search } = useLocation();
  const navigate = useNavigate();
  const grupo = GRUPOS.find((g) => g.chave === new URLSearchParams(search).get('grupo')) ?? GRUPOS[0];

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => db.auth.me() });
  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores', "list()"], queryFn: () => db.entities.Colaborador.list() });
  const { data: ciclos = [] } = useQuery({ queryKey: ['ciclos-trimestrais', "list()"], queryFn: () => db.entities.CicloTrimestral.list() });
  const { data: tratativas = [], isLoading } = useQuery({
    queryKey: ['tratativas', "list('-created_date')"],
    queryFn: () => db.entities.Tratativa.list('-created_date'),
    staleTime: 60000,
  });

  const eu = colaboradores.find((c) => c.email?.toLowerCase() === user?.email?.toLowerCase());
  const ehGestor = eu?.papel === 'gestor';

  // Período padrão: o ciclo ativo da premiação.
  const [periodo, setPeriodo] = useState({ chave: '', inicio: '', fim: '' });
  const cicloAtivo = useMemo(() => ciclos.find((c) => c.ativo) ?? null, [ciclos]);
  useEffect(() => {
    if (!periodo.chave && cicloAtivo) setPeriodo({ chave: cicloAtivo.id, inicio: cicloAtivo.data_inicio, fim: cicloAtivo.data_fim });
  }, [cicloAtivo, periodo.chave]);

  const irPara = (chave) => navigate({ search: `?grupo=${chave}` }, { replace: true });

  if (!user || isLoading) return <LoadingSpinner text="Carregando relatórios..." />;
  if (colaboradores.length > 0 && !ehGestor) {
    return <p className="text-sm text-muted-foreground">Os relatórios são do gestor.</p>;
  }

  const corpo = {
    operacao: <Operacao tratativas={tratativas} periodo={periodo} />,
    canais: <Canais tratativas={tratativas} periodo={periodo} />,
    financeiro: <Financeiro tratativas={tratativas} periodo={periodo} ehGestor={ehGestor} />,
    pessoas: <Pessoas tratativas={tratativas} periodo={periodo} ciclos={ciclos} colaboradores={colaboradores} />,
  }[grupo.chave];

  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios" subtitle="Cada relatório responde a uma pergunta. Abra “Como calculamos” para ver a conta." icon={BarChart3} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <nav aria-label="Grupos de relatórios" className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
          {GRUPOS.map((g) => (
            <button
              key={g.chave}
              type="button"
              onClick={() => irPara(g.chave)}
              aria-current={g.chave === grupo.chave ? 'page' : undefined}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${g.chave === grupo.chave ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
            >
              {g.rotulo}
            </button>
          ))}
        </nav>
        <FiltroPeriodo ciclos={ciclos} valor={periodo} onChange={setPeriodo} />
      </div>

      {corpo ?? (
        <Cartao>
          <p className="text-sm text-muted-foreground">{grupo.pergunta} — este grupo está sendo reconstruído no formato novo.</p>
        </Cartao>
      )}
    </div>
  );
}
