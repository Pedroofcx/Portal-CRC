import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Cartao, Linha } from '@/components/ui/Cartao';
import TabelaResumida from '@/components/ui/TabelaResumida';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { formatDateSP } from '@/components/utils/helpers';
import { ligacoesAuditoria, resumoAuditoria } from '@/lib/apuracao/auditoriaTelefone';

/**
 * AUDITORIA DO TELEFONE — conferir, ligação por ligação, como a fórmula
 * (FCR + CSAT) classificou cada uma. Quase tudo é só leitura, mas as
 * NEGATIVAS podem ser revisadas: às vezes a ligação fica muda (falha
 * técnica) e o cliente avalia negativo mesmo assim — Pedro (30/09/2026)
 * pediu para poder confirmar a negativa ou removê-la (com motivo
 * obrigatório). Remover muda o CSAT oficial: a ligação some do cálculo,
 * como se não tivesse sido avaliada.
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

export default function AuditoriaTelefone({ apuracoes, revisando, onRevisar }) {
  const [busca, setBusca] = useState('');
  const [removendo, setRemovendo] = useState(null); // linha em revisão no diálogo de motivo
  const [motivo, setMotivo] = useState('');

  const linhas = useMemo(() => ligacoesAuditoria(apuracoes), [apuracoes]);
  const resumo = useMemo(() => resumoAuditoria(linhas), [linhas]);

  const filtradas = busca
    ? linhas.filter((l) => l.colaboradorNome?.toLowerCase().includes(busca.toLowerCase()))
    : linhas;

  const abrirRemocao = (linha) => { setRemovendo(linha); setMotivo(''); };
  const confirmarRemocao = () => {
    if (!motivo.trim()) return;
    onRevisar(removendo, 'removido', motivo.trim());
    setRemovendo(null);
    setMotivo('');
  };

  return (
    <div className="space-y-6">
      <Cartao titulo="Como as ligações foram classificadas">
        <div className="grid grid-cols-2 gap-x-8 sm:grid-cols-4">
          <div className="divide-y divide-border sm:col-span-1">
            <Linha rotulo="Ligações avaliadas" valor={resumo.total} forte />
          </div>
          <div className="divide-y divide-border sm:col-span-3">
            <Linha rotulo="Positivas" valor={resumo.positiva} />
            <Linha rotulo="Negativas" detalhe={resumo.negativa > 0 ? `${resumo.negativasNaoRevisadas} sem revisão · ${resumo.negativasConfirmadas} confirmada(s) · ${resumo.negativasRemovidas} removida(s)` : null} valor={resumo.negativa} />
            <Linha rotulo="Neutras (nota 3)" valor={resumo.neutra} />
            <Linha rotulo="Incompletas (sem nota)" valor={resumo.incompleta} />
            <Linha rotulo="Transferência de fila" valor={resumo.transferencia} />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          A classificação é automática — FCR 1 + CSAT 4/5 é positiva, FCR 1 + CSAT 1/2 é negativa, FCR 1 + CSAT 3 é
          neutra, FCR 2 é sempre negativa. Uma negativa pode ser confirmada ou removida (com motivo) quando a ligação
          ficou muda ou teve outra falha técnica — removida, ela sai do CSAT oficial.
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
              {
                chave: 'revisao',
                rotulo: 'Revisão',
                principal: true,
                valor: (l) => {
                  if (l.categoria !== 'negativa') return <span className="text-xs text-muted-foreground">—</span>;
                  if (l.revisao?.status === 'confirmado') {
                    return (
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">Confirmada</span>
                        <button type="button" disabled={revisando} onClick={() => onRevisar(l, null, null)} className="text-xs text-muted-foreground hover:text-foreground hover:underline">desfazer</button>
                      </div>
                    );
                  }
                  if (l.revisao?.status === 'removido') {
                    return (
                      <div className="flex items-center gap-1.5">
                        <span title={l.revisao.motivo} className="rounded-md border border-success/40 bg-success-soft px-2 py-0.5 text-xs font-medium text-success">Removida</span>
                        <button type="button" disabled={revisando} onClick={() => onRevisar(l, null, null)} className="text-xs text-muted-foreground hover:text-foreground hover:underline">desfazer</button>
                      </div>
                    );
                  }
                  return (
                    <div className="flex gap-1.5">
                      <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={revisando} onClick={() => onRevisar(l, 'confirmado', null)}>
                        Confirmar negativo
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs text-destructive hover:text-destructive" disabled={revisando} onClick={() => abrirRemocao(l)}>
                        Remover
                      </Button>
                    </div>
                  );
                },
              },
              { chave: 'fcr', rotulo: 'FCR', valor: (l) => l.fcr ?? '—' },
              { chave: 'csat', rotulo: 'CSAT', valor: (l) => l.csat ?? '—' },
              { chave: 'status', rotulo: 'Status da ligação', valor: (l) => l.status || '—' },
              { chave: 'motivoRevisao', rotulo: 'Motivo da remoção', valor: (l) => l.revisao?.motivo || '—' },
              { chave: 'quemRevisou', rotulo: 'Revisado por', valor: (l) => (l.revisao ? `${l.revisao.por_nome || '—'} em ${formatDateSP(l.revisao.em, 'DD/MM/YYYY HH:mm')}` : '—') },
            ]}
          />
        )}
      </Cartao>

      <Dialog open={Boolean(removendo)} onOpenChange={(v) => { if (!v) setRemovendo(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remover esta negativa</DialogTitle>
            <DialogDescription>
              {removendo ? `${removendo.colaboradorNome} — ${formatDateSP(removendo.data, 'DD/MM/YYYY')}. A ligação sai do CSAT oficial (como se não tivesse sido avaliada). Fica registrado quem removeu e o motivo.` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label htmlFor="motivo-remocao" className="text-sm font-medium text-foreground">Motivo (obrigatório)</label>
            <Textarea
              id="motivo-remocao"
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: ligação ficou muda, sem áudio, falha técnica confirmada."
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setRemovendo(null)} disabled={revisando}>Cancelar</Button>
            <Button type="button" onClick={confirmarRemocao} disabled={revisando || !motivo.trim()}>
              {revisando ? 'Salvando...' : 'Remover negativa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
