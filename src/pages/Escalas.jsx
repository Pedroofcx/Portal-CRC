import db from '@/api/db';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { formatDateSP } from '@/components/utils/helpers';
import PageHeader from '@/components/ui/PageHeader';
import DataTable from '@/components/ui/DataTable';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar as CalendarIcon,
  Plus,
  Eye,
  Trash2,
  Users,
} from 'lucide-react';
import CalendarioEquipes from '@/components/escalas/CalendarioEquipes';
import DiaDetalheDialog from '@/components/escalas/DiaDetalheDialog';
import EquipeCard from '@/components/escalas/EquipeCard';
import EquipeDetalhes from '@/components/escalas/EquipeDetalhes';
import AtribuicaoDialog from '@/components/escalas/AtribuicaoDialog';
import FerramentasLancamentoColetivo from '@/components/escalas/FerramentasLancamentoColetivo';

const periodosSobrepoem = (atrib, dataInicio, dataFim) => {
  const inicio = new Date(atrib.data_inicio).toISOString().split('T')[0];
  const fim = atrib.data_fim ? new Date(atrib.data_fim).toISOString().split('T')[0] : '9999-12-31';
  return dataInicio <= fim && dataFim >= inicio;
};

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const diasSemanaFull = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function Escalas() {
  const [visao, setVisao] = useState('equipes'); // 'equipes', 'calendario', 'lista'
  const [mesAtual, setMesAtual] = useState(new Date());
  const [diaDetalheDialog, setDiaDetalheDialog] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [atribuirDialogOpen, setAtribuirDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEscala, setSelectedEscala] = useState(null);
  const [selectedEquipe, setSelectedEquipe] = useState(null);
  const [colaboradoresSelecionados, setColaboradoresSelecionados] = useState([]);
  const [periodoAtribuicao, setPeriodoAtribuicao] = useState({ inicio: '', fim: '', tipoEvento: 'presencial' });
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    turnos: [{ nome: '', hora_inicio: '', hora_fim: '', dias_semana: [] }]
  });

  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => db.auth.me(),
  });

  const { data: colaboradores = [] } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: () => db.entities.Colaborador.list(),
  });

  const { data: escalas = [], isLoading } = useQuery({
    queryKey: ['escalas'],
    queryFn: () => db.entities.Escala.filter({ ativa: true }),
  });

  const { data: atribuicoes = [] } = useQuery({
    queryKey: ['escalaAtribuicoes'],
    queryFn: () => db.entities.EscalaAtribuicao.list('-created_date'),
  });

  const { data: equipes = [] } = useQuery({
    queryKey: ['equipes'],
    queryFn: () => db.entities.Equipe.filter({ ativa: true }),
  });

  const colaborador = React.useMemo(() => 
    colaboradores.find(c => c.email === user?.email),
    [colaboradores, user]
  );
  const isGestor = colaborador?.papel === 'gestor';

  // Cleanup ao desmontar - CRITICAL
  React.useEffect(() => {
    return () => {
      setDialogOpen(false);
      setAtribuirDialogOpen(false);
      setDeleteDialogOpen(false);
      setDiaDetalheDialog(null);
      setSelectedEscala(null);
      setSelectedEquipe(null);
    };
  }, []);

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Escala.create({ ...data, ativa: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['escalas']);
      toast.success('Escala criada com sucesso');
      setDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error('Erro ao criar escala'),
  });

  const atribuirMutation = useMutation({
    mutationFn: async ({ colaboradorIds, periodo, tipoEvento }) => {
      const promises = colaboradorIds.map(colabId => {
        const colab = colaboradores.find(c => c.id === colabId);
        return db.entities.EscalaAtribuicao.create({
          escala_id: 'direct',
          escala_nome: 'Escala Direta',
          colaborador_id: colabId,
          colaborador_nome: colab?.nome_completo,
          data_inicio: periodo.inicio,
          data_fim: periodo.fim,
          tipo_evento: tipoEvento || 'presencial',
          ativa: true
        });
      });
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['escalaAtribuicoes']);
      toast.success('Escala atribuída com sucesso');
      setAtribuirDialogOpen(false);
    },
    onError: () => toast.error('Erro ao atribuir escala'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Escala.update(id, { ativa: false }),
    onSuccess: () => {
      queryClient.invalidateQueries(['escalas']);
      toast.success('Escala removida');
      setDeleteDialogOpen(false);
    },
    onError: () => toast.error('Erro ao remover'),
  });

  const aplicarMassaMutation = useMutation({
    mutationFn: async ({ colaboradorIds, dataInicio, dataFim, tipoEvento }) => {
      // Antiduplicação: remove registros existentes que se sobrepõem ao período para os colaboradores escolhidos
      const sobrepostos = atribuicoes.filter(a => colaboradorIds.includes(a.colaborador_id) && periodosSobrepoem(a, dataInicio, dataFim));
      await Promise.all(sobrepostos.map(a => db.entities.EscalaAtribuicao.delete(a.id)));

      const novos = colaboradorIds.map(id => ({
        escala_id: 'direct',
        escala_nome: 'Lançamento em Massa',
        colaborador_id: id,
        colaborador_nome: colaboradores.find(c => c.id === id)?.nome_completo,
        data_inicio: dataInicio,
        data_fim: dataFim,
        tipo_evento: tipoEvento,
        ativa: true
      }));
      return db.entities.EscalaAtribuicao.bulkCreate(novos);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['escalaAtribuicoes']);
      toast.success('Escala aplicada em massa com sucesso');
    },
    onError: () => toast.error('Erro ao aplicar escala em massa'),
  });

  const limparMassaMutation = useMutation({
    mutationFn: async ({ colaboradorIds, dataInicio, dataFim }) => {
      const sobrepostos = atribuicoes.filter(a => colaboradorIds.includes(a.colaborador_id) && periodosSobrepoem(a, dataInicio, dataFim));
      await Promise.all(sobrepostos.map(a => db.entities.EscalaAtribuicao.delete(a.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['escalaAtribuicoes']);
      toast.success('Agendamentos do período removidos');
    },
    onError: () => toast.error('Erro ao limpar agendamentos'),
  });

  if (!user) {
    return <LoadingSpinner />;
  }

  const resetForm = () => {
    setFormData({
      nome: '',
      descricao: '',
      turnos: [{ nome: '', hora_inicio: '', hora_fim: '', dias_semana: [] }]
    });
  };

  const addTurno = () => {
    setFormData({
      ...formData,
      turnos: [...formData.turnos, { nome: '', hora_inicio: '', hora_fim: '', dias_semana: [] }]
    });
  };

  const updateTurno = (index, field, value) => {
    const newTurnos = [...formData.turnos];
    newTurnos[index] = { ...newTurnos[index], [field]: value };
    setFormData({ ...formData, turnos: newTurnos });
  };

  const toggleDiaSemana = (turnoIndex, dia) => {
    const newTurnos = [...formData.turnos];
    const diasAtuais = newTurnos[turnoIndex].dias_semana || [];
    if (diasAtuais.includes(dia)) {
      newTurnos[turnoIndex].dias_semana = diasAtuais.filter(d => d !== dia);
    } else {
      newTurnos[turnoIndex].dias_semana = [...diasAtuais, dia];
    }
    setFormData({ ...formData, turnos: newTurnos });
  };

  const removeTurno = (index) => {
    setFormData({ ...formData, turnos: formData.turnos.filter((_, i) => i !== index) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nome) {
      toast.error('Preencha o nome da escala');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleAtribuir = () => {
    if (colaboradoresSelecionados.length === 0) {
      toast.error('Selecione ao menos um colaborador');
      return;
    }
    if (!periodoAtribuicao.inicio) {
      toast.error('Defina a data de início');
      return;
    }
    atribuirMutation.mutate({
      escalaId: selectedEscala.id,
      colaboradorIds: colaboradoresSelecionados,
      periodo: periodoAtribuicao,
      tipoEvento: periodoAtribuicao.tipoEvento
    });
  };

  const toggleColaborador = (colabId) => {
    setColaboradoresSelecionados(prev => 
      prev.includes(colabId)
        ? prev.filter(id => id !== colabId)
        : [...prev, colabId]
    );
  };

  // Minhas escalas (se não for gestor)
  const minhasAtribuicoes = atribuicoes.filter(a => a.colaborador_id === colaborador?.id && a.ativa);

  // Funções do calendário
  const getDiasDoMes = (data) => {
    const ano = data.getFullYear();
    const mes = data.getMonth();
    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);
    const diasAnteriores = primeiroDia.getDay();
    const dias = [];
    for (let i = diasAnteriores - 1; i >= 0; i--) dias.push({ data: new Date(ano, mes, -i), mesAtual: false });
    for (let i = 1; i <= ultimoDia.getDate(); i++) dias.push({ data: new Date(ano, mes, i), mesAtual: true });
    const diasFaltantes = 42 - dias.length;
    for (let i = 1; i <= diasFaltantes; i++) dias.push({ data: new Date(ano, mes + 1, i), mesAtual: false });
    return dias;
  };

  const getAtribuicoesDoDia = (data) => {
    const dataStr = data.toISOString().split('T')[0];
    return atribuicoes.filter(atrib => {
      const inicio = new Date(atrib.data_inicio).toISOString().split('T')[0];
      const fim = atrib.data_fim ? new Date(atrib.data_fim).toISOString().split('T')[0] : '9999-12-31';
      return dataStr >= inicio && dataStr <= fim;
    });
  };

  const mesAnterior = () => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() - 1, 1));
  const mesPosterior = () => setMesAtual(new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 1));
  const hoje = () => setMesAtual(new Date());

  const columns = [
    {
      header: 'Nome',
      accessor: 'nome'
    },
    {
      header: 'Turnos',
      render: (row) => `${row.turnos?.length || 0} turnos`
    },
    {
      header: 'Colaboradores',
      render: (row) => {
        const atribuicoesDaEscala = atribuicoes.filter(a => a.escala_id === row.id && a.ativa);
        return (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>{atribuicoesDaEscala.length}</span>
          </div>
        );
      }
    },
    {
      header: '',
      render: (row) => (
        <div className="flex items-center gap-1">
          {isGestor && (
            <Button 
              variant="outline"
              size="sm"
              onClick={() => { setSelectedEscala(row); setAtribuirDialogOpen(true); }}
            >
              Atribuir
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => { setSelectedEscala(row); }}
          >
            <Eye className="w-4 h-4" />
          </Button>
          {isGestor && (
            <Button 
              variant="ghost" 
              size="icon"
              className="text-destructive"
              onClick={() => { setSelectedEscala(row); setDeleteDialogOpen(true); }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      )
    }
  ];

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Escalas"
        subtitle="Gerenciamento de escalas de trabalho"
        icon={CalendarIcon}
        actions={
          <div className="flex gap-2">
            <div className="flex gap-1 border rounded-lg p-1 bg-card">
              <Button 
                variant={visao === 'equipes' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setVisao('equipes')}
              >
                <Users className="w-4 h-4 mr-1" />
                Equipes
              </Button>
              <Button 
                variant={visao === 'calendario' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setVisao('calendario')}
              >
                <CalendarIcon className="w-4 h-4 mr-1" />
                Calendário
              </Button>
              <Button 
                variant={visao === 'lista' ? 'default' : 'ghost'} 
                size="sm"
                onClick={() => setVisao('lista')}
              >
                Lista
              </Button>
            </div>
            {isGestor && (
              <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Nova Chave
              </Button>
            )}
          </div>
        }
      />

      {isGestor && (
        <FerramentasLancamentoColetivo
          colaboradores={colaboradores}
          equipes={equipes}
          isPending={aplicarMassaMutation.isPending || limparMassaMutation.isPending}
          onAplicar={(dados) => aplicarMassaMutation.mutate(dados)}
          onLimpar={(dados) => limparMassaMutation.mutate(dados)}
        />
      )}

      {visao === 'equipes' ? (
        selectedEquipe ? (
          <EquipeDetalhes
            equipe={selectedEquipe}
            colaboradores={colaboradores}
            atribuicoes={atribuicoes.filter(a => a.ativa)}
            escalas={escalas}
            onVoltar={() => setSelectedEquipe(null)}
          />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {equipes.map(equipe => (
              <EquipeCard
                key={equipe.id}
                equipe={equipe}
                colaboradores={colaboradores}
                atribuicoes={atribuicoes.filter(a => a.ativa)}
                onClick={() => setSelectedEquipe(equipe)}
              />
            ))}
            {equipes.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Nenhuma equipe cadastrada</p>
                <p className="text-muted-foreground text-sm">Crie equipes para organizar melhor as escalas</p>
              </div>
            )}
          </div>
        )
      ) : visao === 'calendario' ? (
        <div className="space-y-6">
          <CalendarioEquipes
            mesAtual={mesAtual}
            onMesAnterior={mesAnterior}
            onMesPosterior={mesPosterior}
            onHoje={hoje}
            atribuicoes={atribuicoes.filter(a => a.ativa)}
            colaboradores={colaboradores}
            equipes={equipes}
            onDiaClick={(data) => setDiaDetalheDialog(data)}
          />
          <DiaDetalheDialog
            open={!!diaDetalheDialog}
            onClose={() => setDiaDetalheDialog(null)}
            data={diaDetalheDialog}
            atribuicoes={atribuicoes.filter(a => a.ativa)}
            colaboradores={colaboradores}
            equipes={equipes}
          />
          
          {isGestor && (
            <div className="flex justify-center">
              <Button 
                onClick={() => setAtribuirDialogOpen(true)} 
                size="lg"
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="w-5 h-5 mr-2" />
                Atribuir Nova Escala
              </Button>
            </div>
          )}
        </div>
      ) : (
        <>
          {!isGestor && minhasAtribuicoes.length > 0 && (
            <Card className="border-0 shadow-sm bg-info-soft">
              <CardHeader>
                <CardTitle className="text-base">Minhas Escalas Ativas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {minhasAtribuicoes.map(atrib => (
                  <div key={atrib.id} className="p-3 bg-card rounded-lg">
                    <p className="font-medium">{atrib.escala_nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateSP(atrib.data_inicio, 'DD/MM/YYYY')} 
                      {atrib.data_fim ? ` - ${formatDateSP(atrib.data_fim, 'DD/MM/YYYY')}` : ' - Sem fim definido'}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <DataTable
            columns={columns}
            data={escalas}
            isLoading={isLoading}
            emptyIcon={CalendarIcon}
            emptyTitle="Nenhuma chave de escala cadastrada"
            emptyDescription={isGestor ? "Crie a primeira chave de escala." : "Nenhuma chave disponível."}
            emptyAction={isGestor ? () => setDialogOpen(true) : null}
            emptyActionLabel="Criar Chave"
          />
        </>
      )}

      {/* Dialog de Criação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Chave de Escala</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <Label>Nome da Chave *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Home Office, Presencial, Híbrido"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição da escala..."
                rows={2}
              />
            </div>

            {/* Turnos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Turnos</Label>
                <Button type="button" variant="outline" size="sm" onClick={addTurno}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {formData.turnos.map((turno, tIndex) => (
                <Card key={tIndex} className="mb-3">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">Turno {tIndex + 1}</Badge>
                      {formData.turnos.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeTurno(tIndex)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <Input
                      placeholder="Nome do turno (ex: Manhã)"
                      value={turno.nome}
                      onChange={(e) => updateTurno(tIndex, 'nome', e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Hora Início</Label>
                        <Input
                          type="time"
                          value={turno.hora_inicio}
                          onChange={(e) => updateTurno(tIndex, 'hora_inicio', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Hora Fim</Label>
                        <Input
                          type="time"
                          value={turno.hora_fim}
                          onChange={(e) => updateTurno(tIndex, 'hora_fim', e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-2 block">Dias da Semana</Label>
                      <div className="flex flex-wrap gap-2">
                        {diasSemana.map((dia, diaIndex) => (
                          <Button
                            key={diaIndex}
                            type="button"
                            variant={turno.dias_semana?.includes(diaIndex) ? 'default' : 'outline'}
                            size="sm"
                            className={turno.dias_semana?.includes(diaIndex) ? 'bg-primary' : ''}
                            onClick={() => toggleDiaSemana(tIndex, diaIndex)}
                          >
                            {dia}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Criando...
                  </>
                ) : (
                  'Criar Escala'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Atribuição Simplificado */}
      <AtribuicaoDialog
        open={atribuirDialogOpen}
        onOpenChange={setAtribuirDialogOpen}
        colaboradores={colaboradores.filter(c => c.ativo !== false)}
        onSubmit={(form) => {
          atribuirMutation.mutate({
            escalaId: 'direct', // Não precisa mais de chave de escala
            colaboradorIds: form.colaboradoresIds,
            periodo: { inicio: form.dataInicio, fim: form.dataFim },
            tipoEvento: form.tipoEvento
          });
        }}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Remover Escala"
        description={`Tem certeza que deseja remover a escala "${selectedEscala?.nome}"? As atribuições não serão afetadas.`}
        confirmLabel="Remover"
        onConfirm={() => selectedEscala && deleteMutation.mutate(selectedEscala.id)}
        variant="danger"
      />
    </div>
  );
}