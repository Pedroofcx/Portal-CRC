import React from 'react';
import { Button } from '@/components/ui/button';
import { Copy, FileDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { fmtBRL, parseBRL, IMPOSTO_LABELS, IMPOSTOS_KEYS, TIPO_ESTORNO_OPTIONS, TIPOS_PLANO, CLASSIFICACAO_PLANO_OPTIONS } from './calculos';

function gerarTexto({ form, config, resultado, aplicarMulta }) {
  if (!resultado) return '';
  const tipoLabel = TIPO_ESTORNO_OPTIONS.find(o => o.value === form.tipo_estorno)?.label || form.tipo_estorno || '—';
  const planoLabel = TIPOS_PLANO.find(p => p.value === form.tipo_plano)?.label || '—';
  const classificacaoLabel = CLASSIFICACAO_PLANO_OPTIONS.find(o => o.value === form.classificacao_plano)?.label || '—';
  const v = resultado.valor_nota || parseBRL(form.valor_nota_fiscal);
  const uso = resultado.uso_proporcional_detalhe;

  // Cenário selecionado pelo operador
  const cenario = aplicarMulta ? 'COM MULTA' : 'SEM MULTA';
  const valorFinal = aplicarMulta ? resultado.valor_final_devolucao : resultado.valor_final_sem_multa;
  const valorMultaExibido = aplicarMulta ? resultado.valor_multa_calculado : 0;

  const lines = [
    '═══════════════════════════════════════════',
    '   MEMÓRIA DE CÁLCULO — ESTORNO PARCIAL — Portal CRC',
    '═══════════════════════════════════════════',
    `Nº Cálculo: ${form.numero_calculo || '—'}   |   Cliente: ${form.nome_cliente || '—'}   |   Documento: ${form.documento_cliente || '—'}`,
    `Tipo: ${tipoLabel}   |   Ticket: ${form.ticket_zendesk || '—'}   |   Operador: ${form.operador_nome || '—'}   |   Data: ${form.data_solicitacao || '—'}`,
    '───────────────────────────────────────────',
    `Valor da Nota: ${fmtBRL(v)}   |   Plano: ${planoLabel} (${uso?.diasContrato || '—'} dias)   |   Classificação: ${classificacaoLabel}`,
    uso?.valor > 0
      ? `Tempo utilizado: ${uso.mesesUsados > 0 ? uso.mesesUsados + ' meses' : ''}${uso.mesesUsados > 0 && uso.diasAdicionais > 0 ? ' + ' : ''}${uso.diasAdicionais > 0 ? uso.diasAdicionais + ' dias' : ''}`
      : '',
    uso?.valor > 0
      ? `Cálculo proporcional: ${fmtBRL(uso.valorMensal)}/mês × ${uso.mesesUsados} meses${uso.diasAdicionais > 0 ? ` + ${uso.diasAdicionais}d × ${fmtBRL(uso.valorDiario)}/dia` : ''} = ${fmtBRL(uso.valor)}`
      : '',
    '───────────────────────────────────────────',
    'IMPOSTOS DEDUZIDOS',
    ...IMPOSTOS_KEYS.map(k => `  ${IMPOSTO_LABELS[k]} (${Number(config[k]).toFixed(2)}%): − ${fmtBRL(resultado.detalhes_impostos?.[k] ?? 0)}`),
    `  TOTAL IMPOSTOS (${resultado.total_impostos_pct?.toFixed(2)}%): − ${fmtBRL(resultado.total_impostos_valor)}`,
    '───────────────────────────────────────────',
    `Comissão Vendedor (${Number(config.comissao_vendedor).toFixed(2)}%): − ${fmtBRL(resultado.comissao_valor)}`,
    ...(uso && uso.valor > 0 ? [
      `Uso proporcional do sistema: − ${fmtBRL(uso.valor)}`,
    ] : []),
    `CUSTO TOTAL DE DESCONTOS: − ${fmtBRL(resultado.total_descontos_valor)}`,
    '═══════════════════════════════════════════',
    `Valor sem multa: ${fmtBRL(resultado.valor_final_sem_multa)}`,
    aplicarMulta
      ? `Multa contratual (${Number(config.multa_contratual).toFixed(2)}%): − ${fmtBRL(valorMultaExibido)}`
      : `Multa contratual: NÃO APLICADA (R$ 0,00)`,
    `VALOR FINAL (${cenario}): → ${fmtBRL(valorFinal)}`,
    '═══════════════════════════════════════════',
    form.observacao_operacional ? `Observação: ${form.observacao_operacional}` : '',
    `Gerado em: ${new Date().toLocaleString('pt-BR')}`,
  ].filter(l => l !== '');
  return lines.join('\n');
}

function gerarHTML({ form, config, resultado, aplicarMulta }) {
  const tipoLabel = TIPO_ESTORNO_OPTIONS.find(o => o.value === form.tipo_estorno)?.label || form.tipo_estorno || '—';
  const planoLabel = TIPOS_PLANO.find(p => p.value === form.tipo_plano)?.label || '—';
  const classificacaoLabel = CLASSIFICACAO_PLANO_OPTIONS.find(o => o.value === form.classificacao_plano)?.label || '—';
  const v = resultado.valor_nota || parseBRL(form.valor_nota_fiscal);
  const uso = resultado.uso_proporcional_detalhe;
  const geradoEm = new Date().toLocaleString('pt-BR');

  // === CENÁRIO SELECIONADO PELO OPERADOR ===
  const cenario = aplicarMulta ? 'COM MULTA' : 'SEM MULTA';
  const valorFinal = aplicarMulta ? resultado.valor_final_devolucao : resultado.valor_final_sem_multa;
  const valorMultaExibido = aplicarMulta ? resultado.valor_multa_calculado : 0;
  const highlightClass = aplicarMulta ? 'highlight-red' : 'highlight-green';

  const impostosRows = IMPOSTOS_KEYS.map(k => `
    <tr>
      <td>${IMPOSTO_LABELS[k]}</td>
      <td class="center">${Number(config[k]).toFixed(2)}%</td>
      <td class="money red">− ${fmtBRL(resultado.detalhes_impostos?.[k] ?? 0)}</td>
    </tr>`).join('');

  const usoRow = uso && uso.valor > 0 ? `
    <tr class="sub">
      <td colspan="3" class="sub-header">Uso Proporcional do Sistema — Plano ${planoLabel} (${uso.mesesContrato} meses)</td>
    </tr>
    <tr>
      <td class="indent">Valor mensal: ${fmtBRL(uso.valorMensal)}/mês (${fmtBRL(v)} ÷ ${uso.mesesContrato})</td>
      <td></td><td></td>
    </tr>
    ${uso.mesesUsados > 0 ? `<tr><td class="indent">${uso.mesesUsados} meses × ${fmtBRL(uso.valorMensal)}</td><td></td><td class="money red">− ${fmtBRL(uso.valorMeses)}</td></tr>` : ''}
    ${uso.diasAdicionais > 0 ? `<tr><td class="indent">${uso.diasAdicionais} dias × ${fmtBRL(uso.valorDiario)}/dia</td><td></td><td class="money red">− ${fmtBRL(uso.valorDias)}</td></tr>` : ''}
    <tr class="subtotal-row"><td>Total de uso do sistema</td><td></td><td class="money red">− ${fmtBRL(uso.valor)}</td></tr>
  ` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Estorno Parcial — ${form.nome_cliente || 'Cliente'}</title>
  <style>
    @page { size: A4 landscape; margin: 16mm 18mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #1e293b; background: #fff; }

    .doc-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #4f46e5; padding-bottom: 10px; margin-bottom: 14px; }
    .doc-header .brand { display: flex; align-items: center; gap: 10px; }
    .doc-header .brand .logo { width: 32px; height: 32px; background: linear-gradient(135deg, #4f46e5, #7c3aed); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; font-size: 16px; }
    .doc-header .brand h1 { font-size: 15px; font-weight: 700; color: #1e293b; }
    .doc-header .brand p { font-size: 9px; color: #64748b; margin-top: 1px; }
    .doc-header .meta { text-align: right; font-size: 9px; color: #64748b; line-height: 1.6; }
    .doc-header .meta strong { color: #4f46e5; }

    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .three-col { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 12px; }

    .section { border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
    .section-title { background: #f1f5f9; padding: 6px 10px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; border-bottom: 1px solid #e2e8f0; }
    .section-title.purple { background: #ede9fe; color: #5b21b6; border-bottom-color: #ddd6fe; }
    .section-title.blue { background: #eff6ff; color: #1d4ed8; border-bottom-color: #bfdbfe; }
    .section-title.red { background: #fef2f2; color: #b91c1c; border-bottom-color: #fecaca; }
    .section-title.green { background: #f0fdf4; color: #166534; border-bottom-color: #bbf7d0; }

    .info-grid { display: grid; grid-template-columns: 1fr 1fr; padding: 8px 10px; gap: 4px 16px; }
    .info-grid.three { grid-template-columns: 1fr 1fr 1fr; }
    .info-item label { font-size: 8px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.3px; display: block; }
    .info-item span { font-size: 10px; font-weight: 600; color: #1e293b; display: block; margin-top: 1px; }
    .info-item span.big { font-size: 13px; color: #4f46e5; }

    table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
    th { background: #f8fafc; padding: 5px 8px; text-align: left; font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; color: #334155; }
    tr:last-child td { border-bottom: none; }
    .money { text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
    .red { color: #dc2626; }
    .green-val { color: #16a34a; }
    .center { text-align: center; }
    .total-row td { font-weight: 700; background: #f8fafc; border-top: 1px solid #cbd5e1; font-size: 10px; }
    .total-row .money.red { color: #b91c1c; }
    .subtotal-row td { font-weight: 600; background: #fef9f9; border-top: 1px dashed #fca5a5; }
    .sub-header { font-size: 8.5px; font-weight: 700; color: #7c3aed; background: #faf5ff; padding: 4px 8px; }
    .indent { padding-left: 20px; color: #64748b; }

    /* RESULTADO FINAL */
    .resultado-final { display: grid; grid-template-columns: 1fr 1fr 1.4fr; gap: 12px; margin-top: 12px; }
    .scenario-box { border: 1.5px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; }
    .scenario-box .scenario-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; color: #64748b; margin-bottom: 4px; }
    .scenario-box .scenario-label.green { color: #15803d; }
    .scenario-box .scenario-label.red-l { color: #b91c1c; }
    .scenario-box .scenario-value { font-size: 16px; font-weight: 700; color: #1e293b; }
    .scenario-box .scenario-sub { font-size: 8px; color: #94a3b8; margin-top: 3px; }

    /* HIGHLIGHT DINÂMICO baseado no cenário selecionado */
    .scenario-box.highlight-green { border-color: #16a34a; background: #f0fdf4; }
    .scenario-box.highlight-green .scenario-value { color: #15803d; font-size: 20px; }
    .scenario-box.highlight-red { border-color: #dc2626; background: #fef2f2; }
    .scenario-box.highlight-red .scenario-value { color: #b91c1c; font-size: 20px; }

    .badge-cenario { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 8px; font-weight: 700; margin-bottom: 4px; }
    .badge-cenario.green { background: #dcfce7; color: #15803d; }
    .badge-cenario.red { background: #fee2e2; color: #b91c1c; }

    .doc-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 8px; color: #94a3b8; }
    .doc-footer .confidential { background: #fef3c7; border: 1px solid #fbbf24; border-radius: 4px; padding: 2px 8px; font-size: 8px; font-weight: 700; color: #92400e; }
    .obs-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 10px; margin-top: 10px; font-size: 9px; color: #78350f; }
    .obs-box strong { display: block; font-size: 8px; text-transform: uppercase; color: #b45309; margin-bottom: 3px; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="doc-header">
    <div class="brand">
      <div class="logo">C</div>
      <div>
        <h1>Portal CRC — Cálculo de Estorno Parcial</h1>
        <p>Documento gerado automaticamente · Uso interno e operacional</p>
      </div>
    </div>
    <div class="meta">
      <div>Nº Cálculo: <strong>${form.numero_calculo || '—'}</strong></div>
      <div>Data: ${form.data_solicitacao || '—'}</div>
      <div>Gerado em: ${geradoEm}</div>
    </div>
  </div>

  <!-- LINHA 1: DADOS DO CLIENTE + TICKET -->
  <div class="two-col">
    <div class="section">
      <div class="section-title blue">Dados do Cliente</div>
      <div class="info-grid three">
        <div class="info-item"><label>Nome completo</label><span>${form.nome_cliente || '—'}</span></div>
        <div class="info-item"><label>CPF / CNPJ</label><span>${form.documento_cliente || '—'}</span></div>
        <div class="info-item"><label>Tipo de Estorno</label><span>${tipoLabel}</span></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title blue">Dados do Ticket</div>
      <div class="info-grid three">
        <div class="info-item"><label>Ticket Zendesk</label><span>${form.ticket_zendesk || '—'}</span></div>
        <div class="info-item"><label>Operador Responsável</label><span>${form.operador_nome || '—'}</span></div>
        <div class="info-item"><label>Data da Solicitação</label><span>${form.data_solicitacao || '—'}</span></div>
      </div>
    </div>
  </div>

  <!-- LINHA 2: FINANCEIRO + IMPOSTOS + USO PROPORCIONAL -->
  <div class="three-col">

    <!-- Dados Financeiros -->
    <div class="section">
      <div class="section-title purple">Dados Financeiros</div>
      <div class="info-grid three">
        <div class="info-item"><label>Valor da Nota Fiscal</label><span class="big">${fmtBRL(v)}</span></div>
        <div class="info-item"><label>Classificação do Plano</label><span>${classificacaoLabel || '—'}</span></div>
        <div class="info-item"><label>Tipo de Plano Contratado</label><span>${planoLabel} · ${uso?.diasContrato || '—'} dias</span></div>
        <div class="info-item"><label>Tempo Utilizado</label><span>${uso?.diasTotaisUsados ?? 0} dias totais</span></div>
        ${uso && uso.valor > 0 ? `<div class="info-item"><label>Valor Mensal (NF ÷ ${uso.mesesContrato})</label><span>${fmtBRL(uso.valorMensal)}/mês</span></div>` : ''}
        ${uso && uso.valor > 0 ? `<div class="info-item"><label>Uso Proporcional do Sistema</label><span>${fmtBRL(uso.valor)}</span></div>` : ''}
      </div>
    </div>

    <!-- Impostos -->
    <div class="section">
      <div class="section-title red">Impostos e Deduções</div>
      <table>
        <thead>
          <tr>
            <th>Imposto</th>
            <th class="center">%</th>
            <th class="center">Valor Deduzido</th>
          </tr>
        </thead>
        <tbody>
          ${impostosRows}
          <tr class="total-row">
            <td>Total Impostos</td>
            <td class="center">${resultado.total_impostos_pct?.toFixed(2)}%</td>
            <td class="money red">− ${fmtBRL(resultado.total_impostos_valor)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Comissão + Uso + Total Descontos -->
    <div class="section">
      <div class="section-title red">Outros Descontos</div>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th></th>
            <th class="center">Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Comissão do Vendedor</td>
            <td class="center">${Number(config.comissao_vendedor).toFixed(2)}%</td>
            <td class="money red">− ${fmtBRL(resultado.comissao_valor)}</td>
          </tr>
          ${usoRow}
          <tr class="total-row">
            <td>Custo Total de Descontos</td>
            <td></td>
            <td class="money red">− ${fmtBRL(resultado.total_descontos_valor)}</td>
          </tr>
        </tbody>
      </table>
    </div>

  </div>

  <!-- RESULTADO FINAL — REFLETE O CENÁRIO SELECIONADO PELO OPERADOR -->
  <div class="resultado-final">
    <div class="scenario-box">
      <div class="scenario-label">✓ Sem Multa Contratual</div>
      <div class="scenario-value">${fmtBRL(resultado.valor_final_sem_multa)}</div>
      <div class="scenario-sub">Devolução líquida ao cliente</div>
    </div>
    <div class="scenario-box">
      <div class="scenario-label red-l">Com Multa Contratual (${Number(config.multa_contratual).toFixed(2)}%)</div>
      <div class="scenario-value">${fmtBRL(resultado.valor_final_devolucao)}</div>
      <div class="scenario-sub">Multa deduzida: − ${fmtBRL(resultado.valor_multa_calculado)}</div>
    </div>
    <div class="scenario-box ${highlightClass}">
      <div class="badge-cenario ${aplicarMulta ? 'red' : 'green'}">CENÁRIO SELECIONADO: ${cenario}</div>
      <div class="scenario-label ${aplicarMulta ? 'red-l' : 'green'}">
        VALOR FINAL DE DEVOLUÇÃO
      </div>
      <div class="scenario-value">${fmtBRL(valorFinal)}</div>
      <div class="scenario-sub">
        ${aplicarMulta
          ? `Multa de ${Number(config.multa_contratual).toFixed(2)}% aplicada: − ${fmtBRL(valorMultaExibido)}`
          : 'Multa contratual não aplicada'
        }
      </div>
      <div class="scenario-sub" style="margin-top:4px">Operador: ${form.operador_nome || '—'} · ${form.data_solicitacao || '—'}</div>
    </div>
  </div>

  ${form.observacao_operacional ? `<div class="obs-box"><strong>Observação Operacional</strong>${form.observacao_operacional}</div>` : ''}

  <!-- FOOTER -->
  <div class="doc-footer">
    <div>Portal CRC · Documento gerado em ${geradoEm} · Uso interno e operacional</div>
    <div class="confidential">CONFIDENCIAL</div>
  </div>

</body>
</html>`;
}

export default function ExportacaoEstorno({ form, config, resultado, aplicarMulta }) {
  const { toast } = useToast();
  if (!resultado) return null;

  const handleCopiar = () => {
    try {
      navigator.clipboard.writeText(gerarTexto({ form, config, resultado, aplicarMulta }));
      toast({ title: 'Copiado!', description: 'Memória de cálculo copiada para a área de transferência.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível copiar.', variant: 'destructive' });
    }
  };

  const handlePDF = () => {
    try {
      const win = window.open('', '_blank');
      if (!win) { toast({ title: 'Bloqueado', description: 'Permita pop-ups para exportar.', variant: 'destructive' }); return; }
      win.document.write(gerarHTML({ form, config, resultado, aplicarMulta }));
      win.document.close();
      setTimeout(() => win.print(), 800);
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível gerar o PDF.', variant: 'destructive' });
    }
  };

  return (
    <div className="flex gap-2 flex-wrap">
      <Button variant="outline" size="sm" onClick={handleCopiar} className="gap-2">
        <Copy className="w-4 h-4" /> Copiar Resumo
      </Button>
      <Button variant="outline" size="sm" onClick={handlePDF} className="gap-2">
        <FileDown className="w-4 h-4" /> Exportar PDF
      </Button>
    </div>
  );
}