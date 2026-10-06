import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import CampoFormulario from '@/components/ui/CampoFormulario';
import { Building2 } from 'lucide-react';
import { PLANOS_CLIENTE } from '@/components/utils/helpers';

// Segmentos sugeridos (editáveis — o campo aceita texto livre via input)
const SEGMENTOS_SUGERIDOS = [
  'Varejo', 'Finanças', 'Saúde', 'Educação', 'Tecnologia', 'Logística',
  'Indústria', 'Serviços', 'Agronegócio', 'Imobiliário', 'Outros'
];

const MODALIDADES = ['Mensal', 'Trimestral', 'Semestral', 'Anual'];

// Componente de seção "Dados Comerciais do Cliente" para o formulário de Nova Tratativa.
// Recebe formData e setFormData do pai, e `validacao` (useValidacao) para destacar
// os campos que faltam.
// `opcional` (Google Meu Negócio): nenhum campo é obrigatório.
// Campos obrigatórios: plano, modalidade_plano, valor_contratacao_plano_atual,
// data_primeira_contratacao, data_contratacao_plano_atual.
// A fonte de verdade é sempre o contrato firmado — valores mensal/anual equivalentes
// são calculados dinamicamente pela aplicação, nunca persistidos.
export default function DadosComerciaisForm({ formData, setFormData, validacao, opcional = false }) {
  const atualizar = (nome, valor) => {
    setFormData({ ...formData, [nome]: valor });
    validacao?.aoMudar(nome, valor);
  };
  const erro = (nome) => validacao?.erro(nome) || null;
  const ligar = (nome) => validacao?.campo(nome) || {};

  return (
    <div className="p-4 bg-success-soft border border-success/25 rounded-lg space-y-4">
      <h4 className="font-semibold text-success flex items-center gap-2">
        <Building2 className="w-4 h-4" />
        Dados Comerciais do Cliente
      </h4>

      <div className="grid grid-cols-2 gap-4">
        <CampoFormulario id="plano_cliente" rotulo="Plano do Cliente" obrigatorio={!opcional} erro={erro('plano_cliente')}>
          <Select
            value={formData.plano_cliente || ''}
            onValueChange={(value) => atualizar('plano_cliente', value)}
          >
            <SelectTrigger id="plano_cliente" {...ligar('plano_cliente')}>
              <SelectValue placeholder="Selecione o plano" />
            </SelectTrigger>
            <SelectContent>
              {PLANOS_CLIENTE.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CampoFormulario>
        <CampoFormulario id="segmento_cliente" rotulo="Segmento do Cliente">
          <Select
            value={formData.segmento_cliente || ''}
            onValueChange={(value) => setFormData({ ...formData, segmento_cliente: value })}
          >
            <SelectTrigger id="segmento_cliente">
              <SelectValue placeholder="Selecione o segmento" />
            </SelectTrigger>
            <SelectContent>
              {SEGMENTOS_SUGERIDOS.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CampoFormulario>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <CampoFormulario id="modalidade_plano" rotulo="Modalidade do Plano" obrigatorio={!opcional} erro={erro('modalidade_plano')}>
          <Select
            value={formData.modalidade_plano || ''}
            onValueChange={(value) => atualizar('modalidade_plano', value)}
          >
            <SelectTrigger id="modalidade_plano" {...ligar('modalidade_plano')}>
              <SelectValue placeholder="Selecione a modalidade" />
            </SelectTrigger>
            <SelectContent>
              {MODALIDADES.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CampoFormulario>
        <CampoFormulario id="valor_contratacao_plano_atual" rotulo="Valor da Contratação do Plano Atual (R$)" obrigatorio={!opcional} erro={erro('valor_contratacao_plano_atual')}>
          <CurrencyInput
            id="valor_contratacao_plano_atual"
            value={formData.valor_contratacao_plano_atual || 0}
            onChange={(num) => atualizar('valor_contratacao_plano_atual', num)}
            {...ligar('valor_contratacao_plano_atual')}
          />
        </CampoFormulario>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <CampoFormulario
          id="data_primeira_contratacao"
          rotulo="Data da Primeira Contratação"
          obrigatorio={!opcional}
          erro={erro('data_primeira_contratacao')}
          ajuda="Início do relacionamento comercial do cliente com a empresa."
        >
          <Input
            id="data_primeira_contratacao"
            type="date"
            value={formData.data_primeira_contratacao || ''}
            onChange={(e) => atualizar('data_primeira_contratacao', e.target.value)}
            {...ligar('data_primeira_contratacao')}
          />
        </CampoFormulario>
        <CampoFormulario
          id="data_contratacao_plano_atual"
          rotulo="Data da Contratação do Plano Atual"
          obrigatorio={!opcional}
          erro={erro('data_contratacao_plano_atual')}
          ajuda="Aderiu ao plano atual (permite identificar upgrades/downgrades)."
        >
          <Input
            id="data_contratacao_plano_atual"
            type="date"
            value={formData.data_contratacao_plano_atual || ''}
            onChange={(e) => atualizar('data_contratacao_plano_atual', e.target.value)}
            {...ligar('data_contratacao_plano_atual')}
          />
        </CampoFormulario>
      </div>

      <p className="text-xs text-success">
        O Tempo de Relacionamento (em meses) é calculado automaticamente a partir da Data da Primeira Contratação.
        Receitas mensal e anual equivalentes são derivadas da modalidade e do valor da contratação do plano atual.
      </p>
    </div>
  );
}
