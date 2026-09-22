import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import db from '@/api/db';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import CampoFormulario from '@/components/ui/CampoFormulario';
import { useValidacao } from '@/hooks/useValidacao';
import { obrigatorio, numeroPositivo, maximoCaracteres } from '@/lib/validacao';
import { montarBonus } from '@/lib/bonusManual';

/**
 * Lançar bônus manual: pessoa, pontos e motivo, para um ciclo.
 *
 * Aberto pela tela inicial do gestor (escolhendo a pessoa) e pela página
 * detalhada (pessoa já escolhida). O lançamento entra no ranking na hora — a
 * consulta ['bonus-manual'] é a mesma do ranking e do "Meu ciclo".
 */

const MAX_MOTIVO = 300;
// Fora do componente: o useValidacao guarda as regras, e um objeto novo a
// cada render refaria a validação à toa.
const REGRAS = {
  pessoaId: [obrigatorio('O agente')],
  pontos: [obrigatorio('O número de pontos'), numeroPositivo('O número de pontos')],
  descricao: [obrigatorio('O motivo'), maximoCaracteres(MAX_MOTIVO, 'O motivo')],
};

const VAZIO = { pessoaId: '', pontos: '', descricao: '' };

// Bônus de ritmo (POP 11): a gestão confere no Zendesk se os tickets tiveram
// comentário interno a cada 36h úteis e lança a faixa. O atalho só preenche
// pontos e motivo — dá para ajustar antes de lançar.
const FAIXAS_RITMO = [
  { pontos: '10', rotulo: '95% ou mais', motivo: 'Bônus de ritmo: 95% ou mais dos tickets atualizados a cada 36h úteis (conferido no Zendesk).' },
  { pontos: '7', rotulo: '90% a 94%', motivo: 'Bônus de ritmo: 90% a 94% dos tickets atualizados a cada 36h úteis (conferido no Zendesk).' },
  { pontos: '4', rotulo: '85% a 89%', motivo: 'Bônus de ritmo: 85% a 89% dos tickets atualizados a cada 36h úteis (conferido no Zendesk).' },
];
const dataCurta = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');

export default function DialogoBonus({ open, onOpenChange, ciclo, pessoas = [], pessoaFixa = null, gestor, agora = new Date() }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(VAZIO);
  const validacao = useValidacao(form, REGRAS);

  // Abrir de novo começa limpo — e já com a pessoa, quando ela vem fixa.
  useEffect(() => {
    if (open) {
      setForm({ ...VAZIO, pessoaId: pessoaFixa?.id ?? '' });
      validacao.limpar();
    }
  }, [open, pessoaFixa?.id]);

  const lancar = useMutation({
    mutationFn: (registro) => db.entities.Pontuacao.create(registro),
    onSuccess: (_, registro) => {
      queryClient.invalidateQueries({ queryKey: ['bonus-manual'] });
      toast.success(`Bônus de ${String(registro.total_pontos).replace('.', ',')} pts lançado para ${registro.colaborador_nome}.`);
      onOpenChange(false);
    },
    onError: (e) => toast.error(`Não foi possível lançar o bônus: ${e.message}`),
  });

  const mudar = (campo, valor) => {
    setForm((f) => ({ ...f, [campo]: valor }));
    validacao.aoMudar(campo, valor);
  };

  const enviar = (ev) => {
    ev.preventDefault();
    if (!validacao.validarTudo()) return;
    const pessoa = pessoaFixa ?? pessoas.find((p) => p.id === form.pessoaId);
    const { registro, erro } = montarBonus({
      ciclo,
      pessoa: pessoa && { id: pessoa.id, nome_completo: pessoa.nome },
      pontos: form.pontos,
      descricao: form.descricao,
      gestor,
    });
    if (erro) { toast.error(erro); return; }
    lancar.mutate(registro);
  };

  const encerrado = ciclo && new Date(`${ciclo.data_fim}T23:59:59`) < agora;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Lançar bônus</DialogTitle>
          <DialogDescription>
            {ciclo ? `${ciclo.nome} · ${dataCurta(ciclo.data_inicio)} a ${dataCurta(ciclo.data_fim)}` : 'Nenhum ciclo escolhido'}
          </DialogDescription>
        </DialogHeader>

        {encerrado && (
          <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-foreground">
            Este ciclo já terminou. O bônus muda o resultado final dele.
          </p>
        )}

        <form onSubmit={enviar} className="space-y-4" noValidate>
          {pessoaFixa ? (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">Pessoa</p>
              <p className="text-sm text-foreground">{pessoaFixa.nome}</p>
            </div>
          ) : (
            <CampoFormulario id="bonus-pessoa" rotulo="Pessoa" obrigatorio erro={validacao.erro('pessoaId')}>
              <Select
                value={form.pessoaId}
                onValueChange={(v) => mudar('pessoaId', v)}
              >
                <SelectTrigger id="bonus-pessoa" {...validacao.campo('pessoaId')}>
                  <SelectValue placeholder="Escolha o agente" />
                </SelectTrigger>
                <SelectContent>
                  {pessoas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </CampoFormulario>
          )}

          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">Bônus de ritmo (atalho)</p>
            <div className="flex flex-wrap gap-2">
              {FAIXAS_RITMO.map((f) => (
                <Button
                  key={f.pontos}
                  type="button"
                  size="sm"
                  variant={form.pontos === f.pontos && form.descricao === f.motivo ? 'default' : 'outline'}
                  onClick={() => { mudar('pontos', f.pontos); mudar('descricao', f.motivo); }}
                >
                  {f.rotulo} · {f.pontos} pts
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Abaixo de 85% não pontua. Para outro bônus, preencha os campos abaixo.</p>
          </div>

          <CampoFormulario
            id="bonus-pontos"
            rotulo="Pontos"
            obrigatorio
            erro={validacao.erro('pontos')}
            ajuda="Use vírgula para meio ponto: 2,5"
          >
            <Input
              id="bonus-pontos"
              inputMode="decimal"
              value={form.pontos}
              onChange={(e) => mudar('pontos', e.target.value)}
              {...validacao.campo('pontos')}
              className="max-w-32"
            />
          </CampoFormulario>

          <CampoFormulario
            id="bonus-descricao"
            rotulo="Motivo"
            obrigatorio
            erro={validacao.erro('descricao')}
            ajuda={`${form.descricao.length}/${MAX_MOTIVO} · aparece no histórico do ciclo`}
          >
            <Textarea
              id="bonus-descricao"
              rows={3}
              value={form.descricao}
              onChange={(e) => mudar('descricao', e.target.value)}
              {...validacao.campo('descricao')}
            />
          </CampoFormulario>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={lancar.isPending || !ciclo}>
              {lancar.isPending ? 'Lançando…' : 'Lançar bônus'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
