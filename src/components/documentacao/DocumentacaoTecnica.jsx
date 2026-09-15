import db from '@/api/db';
import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Accordion } from '@/components/ui/accordion';
import { Search, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ModuloDocCard from './ModuloDocCard';
import { modulosOperacoes } from './dadosOperacoes';
import { modulosGestaoPessoas } from './dadosGestaoPessoas';
import { modulosComunicacao } from './dadosComunicacao';
import { modulosSistema } from './dadosSistema';

const TODOS_MODULOS = [
  ...modulosOperacoes,
  ...modulosGestaoPessoas,
  ...modulosComunicacao,
  ...modulosSistema,
];

const CATEGORIAS = ['Operações', 'Gestão de Pessoas', 'Comunicação', 'Sistema'];

export default function DocumentacaoTecnica() {
  const [busca, setBusca] = useState('');

  const modulosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return TODOS_MODULOS;
    return TODOS_MODULOS.filter((m) => {
      const texto = JSON.stringify(m).toLowerCase();
      return texto.includes(termo);
    });
  }, [busca]);

  const handleExportar = () => {
    const json = JSON.stringify(TODOS_MODULOS, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documentacao_tecnica_portal_crc_${Date.now()}.json`;
    a.click();
  };

  const gerarMarkdown = () => {
    const todasEntidades = [...new Set(TODOS_MODULOS.flatMap((m) => m.entidades || []))].sort();
    const dataGeracao = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    let md = `# Documentação Técnica — Portal CRC\n\n`;
    md += `> Central de Relacionamento e Conformidade — Plataforma de gestão de desempenho, desenvolvimento de colaboradores e conformidade operacional.\n\n`;
    md += `**Gerado em:** ${dataGeracao}\n`;
    md += `**Total de módulos documentados:** ${TODOS_MODULOS.length}\n`;
    md += `**Total de entidades:** ${todasEntidades.length}\n\n`;
    md += `---\n\n`;

    // Sumário
    md += `## Sumário\n\n`;
    CATEGORIAS.forEach((cat) => {
      const mods = TODOS_MODULOS.filter((m) => m.categoria === cat);
      if (mods.length === 0) return;
      md += `### ${cat}\n\n`;
      mods.forEach((m) => {
        md += `- [${m.nome}](#${m.id})\n`;
      });
      md += `\n`;
    });

    // Índice de Entidades
    md += `---\n\n## Índice de Entidades\n\n`;
    md += `| Entidade | Módulos que utilizam |\n|---|---|\n`;
    todasEntidades.forEach((ent) => {
      const modsUsam = TODOS_MODULOS.filter((m) => (m.entidades || []).includes(ent)).map((m) => m.nome);
      md += `| **${ent}** | ${modsUsam.join(', ')} |\n`;
    });
    md += `\n`;

    // Visão Geral da Arquitetura
    md += `---\n\n## Visão Geral da Arquitetura\n\n`;
    md += `### Stack Tecnológico\n\n`;
    md += `- **Frontend:** React 18 + Vite + Tailwind CSS + shadcn/ui (Radix UI)\n`;
    md += `- **Roteamento:** React Router DOM v6\n`;
    md += `- **Cache/Estado servidor:** TanStack React Query v5\n`;
    md += `- **Gráficos:** Recharts\n`;
    md += `- **Ícones:** lucide-react\n`;
    md += `- **Datas:** date-fns\n`;
    md += `- **Backend (BaaS):** Base44 SDK — entidades (JSON schemas), auth, integrações (InvokeLLM, UploadFile, SendEmail, GenerateImage, etc.)\n`;
    md += `- **Drag-and-drop:** @hello-pangea/dnd\n`;
    md += `- **Editor rich-text:** react-quill-new\n`;
    md += `- **Mapas:** react-leaflet\n`;
    md += `- **3D:** three.js\n\n`;
    md += `### Padrões de Arquitetura\n\n`;
    md += `1. **Vínculo usuário↔colaborador por email:** não há FK no banco; o registro Colaborador é criado manualmente com o mesmo email do usuário autenticado.\n`;
    md += `2. **Segregação de acesso no cliente:** sem RLS no banco — toda lógica de permissão (gestorOnly, PermissaoModulo, filtro por colaborador_id) é no frontend.\n`;
    md += `3. **Pontuação sempre recalculada ao vivo:** calculateTratativaPoints() é a única fonte de verdade — não há persistência de pontos por tratativa (entidade Pontuacao é código morto para isso).\n`;
    md += `4. **Cálculo financeiro dinâmico:** custo operacional e impacto financeiro sempre recalculados com salário atual do colaborador — campos estáticos gravados são ignorados nos relatórios.\n`;
    md += `5. **Fuso horário São Paulo:** datas persistidas em ISO (UTC), exibição sempre via formatDateSP/todaySP (America/Sao_Paulo).\n`;
    md += `6. **Input monetário:** CurrencyInput com acumulador de centavos — contrato de dado sempre number (centavos), nunca string.\n`;
    md += `7. **Máquina de estados (FSM) de Tratativa:** transições fixas no código (FSM_TRANSITIONS em TratativaDetalhe.jsx), historico_estados[] é append-only.\n`;
    md += `8. **ErrorBoundary aninhado:** Layout envolve children em ErrorBoundary → uma página quebrada não derruba o app.\n\n`;

    // Módulos por categoria
    CATEGORIAS.forEach((cat) => {
      const mods = TODOS_MODULOS.filter((m) => m.categoria === cat);
      if (mods.length === 0) return;
      md += `---\n\n## ${cat}\n\n`;
      mods.forEach((m) => {
        md += `### ${m.nome}\n\n`;
        md += `**ID:** \`${m.id}\`\n\n`;
        if (m.objetivo) md += `**Objetivo:** ${m.objetivo}\n\n`;
        if (m.paginas?.length) {
          md += `**Páginas / Componentes:**\n\n`;
          m.paginas.forEach((p) => { md += `- \`${p}\`\n`; });
          md += `\n`;
        }
        if (m.entidades?.length) {
          md += `**Entidades:** ${m.entidades.map((e) => `\`${e}\``).join(', ')}\n\n`;
        }
        if (m.fluxo) {
          md += `**Fluxo / Lógica:**\n\n`;
          md += `${m.fluxo}\n\n`;
        }
        if (m.campos_chave?.length) {
          md += `**Campos-chave:**\n\n`;
          m.campos_chave.forEach((c) => {
            md += `- \`${c.campo}\` — ${c.descricao}\n`;
          });
          md += `\n`;
        }
        if (m.regras_negocio?.length) {
          md += `**Regras de negócio:**\n\n`;
          m.regras_negocio.forEach((r) => { md += `- ${r}\n`; });
          md += `\n`;
        }
        if (m.integracoes?.length) {
          md += `**Integrações com outros módulos:**\n\n`;
          m.integracoes.forEach((r) => { md += `- ${r}\n`; });
          md += `\n`;
        }
      });
    });

    // Entidades e schemas
    md += `---\n\n## Entidades e Schemas de Dados\n\n`;
    md += `> As entidades são definidas como JSON schemas em \`base44/entities/<Nome>.jsonc\`. Campos built-in em todo registro: \`id\`, \`created_date\`, \`updated_date\`, \`created_by_id\`.\n\n`;
    md += `Lista completa de entidades do sistema:\n\n`;
    todasEntidades.forEach((ent) => {
      md += `- \`${ent}\`\n`;
    });
    md += `\n`;

    // Integrações Base44
    md += `---\n\n## Integrações Base44 (Core)\n\n`;
    md += `- **InvokeLLM:** Geração de respostas com LLM (usado em Observações, ORÁCULO, Jornada do Cliente, Relatório Diretoria). Suporta \`add_context_from_internet\` (apenas modelos gemini_3_flash/gemini_3_1_pro), \`file_urls\` e \`response_json_schema\`.\n`;
    md += `- **UploadFile:** Upload de arquivos (retorna \`{file_url}\`).\n`;
    md += `- **UploadPrivateFile / CreateFileSignedUrl:** Armazenamento privado com URL assinada temporária.\n`;
    md += `- **SendEmail:** Envio de e-mail (atinge usuários registrados sempre; não registrados requer plano pago + domínio customizado).\n`;
    md += `- **SendPushNotification:** Push nativo mobile (apenas app nativo iOS/Android com credenciais configuradas; server-side via asServiceRole).\n`;
    md += `- **GenerateImage / GenerateVideo / GenerateSpeech:** Geração de mídia via IA.\n`;
    md += `- **TranscribeAudio:** Transcrição de áudio (Whisper).\n`;
    md += `- **ExtractDataFromUploadedFile:** Extração estruturada de CSV/Excel/JSON/PDF/imagens para um JSON schema alvo.\n\n`;

    // Convenções de código
    md += `---\n\n## Convenções de Código\n\n`;
    md += `- **Imports:** alias \`@/\` (ex: \`@/components/ui/button\`), nunca paths relativos \`src/\`.\n`;
    md += `- **cn (class merge):** import de \`@/lib/utils\`.\n`;
    md += `- **createPageUrl:** import de \`@/utils\`.\n`;
    md += `- **shadcn/ui:** cada componente em \`@/components/ui/<nome>.jsx\` — importar cada primitiva do seu próprio arquivo.\n`;
    md += `- **Ícones:** apenas lucide-react, apenas ícones que existem.\n`;
    md += `- **JSX:** apenas em arquivos \`.jsx\`/\\\`.tsx\`.\n`;
    md += `- **Hooks:** chamados apenas no top-level do componente, nunca condicional ou em loops.\n`;
    md += `- **Classes Tailwind:** sempre strings literais (o build purga classes dinâmicas \`bg-\${cor}-500\`).\n`;
    md += `- **Entidades SDK:** \`db.entities.<Nome>.list()\`, \`.filter()\`, \`.create()\`, \`.update()\`, \`.delete()\`, \`.bulkCreate()\`, \`.bulkUpdate()\`, \`.updateMany()\`, \`.deleteMany()\`.\n\n`;
    md += `---\n\n*Fim da documentação técnica — Portal CRC.*\n`;

    return md;
  };

  const handleExportarMarkdown = () => {
    const md = gerarMarkdown();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documentacao_tecnica_portal_crc_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-info-soft border border-info/25 rounded-lg flex items-start gap-3">
        <FileText className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-sm text-primary">
          Documentação técnica de todos os módulos do sistema: objetivo, páginas/componentes, entidades,
          fluxo de negócio, campos-chave e integrações entre módulos. Use como referência ao planejar
          novas funcionalidades ou repassar contexto a um consultor.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar módulo, entidade, campo, regra..."
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportar}>
            <Download className="w-4 h-4 mr-2" />
            Exportar JSON
          </Button>
          <Button onClick={handleExportarMarkdown}>
            <Download className="w-4 h-4 mr-2" />
            Baixar .md (para IA)
          </Button>
        </div>
      </div>

      {CATEGORIAS.map((categoria) => {
        const modulosDaCategoria = modulosFiltrados.filter((m) => m.categoria === categoria);
        if (modulosDaCategoria.length === 0) return null;
        return (
          <div key={categoria}>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">{categoria}</h3>
            <Accordion type="multiple" className="space-y-0">
              {modulosDaCategoria.map((modulo) => (
                <ModuloDocCard key={modulo.id} modulo={modulo} />
              ))}
            </Accordion>
          </div>
        );
      })}

      {modulosFiltrados.length === 0 && (
        <p className="text-center text-muted-foreground py-10">Nenhum módulo encontrado para "{busca}"</p>
      )}
    </div>
  );
}