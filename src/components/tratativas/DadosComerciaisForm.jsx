import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/CurrencyInput';
import { Building2 } from 'lucide-react';
import { PLANOS_CLIENTE } from '@/components/utils/helpers';

// Segmentos sugeridos (editáveis — o campo aceita texto livre via input)
const SEGMENTOS_SUGERIDOS = [
  'Varejo', 'Finanças', 'Saúde', 'Educação', 'Tecnologia', 'Logística',
  'Indústria', 'Serviços', 'Agronegócio', 'Imobiliário', 'Outros'
];

const MODALIDADES = ['Mensal', 'Trimestral', 'Semestral', 'Anual'];

// Componente de seção "Dados Comerciais do Cliente" para o formulário de Nova Tratativa.
// Recebe formData e setFormData do pai.
// Campos obrigatórios: plano, modalidade_plano, valor_contratacao_plano_atual,
// data_primeira_contratacao, data_contratacao_plano_atual.
// A fonte de verdade é sempre o contrato firmado — valores mensal/anual equivalentes
// são calculados dinamicamente pela aplicação, nunca persistidos.
export default function DadosComerciaisForm({ formData, setFormData }) {
  return (
    <div className="p-4 bg-success-soft border border-emerald-200 rounded-lg space-y-4">
      <h4 className="font-semibold text-emerald-900 flex items-center gap-2">
        <Building2 className="w-4 h-4" />
        Dados Comerciais do Cliente
      </h4>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Plano do Cliente *</Label>
          <Select
            value={formData.plano_cliente || ''}
            onValueChange={(value) => setFormData({ ...formData, plano_cliente: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecione o plano" />
            </SelectTrigger>
            <SelectContent>
              {PLANOS_CLIENTE.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Segmento do Cliente</Label>
          <Select
            value={formData.segmento_cliente || ''}
            onValueChange={(value) => setFormData({ ...formData, segmento_cliente: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecione o segmento" />
            </SelectTrigger>
            <SelectContent>
              {SEGMENTOS_SUGERIDOS.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Modalidade do Plano *</Label>
          <Select
            value={formData.modalidade_plano || ''}
            onValueChange={(value) => setFormData({ ...formData, modalidade_plano: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Selecione a modalidade" />
            </SelectTrigger>
            <SelectContent>
              {MODALIDADES.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Valor da Contratação do Plano Atual (R$) *</Label>
          <CurrencyInput
            value={formData.valor_contratacao_plano_atual || 0}
            onChange={(num) => setFormData({ ...formData, valor_contratacao_plano_atual: num })}
            className="mt-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Data da Primeira Contratação *</Label>
          <Input
            type="date"
            value={formData.data_primeira_contratacao || ''}
            onChange={(e) => setFormData({ ...formData, data_primeira_contratacao: e.target.value })}
            className="mt-1"
          />
          <p className="text-xs text-success mt-1">
            Início do relacionamento comercial do cliente com a empresa.
          </p>
        </div>
        <div>
          <Label>Data da Contratação do Plano Atual *</Label>
          <Input
            type="date"
            value={formData.data_contratacao_plano_atual || ''}
            onChange={(e) => setFormData({ ...formData, data_contratacao_plano_atual: e.target.value })}
            className="mt-1"
          />
          <p className="text-xs text-success mt-1">
            Aderiu ao plano atual (permite identificar upgrades/downgrades).
          </p>
        </div>
      </div>

      <p className="text-xs text-success">
        O Tempo de Relacionamento (em meses) é calculado automaticamente a partir da Data da Primeira Contratação.
        Receitas mensal e anual equivalentes são derivadas da modalidade e do valor da contratação do plano atual.
      </p>
    </div>
  );
}