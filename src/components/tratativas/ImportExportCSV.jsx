import db from '@/api/db';
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import PainelLateral, { RodapeFixo } from '@/components/ui/PainelLateral';

// Campos comerciais que podem ser atualizados via importação
const COMMERCIAL_FIELDS = [
  'plano_cliente', 'modalidade_plano', 'valor_contratacao_plano_atual',
  'data_primeira_contratacao', 'data_contratacao_plano_atual', 'segmento_cliente'
];

// Campos exportados/importados
const CSV_FIELDS = [
  'id_interno', 'link_zendesk', 'link_intranet', 'id_base_cliente', 'nome_cliente',
  'tipo_tratativa', 'prioridade', 'status', 'motivo_nome', 'submotivos',
  'causa_primaria', 'agente_responsavel_nome', 'agente_responsavel_id',
  'data_registro', 'data_encerramento', 'sla_atribuido', 'encerrado_no_sla',
  'descricao_solucao', 'houve_devolucao_financeira', 'valor_devolvido_cliente',
  'numero_case_contestacao', 'valor_contestado_inicial', 'valor_recuperado',
  'cliente_recorrente', 'numero_ocorrencias', 'solucao_replicavel', 'excluida',
  'plano_cliente', 'modalidade_plano', 'valor_contratacao_plano_atual',
  'data_primeira_contratacao', 'data_contratacao_plano_atual', 'segmento_cliente'
];

function escapeCsvValue(val) {
  if (val === null || val === undefined) return '';
  const str = Array.isArray(val) ? val.join('|') : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// Converte um row do CSV em payload válido para create/update
function converterRow(row) {
  const data = { ...row };
  // Arrays (separador |)
  if (typeof data.submotivos === 'string') {
    data.submotivos = data.submotivos ? data.submotivos.split('|').filter(Boolean) : [];
  }
  // Booleans
  ['cliente_recorrente', 'encerrado_no_sla', 'houve_devolucao_financeira',
   'solucao_replicavel', 'excluida'].forEach(f => {
    if (data[f] !== undefined && data[f] !== '') data[f] = data[f] === 'true' || data[f] === true;
  });
  // Números
  ['sla_atribuido', 'numero_ocorrencias', 'valor_devolvido_cliente',
   'valor_contestado_inicial', 'valor_recuperado',
   'valor_contratacao_plano_atual'].forEach(f => {
    if (data[f] !== '' && data[f] !== undefined) data[f] = parseFloat(data[f]) || 0;
  });
  return data;
}

export default function ImportExportCSV({ tratativas, onRefresh }) {
  const [importOpen, setImportOpen] = useState(false);
  const [preview, setPreview] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [erros, setErros] = useState([]);
  const [processando, setProcessando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });
  const [logImport, setLogImport] = useState([]);
  const queryClient = useQueryClient();

  // ── EXPORTAR ──
  const exportarCSV = () => {
    const header = CSV_FIELDS.join(',');
    const rows = tratativas.map(t =>
      CSV_FIELDS.map(f => escapeCsvValue(t[f])).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tratativas_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${tratativas.length} tratativas exportadas`);
  };

  // ── LER CSV ──
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Apenas arquivos CSV são aceitos');
      return;
    }

    setProcessando(true);
    setAllRows([]);
    setPreview([]);
    setErros([]);
    setLogImport([]);

    const text = await file.text();
    const linhas = text.split('\n').map(l => l.replace(/\r$/, '')).filter(l => l.trim());

    if (linhas.length < 2) {
      toast.error('CSV vazio ou inválido');
      setProcessando(false);
      return;
    }

    const cabecalho = parseCsvLine(linhas[0]);
    const errosDetectados = [];
    const registros = [];

    for (let i = 1; i < linhas.length; i++) {
      const valores = parseCsvLine(linhas[i]);
      if (valores.length < 2) continue;
      const row = {};
      cabecalho.forEach((col, idx) => { row[col] = valores[idx] ?? ''; });

      // Validação mínima
      if (!row.link_zendesk && !row.id_interno) {
        errosDetectados.push(`Linha ${i + 1}: sem link_zendesk ou id_interno`);
        continue;
      }
      registros.push(row);
    }

    setPreview(registros.slice(0, 5));
    setAllRows(registros);
    setErros(errosDetectados);
    setProcessando(false);

    if (registros.length > 0) {
      toast.success(`${registros.length} registros lidos — prontos para importação`);
    }
  };

  // ── IMPORTAR (criar ou atualizar) ──
  const handleImportar = async () => {
    if (allRows.length === 0) {
      toast.error('Nenhum dado para importar. Faça o upload primeiro.');
      return;
    }

    setImportando(true);
    setLogImport([]);
    setProgresso({ atual: 0, total: allRows.length });

    try {
      // Buscar todos os registros existentes (limite alto para cobrir bases grandes)
      const existentes = await db.entities.Tratativa.list('-created_date', 5000);

      // Múltiplos mapas para matching robusto (id_interno pode duplicar no banco)
      const byIdAndLink = {};
      const byLink = {};
      const byIdInterno = {};
      existentes.forEach(t => {
        if (t.id_interno && t.link_zendesk) byIdAndLink[`${t.id_interno}||${t.link_zendesk}`] = t;
        if (t.link_zendesk) byLink[t.link_zendesk] = t;
        if (t.id_interno && !byIdInterno[t.id_interno]) byIdInterno[t.id_interno] = t;
      });

      let criadas = 0, atualizadas = 0, erros = 0, comercialPreenchido = 0;
      const logs = [];
      const novosRegistros = [];

      // Processar cada linha
      for (let i = 0; i < allRows.length; i++) {
        const row = allRows[i];
        const linhaNum = i + 2; // +1 header, +1 base-1
        const data = converterRow(row);

        // Matching em cascata: id_interno+link_zendesk → link_zendesk → id_interno
        const existente = byIdAndLink[`${data.id_interno}||${data.link_zendesk}`]
          || (data.link_zendesk ? byLink[data.link_zendesk] : null)
          || (data.id_interno ? byIdInterno[data.id_interno] : null);
        if (existente) {
          // Atualizar — preservar historico_estados e mesclar apenas campos preenchidos
          delete data.historico_estados;
          const updatePayload = {};
          const camposAtualizados = [];
          Object.keys(data).forEach(k => {
            const v = data[k];
            if (v !== '' && v !== undefined && v !== null) {
              updatePayload[k] = v;
              camposAtualizados.push(k);
            }
          });
          const temComercial = camposAtualizados.some(f => COMMERCIAL_FIELDS.includes(f));
          if (temComercial) comercialPreenchido++;
          try {
            await db.entities.Tratativa.update(existente.id, updatePayload);
            atualizadas++;
            logs.push({
              linha: linhaNum,
              status: 'ok',
              msg: `Atualizado: ${data.id_interno || existente.id_interno}`,
              campos: camposAtualizados.join(', '),
              comercial: temComercial
            });
          } catch (err) {
            erros++;
            logs.push({ linha: linhaNum, status: 'erro', msg: `Erro ao atualizar ${data.id_interno || ''}: ${err.message || err}` });
          }
        } else {
          // Coletar para bulk create
          if (!data.data_registro) data.data_registro = new Date().toISOString();
          if (!data.status) data.status = 'registrada';
          novosRegistros.push({ data, linha: linhaNum });
        }
        setProgresso({ atual: i + 1, total: allRows.length });
      }

      // Bulk create dos novos registros (lotes de 100)
      for (let i = 0; i < novosRegistros.length; i += 100) {
        const batch = novosRegistros.slice(i, i + 100);
        try {
          await db.entities.Tratativa.bulkCreate(batch.map(r => r.data));
          criadas += batch.length;
          batch.forEach(r => logs.push({ linha: r.linha, status: 'ok', msg: `Criado: ${r.data.id_interno || 'novo registro'}` }));
        } catch (err) {
          erros += batch.length;
          batch.forEach(r => logs.push({ linha: r.linha, status: 'erro', msg: `Erro ao criar: ${err.message || err}` }));
        }
        setProgresso({ atual: allRows.length, total: allRows.length });
      }

      setLogImport(logs);
      queryClient.invalidateQueries(['tratativas']);
      queryClient.invalidateQueries(['tratativas-jornada']);
      queryClient.invalidateQueries(['tratativas-relatorios']);

      toast.success(`Importação concluída: ${criadas} criadas, ${atualizadas} atualizadas (${comercialPreenchido} com dados comerciais)${erros > 0 ? `, ${erros} erros` : ''}`);

      if (erros === 0 && onRefresh) onRefresh();
    } catch (err) {
      toast.error('Erro durante a importação: ' + (err.message || err));
    } finally {
      setImportando(false);
    }
  };

  const progressoPct = progresso.total > 0 ? Math.round((progresso.atual / progresso.total) * 100) : 0;

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={exportarCSV}>
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Importar CSV
        </Button>
      </div>

      <PainelLateral
        open={importOpen} onOpenChange={(v) => { setImportOpen(v); if (!v) { setPreview([]); setAllRows([]); setErros([]); setLogImport([]); } }}
        largura="2xl"
        titulo={<><FileSpreadsheet className="w-5 h-5 text-primary" /> Importar Tratativas via CSV</>}
      >
          <div className="space-y-4 mt-2">
            {/* Info */}
            <div className="p-3 bg-info-soft border border-info/25 rounded-lg text-sm text-primary space-y-1">
              <p><strong>Como funciona:</strong></p>
              <ul className="list-disc ml-4 space-y-0.5 text-xs">
                <li>Se <code>id_interno</code> já existir no banco → <strong>atualiza</strong> os dados (apenas os campos preenchidos no CSV)</li>
                <li>Se <code>id_interno</code> for novo → <strong>cria</strong> uma nova tratativa</li>
                <li>Campos de array (submotivos) usam <strong>|</strong> como separador</li>
                <li>Colunas comerciais (plano_cliente, modalidade_plano, valor_contratacao_plano_atual, data_primeira_contratacao, data_contratacao_plano_atual, segmento_cliente) são opcionais — CSVs antigos continuam funcionando</li>
                <li>Use "Exportar CSV" para obter o modelo correto de colunas</li>
              </ul>
            </div>

            {/* Upload */}
            <div>
              <label htmlFor="csv-import-input" className="cursor-pointer block">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/40 hover:bg-info-soft transition-all">
                  <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Clique para selecionar o arquivo CSV</p>
                  <p className="text-xs text-muted-foreground mt-1">Separador: vírgula (,)</p>
                </div>
                <Input
                  id="csv-import-input"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={processando || importando}
                />
              </label>
            </div>

            {processando && (
              <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Processando arquivo...
              </div>
            )}

            {/* Resumo inteligente de registros lidos + dados comerciais */}
            {allRows.length > 0 && !importando && (() => {
              const comPlano = allRows.filter(r => r.plano_cliente && r.plano_cliente.trim()).length;
              const comValor = allRows.filter(r => r.valor_contratacao_plano_atual && String(r.valor_contratacao_plano_atual).trim()).length;
              const comData = allRows.filter(r => r.data_primeira_contratacao && r.data_primeira_contratacao.trim()).length;
              const comSegmento = allRows.filter(r => r.segmento_cliente && r.segmento_cliente.trim()).length;
              const semComercial = allRows.length - comPlano;
              return (
                <div className="space-y-2">
                  <div className="p-3 bg-success-soft border border-success/25 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-success" />
                    <span className="text-sm font-medium text-success">
                      {allRows.length} registro(s) lido(s) e pronto(s) para importação
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div className="p-2 bg-info-soft border border-info/25 rounded-lg text-center">
                      <p className="text-xs text-primary font-medium">Com Plano</p>
                      <p className="text-lg font-bold text-primary">{comPlano}</p>
                    </div>
                    <div className="p-2 bg-info-soft border border-info/25 rounded-lg text-center">
                      <p className="text-xs text-primary font-medium">Com Valor</p>
                      <p className="text-lg font-bold text-primary">{comValor}</p>
                    </div>
                    <div className="p-2 bg-warning-soft border border-warning/25 rounded-lg text-center">
                      <p className="text-xs text-warning font-medium">Com Data Contrato</p>
                      <p className="text-lg font-bold text-warning">{comData}</p>
                    </div>
                    <div className="p-2 bg-success-soft border border-success/25 rounded-lg text-center">
                      <p className="text-xs text-success font-medium">Com Segmento</p>
                      <p className="text-lg font-bold text-success">{comSegmento}</p>
                    </div>
                    <div className="p-2 bg-muted border border-border rounded-lg text-center">
                      <p className="text-xs text-muted-foreground font-medium">Sem Comercial</p>
                      <p className="text-lg font-bold text-foreground">{semComercial}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Erros de validação */}
            {erros.length > 0 && (
              <div className="p-3 bg-destructive/10 border border-destructive/25 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">{erros.length} linha(s) com problema (serão ignoradas)</span>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {erros.map((e, i) => <p key={i} className="text-xs text-destructive">{e}</p>)}
                </div>
              </div>
            )}

            {/* Barra de progresso da importação */}
            {importando && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Importando... {progresso.atual} de {progresso.total}</span>
                  <span className="font-medium text-primary">{progressoPct}%</span>
                </div>
                <Progress value={progressoPct} className="h-2" />
              </div>
            )}

            {/* Log de processamento */}
            {logImport.length > 0 && !importando && (() => {
              const okCount = logImport.filter(l => l.status === 'ok').length;
              const errCount = logImport.filter(l => l.status === 'erro').length;
              const comercialCount = logImport.filter(l => l.comercial).length;
              return (
                <div className="p-3 bg-muted border border-border rounded-lg">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-success" />
                      <span className="text-sm font-medium text-foreground">Log de processamento ({logImport.length} registros)</span>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge className="bg-success-soft text-success border-0">{okCount} OK</Badge>
                      {comercialCount > 0 && <Badge className="bg-info-soft text-primary border-0">{comercialCount} comercial</Badge>}
                      {errCount > 0 && <Badge className="bg-destructive/10 text-destructive border-0">{errCount} erros</Badge>}
                    </div>
                  </div>
                  <div className="space-y-0.5 max-h-48 overflow-y-auto">
                    {logImport.slice(0, 200).map((l, i) => (
                      <div key={i} className={`text-xs flex items-start gap-1 ${l.status === 'erro' ? 'text-destructive' : 'text-success'}`}>
                        <span className="font-mono shrink-0">L{l.linha}:</span>
                        <span>{l.msg}</span>
                        {l.campos && (
                          <span className="text-muted-foreground ml-1 text-[10px]">({l.campos})</span>
                        )}
                      </div>
                    ))}
                    {logImport.length > 200 && (
                      <p className="text-xs text-muted-foreground italic">... e mais {logImport.length - 200} registros. Verifique o toast para o resumo.</p>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Preview */}
            {preview.length > 0 && !importando && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium text-success">
                    Preview (primeiros {preview.length} de {allRows.length} registros)
                  </span>
                </div>
                <div className="border rounded-lg overflow-auto max-h-40">
                  <table className="text-xs w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-2 text-left">id_interno</th>
                        <th className="p-2 text-left">nome_cliente</th>
                        <th className="p-2 text-left">tipo_tratativa</th>
                        <th className="p-2 text-left">status</th>
                        <th className="p-2 text-left">prioridade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2 font-mono">{r.id_interno || '—'}</td>
                          <td className="p-2">{r.nome_cliente || '—'}</td>
                          <td className="p-2">{r.tipo_tratativa || '—'}</td>
                          <td className="p-2"><Badge variant="outline" className="text-xs">{r.status || '—'}</Badge></td>
                          <td className="p-2">{r.prioridade || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <RodapeFixo>
              <Button variant="outline" onClick={() => { setImportOpen(false); setPreview([]); setAllRows([]); setErros([]); setLogImport([]); }} disabled={importando}>
                Cancelar
              </Button>
              <Button
                onClick={handleImportar}
                disabled={allRows.length === 0 || importando}
                className="bg-primary hover:bg-primary/90"
              >
                {importando ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importando {progressoPct}%</>
                ) : (
                  <><Upload className="w-4 h-4 mr-2" />Importar {allRows.length} registro(s)</>
                )}
              </Button>
            </RodapeFixo>
          </div>
      </PainelLateral>
    </>
  );
}