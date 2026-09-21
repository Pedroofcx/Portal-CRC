import db from '@/api/db';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ColaboradorCard from '@/components/observacoes/ColaboradorCard';
import HistoricoColaborador from '@/components/observacoes/HistoricoColaborador';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { MessageSquare, Plus, Search } from 'lucide-react';
import RichTextEditor from '@/components/ui/RichTextEditor';
import PainelLateral, { RodapeFixo } from '@/components/ui/PainelLateral';

const TIPOS_OBS = [
  { value: 'observacao_diaria', label: 'Observação Diária' },
  { value: 'feedback_positivo', label: 'Feedback Positivo' },
  { value: 'feedback_regular', label: 'Feedback Regular' },
  { value: 'feedback_negativo', label: 'Feedback Negativo' },
  { value: 'one_on_one', label: 'One-on-One' },
  { value: 'kaizen', label: 'Kaizen' },
  { value: 'hansei', label: 'Hansei' },
  { value: 'keidoh', label: 'Keidoh' },
  { value: 'registro_livre', label: 'Registro Livre' },
];

export default function Observacoes() {
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState(null);
  const [busca, setBusca] = useState('');
  const [dialogNovaObs, setDialogNovaObs] = useState(false);
  const [form, setForm] = useState({
    tipo: '',
    titulo: '',
    conteudo: '',
    visibilidade: 'gestor',
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => db.auth.me(),
  });

  const { data: colaboradores = [], isLoading: loadingColabs } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => db.entities.Colaborador.list(),
  });

  const { data: observacoes = [], isLoading: loadingObs } = useQuery({
    queryKey: ['observacoes'],
    queryFn: () => db.entities.Observacao.list('-created_date', 2000),
    staleTime: 60000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  const { data: pdis = [] } = useQuery({
    queryKey: ['pdis'],
    queryFn: () => db.entities.PDI.list('-created_date', 500),
    staleTime: 120000,
  });

  const colaboradorAtual = colaboradores.find(c => c.email === user?.email);
  const isGestor = colaboradorAtual?.papel === 'gestor';

  const criarMutation = useMutation({
    mutationFn: (data) => db.entities.Observacao.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['observacoes']);
      toast.success('Observação registrada!');
      setDialogNovaObs(false);
      setForm({ tipo: '', titulo: '', conteudo: '', visibilidade: 'gestor' });
    },
    onError: () => toast.error('Erro ao salvar observação'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Observacao.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['observacoes']);
      toast.success('Observação excluída');
    },
  });

  const handleCriar = () => {
    if (!form.tipo) { toast.error('Selecione o tipo'); return; }
    if (!form.conteudo || form.conteudo.replace(/<[^>]*>/g, '').trim().length < 5) {
      toast.error('Preencha o conteúdo da observação'); return;
    }
    criarMutation.mutate({
      tipo: form.tipo,
      titulo: form.titulo,
      conteudo: form.conteudo,
      visibilidade: form.visibilidade,
      colaboradores_ids: [colaboradorSelecionado.id],
      colaboradores_nomes: [colaboradorSelecionado.nome_completo],
      autor_id: colaboradorAtual?.id || user?.id,
      autor_nome: colaboradorAtual?.nome_completo || user?.full_name,
      data_registro: new Date().toISOString(),
    });
  };

  // Mostra TODOS os colaboradores (ativos e inativos, qualquer papel) para que nenhum lançamento fique oculto
  const colaboradoresLista = [...colaboradores]
    .sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || ''));
  const agentesFiltrados = colaboradoresLista.filter(c =>
    c.nome_completo?.toLowerCase().includes(busca.toLowerCase()) ||
    c.cargo_atual?.toLowerCase().includes(busca.toLowerCase())
  );

  if (loadingColabs || loadingObs) return <LoadingSpinner text="Carregando observações..." />;

  if (!isGestor) {
    return (
      <div className="text-center py-16">
        <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
        <p className="text-muted-foreground">Apenas gestores podem acessar as observações.</p>
      </div>
    );
  }

  if (colaboradorSelecionado) {
    return (
      <>
        <PageHeader
          title="Observações"
          subtitle={colaboradorSelecionado.nome_completo}
          icon={MessageSquare}
        />
        <HistoricoColaborador
          colaborador={colaboradorSelecionado}
          observacoes={observacoes}
          pdis={pdis}
          onBack={() => setColaboradorSelecionado(null)}
          onNovaObservacao={() => setDialogNovaObs(true)}
          isGestor={isGestor}
          colaboradorAtual={colaboradorAtual}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
        <PainelLateral
          open={dialogNovaObs} onOpenChange={setDialogNovaObs}
          largura="xl"
          titulo={<>Nova Observação — {colaboradorSelecionado.nome_completo}</>}
        >
            <div className="space-y-4 mt-2">
              <div>
                <Label>Tipo *</Label>
                <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_OBS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Título (opcional)</Label>
                <Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Título da observação" className="mt-1" />
              </div>
              <div>
                <Label>Conteúdo *</Label>
                <div className="mt-1">
                  <RichTextEditor
                    value={form.conteudo}
                    onChange={v => setForm({ ...form, conteudo: v })}
                    placeholder="Descreva a observação..."
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Switch
                  checked={form.visibilidade === 'ambos'}
                  onCheckedChange={checked => setForm({ ...form, visibilidade: checked ? 'ambos' : 'gestor' })}
                />
                <div>
                  <Label className="cursor-pointer">Visível ao agente</Label>
                  <p className="text-xs text-muted-foreground">{form.visibilidade === 'ambos' ? 'O agente poderá visualizar este registro' : 'Apenas gestores verão este registro'}</p>
                </div>
              </div>
              <RodapeFixo>
                <Button variant="outline" onClick={() => setDialogNovaObs(false)}>Cancelar</Button>
                <Button onClick={handleCriar} disabled={criarMutation.isPending} className="bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4 mr-2" />
                  {criarMutation.isPending ? 'Salvando...' : 'Salvar Observação'}
                </Button>
              </RodapeFixo>
            </div>
        </PainelLateral>
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Observações"
        subtitle="Registros e feedbacks da equipe"
        icon={MessageSquare}
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar colaborador..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="pl-10"
        />
      </div>

      {agentesFiltrados.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum colaborador encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {agentesFiltrados.map(colab => (
            <ColaboradorCard
              key={colab.id}
              colaborador={colab}
              observacoes={observacoes}
              pdis={pdis}
              onClick={() => setColaboradorSelecionado(colab)}
            />
          ))}
        </div>
      )}
      {agentesFiltrados.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Mostrando {agentesFiltrados.length} de {colaboradoresLista.length} colaboradores • {observacoes.length} observações carregadas
        </p>
      )}
    </div>
  );
}