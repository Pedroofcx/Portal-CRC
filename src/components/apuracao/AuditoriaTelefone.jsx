import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Cartao, Linha } from '@/components/ui/Cartao';
import TabelaResumida from '@/components/ui/TabelaResumida';
import { formatDateSP } from '@/components/utils/helpers';
import { ligacoesAuditoria, resumoAuditoria } from '@/lib/apuracao/auditoriaTelefone';

/**
 * AUDITORIA DO TELEFONE — conferir, ligação por ligação, como a fórmula
 * (FCR + CSAT) classificou cada uma. Só leitura: diferente do chat, o
 * 55PBX já vem com a nota no arquivo, não há nada pra classificar aqui —
 * é conferência, não decisão (Pedro, 29/09/2026).
 */
const CATEGORIA_CLASSE = {
  positiva: 'border-success/40 bg-success-soft text-success',
  negativa: 'border-destructive/40 bg-destructive/10 text-destructive',
  neutra: 'border-warning/40 bg-warning-soft text-warning',
  incompleta: 'border-border bg-muted text-muted-foreground',
  transferencia: 'border-info/40 bg-info-soft text-info',
  nao_atendida: 'border-border bg-muted text-muted-foreground',
  sem_avaliacao: 'border-border bg-muted text-muted-foreground',
};

export default function AuditoriaTelefone({ apuracoes }) {
  const [busca, setBusca] = useState('');

  const linhas = useMemo(() => ligacoesAuditoria(apuracoes), [apuracoes]);
  const resumo = useMemo(() => resumoAuditoria(linhas), [linhas]);

  const filtradas = busca
    ? linhas.filter((l) => l.colaboradorNome?.toLowerCase().includes(busca.toLowerCase()))
    : linhas;

  return (
    <div className="space-y-6">
      <Cartao titulo="Como as ligações foram classificadas">
        <div className="grid grid-cols-2 gap-x-8 sm:grid-cols-4">
          <div className="divide-y divide-border sm:col-span-1">
            <Linha rotulo="Ligações avaliadas" valor={resumo.total} forte />
          </div>
          <div className="divide-y divide-border sm:col-span-3">
            <Linha rotulo="Positivas" valor={resumo.positiva} />
            <Linha rotulo="Negativas" valor={resumo.negativa} />
            <Linha rotulo="Neutras (nota 3)" valor={resumo.neutra} />
            <Linha rotulo="Incompletas (sem nota)" valor={resumo.incompleta} />
            <Linha rotulo="Transferência de fila" valor={resumo.transferencia} />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          A classificação é automática — FCR 1 + CSAT 4/5 é positiva, FCR 1 + CSAT 1/2 é negativa, FCR 1 + CSAT 3 é
          neutra, FCR 2 é sempre negativa. Esta tela é só para conferir, não há nada para decidir aqui.
        </p>
      </Cartao>

      <Input className="max-w-xs" placeholder="Buscar por pessoa..." value={busca} onChange={(e) => setBusca(e.target.value)} />

      <Cartao>
        {filtradas.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma ligação encontrada.</p>
        ) : (
          <TabelaResumida
            linhas={filtradas}
            chaveDaLinha={(l, i) => `${l.apuracaoId}-${i}`}
            limite={30}
            rotulo="ligações"
            colunas={[
              { chave: 'pessoa', rotulo: 'Agente', alinhar: 'esquerda', principal: true, valor: (l) => l.colaboradorNome || 'sem pessoa vinculada' },
              { chave: 'data', rotulo: 'Data', principal: true, valor: (l) => (l.data ? formatDateSP(l.data, 'DD/MM/YYYY') : '—') },
              {
                chave: 'classificacao',
                rotulo: 'Classificação',
                principal: true,
                valor: (l) => <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${CATEGORIA_CLASSE[l.categoria] || ''}`}>{l.rotulo}</span>,
              },
              { chave: 'fcr', rotulo: 'FCR', valor: (l) => l.fcr ?? '—' },
              { chave: 'csat', rotulo: 'CSAT', valor: (l) => l.csat ?? '—' },
              { chave: 'status', rotulo: 'Status da ligação', valor: (l) => l.status || '—' },
            ]}
          />
        )}
      </Cartao>
    </div>
  );
}
