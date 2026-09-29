import db from '@/api/db';
import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CalendarClock, Plus, Trash2 } from 'lucide-react';

import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Cartao } from '@/components/ui/Cartao';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { todaySP } from '@/components/utils/helpers';

/**
 * MINHA AGENDA — compromissos pessoais, com data e hora. Cada um vê e mexe
 * só na própria (RLS, migration 26) — nem o gestor vê a agenda de outra
 * pessoa, mesma regra das anotações pessoais.
 */
const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

function rotuloDoDia(dataIso, hoje) {
  const [y, m, d] = dataIso.split('-').map(Number);
  const data = new Date(y, m - 1, d);
  const dataCurta = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
  if (dataIso === hoje) return `Hoje · ${dataCurta}`;
  const amanha = new Date(hoje.split('-').map(Number)[0], hoje.split('-').map(Number)[1] - 1, hoje.split('-').map(Number)[2] + 1);
  const amanhaIso = `${amanha.getFullYear()}-${String(amanha.getMonth() + 1).padStart(2, '0')}-${String(amanha.getDate()).padStart(2, '0')}`;
  if (dataIso === amanhaIso) return `Amanhã · ${dataCurta}`;
  return `${DIAS_SEMANA[data.getDay()]} · ${dataCurta}`;
}

const FORM_VAZIO = { data: todaySP(), hora: '', titulo: '', descricao: '' };

export default function MinhaAgenda() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(FORM_VAZIO);
  const [mostrarPassados, setMostrarPassados] = useState(false);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => db.auth.me() });
  const { data: colaboradores = [] } = useQuery({ queryKey: ['colaboradores', "list()"], queryFn: () => db.entities.Colaborador.list() });
  const eu = colaboradores.find((c) => c.email?.toLowerCase() === user?.email?.toLowerCase());

  const { data: compromissos = [], isLoading } = useQuery({
    queryKey: ['agenda-pessoal', eu?.id],
    queryFn: () => db.entities.AgendaPessoal.filter({ colaborador_id: eu.id }),
    enabled: Boolean(eu?.id),
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ['agenda-pessoal', eu?.id] });

  const criar = useMutation({
    mutationFn: (dados) => db.entities.AgendaPessoal.create({ ...dados, colaborador_id: eu.id }),
    onSuccess: () => { toast.success('Compromisso adicionado'); setForm({ ...FORM_VAZIO, data: form.data }); invalidar(); },
    onError: () => toast.error('Não consegui adicionar.'),
  });

  const alterar = useMutation({
    mutationFn: ({ id, dados }) => db.entities.AgendaPessoal.update(id, dados),
    onSuccess: invalidar,
    onError: () => toast.error('Não consegui salvar a alteração.'),
  });

  const apagar = useMutation({
    mutationFn: (id) => db.entities.AgendaPessoal.delete(id),
    onSuccess: () => { toast.success('Compromisso removido'); invalidar(); },
    onError: () => toast.error('Não consegui remover.'),
  });

  const hoje = todaySP();
  const grupos = useMemo(() => {
    const porDia = new Map();
    compromissos.forEach((c) => {
      if (!porDia.has(c.data)) porDia.set(c.data, []);
      porDia.get(c.data).push(c);
    });
    porDia.forEach((lista) => lista.sort((a, b) => (a.hora || '99:99').localeCompare(b.hora || '99:99')));
    return [...porDia.entries()]
      .filter(([data]) => mostrarPassados || data >= hoje)
      .sort(([a], [b]) => a.localeCompare(b));
  }, [compromissos, hoje, mostrarPassados]);

  const temPassados = compromissos.some((c) => c.data < hoje);

  const enviar = (e) => {
    e.preventDefault();
    if (!form.titulo.trim() || !form.data) { toast.error('Preencha ao menos a data e o título.'); return; }
    criar.mutate({ data: form.data, hora: form.hora || null, titulo: form.titulo.trim(), descricao: form.descricao.trim() || null, concluido: false });
  };

  if (!user || (eu && isLoading)) return <LoadingSpinner text="Carregando sua agenda..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Minha Agenda" subtitle="O que você vai fazer, com data e hora" icon={CalendarClock} />

      <Cartao titulo="Novo compromisso">
        <form onSubmit={enviar} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[140px_120px_minmax(0,1fr)]">
            <div>
              <Label htmlFor="agenda-data" className="text-xs">Data</Label>
              <Input id="agenda-data" type="date" value={form.data} onChange={(e) => setForm((f) => ({ ...f, data: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="agenda-hora" className="text-xs">Hora (opcional)</Label>
              <Input id="agenda-hora" type="time" value={form.hora} onChange={(e) => setForm((f) => ({ ...f, hora: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="agenda-titulo" className="text-xs">O que vai fazer</Label>
              <Input id="agenda-titulo" value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Ligar para o cliente X" />
            </div>
          </div>
          <div>
            <Label htmlFor="agenda-descricao" className="text-xs">Detalhe (opcional)</Label>
            <Textarea id="agenda-descricao" rows={2} value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
          </div>
          <Button type="submit" disabled={criar.isPending}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" /> {criar.isPending ? 'Adicionando...' : 'Adicionar'}
          </Button>
        </form>
      </Cartao>

      {grupos.length === 0 ? (
        <Cartao>
          <p className="text-sm text-muted-foreground">Nada agendado. Use o formulário acima para adicionar um compromisso.</p>
        </Cartao>
      ) : (
        grupos.map(([data, itens]) => (
          <Cartao key={data} titulo={rotuloDoDia(data, hoje)}>
            <div className="divide-y divide-border">
              {itens.map((c) => (
                <div key={c.id} className="flex items-start gap-3 py-2.5">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded accent-[hsl(var(--primary))]"
                    checked={Boolean(c.concluido)}
                    onChange={(e) => alterar.mutate({ id: c.id, dados: { concluido: e.target.checked } })}
                    aria-label={`Marcar "${c.titulo}" como concluído`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium text-foreground ${c.concluido ? 'line-through opacity-50' : ''}`}>
                      {c.hora && <span className="mr-2 font-mono text-xs text-muted-foreground">{c.hora.slice(0, 5)}</span>}
                      {c.titulo}
                    </p>
                    {c.descricao && <p className={`mt-0.5 text-xs text-muted-foreground ${c.concluido ? 'line-through opacity-50' : ''}`}>{c.descricao}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => apagar.mutate(c.id)}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                    aria-label={`Remover "${c.titulo}"`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </Cartao>
        ))
      )}

      {temPassados && (
        <button type="button" onClick={() => setMostrarPassados((v) => !v)} className="text-sm font-medium text-primary hover:underline">
          {mostrarPassados ? 'Ocultar dias passados' : 'Ver dias passados'}
        </button>
      )}
    </div>
  );
}
