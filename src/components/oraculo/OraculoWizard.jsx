import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Sparkles,
  TrendingUp,
  MessageSquare,
  Target,
  Edit3
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SOFT_SKILLS = [
  'Comunicação',
  'Empatia',
  'Resiliência',
  'Proatividade',
  'Trabalho em Equipe'
];

const HARD_SKILLS = [
  'Conhecimento Técnico',
  'Uso de Ferramentas',
  'Resolução de Problemas',
  'Organização',
  'Análise de Dados'
];

export default function OraculoWizard({ 
  colaborador, 
  contexto, 
  palavrasDicionario,
  onComplete,
  onCancel 
}) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    palavras_selecionadas: [],
    soft_skills: {},
    hard_skills: {},
    texto_livre: '',
    pergunta_gerada: ''
  });

  const totalSteps = 5;
  const progress = (step / totalSteps) * 100;

  // Gerar pergunta estratégica
  const gerarPergunta = () => {
    const perguntas = [
      `Como você descreveria a evolução de ${colaborador.nome_completo} nas últimas semanas?`,
      `${colaborador.nome_completo} tem demonstrado consistência na entrega? O que você observa?`,
      `Qual aspecto mais chama sua atenção no trabalho de ${colaborador.nome_completo} recentemente?`,
      `Como ${colaborador.nome_completo} tem lidado com desafios e pressão no dia a dia?`,
      `O que você diria sobre o nível de engajamento de ${colaborador.nome_completo}?`
    ];
    
    const perguntaAleatoria = perguntas[Math.floor(Math.random() * perguntas.length)];
    setData(prev => ({ ...prev, pergunta_gerada: perguntaAleatoria }));
  };

  React.useEffect(() => {
    if (step === 2 && !data.pergunta_gerada) {
      gerarPergunta();
    }
  }, [step]);

  const togglePalavra = (palavra) => {
    setData(prev => {
      const existe = prev.palavras_selecionadas.find(p => p.palavra === palavra.palavra);
      if (existe) {
        return {
          ...prev,
          palavras_selecionadas: prev.palavras_selecionadas.filter(p => p.palavra !== palavra.palavra)
        };
      } else {
        return {
          ...prev,
          palavras_selecionadas: [...prev.palavras_selecionadas, {
            palavra: palavra.palavra,
            categoria: palavra.categoria,
            origem: 'dicionario'
          }]
        };
      }
    });
  };

  const adicionarPalavraManual = (palavraTexto) => {
    if (!palavraTexto.trim()) return;
    
    const existe = data.palavras_selecionadas.find(p => p.palavra === palavraTexto.toLowerCase());
    if (!existe) {
      setData(prev => ({
        ...prev,
        palavras_selecionadas: [...prev.palavras_selecionadas, {
          palavra: palavraTexto.toLowerCase(),
          categoria: 'manual',
          origem: 'manual'
        }]
      }));
    }
  };

  const setPontuacao = (tipo, skill, valor) => {
    setData(prev => ({
      ...prev,
      [tipo]: {
        ...prev[tipo],
        [skill]: valor
      }
    }));
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = () => {
    onComplete(data);
  };

  const canProceed = () => {
    if (step === 3) return data.palavras_selecionadas.length > 0;
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Passo {step} de {totalSteps}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Card 1 - Contexto */}
      {step === 1 && (
        <Card className="border-blue-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <CardTitle>Contexto do Colaborador</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">{colaborador.nome_completo}</h3>
              <p className="text-sm text-slate-600">{colaborador.cargo_atual}</p>
            </div>

            {contexto && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
                <div>
                  <div className="text-xs text-slate-600">CSAT Recente</div>
                  <div className="text-xl font-bold text-blue-600">
                    {contexto.csat_recente?.toFixed(1) || '-'}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-600">Tratativas</div>
                  <div className="text-xl font-bold text-blue-600">
                    {contexto.tratativas_periodo || 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-600">Pontos (Trimestre)</div>
                  <div className="text-xl font-bold text-blue-600">
                    {contexto.pontos_trimestre?.toFixed(1) || 0}
                  </div>
                </div>
              </div>
            )}

            {contexto?.sinais_recentes && contexto.sinais_recentes.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Sinais Recentes</h4>
                <div className="space-y-2">
                  {contexto.sinais_recentes.map((sinal, idx) => (
                    <div key={idx} className="text-sm p-2 bg-slate-50 rounded">
                      • {sinal}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Card 2 - Pergunta Estratégica */}
      {step === 2 && (
        <Card className="border-purple-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-600" />
              <CardTitle>Reflexão Estratégica</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-6 bg-purple-50 rounded-lg border-l-4 border-purple-500">
              <p className="text-lg font-medium text-slate-800">
                {data.pergunta_gerada}
              </p>
            </div>
            <p className="text-sm text-slate-600">
              Esta pergunta foi gerada com base no histórico e contexto do colaborador.
              Use-a como reflexão para o próximo passo.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Card 3 - Palavras-chave */}
      {step === 3 && (
        <Card className="border-green-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              <CardTitle>Palavras-chave (Percepções)</CardTitle>
            </div>
            <p className="text-sm text-slate-600 mt-2">
              Selecione quantas palavras forem necessárias. Não há limite.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Palavras por categoria */}
            {Object.entries(
              palavrasDicionario.reduce((acc, palavra) => {
                if (!acc[palavra.categoria]) acc[palavra.categoria] = [];
                acc[palavra.categoria].push(palavra);
                return acc;
              }, {})
            ).map(([categoria, palavras]) => (
              <div key={categoria}>
                <h4 className="text-xs font-semibold text-slate-600 mb-2 uppercase">
                  {categoria.replace(/_/g, ' ')}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {palavras.map((palavra) => {
                    const selecionada = data.palavras_selecionadas.find(
                      p => p.palavra === palavra.palavra
                    );
                    return (
                      <Badge
                        key={palavra.palavra}
                        variant={selecionada ? 'default' : 'outline'}
                        className={cn(
                          'cursor-pointer transition-all',
                          selecionada && 'bg-green-600 hover:bg-green-700',
                          palavra.valenca === 'atencao' && !selecionada && 'border-amber-400 text-amber-700'
                        )}
                        onClick={() => togglePalavra(palavra)}
                      >
                        {selecionada && <Check className="w-3 h-3 mr-1" />}
                        {palavra.palavra}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Palavras selecionadas */}
            {data.palavras_selecionadas.length > 0 && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <h4 className="text-sm font-medium mb-2">
                  Selecionadas ({data.palavras_selecionadas.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.palavras_selecionadas.map((p, idx) => (
                    <Badge key={idx} className="bg-green-600">
                      {p.palavra}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Campo para adicionar palavra manual */}
            <div className="pt-4 border-t">
              <label className="text-sm font-medium mb-2 block">
                Adicionar palavra personalizada
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Digite uma palavra..."
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      adicionarPalavraManual(e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    const input = e.target.closest('div').querySelector('input');
                    adicionarPalavraManual(input.value);
                    input.value = '';
                  }}
                >
                  Adicionar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card 4 - Pontuação de Skills */}
      {step === 4 && (
        <Card className="border-amber-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              <CardTitle>Pontuação de Habilidades</CardTitle>
            </div>
            <p className="text-sm text-slate-600 mt-2">
              Escala de 1 a 5. Use para leitura analítica, não punitiva.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Soft Skills */}
            <div>
              <h4 className="font-medium mb-3">Soft Skills</h4>
              {SOFT_SKILLS.map((skill) => (
                <div key={skill} className="mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">{skill}</span>
                    <span className="text-sm font-medium text-amber-600">
                      {data.soft_skills[skill] || '-'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((valor) => (
                      <button
                        key={valor}
                        onClick={() => setPontuacao('soft_skills', skill, valor)}
                        className={cn(
                          'flex-1 py-2 rounded border transition-colors',
                          data.soft_skills[skill] === valor
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'border-slate-300 hover:border-amber-400'
                        )}
                      >
                        {valor}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Hard Skills */}
            <div>
              <h4 className="font-medium mb-3">Hard Skills</h4>
              {HARD_SKILLS.map((skill) => (
                <div key={skill} className="mb-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">{skill}</span>
                    <span className="text-sm font-medium text-amber-600">
                      {data.hard_skills[skill] || '-'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((valor) => (
                      <button
                        key={valor}
                        onClick={() => setPontuacao('hard_skills', skill, valor)}
                        className={cn(
                          'flex-1 py-2 rounded border transition-colors',
                          data.hard_skills[skill] === valor
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'border-slate-300 hover:border-amber-400'
                        )}
                      >
                        {valor}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Card 5 - Texto Livre */}
      {step === 5 && (
        <Card className="border-indigo-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-indigo-600" />
              <CardTitle>Observação Contextual (Opcional)</CardTitle>
            </div>
            <p className="text-sm text-slate-600 mt-2">
              Adicione um contexto breve se necessário. Não obrigatório.
            </p>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Ex: Observei melhora significativa na comunicação durante os atendimentos da semana..."
              value={data.texto_livre}
              onChange={(e) => setData(prev => ({ ...prev, texto_livre: e.target.value }))}
              rows={6}
            />
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={step === 1 ? onCancel : handleBack}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {step === 1 ? 'Cancelar' : 'Voltar'}
        </Button>

        {step < totalSteps ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
          >
            Próximo
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="w-4 h-4 mr-2" />
            Concluir Lançamento
          </Button>
        )}
      </div>
    </div>
  );
}