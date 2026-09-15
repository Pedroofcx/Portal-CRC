import db from '@/api/db';
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Brain, Wrench } from 'lucide-react';

export default function ConfigSkills() {
  const [novaSkill, setNovaSkill] = useState({ nome: '', tipo: 'soft', descricao: '' });
  const queryClient = useQueryClient();

  const { data: skills = [] } = useQuery({
    queryKey: ['skillsMestre'],
    queryFn: () => db.entities.SkillMestre.filter({ ativa: true }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.SkillMestre.create({
      ...data,
      ativa: true,
      ordem: skills.filter(s => s.tipo === data.tipo).length + 1
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['skillsMestre']);
      toast.success('Skill criada');
      setNovaSkill({ nome: '', tipo: 'soft', descricao: '' });
    },
    onError: () => toast.error('Erro ao criar skill'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.SkillMestre.update(id, { ativa: false }),
    onSuccess: () => {
      queryClient.invalidateQueries(['skillsMestre']);
      toast.success('Skill removida');
    },
  });

  const softSkills = skills.filter(s => s.tipo === 'soft');
  const hardSkills = skills.filter(s => s.tipo === 'hard');

  return (
    <div className="space-y-6">
      <Tabs defaultValue="soft">
        <TabsList>
          <TabsTrigger value="soft" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Soft Skills ({softSkills.length})
          </TabsTrigger>
          <TabsTrigger value="hard" className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Hard Skills ({hardSkills.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="soft" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adicionar Soft Skill</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Nome da skill (ex: Comunicação)"
                  value={novaSkill.tipo === 'soft' ? novaSkill.nome : ''}
                  onChange={(e) => setNovaSkill({ ...novaSkill, nome: e.target.value, tipo: 'soft' })}
                />
                <Button onClick={() => createMutation.mutate(novaSkill)} disabled={!novaSkill.nome}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4">
                {softSkills.map(skill => (
                  <Badge key={skill.id} variant="outline" className="px-3 py-1.5 flex items-center gap-2">
                    {skill.nome}
                    <button onClick={() => deleteMutation.mutate(skill.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hard" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Adicionar Hard Skill</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Nome da skill (ex: Excel Avançado)"
                  value={novaSkill.tipo === 'hard' ? novaSkill.nome : ''}
                  onChange={(e) => setNovaSkill({ ...novaSkill, nome: e.target.value, tipo: 'hard' })}
                />
                <Button onClick={() => createMutation.mutate(novaSkill)} disabled={!novaSkill.nome}>
                  <Plus className="w-4 h-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4">
                {hardSkills.map(skill => (
                  <Badge key={skill.id} variant="outline" className="px-3 py-1.5 flex items-center gap-2">
                    {skill.nome}
                    <button onClick={() => deleteMutation.mutate(skill.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}