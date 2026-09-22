import React from 'react';
import { formatDateSP } from '@/components/utils/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';
import RichTextViewer from '@/components/ui/RichTextViewer';
import PainelLateral from '@/components/ui/PainelLateral';

export default function FeedbackModal({ feedback, open, onClose }) {
  if (!feedback) return null;

  return (
    <PainelLateral
      open={open} onOpenChange={(isOpen) => !isOpen && onClose()}
      largura="xl"
      titulo={<><MessageSquare className="w-5 h-5 text-primary" /> {feedback.titulo || feedback.tipo}</>}
    >
        <div className="space-y-4 mt-4">
          <div>
            <p className="text-sm text-muted-foreground">De: {feedback.autor_nome || 'Desconhecido'}</p>
            {feedback.data_registro && (
              <p className="text-xs text-muted-foreground">Em: {formatDateSP(feedback.data_registro, 'DD/MM/YYYY HH:mm')}</p>
            )}
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-1">Conteúdo</p>
            <div className="max-h-80 overflow-y-auto">
              <RichTextViewer 
                content={feedback.conteudo || 'Sem conteúdo disponível'} 
                maxHeight="none" 
              />
            </div>
          </div>

          {/* SWOT */}
          {feedback.analise_swot && (
            <Card className="bg-info-soft border-info/25">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Análise SWOT</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm max-h-60 overflow-y-auto">
                {feedback.analise_swot.forcas?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-success mb-1">Forças</p>
                    <ul className="text-xs text-muted-foreground list-disc list-inside">
                      {feedback.analise_swot.forcas.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}
                {feedback.analise_swot.fraquezas?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-destructive mb-1">Fraquezas</p>
                    <ul className="text-xs text-muted-foreground list-disc list-inside">
                      {feedback.analise_swot.fraquezas.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}
                {feedback.analise_swot.oportunidades?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-primary mb-1">Oportunidades</p>
                    <ul className="text-xs text-muted-foreground list-disc list-inside">
                      {feedback.analise_swot.oportunidades.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}
                {feedback.analise_swot.ameacas?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-warning mb-1">Ameaças</p>
                    <ul className="text-xs text-muted-foreground list-disc list-inside">
                      {feedback.analise_swot.ameacas.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Skills Avaliadas */}
          {(feedback.soft_skills_avaliadas || feedback.hard_skills_avaliadas) && (
            <Card className="bg-info-soft border-primary/25">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Avaliação de Skills</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm max-h-60 overflow-y-auto">
                {feedback.soft_skills_avaliadas && Object.keys(feedback.soft_skills_avaliadas).length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-2">Soft Skills</p>
                    {Object.entries(feedback.soft_skills_avaliadas).map(([skill, value]) => (
                      <div key={skill} className="flex justify-between py-1">
                        <span className="text-muted-foreground">{skill}</span>
                        <Badge variant="outline">{value}/10</Badge>
                      </div>
                    ))}
                  </div>
                )}
                {feedback.hard_skills_avaliadas && Object.keys(feedback.hard_skills_avaliadas).length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-2">Hard Skills</p>
                    {Object.entries(feedback.hard_skills_avaliadas).map(([skill, value]) => (
                      <div key={skill} className="flex justify-between py-1">
                        <span className="text-muted-foreground">{skill}</span>
                        <Badge variant="outline">{value}/10</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Sugestão IA */}
          {(feedback.sugestao_ia_soft_skills || feedback.sugestao_ia_hard_skills) && (
            <Card className="bg-info-soft border-info/25">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  Sugestão da IA
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm max-h-60 overflow-y-auto">
                {feedback.sugestao_ia_soft_skills && (
                  <div>
                    <p className="text-xs font-medium mb-2">Soft Skills</p>
                    {Object.entries(feedback.sugestao_ia_soft_skills).map(([skill, value]) => (
                      <div key={skill} className="flex justify-between py-1">
                        <span className="capitalize text-muted-foreground">{skill.replace('_', ' ')}</span>
                        <span>{value}/10</span>
                      </div>
                    ))}
                  </div>
                )}
                {feedback.sugestao_ia_hard_skills && (
                  <div>
                    <p className="text-xs font-medium mb-2">Hard Skills</p>
                    {Object.entries(feedback.sugestao_ia_hard_skills).map(([skill, value]) => (
                      <div key={skill} className="flex justify-between py-1">
                        <span className="capitalize text-muted-foreground">{skill.replace('_', ' ')}</span>
                        <span>{value}/10</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </PainelLateral>
  );
}