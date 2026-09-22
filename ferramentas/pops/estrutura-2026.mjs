/**
 * POPs da Estrutura de Trabalho CRC 2026 — V2.
 *
 * Fonte: "Estrutura de trabalho CRC 2026 - V2.docx". Fiel ao documento, com
 * os erros de digitação corrigidos e reorganizado para leitura rápida (passos
 * numerados, prazos em destaque), sem mudar nenhuma regra. Decisões do
 * responsável pelo produto em 21/09/2026:
 *   - cada tipo de Reclamação Interna (AC, SM, IP) tem o seu POP;
 *   - Contestação: defesa entregue com 1 dia útil de antecedência (o
 *     documento dizia 1 num ponto e 2 noutro);
 *   - GMN: cobrança do cliente pendente a cada 14h (confirmado);
 *   - "Facilitador Interno" (e não "de Informações");
 *   - Premiação: a gestão tem até o 10º dia após o fim do ciclo para
 *     consolidar, avaliar e divulgar o vencedor;
 *   - Home Office (por escolha e política 07/2026): fora dos POPs;
 *   - R.A. e GMN inativados: +1 ponto a partir do Ciclo 3 (informativo).
 *
 * Formato dos textos (o visualizador entende): "## " subtítulo, "- " item,
 * "1. " passo numerado, "**x**" destaque. Importado por
 * ferramentas/importar-pops.mjs.
 */

const FERRAMENTAS_PADRAO = 'Zendesk, Portal CRC, HubSpot, WhatsApp, Telefone, Google Drive e outras.';

const ESTADOS_ZENDESK = `## Estados do ticket no Zendesk
- **Novo:** ticket criado pelo supervisor CRC no Zendesk, aguardando atribuição.
- **Aberto:** tratativa enviada ao agente.
- **Pendente:** aguardando ação ou resposta do cliente.
- **Em espera:** aguardando retorno de terceiros (N2, programação ou áreas externas).
- **Resolvido:** tratativa concluída e cliente posicionado.`;

const INATIVADOS_CICLO_3 = `## Informativo — a partir do Ciclo 3
Reclamações do Reclame Aqui **inativadas** e avaliações do Google Meu Negócio **inativadas** passam a gerar **+1 ponto**. A regra vale **somente a partir do Ciclo 3**; a pontuação dos ciclos anteriores não muda.`;

const MODO_ATUACAO_EXTERNO = (canal, macroFinal) => `## Modo de atuação ${canal}
**Comunicação com o cliente.** Linguagem empática, clara e objetiva, sem jargões técnicos desnecessários. Foco na experiência do cliente e na resolução do problema, sem atribuir culpa ao cliente, a terceiros ou a fatores externos sem evidência validada.

**Confidencialidade e tomada de decisão.** É proibido mencionar falhas internas não validadas e compartilhar prints, logs, mensagens internas ou tratativas com parceiros e terceiros. Em situações críticas, a decisão final é exclusivamente da gestão ou da diretoria; é proibido prometer soluções, prazos ou compensações sem validação formal.

**Padronização obrigatória.** O uso das macros aprovadas é obrigatório. É proibido criar respostas padrão paralelas ou modelos não homologados; ajustes personalizados são permitidos apenas sem descaracterizar a macro oficial. É obrigatório usar um link do Google Drive para guardar prints, áudios e outros documentos da interação com o cliente.${macroFinal ? `\n\n**Encerramento público:** macro "${macroFinal}".` : ''}`;

export const POPS = [
  // ---------------------------------------------------------------- Governança
  {
    codigo: 'POP 00',
    titulo: 'Manual da Estrutura de Trabalho CRC 2026',
    categoria: 'Governança',
    ordem: 0,
    tipos_tratativa: [],
    objetivo: 'Este Manual Oficial de Governança de Processos estabelece as diretrizes, princípios, papéis, responsabilidades, metodologias e mecanismos de controle adotados pela organização para 2026, aprovados pela gestão. O objetivo é garantir previsibilidade, qualidade, transparência, aprendizado organizacional contínuo e excelência na experiência interna e externa, por meio de processos bem definidos, vivos e evolutivos.',
    ferramentas: FERRAMENTAS_PADRAO,
    prazos: [
      { rotulo: 'Em vigor desde', valor: '13/03/2026' },
      { rotulo: 'Decisor por processo', valor: '1 aprovador (A) único' },
    ],
    fluxo_operacional: `## 1. Princípios da governança de processos
Clareza, responsabilidade, simplicidade funcional, foco no cliente, aprendizado contínuo, ética, transparência e equilíbrio operacional.

## 2. Estrutura de governança
Alta Liderança, Supervisão, Facilitador Interno, Agentes Operacionais e Áreas de Apoio. Cada camada tem responsabilidades bem delimitadas, para evitar sobreposição, ruído e sobrecarga.

## 3. Papéis e responsabilidades
- **Alta Liderança:** define as diretrizes estratégicas e patrocina a cultura de processos.
- **Supervisão:** garante a aderência, resolve conflitos e prioriza melhorias.
- **Facilitador Interno:** monitora, analisa desvios, propõe melhorias e preserva a integridade do fluxo.
- **Agentes:** realizam as atividades conforme definido.
- **Áreas de Apoio:** dão suporte técnico, jurídico, financeiro ou sistêmico.

## 4. Indicadores e SLAs
Todos os processos devem ter indicadores de desempenho (KPIs) e SLAs definidos, considerando tempo de resposta, qualidade da entrega, satisfação do cliente e evidências.

## 5. Processos do CRC
- **Reclamações internas:** acolher, analisar, tratar e encerrar, com triagem, classificação, investigação, resposta ao reclamante, aprendizado organizacional e registro com possível replicação.
- **Reclamações externas (Reclame Aqui e Google Meu Negócio):** foco em tempo de resposta, linguagem adequada, solução efetiva e preservação da reputação da marca.
- **Contestação de compra:** análise de contestações financeiras, validação documental, integração com a área financeira e comunicação transparente com o cliente.
- **Ciclos de Facilitador Interno (FI):** distribuição equilibrada de responsabilidades ao longo do tempo, com continuidade operacional, desenvolvimento das pessoas e resiliência do time.

## 6. Gestão de riscos, controles e conhecimento
Os processos devem prever pontos de controle e mitigação de riscos operacionais, financeiros, reputacionais e legais, ser revisados periodicamente com o intuito de se igualarem ou serem referência de mercado, e ser catalogados, instrumentados, replicáveis, de fácil acesso e de domínio padrão.`,
    criterio_qualidade: `## Regra institucional de responsabilidade (RACI)
- **Aprovador único:** cada processo tem apenas 1 "A".
- **Conflito de decisão:** escalonar para o Gestor CRC.
- **Ausência de "A":** reportar à Diretoria.

## Papéis da matriz RACI
- **R — Responsável:** executa a atividade.
- **A — Aprovador:** responde pelo resultado e pelas decisões.
- **C — Consultado:** dá suporte técnico ou validação.
- **I — Informado:** recebe comunicação sobre o andamento.`,
    outras_informacoes: `## Vigência e alterações
Este manual entra em vigor em 13 de março de 2026 e é a referência para a consolidação das práticas operacionais e para a cultura de melhoria contínua. As disposições refletem o estágio atual de maturidade dos processos e podem ser revisadas de forma progressiva, conforme a evolução da estrutura, dos modelos de trabalho e das necessidades do negócio.

Qualquer alteração deve ser formalmente documentada, versionada e submetida à validação e aprovação da governança. As mudanças ficam registradas no Portal CRC.

## Uso do manual
Base para treinamentos, auditorias internas, avaliações de desempenho operacional e iniciativas de melhoria contínua. O cumprimento das diretrizes é responsabilidade de todos os colaboradores, gestores e áreas envolvidas.

Este manual não substitui políticas corporativas, decisões estratégicas, políticas de produto, segurança da informação, compliance, jurídico, pricing ou infraestrutura técnica, que são responsabilidade das áreas competentes.

## Considerações finais
O manual consolida o compromisso com a padronização operacional, a clareza de responsabilidades, a governança de processos e a excelência na experiência do cliente. É um instrumento vivo: à medida que a organização amadurece, ajustes podem ser feitos para manter a aderência às melhores práticas. Excelência operacional é a soma de processos claros, comunicação transparente, aprendizado contínuo e colaboração entre áreas. O CRC é o agente de conexão entre cliente e organização, transformando interações em conhecimento, problemas em melhorias e experiências em oportunidades de evolução.`,
    raci: [],
  },

  // ---------------------------------------------------------------- Tratativas
  {
    codigo: 'POP 01',
    titulo: 'Reclamação Interna — Avaliação de Conduta (AC)',
    categoria: 'Tratativas',
    ordem: 1,
    tipos_tratativa: ['reclamacao_interna'],
    objetivo: 'Tratar falhas de conduta, postura inadequada, informação incorreta ou atritos na jornada de atendimento.',
    ferramentas: FERRAMENTAS_PADRAO,
    prazos: [
      { rotulo: 'Prioridade alta', valor: '48h' },
      { rotulo: 'Prioridade média/baixa', valor: '72h' },
      { rotulo: 'Macro de abertura', valor: 'Reclamação Interna – AC' },
      { rotulo: 'Macro de retorno', valor: 'Retorno RI-AC' },
    ],
    fluxo_operacional: `1. O cliente manifesta insatisfação por qualquer canal de contato ou durante o contato.
2. O agente registra o ticket no Zendesk com a macro "Reclamação Interna – AC".
3. O agente registra a situação no Portal CRC.
4. O agente faz a análise inicial do relato.
5. O agente coleta e organiza as evidências no Google Drive (prints, áudios, vídeos etc.).
6. Classificação de prioridade: **alta 48h | média/baixa 72h**.
7. Verificação de indício de conduta inadequada.
8. Se houver conduta inadequada, encaminhar ao supervisor CRC para os devidos fins internos. Se não houver, seguir para o passo 11.
9. Ticket concluído com análise, ciência da área e registro interno.
10. Retorno ao agente.
11. Resposta padrão empática ao cliente — macro "Retorno RI-AC".
12. Encerramento no Zendesk.
13. Encerramento no Portal CRC, para a pontuação.`,
    criterio_qualidade: `- Evidências organizadas no Google Drive antes da resposta.
- Prazo da prioridade respeitado (48h ou 72h).
- Encerramento nos dois sistemas: Zendesk e Portal CRC.`,
    outras_informacoes: '',
    raci: [
      { atividade: 'Registro do ticket', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'FI', informado: 'Gestão' },
      { atividade: 'Análise inicial', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'Área Técnica', informado: 'Gestão' },
      { atividade: 'Coleta de evidências', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'FI', informado: 'Gestão' },
      { atividade: 'Encaminhamento interno', responsavel: 'Supervisor CRC', aprovador: 'Gestor CRC', consultado: 'Área Técnica', informado: 'Gestão' },
      { atividade: 'Resposta ao cliente', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'Gestão', informado: 'Gestão' },
      { atividade: 'Encerramento da tratativa', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'FI', informado: 'Gestão' },
    ],
  },
  {
    codigo: 'POP 02',
    titulo: 'Reclamação Interna — Sugestão de Melhoria (SM)',
    categoria: 'Tratativas',
    ordem: 2,
    tipos_tratativa: ['reclamacao_interna'],
    objetivo: 'Tratar de forma estruturada as sugestões de melhoria relacionadas a produto, sistema ou integrações, sem gerar expectativa de implementação.',
    ferramentas: FERRAMENTAS_PADRAO,
    prazos: [
      { rotulo: 'Prioridade alta', valor: '48h' },
      { rotulo: 'Prioridade média/baixa', valor: '72h' },
      { rotulo: 'Validação do supervisor', valor: 'SLA 24h' },
      { rotulo: 'Macro de retorno', valor: 'Retorno RI-SM' },
    ],
    fluxo_operacional: `1. O cliente apresenta a sugestão por qualquer canal ou durante o contato.
2. O agente registra o ticket no Zendesk com a macro "Reclamação Interna – SM".
3. O agente registra a situação no Portal CRC.
4. Classificação de prioridade: **alta 48h | média/baixa 72h**.
5. O agente faz a análise completa da sugestão: regras de negócio, impacto, viabilidade conceitual e direcionamento do sistema.
6. O agente define um parecer preliminar. Se a implementação não for viável, seguir para o passo 8.
7. Encaminhamento ao supervisor para validação da sugestão (**SLA 24h**).
8. O agente registra a conclusão.
9. Resposta padrão empática ao cliente — macro "Retorno RI-SM".
10. Encerramento no Zendesk.
11. Encerramento no Portal CRC, para a pontuação.`,
    criterio_qualidade: `- Nenhuma expectativa de implementação é criada para o cliente.
- Parecer registrado antes da resposta.
- Encerramento nos dois sistemas: Zendesk e Portal CRC.`,
    outras_informacoes: '',
    raci: [
      { atividade: 'Registro do ticket', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'FI', informado: 'Gestão' },
      { atividade: 'Análise inicial', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'Área Técnica', informado: 'Gestão' },
      { atividade: 'Encaminhamento interno', responsavel: 'Supervisor CRC', aprovador: 'Gestor CRC', consultado: 'Área Técnica', informado: 'Gestão' },
      { atividade: 'Resposta ao cliente', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'Gestão', informado: 'Gestão' },
      { atividade: 'Encerramento da tratativa', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'FI', informado: 'Gestão' },
    ],
  },
  {
    codigo: 'POP 03',
    titulo: 'Reclamação Interna — Intercorrência de Produto (IP)',
    categoria: 'Tratativas',
    ordem: 3,
    tipos_tratativa: ['reclamacao_interna'],
    objetivo: 'Tratar intercorrências técnicas — bugs, falhas sistêmicas, indisponibilidade de serviço e tickets sem resposta — com acompanhamento contínuo e comunicação clara com o cliente.',
    ferramentas: FERRAMENTAS_PADRAO,
    prazos: [
      { rotulo: 'Acompanhamento com o time técnico', valor: 'SLA 36h' },
      { rotulo: 'Macro de abertura', valor: 'Reclamação Interna – IP' },
      { rotulo: 'Macro de retorno', valor: 'Retorno RI-IP' },
    ],
    fluxo_operacional: `1. O cliente relata a intercorrência por qualquer canal ou durante o contato.
2. O agente registra o ticket no Zendesk com a macro "Reclamação Interna – IP".
3. O agente registra a situação no Portal CRC.
4. O agente valida o contexto, coleta evidências e mensura o impacto. Se necessário, encaminha, vincula e reporta a situação ao time técnico, N2 ou desenvolvimento.
5. Durante a tratativa, o agente acompanha continuamente o time técnico, registrando situações e atualizações conforme o **SLA de 36 horas**, e mantém comunicação recorrente com o cliente pelo canal escolhido, com foco em conexão e posicionamento.
6. Após a validação da resolução, aplicar a macro "Retorno RI-IP".
7. Encerramento no Zendesk.
8. Encerramento no Portal CRC, para a pontuação.`,
    criterio_qualidade: `- Atualização do acompanhamento técnico dentro de 36h.
- Cliente posicionado ao longo da tratativa, não só no fim.
- Encerramento nos dois sistemas: Zendesk e Portal CRC.`,
    outras_informacoes: '',
    raci: [
      { atividade: 'Registro do ticket', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'FI', informado: 'Gestão' },
      { atividade: 'Análise inicial', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'Área Técnica', informado: 'Gestão' },
      { atividade: 'Coleta de evidências', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'FI', informado: 'Gestão' },
      { atividade: 'Encaminhamento interno', responsavel: 'Supervisor CRC', aprovador: 'Gestor CRC', consultado: 'Área Técnica', informado: 'Gestão' },
      { atividade: 'Resposta ao cliente', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'Gestão', informado: 'Gestão' },
      { atividade: 'Encerramento da tratativa', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'FI', informado: 'Gestão' },
    ],
  },
  {
    codigo: 'POP 04',
    titulo: 'Reclame Aqui (R.A.)',
    categoria: 'Tratativas',
    ordem: 4,
    tipos_tratativa: ['reclame_aqui'],
    objetivo: 'Diferente das tratativas internas, o Reclame Aqui é prioritário. Este POP define, de forma padronizada e sequencial, todas as ações obrigatórias da tratativa, garantindo velocidade, contato humano contínuo, controle por SLA e eliminação de erro operacional. Aplica-se aos agentes CRC responsáveis pelo Reclame Aqui, supervisores, N2, times de programação e gestores que acompanham a operação pelo Zendesk e pelo Portal CRC.',
    ferramentas: FERRAMENTAS_PADRAO,
    prazos: [
      { rotulo: '1º contato com o cliente', valor: 'até 1h' },
      { rotulo: 'Ligações (55PBX)', valor: '3 tentativas: até 20, 40 e 60 min' },
      { rotulo: 'Resumo ao gestor', valor: '11h e 16h' },
      { rotulo: 'Pendente (cobrar o cliente)', valor: 'a cada 32h' },
      { rotulo: 'Em espera (cobrar N2/Programação)', valor: 'até 72h' },
      { rotulo: 'Sem retorno do cliente', valor: 'novo e-mail em 24h; encerrar às 17h após mais 24h' },
    ],
    fluxo_operacional: `## Princípio de prioridade
Reclame Aqui é **prioridade total**. Quem receber um ticket deste canal deve interromper outras atividades até garantir o primeiro contato com o cliente em até 1 hora, registrando o contato no ticket do Zendesk e a situação no Portal CRC.

${ESTADOS_ZENDESK}

## Estado aberto — passo a passo
1. **Recebimento:** ao receber o ticket, iniciar a tratativa imediatamente.
2. **Início de contato:** o contato com o cliente deve ocorrer em até **1 hora**.
3. **Ligações:** 3 tentativas pelo 55PBX — 1ª até 20 min, 2ª até 40 min, 3ª até 60 min.
4. **Contatos alternativos:** sem sucesso por telefone, WhatsApp imediato; aguardar 1 hora; e-mail formal (macro de resposta pública "Tentativa de contato - Email").
5. **Registros:** todas as ações no Zendesk, integralmente; no Portal CRC, os campos pertinentes e para a pontuação. Informar ao gestor o resumo da situação às **11h** e às **16h**, sempre atualizando a tratativa.

## Estado pendente
Quando falta algo a ser entregue pelo cliente: cobrança obrigatória **a cada 32 horas**, com todas as tentativas registradas no Zendesk.

## Estado em espera
Cobrança interna obrigatória **em até 72 horas** junto a N2 ou Programação, com registro e comunicação ao cliente sobre o andamento.

## Encerramento
O ticket é encerrado após o posicionamento final ao cliente e a avaliação dele na plataforma R.A.; conferir os registros no ticket antes de encerrar. Na resposta pública do Zendesk, aplicar a macro "Finalização R.A Público". Encerrar também no Portal CRC, para a pontuação.

## Sem retorno do cliente
Se todas as tentativas previstas foram feitas sem retorno, enviar novo e-mail de cobrança **24 horas** após o início da tratativa. Sem resposta nas 24 horas seguintes, encerrar o ticket **às 17h**, com registro no Zendesk e encerramento no Portal CRC. Na mesma data, encerrar a reclamação na plataforma Reclame Aqui.`,
    criterio_qualidade: `## Padrões e diretrizes
Não existe um padrão único: às vezes uma solução anterior se aplica, mas cada caso tem particularidades e exige análise individual e abordagem personalizada.

Principais reclamações hoje:
- cancelamento de serviços;
- falta de atendimento;
- insatisfação pela ausência de novas funcionalidades ou melhorias no sistema.

**Cinco princípios fundamentais:** rapport, comunicação assertiva, posicionamento claro, atualização situacional privada e criação de plano de ação para a resolução. Eles garantem que o cliente se sinta acolhido, ouvido e compreendido — e aumentam a chance de sucesso e de boa avaliação.

**Meta de avaliação:** o R.A. usa escala de 0 a 10 e a pergunta "Voltaria a fazer negócio?". O objetivo é nota **10** e "Voltaria a fazer negócio" marcado como **sim**.

Para ter sucesso, o agente deve compreender toda a jornada do cliente, fazer uma análise crítica do caso e propor um plano de ação para validação interna da solução. Exemplo de referência: ticket Zendesk #883538.`,
    outras_informacoes: `${MODO_ATUACAO_EXTERNO('Reclame Aqui', 'Finalização R.A Público')}

${INATIVADOS_CICLO_3}`,
    raci: [
      { atividade: 'Recebimento e priorização', responsavel: 'Supervisor CRC', aprovador: 'Gestor CRC', consultado: 'FI', informado: 'Diretoria' },
      { atividade: 'Contato inicial com o cliente', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'Gestão', informado: 'Diretoria' },
      { atividade: 'Tratativa técnica', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'Área técnica', informado: 'Diretoria' },
      { atividade: 'Comunicação pública', responsavel: 'Agente CRC', aprovador: 'Gestor CRC', consultado: 'Gestão', informado: 'Diretoria' },
      { atividade: 'Encerramento', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'Gestão', informado: 'Diretoria' },
    ],
  },
  {
    codigo: 'POP 05',
    titulo: 'Google Meu Negócio (GMN)',
    categoria: 'Tratativas',
    ordem: 5,
    tipos_tratativa: ['google_meu_negocio'],
    objetivo: 'Definir, de forma padronizada e sequencial, todas as ações obrigatórias para tratar reclamações e avaliações no Google Meu Negócio (Google Business Profile), garantindo agilidade na resposta, contato humano contínuo, controle por SLA e redução de erro operacional. Aplica-se aos agentes CRC responsáveis pelo GMN, supervisores, N2, times de programação e gestores que acompanham a operação pelo Zendesk, pelo Portal CRC e pelas ferramentas de reputação digital.',
    ferramentas: 'Zendesk, Portal CRC, HubSpot, Google Business Profile, WhatsApp, Telefone, Google Drive e demais ferramentas internas de monitoramento.',
    prazos: [
      { rotulo: '1º posicionamento', valor: 'até 1h' },
      { rotulo: 'Ligações (55PBX)', valor: '3 tentativas: até 20, 40 e 60 min' },
      { rotulo: 'Resumo ao gestor', valor: '11h e 16h' },
      { rotulo: 'Pendente (cobrar o cliente)', valor: 'a cada 14h' },
      { rotulo: 'Em espera (cobrar N2/Programação)', valor: 'até 72h' },
      { rotulo: 'Sem retorno do cliente', valor: 'novo e-mail em 24h; encerrar às 17h após mais 24h' },
    ],
    fluxo_operacional: `## Princípio de prioridade
Avaliações e reclamações no GMN são **prioridade crítica**, porque afetam diretamente a reputação pública da marca. Quem receber um ticket deste canal deve interromper outras atividades até garantir o primeiro posicionamento ao cliente em até 1 hora, registrando o contato no ticket do Zendesk e a situação no Portal CRC.

${ESTADOS_ZENDESK}

## Estado aberto — passo a passo
1. **Recebimento:** ao receber o ticket, iniciar a tratativa imediatamente.
2. **Início de contato:** o contato com o cliente deve ocorrer em até **1 hora**.
3. **Ligações:** 3 tentativas pelo 55PBX — 1ª até 20 min, 2ª até 40 min, 3ª até 60 min.
4. **Contatos alternativos:** sem sucesso por telefone, WhatsApp imediato; aguardar 1 hora; e-mail formal. As macros de WhatsApp e e-mail estão no Portal CRC; a de e-mail, em resposta pública no ticket, é "RETORNO E-MAIL GMN".
5. **Registros:** todas as ações no Zendesk, integralmente; no Portal CRC, os campos pertinentes e para a pontuação. Informar ao gestor o resumo da situação às **11h** e às **16h**, sempre atualizando a tratativa.
6. **Sem retorno do cliente:** se todas as tentativas foram feitas, enviar novo e-mail de cobrança **24 horas** após o início. Sem resposta nas 24 horas seguintes, encerrar o ticket **às 17h**, com registro no Zendesk e no Portal CRC, e encerrar a reclamação no Google Meu Negócio na mesma data.

## Estado pendente
Quando falta algo a ser entregue pelo cliente: cobrança obrigatória **a cada 14 horas**, com todas as tentativas registradas no Zendesk.

## Estado em espera
Cobrança interna obrigatória **em até 72 horas** junto a N2 ou Programação, com registro e comunicação ao cliente sobre o andamento.

## Encerramento
O ticket é encerrado após o posicionamento final ao cliente, com a reavaliação dele na plataforma ou a exclusão da reclamação; conferir os registros antes de encerrar. Na resposta pública do Zendesk, aplicar a macro "Finalização GMN Público". Encerrar também no Portal CRC, para a pontuação.`,
    criterio_qualidade: `- Primeiro posicionamento em até 1h.
- Cobrança do cliente pendente a cada 14h, registrada no Zendesk.
- Encerramento nos dois sistemas, com a macro oficial.`,
    outras_informacoes: `${MODO_ATUACAO_EXTERNO('GMN', 'Finalização GMN Público')}

${INATIVADOS_CICLO_3}`,
    raci: [
      { atividade: 'Monitoramento de avaliações', responsavel: 'Supervisor CRC', aprovador: 'Supervisor CRC', consultado: 'Diretoria', informado: 'Diretoria' },
      { atividade: 'Contato com o cliente', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'Diretoria', informado: 'Diretoria' },
      { atividade: 'Solicitação de reavaliação ou exclusão', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'Diretoria', informado: 'Diretoria' },
      { atividade: 'Encerramento', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'Diretoria', informado: 'Diretoria' },
    ],
  },
  {
    codigo: 'POP 06',
    titulo: 'Contestação de Compra (chargeback)',
    categoria: 'Tratativas',
    ordem: 6,
    tipos_tratativa: ['contestacao'],
    objetivo: 'Padronizar a atuação do CRC nas contestações de compra, garantindo contato tempestivo com o cliente, registro das ações e entrega da defesa ao Administrativo/Financeiro no prazo informado. Aplica-se exclusivamente ao contato com o cliente, ao registro das tentativas, ao bloqueio de base quando aplicável e à consolidação de evidências para a defesa. Não contempla decisões financeiras nem o envio de documentação ao banco.',
    ferramentas: 'Zendesk, Portal CRC, 55PBX, HubSpot, WhatsApp, Telefone, Google Drive e demais ferramentas internas de monitoramento.',
    prazos: [
      { rotulo: 'Entrega da defesa', valor: '1 dia útil antes do prazo do banco' },
      { rotulo: 'Prazo regular', valor: '7 dias ou mais' },
      { rotulo: 'Prazo curto', valor: '4 a 6 dias' },
      { rotulo: 'Prazo crítico', valor: '3 dias ou menos' },
      { rotulo: 'Tentativas no 1º dia', valor: 'até 6 (3 ligações, ≥1 WhatsApp, ≥1 e-mail)' },
      { rotulo: 'Retorno do banco', valor: '3 a 15 dias' },
    ],
    fluxo_operacional: `## Princípio de prioridade
A contestação de compra tem **prioridade operacional máxima**, como o Reclame Aqui e o Google Meu Negócio. O prazo final é definido pelo banco emissor e repassado pelo Administrativo/Financeiro, e deve ser seguido rigorosamente. A solução e as evidências devem ser entregues com antecedência mínima de **1 (um) dia útil** em relação ao prazo final, considerando feriados, sábados e domingos.

${ESTADOS_ZENDESK}

## Passo a passo
1. **Recebimento:** ao receber a notificação do Administrativo/Financeiro, iniciar a tratativa imediatamente, considerando o prazo final da instituição financeira.
2. **Registro inicial:** registrar a contestação imediatamente na planilha de controle de chargebacks e no Portal CRC, preenchendo os campos indicados.
3. **Classificação do prazo:** regular (7 dias ou mais), curto (4 a 6 dias) ou crítico (3 dias ou menos).
4. **Início de contato:** no mesmo dia do recebimento, até **seis tentativas** ao longo do dia: ligação (até três), WhatsApp (mínimo uma) e e-mail (mínimo uma).
5. **Registro das tentativas:** no Zendesk e no Portal CRC, com data, horário, canal, resultado e evidência de cada contato.
6. **Orientação ao cliente:** se o cliente responder, explicar a situação, apresentar apenas as opções previamente autorizadas pelo Administrativo/Financeiro, registrar a decisão dele e comunicar o Administrativo/Financeiro imediatamente. Negociações são possíveis, desde que evidenciadas e informadas ao supervisor para análise.
7. **Sem retorno do cliente:** enviar aviso final informando que, sem retorno até o fim do dia, a base poderá ser bloqueada por risco financeiro. Se o prazo permitir, manter a base ativa e retomar as tentativas no próximo dia útil; se não permitir, bloquear a base no mesmo dia, conforme orientação do Administrativo/Financeiro.
8. **Consolidação da defesa:** criar no Google Drive uma pasta com o número do case e link de acesso compartilhado, com todas as evidências — histórico de tentativas, dados da compra, logs, nota fiscal, comunicações e documentos pertinentes.
9. **Entrega:** anexar o link da pasta ao ticket da contestação com antecedência mínima de **1 dia útil** do prazo do banco (considerando feriados, sábados e domingos) e formalizar a entrega por ticket direcionado ao supervisor CRC.
10. **Acompanhamento:** atualizar a planilha de controle e o Portal CRC. O retorno do banco pode levar de 3 a 15 dias.
11. **Encerramento:** com o parecer final, registrar o resultado no Zendesk e no Portal CRC e encerrar a atuação do CRC no caso.`,
    criterio_qualidade: `- Tentativas iniciadas no mesmo dia do recebimento.
- Cada tentativa registrada com data, horário, canal, resultado e evidência.
- Defesa entregue com 1 dia útil de antecedência.`,
    outras_informacoes: '',
    raci: [
      { atividade: 'Registro da contestação', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'Supervisor CRC', informado: 'Financeiro' },
      { atividade: 'Contato com o cliente', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'Supervisor CRC', informado: 'Gestão' },
      { atividade: 'Consolidação de evidências', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'Supervisor CRC', informado: 'Gestão' },
      { atividade: 'Entrega da defesa ao Financeiro', responsavel: 'Supervisor CRC', aprovador: 'Financeiro', consultado: 'Supervisor CRC', informado: 'Financeiro' },
      { atividade: 'Encerramento CRC', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'Supervisor CRC', informado: 'Diretoria' },
    ],
  },
  {
    codigo: 'POP 07',
    titulo: 'PROCON',
    categoria: 'Tratativas',
    ordem: 7,
    tipos_tratativa: ['procon'],
    objetivo: 'As demandas do PROCON têm caráter prioritário e são conduzidas acima do fluxo padrão, pelo potencial impacto jurídico e institucional. Este POP estabelece as etapas obrigatórias da tratativa, garantindo consistência, cumprimento rigoroso de prazos, comunicação contínua e humanizada com o cliente, controle por SLA e mitigação de falhas. Aplica-se aos agentes CRC responsáveis pelo PROCON, supervisores, N2, times de programação e gestores.',
    ferramentas: FERRAMENTAS_PADRAO,
    prazos: [
      { rotulo: '1º contato com o cliente', valor: 'até 1h' },
      { rotulo: 'Ligações (55PBX)', valor: '3 tentativas: até 20, 40 e 60 min' },
      { rotulo: 'Resumo ao gestor', valor: '11h e 16h' },
      { rotulo: 'Pendente (cobrar o cliente)', valor: 'a cada 32h' },
      { rotulo: 'Em espera (cobrar internamente)', valor: 'até 8h' },
    ],
    fluxo_operacional: `## Princípio de prioridade
PROCON é **prioridade total**. Quem receber um ticket deste canal deve interromper outras atividades até garantir o primeiro contato com o cliente em até 1 hora, registrando o contato no Zendesk e a situação no Portal CRC.

${ESTADOS_ZENDESK}

## Passo a passo
1. Recebimento da manifestação PROCON pelo Zendesk.
2. O supervisor CRC registra o ticket no Zendesk com a macro "Abertura Procon".
3. O supervisor envia o ticket ao agente responsável.
4. O agente faz a análise inicial do relato.
5. O agente cria a tratativa no Portal CRC.
6. O agente coleta e organiza as evidências no Google Drive (prints, áudios, vídeos etc.).
7. O agente estrutura o plano de ação, registrado de forma privada no ticket, e envia ao supervisor CRC.
8. O supervisor valida o plano de ação e encaminha à gestão.
9. O supervisor devolve o ticket ao agente para a resolução final.
10. O agente faz o contato, posiciona o cliente, registra no ticket e encaminha ao supervisor para o encerramento na interface do PROCON.
11. O supervisor envia ao agente o print da tratativa encerrada, para a finalização privada do ticket.
12. Encerramento no Zendesk.
13. Encerramento no Portal CRC.

## Modo de atuação
- **Início de contato:** em até **1 hora**.
- **Ligações:** 3 tentativas pelo 55PBX — até 20, 40 e 60 min.
- **Contatos alternativos:** WhatsApp imediato; aguardar 1 hora; e-mail formal (macro "Tentativa de contato - Email").
- **Registros:** tudo no Zendesk; no Portal CRC, os campos pertinentes. Resumo ao gestor às **11h** e às **16h**.

## Estado pendente
Cobrança obrigatória ao cliente **a cada 32 horas**, registrada no Zendesk.

## Estado em espera
Cobrança interna obrigatória **em até 8 horas** junto a N2, Supervisão, Gestão ou Programação, com registro e comunicação ao cliente.

## Encerramento
O ticket é encerrado após o posicionamento final ao cliente na plataforma PROCON SP pelo supervisor CRC, com o print do encerramento e a descrição do contato feita pelo agente.`,
    criterio_qualidade: `## Padrões e diretrizes
Conduzir com postura ética, maturidade profissional e alto nível de responsabilidade, com escuta ativa, empatia e clareza. Como há possível desdobramento jurídico, a comunicação deve ser precisa, coerente e fundamentada, evitando interpretações ambíguas ou posicionamentos que fragilizem a empresa — equilíbrio entre acolhimento ao cliente e segurança na defesa técnica.

**Princípios:** rapport, comunicação assertiva, posicionamento claro, atualização situacional privada, plano de ação para a resolução, empatia e escuta ativa. O agente deve compreender toda a jornada do cliente, fazer uma análise crítica e propor um plano de ação para validação interna.`,
    outras_informacoes: '',
    raci: [
      { atividade: 'Recebimento e priorização', responsavel: 'Supervisor CRC', aprovador: 'Supervisor CRC', consultado: 'Gestão', informado: 'Diretoria' },
      { atividade: 'Contato inicial com o cliente', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'Gestão', informado: 'Diretoria' },
      { atividade: 'Tratativa técnica', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'Área técnica', informado: 'Diretoria' },
      { atividade: 'Comunicação pública', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'Gestão', informado: 'Diretoria' },
      { atividade: 'Encerramento', responsavel: 'Supervisor CRC', aprovador: 'Supervisor CRC', consultado: 'Gestão', informado: 'Diretoria' },
    ],
  },
  {
    codigo: 'POP 08',
    titulo: 'Gestão de Incidentes Críticos (Major Incident)',
    categoria: 'Tratativas',
    ordem: 8,
    tipos_tratativa: [],
    objetivo: 'Definir, de forma padronizada e sequencial, a identificação, comunicação, tratamento, escalonamento e encerramento de incidentes críticos que impactem significativamente a operação, a experiência do cliente, a reputação da marca ou o risco financeiro e legal — com resposta rápida, comunicação estruturada, mitigação de impactos e aprendizado organizacional. Aplica-se ao CRC, à supervisão CRC e ao Facilitador Interno (FI).',
    ferramentas: FERRAMENTAS_PADRAO,
    prazos: [
      { rotulo: 'Prioridade', valor: 'acima de qualquer atividade de rotina' },
      { rotulo: 'Comunicação à equipe', valor: 'imediata, pelo supervisor CRC' },
    ],
    fluxo_operacional: `## O que é um incidente crítico
Qualquer evento que afete grande volume de clientes, gere risco financeiro relevante, impacte a reputação pública da marca, cause indisponibilidade sistêmica ou envolva risco legal ou de dados.

## Tipos
- **Tecnológico:** sistema fora do ar, falhas sistêmicas recorrentes, bugs críticos em produção.
- **Reputacional:** Reclame Aqui viral, avaliações negativas em massa no Google Meu Negócio, exposição pública em redes sociais.
- **Financeiro:** chargeback em massa, erros de cobrança sistêmicos, fraudes detectadas.
- **Legal e segurança:** vazamento de dados, incidentes de LGPD, acesso indevido a informações sensíveis.

## Princípio de prioridade
Incidentes críticos se sobrepõem a qualquer atividade de rotina. Quem identificar um incidente crítico deve interromper as atividades normais e acionar o fluxo de crise imediatamente.

## Fluxo
1. **Identificação:** por volume atípico de tickets, monitoramento sistêmico, Reclame Aqui, Google Meu Negócio, comunicação interna ou áreas técnicas e financeiras.
2. **Comunicação inicial:** o supervisor CRC notifica a equipe imediatamente e cria as contramedidas para a situação.
3. **Acompanhamento interno:** o supervisor acompanha o status técnico, o risco financeiro, o volume de tickets e a comunicação pública; o FI consolida registros, impactos e evidências.`,
    criterio_qualidade: '',
    outras_informacoes: `## Limitação de responsabilidade do CRC
O CRC atua como executor operacional e interface com o cliente. Não tem autoridade decisória sobre infraestrutura técnica, produto, pricing, jurídico ou políticas financeiras — atribuições das áreas responsáveis.`,
    raci: [
      { atividade: 'Identificação do incidente', responsavel: 'Agente CRC', aprovador: 'Supervisor CRC', consultado: 'N2', informado: 'Diretoria' },
      { atividade: 'Comunicação interna', responsavel: 'Supervisor CRC', aprovador: 'Supervisor CRC', consultado: 'Marketing', informado: 'Diretoria' },
      { atividade: 'Comunicação externa ao cliente', responsavel: 'CRC', aprovador: 'Supervisor CRC', consultado: 'Marketing', informado: 'Diretoria' },
      { atividade: 'Comitê de incidente', responsavel: 'Gestor CRC', aprovador: 'Diretoria', consultado: 'Tecnologia', informado: 'Diretoria' },
      { atividade: 'Relatório post-mortem', responsavel: 'FI', aprovador: 'Diretoria', consultado: 'Supervisor CRC', informado: 'Diretoria' },
    ],
  },
  {
    codigo: 'POP 09',
    titulo: 'Macros',
    categoria: 'Tratativas',
    ordem: 9,
    tipos_tratativa: [],
    objetivo: 'As macros tornam o atendimento mais ágil, padronizado e eficiente, garantindo clareza na comunicação e reduzindo retrabalho.',
    ferramentas: 'Zendesk.',
    prazos: [],
    fluxo_operacional: `## Macros de abertura
Usadas para abrir processos:
- Reclamação Interna – AC
- Reclamação Interna – SM
- Reclamação Interna – IP
- Google Meu Negócio – Abertura de reclamação
- Reclame Aqui 2026

## Macros de finalização
Usadas no encerramento de tratativas ou em pedidos de contato com o cliente (resposta pública):
- Retorno RI-AC
- Retorno RI-SM
- Retorno RI-IP`,
    criterio_qualidade: 'O uso das macros aprovadas é obrigatório. É proibido criar respostas padrão paralelas ou modelos não homologados; ajustes personalizados são permitidos apenas sem descaracterizar a macro oficial.',
    outras_informacoes: '',
    raci: [],
  },

  // ---------------------------------------------------------- Pessoas e rotina
  {
    codigo: 'POP 10',
    titulo: 'Facilitador Interno (FI)',
    categoria: 'Pessoas e rotina',
    ordem: 10,
    tipos_tratativa: [],
    objetivo: 'Padronizar a atuação do Facilitador Interno na consolidação, análise e validação de padrões recorrentes vindos de reclamações internas, Reclame Aqui, Google Meu Negócio, contestações de compra e outros fatores internos, gerando insumos para a melhoria de processos — sem caráter hierárquico, operacional ou decisório. Aplica-se exclusivamente à análise sistêmica, à validação técnica e ao registro de aprendizados sobre casos já tratados ou encerrados.',
    ferramentas: FERRAMENTAS_PADRAO,
    prazos: [
      { rotulo: 'Rodízio', valor: 'bimestral, do dia 16 ao dia 15' },
      { rotulo: 'Exceção anual', valor: '16/11 a 31/12' },
      { rotulo: 'Síntese para a gestão', valor: 'toda sexta-feira, 10 min' },
    ],
    fluxo_operacional: `## Responsabilidades
- Consolidar semanalmente as ocorrências tratadas.
- Identificar padrões e recorrências.
- Validar causas com líderes técnicos e supervisores.
- Registrar aprendizados sistêmicos.
- Compartilhar a síntese com a gestão.
- Acompanhar internamente os registros nos tickets.
- Apurar casos de crise nos setores próximos, de modo a resguardar a área.

## Passo a passo
1. **Consolidar as ocorrências da semana:** reclamações internas encerradas, Reclame Aqui tratados e contestações concluídas — apenas casos finalizados ou estabilizados. Acompanhar os registros nos tickets, orientando os agentes sobre o preenchimento correto. Validar e acompanhar as notas de R.A. e GMN.
2. **Classificar as ocorrências** por tipo de falha, etapa do fluxo, área envolvida e grau de recorrência.
3. **Avaliar se há padrão:** sem padrão recorrente, registrar como ocorrência pontual e encerrar a análise da semana; com padrão, seguir para a validação.
4. **Validar com líderes técnicos e supervisores** as causas prováveis, a coerência, os controles existentes e o risco de reincidência — sem atribuir responsabilidade individual.
5. **Registrar o aprendizado sistêmico:** padrões, causas prováveis, impactos potenciais e aprendizados, para subsidiar decisões da gestão. Propor solução não é obrigatório nesta etapa.
6. **Compartilhar a síntese com a gestão** em reunião de 10 minutos toda sexta-feira: principais padrões, riscos sistêmicos, aprendizados e oportunidades de mecanismos de defesa para a área.

## Encerramento do ciclo
Ao fim do período, registrar os aprendizados-chave, os alertas sistêmicos e as informações necessárias para a continuidade do próximo ciclo.`,
    criterio_qualidade: `## Regime de rodízio
- Rodízio bimestral (dia 16 ao dia 15).
- Exceção anual: 16/11 a 31/12.
- Não é permitida repetição consecutiva.
- Definição por sorteio controlado ou rotação definida.
- Registro obrigatório no sistema.
- Papel integrado ao Plano de Desenvolvimento Individual (PDI).`,
    outras_informacoes: `## Propósito do FI
O papel de Facilitador Interno tem caráter formativo, preventivo e de desenvolvimento profissional, vinculado ao PDI. Não é cargo, função formal ou posição hierárquica, não substitui a liderança e não gera metas individuais.`,
    raci: [
      { atividade: 'Consolidação de ocorrências', responsavel: 'FI', aprovador: 'Supervisor CRC', consultado: 'Supervisor CRC', informado: 'Gestão' },
      { atividade: 'Identificação de padrões', responsavel: 'FI', aprovador: 'Supervisor CRC', consultado: 'Supervisor CRC', informado: 'Gestão' },
      { atividade: 'Registro de aprendizados', responsavel: 'FI', aprovador: 'Supervisor CRC', consultado: 'Supervisor CRC', informado: 'Gestão' },
      { atividade: 'Síntese semanal para a gestão', responsavel: 'FI', aprovador: 'Supervisor CRC', consultado: 'Supervisor CRC', informado: 'Gestão' },
    ],
  },
  {
    codigo: 'POP 11',
    titulo: 'Regras da Premiação Trimestral',
    categoria: 'Pessoas e rotina',
    ordem: 11,
    tipos_tratativa: [],
    objetivo: 'Estabelecer os critérios oficiais de pontuação e as regras de elegibilidade da Premiação Trimestral CRC 2026, incentivando a qualidade da resolução, a consistência operacional, a excelência na experiência do cliente e a maturidade na gestão de tickets e tratativas. Este documento é a fonte oficial de consulta sobre pontuação e participação.',
    ferramentas: 'Portal CRC, Zendesk.',
    prazos: [
      { rotulo: 'Resultado do ciclo', valor: 'até o 10º dia após o fim do ciclo' },
      { rotulo: 'Reclamação interna', valor: 'até 2,5 pts' },
      { rotulo: 'Reclame Aqui', valor: 'até 3,5 pts' },
      { rotulo: 'Google Meu Negócio', valor: '1 a 2 pts' },
      { rotulo: 'Contestação de compra', valor: 'até 2,5 pts' },
      { rotulo: 'Mínimo por canal', valor: '4 registros no trimestre' },
    ],
    fluxo_operacional: `## Princípios gerais
A pontuação é individual e acumulada ao longo do ciclo. Ao fim do ciclo, a gestão tem **até o 10º dia** para consolidar, avaliar e divulgar o vencedor.

## Pontuação por tipo de tratativa
**Reclamações internas**
- Encerramento dentro do SLA: **1 ponto**.
- Sem reabertura: **+1 ponto** quando o mesmo cliente **não abre nenhuma nova tratativa** no Portal CRC, com qualquer agente, em até **7 dias corridos** contados do encerramento. Se ele abrir no 6º dia, o ponto não conta; passado o 7º dia sem nova abertura, o ponto conta. O Portal apura sozinho.
- Solução replicável, com causa raiz documentada no ticket: **+0,5 ponto**. A causa raiz deve estar claramente registrada para validação.
- Total possível por tratativa: **2,5 pontos**.

**Reclame Aqui** (pela nota final do consumidor)
- Notas 7 e 8: **0,5 ponto**. Nota 9: **1,5 ponto**. Nota 10: **2,5 pontos**.
- "Voltaria a fazer negócio" marcado: **+1 ponto** (só para notas acima de 8).
- Total possível: cerca de **3,5 pontos**.

**Google Meu Negócio**
- Reavaliação positiva de uma avaliação existente: **2 pontos**.
- Exclusão de uma avaliação negativa: **1 ponto**.

**Contestação de compra** (pelo desfecho)
- Cancelamento da contestação, pagamento integral ou acordo com custo reduzido: **2,5 pontos**.
- Total possível ao fim da tratativa: **2,5 pontos**.

## Indicadores de qualidade e performance
Apurados mensalmente e consolidados no fechamento do ciclo.
- **CSAT mensal:** 85% a 89% = **7 pts**; 90% a 94% = **9 pts**; 95% ou mais = **10 pts**.
- **Performance de atendimento:** atingir ou superar a meta trimestral = **10 pts**; pelo menos 95% da meta = **7 pts**; abaixo de 95% não pontua.
- **Avaliação de atendimento (quinzenal):** todas as avaliações do trimestre com nota 4,5 ou mais = **10 pts**; média entre 4,3 e 4,4 = **4 pts**; média 4,2 = **1 pt**; abaixo de 4,2 não pontua.

## Bônus de ritmo operacional — atualização de tickets
Todo ticket ativo deve ter comentário interno atualizado **a cada 36 horas úteis**, contendo obrigatoriamente: status atual da tratativa, próximo passo definido e dependência ou risco, quando houver. Comentários genéricos, sem avanço real, não contam. O FI pode apoiar o agente e lembrá-lo do comentário. A atualização acontece no Zendesk: a gestão confere o histórico dos tickets e lança o bônus no Portal.
- 95% ou mais dos tickets atualizados no prazo: **10 pts**.
- 90% a 94%: **7 pts**. 85% a 89%: **4 pts**. Abaixo de 85%: não pontua.

## Tratativas prolongadas
Tratativas que passam de um ciclo não prejudicam o agente. **Cada abertura de ticket no Portal CRC gera 0,5 ponto** para o agente responsável, no ciclo em que foi registrada (regra aplicada do Ciclo 2 em diante); a pontuação do encerramento vale no ciclo em que o caso é concluído, independentemente da data de início.`,
    criterio_qualidade: `## Regras gerais e auditoria
- A pontuação é individual e vale exclusivamente para o ciclo de apuração.
- A liderança pode fazer auditorias amostrais dos tickets para validar a qualidade das tratativas e dos comentários internos; o descumprimento dos critérios pode levar à perda parcial ou total dos pontos do item.
- Para garantir justiça, canais que não atingirem **4 registros no trimestre** não entram na validação da elegibilidade; é necessário que todos tenham 4 registros no canal para o julgamento da pontuação dele.`,
    outras_informacoes: `## Caráter da premiação
A premiação é discricionária: não integra a remuneração fixa, não gera direito adquirido e pode ser alterada ou suspensa a qualquer tempo.

${INATIVADOS_CICLO_3}`,
    raci: [
      { atividade: 'Apuração de pontos', responsavel: 'Supervisor CRC', aprovador: 'Gestão', consultado: 'Gestão', informado: 'Gestão' },
      { atividade: 'Auditoria amostral', responsavel: 'Supervisor CRC', aprovador: 'Gestão', consultado: 'Gestão', informado: 'Gestão' },
      { atividade: 'Divulgação do ranking', responsavel: 'Supervisor CRC', aprovador: 'Gestão', consultado: 'Gestão', informado: 'Gestão' },
      { atividade: 'Entrega da premiação', responsavel: 'Supervisor CRC', aprovador: 'Gestão', consultado: 'Gestão', informado: 'Gestão' },
    ],
  },
  {
    codigo: 'POP 12',
    titulo: 'Treinamento, Reciclagem e Desenvolvimento (PDI)',
    categoria: 'Pessoas e rotina',
    ordem: 12,
    tipos_tratativa: [],
    objetivo: 'Garantir a capacitação contínua dos colaboradores do CRC por meio de treinamentos técnicos, reciclagens periódicas e Planos de Desenvolvimento Individual (PDI), assegurando aderência aos procedimentos, melhoria da qualidade do atendimento, evolução profissional e fortalecimento da cultura de governança. A capacitação é um pilar estratégico da operação.',
    ferramentas: 'Portal CRC (PDI), Google Drive.',
    prazos: [
      { rotulo: 'Liberação do novo colaborador', valor: 'após validação formal do supervisor' },
      { rotulo: 'Avaliação do PDI', valor: 'anual' },
    ],
    fluxo_operacional: `## 1. Onboarding (integração)
Todo novo colaborador passa por integração estruturada antes de atuar de forma autônoma, contemplando no mínimo:
- apresentação institucional, cultura, valores e estrutura do CRC;
- treinamento técnico sobre sistemas, ferramentas, fluxos e POPs vigentes;
- treinamento comportamental: atendimento, empatia, comunicação assertiva, rapport e postura profissional;
- avaliação prática com simulações de atendimento e certificação interna de aptidão.

A liberação para atuação plena só ocorre após validação formal do supervisor do CRC.

## 2. Reciclagem periódica
Reciclagens estruturadas para atualizar conhecimentos, reforçar padrões e garantir conformidade, contemplando no mínimo:
- atualização de POPs, fluxos e ferramentas;
- reforço de padrões de qualidade, linguagem e conduta;
- compliance, ética, segurança da informação e LGPD.

## 3. Avaliação de competências
Avaliação periódica das competências técnicas, comportamentais e operacionais, com indicadores de desempenho, auditorias de tickets, simulações e feedback estruturado — para identificar lacunas, orientar os PDIs e subsidiar decisões de capacitação, reconhecimento e evolução.

## 4. Plano de Desenvolvimento Individual (PDI)
Cada colaborador tem um PDI alinhado às necessidades da área e aos objetivos de carreira: diagnóstico de competências, metas de aprendizado, plano de ação (treinamentos, mentorias, projetos práticos), acompanhamento periódico pelo supervisor e avaliação anual de evolução. O PDI é formativo e não implica, automaticamente, promoção, alteração salarial ou mudança de função.

## 5. Aprendizado organizacional e gestão do conhecimento
Capturar, documentar e disseminar o conhecimento gerado em reclamações, incidentes, contestações e melhorias. Registrar no mínimo:
- soluções replicáveis e boas práticas;
- lições aprendidas de incidentes críticos, falhas e projetos de melhoria;
- sínteses periódicas de padrões identificados pelo Facilitador Interno.

## 6. Trilhas de capacitação e carreira
Trilhas alinhadas à maturidade técnica e comportamental (por exemplo: Júnior, Pleno, Sênior e Supervisão). A evolução considera desempenho, aderência aos processos, treinamentos, maturidade analítica, contribuição para a melhoria contínua e avaliação da liderança.`,
    criterio_qualidade: `## Registro e evidências
Todo treinamento, reciclagem e PDI tem registro formal para governança, auditoria e rastreabilidade. Manter no mínimo: listas de presença e materiais, avaliações técnicas e práticas e relatórios de reciclagem e capacitação, na base oficial definida pela governança do CRC.

## Obrigatoriedade
A participação em treinamentos, reciclagens e PDIs é obrigatória para todos. O descumprimento pode ser tratado conforme as políticas internas de gestão de desempenho e compliance.`,
    outras_informacoes: '',
    raci: [],
  },
  {
    codigo: 'POP 13',
    titulo: 'Gestão de Turnos, Distribuição de Demandas e Equidade Operacional',
    categoria: 'Pessoas e rotina',
    ordem: 13,
    tipos_tratativa: [],
    objetivo: 'Estabelecer diretrizes para a gestão de turnos (2x2 e 2x1), a distribuição centralizada de demandas e a equidade operacional e de performance entre turnos, com justiça na medição de resultados, preservação do SLA e equilíbrio de carga de trabalho.',
    ferramentas: 'Portal CRC, Zendesk.',
    prazos: [],
    fluxo_operacional: `## Estrutura de turnos
- **2x2:** dois colaboradores dedicados a canais e dois a tratativas e análises por turno, com rodízio.
- **2x1:** dois dedicados a canais e um a tratativas e análises, em regime temporário de contingência.
- **Contingência:** em demandas e fluxos altos de contato, todos ficam disponíveis.

A mudança entre modelos não é desvio operacional, e sim adaptação à realidade do dia.

## Equidade entre turnos (regra central)
Como o volume pode se concentrar em certos períodos do dia, a equidade é garantida **no momento da distribuição**, e não depois do encerramento:
- demandas críticas podem ficar em fila controlada para o turno seguinte, desde que o SLA de início de contato seja respeitado;
- a liderança é a guardiã do equilíbrio, distribuindo oportunidades de tratativa ao longo do dia.

## Redução de equipe (2x1 ou 2 pessoas)
Em ausências, férias, atestados ou contingência:
- a liderança pode priorizar a estabilidade operacional em vez da equidade momentânea;
- essas situações não podem ser usadas como critério negativo em avaliações de desempenho ou na premiação;
- o impacto deve ser considerado nas análises posteriores da governança.

## Tratativas críticas
Em tratativas críticas, Reclame Aqui, Google Meu Negócio e Contestação de Compra, o primeiro contato segue sempre o fluxo padrão, com o objetivo exclusivo de criar a ponte de conexão com o cliente. A análise detalhada e a devolutiva final são feitas dentro do turno — ou, conforme a criticidade, em tempo corrente. Isso garante organização, respeito aos turnos e melhor experiência para o cliente e para o time.`,
    criterio_qualidade: '',
    outras_informacoes: '',
    raci: [],
  },
  {
    codigo: 'POP 14',
    titulo: 'Redistribuição de Tickets (férias e afastamentos acima de 5 dias)',
    categoria: 'Pessoas e rotina',
    ordem: 14,
    tipos_tratativa: [],
    objetivo: 'Em ausências de mais de 5 dias (férias, afastamentos ou licenças), redistribuir os tickets de forma estruturada, planejada e controlada, justa e equilibrada — sem sobrecarga individual, mantendo a qualidade das tratativas, o SLA e a estabilidade operacional. Aplica-se a agentes CRC, supervisores, N2 e gestores que atuam com tickets no Zendesk e no Portal CRC.',
    ferramentas: 'Zendesk, Portal CRC, Google Drive, planilhas de controle ou painel operacional.',
    prazos: [{ rotulo: 'Quando aplicar', valor: 'ausência acima de 5 dias' }],
    fluxo_operacional: `## Princípio de redistribuição
A redistribuição segue o princípio da **equidade operacional**, considerando não só o volume, mas também a complexidade dos tickets, a capacidade produtiva e a performance individual.

Nenhum agente deve ser sobrecarregado ou subutilizado. A distribuição deve garantir equilíbrio, previsibilidade e a qualidade do atendimento.`,
    criterio_qualidade: '',
    outras_informacoes: '',
    raci: [],
  },
  {
    codigo: 'POP 15',
    titulo: 'Rodízio de Acionamento dos Líderes Técnicos',
    categoria: 'Pessoas e rotina',
    ordem: 15,
    tipos_tratativa: [],
    objetivo: 'Estabelecer um fluxo obrigatório de acionamento dos Líderes Técnicos, garantindo distribuição equitativa da carga, continuidade operacional, menor dependência de um único profissional, desenvolvimento técnico uniforme da equipe e maior previsibilidade da capacidade de atendimento.',
    ferramentas: 'Portal CRC (Ferramentas Operacionais — Líder Técnico).',
    prazos: [{ rotulo: 'Revisão por desequilíbrio', valor: 'acima de 15% entre líderes' }],
    fluxo_operacional: `## Princípios
- Nenhum Líder Técnico pode ser o ponto único de apoio da operação.
- Todo acionamento respeita obrigatoriamente o rodízio.
- Solicitações fora do fluxo não são procedimento padrão.

## Estrutura do rodízio
Os líderes ficam numa fila rotativa (Líder A → Líder B → Líder C…), seguida rigorosamente: depois de um atendimento, o próximo acionamento vai obrigatoriamente para o líder seguinte da fila.

## Antes de acionar (escalonamento)
1. Validar a Base de Conhecimento.
2. Consultar os procedimentos existentes.
3. Confirmar que a dúvida não pode ser resolvida internamente.

Só depois dessas validações o líder pode ser acionado.

## Regra obrigatória
É proibido escolher o líder por afinidade, facilidade de comunicação, maior conhecimento, histórico de resolução, preferência pessoal ou disponibilidade presumida. **O único critério permitido é a posição atual do rodízio.**

## Exceções
- **Ausência** (férias, licença, treinamento, reunião estratégica ou indisponibilidade formalmente comunicada): o atendimento passa ao próximo da fila; o líder ausente não perde a posição e volta à fila no retorno.
- **Especialidade técnica:** quando o assunto exige conhecimento exclusivo de um líder. A justificativa deve ser registrada; depois, o rodízio continua sem reiniciar a sequência.
- **Incidente crítico:** o supervisor pode designar um líder específico; após o encerramento do incidente, o rodízio volta à ordem normal.`,
    criterio_qualidade: `## Monitoramento
O supervisor acompanha periodicamente: quantidade de acionamentos por líder, tempo médio de apoio, percentual de distribuição e principais motivos de escalonamento. Desequilíbrio acima de **15%** entre líderes no mesmo período exige revisão operacional para identificar desvios.

## Não conformidades
- acionar um líder fora da ordem do rodízio;
- ignorar a fila por conveniência;
- concentrar demandas num único líder;
- pedir apoio por canais paralelos sem registro;
- deixar de registrar exceções.

As recorrências são tratadas pela liderança imediata, com orientação e acompanhamento.`,
    outras_informacoes: `## Responsabilidades do colaborador
- Respeitar integralmente o rodízio.
- Registrar corretamente as solicitações.
- Não direcionar demandas por preferência pessoal.`,
    raci: [],
  },
  {
    codigo: 'POP 16',
    titulo: 'Horário de Almoço e Pausas para Café',
    categoria: 'Pessoas e rotina',
    ordem: 16,
    tipos_tratativa: [],
    objetivo: 'Estabelecer diretrizes para o intervalo de almoço e as pausas para café, garantindo a organização das atividades, a continuidade do atendimento e o bem-estar dos colaboradores. Aplica-se a todos os colaboradores CRC/CX.',
    ferramentas: '—',
    prazos: [
      { rotulo: 'Almoço — 1º turno', valor: '11h30 às 13h00' },
      { rotulo: 'Almoço — 2º turno', valor: '13h00 às 14h30' },
      { rotulo: 'Pausa para café', valor: '1 por dia, até 15 min' },
      { rotulo: 'Início do café', valor: 'entre 15h00 e 17h30' },
    ],
    fluxo_operacional: `## Intervalo para almoço
Conforme a jornada e a escala definida pela liderança. Hoje há dois turnos: **11h30 às 13h00** e **13h00 às 14h30**. Alterações só com autorização da liderança, considerando a necessidade operacional.

## Pausa para café
Facultativa, de no máximo **15 minutos**, **uma vez ao dia**, iniciada entre **15h00 e 17h30**. Se começar às 17h30, o colaborador volta às atividades ao término do período regulamentar. A pausa não pode ser usada para antecipar a saída: o horário de término do trabalho permanece o mesmo.

## Antes de sair para almoço ou café
- Finalizar o atendimento em andamento, sempre que possível.
- Evitar iniciar atendimentos complexos perto do horário de saída.
- Atualizar o status nos sistemas, quando aplicável.
- Garantir que a operação fique com colaboradores suficientes, aguardando ser rendido por um colega.

## Alta demanda
Em momentos de volume elevado, a liderança pode reorganizar temporariamente os horários de almoço e café.

## Encerramento do expediente
Nos últimos minutos da jornada, recomenda-se ficar disponível para concluir as atividades e passar as informações necessárias. Evitar pausas para café muito perto do fim do expediente quando comprometerem a continuidade da operação.`,
    criterio_qualidade: `## Diretrizes gerais
- Respeitar os horários definidos pela liderança.
- Evitar ausências simultâneas que prejudiquem o atendimento.
- Bom senso no uso das pausas.
- Preservar a continuidade da operação e a experiência do cliente.
- Situações excepcionais são avaliadas individualmente pela liderança.`,
    outras_informacoes: `## Responsabilidades
**Colaborador:** cumprir os horários definidos, voltar no horário estabelecido e informar ao líder imediato quando houver necessidade excepcional de alteração.

**Liderança:** organizar as escalas sem comprometer a operação, garantir tratamento igualitário e avaliar e autorizar situações excepcionais.

## Observações
Este procedimento é organizacional e operacional e não substitui a legislação trabalhista, acordos coletivos ou políticas internas. Casos omissos são tratados pela liderança imediata com o setor de Recursos Humanos.`,
    raci: [],
  },
  {
    codigo: 'POP 17',
    titulo: 'Plano de Continuidade da Supervisão (período de férias)',
    categoria: 'Pessoas e rotina',
    ordem: 17,
    tipos_tratativa: [],
    objetivo: 'Orientar a continuidade da supervisão do CRC durante as férias do Supervisor, mantendo a operação estável, organizada e aderente aos processos da Estrutura de Trabalho CRC 2026. O objetivo não é criar processos nem mudar a forma de funcionamento da área, e sim preservar os processos, a distribuição equilibrada, o acompanhamento dos indicadores, os registros, a qualidade das tratativas, os fluxos de escalonamento e a cultura do CRC. Durante a ausência da supervisão, nenhuma atividade operacional deve ser interrompida.',
    ferramentas: 'Portal CRC, Zendesk, Zendesk Explore, 55PBX, ferramenta de consulta do CSAT, Google Docs (relatório diário).',
    prazos: [
      { rotulo: 'Período', valor: '20 dias corridos' },
      { rotulo: '1º acompanhamento', valor: '09h00 às 10h00' },
      { rotulo: '2º acompanhamento', valor: '15h00 às 16h00' },
      { rotulo: 'Relatório diário', valor: '17h30 às 18h00' },
      { rotulo: 'Meta de CSAT', valor: '85% telefone e 85% chat' },
    ],
    fluxo_operacional: `## Substituição
- Período: 20 dias corridos. Substituto: a definir.
- O substituto conduz o time durante todo o período; o Supervisor titular não deve ser acionado.
- Decisões que precisem de validação da gestão vão para Lucas Tomyo.
- O substituto tem autonomia para a rotina, mas não para exceções, gestão de pessoas ou decisões que dependam da gestão. Na dúvida: consultar os processos; ver se cabe no fluxo padrão; se exigir decisão de gestão, encaminhar a Lucas Tomyo; registrar a decisão ou orientação no Portal CRC.

## Rotina diária
1. **Início do expediente:** acessar o Portal CRC e o Zendesk; analisar os tickets; identificar o que pode ser resolvido e o que precisa de direcionamento; verificar as prioridades, o rodízio dos processos especiais, o CSAT e as pendências do dia anterior.
2. **1º acompanhamento (09h00–10h00):** andamento das demandas, distribuição, pendências, necessidade de direcionamento, cumprimento dos processos e dificuldades dos agentes.
3. **2º acompanhamento (15h00–16h00):** evolução das demandas, tickets pendentes, processos prioritários, escalonamentos, desempenho do time e indicadores.
4. **Fechamento:** revalidar o que ficou pendente, o que ainda pode ser resolvido, o que precisa de continuidade, os processos especiais em andamento, as decisões e exceções do dia e se os registros foram feitos.
5. **Relatório diário (17h30–18h00):** Google Docs compartilhado com pedro.soares@clickdigital.com.br, todos os dias, mesmo sem ocorrências relevantes.

## Processos prioritários (acompanhamento diário)
Google Meu Negócio, Reclame Aqui, Contestação de Compra e PROCON. A ausência da supervisão não altera os prazos de atendimento.

## Rodízio dos processos especiais
Reclame Aqui, Google Meu Negócio, PROCON e Contestação de Compra são distribuídos em rodízio entre os agentes (Agente A → B → C → D → próximo da sequência). O substituto acompanha o rodízio, garante que a sequência seja respeitada, faz ajustes quando necessário e registra as alterações no Portal CRC.

## O que vai para a gestão (Lucas Tomyo)
Decisões que exijam validação da gestão, encerramento de reclamações sensíveis, plano de ação para reclamações, exceções ao processo, situações comerciais ou que envolvam outros setores, decisões com impacto operacional, financeiro, jurídico ou reputacional, incidentes críticos, questões de gestão de pessoas (atestados, atrasos, ocorrências pessoais, situações disciplinares) e trocas de horário sem consenso.

## Líderes técnicos / apoio N2
Hoje: Luiz Gustavo e Ariane. O rodízio ainda não tem ordem estabelecida — o substituto o inicia e controla, registrando os acionamentos no Portal CRC. Antes de acionar: Base de Conhecimento, procedimentos existentes e verificação interna. Exceção por especialidade técnica: registrar o motivo e depois seguir o rodízio.`,
    criterio_qualidade: `## Relatório diário deve conter
Atividades realizadas, principais ocorrências, situação dos tickets, processos prioritários acompanhados, decisões tomadas, orientações recebidas da gestão, pendências, situação do CSAT, percepção sobre a operação, problemas identificados, oportunidades de melhoria e plano de ação proposto, quando necessário.

## CSAT abaixo de 85%
Analisar a situação, identificar causas possíveis, avaliar os impactos, registrar a percepção no relatório diário e elaborar uma proposta de plano de ação — proposta, não necessariamente executada durante as férias. No retorno do Supervisor, apresentar a análise e a proposta.

## O substituto não deve
Criar processos sem validação; alterar processos sem necessidade; tomar decisões de gestão de pessoas; fazer exceções sem validação; decidir de forma precipitada em situações sensíveis; deixar de registrar decisões; deixar de acompanhar os processos prioritários, o rodízio e o CSAT; deixar de fazer o relatório diário ou de registrar as atividades no Portal CRC.`,
    outras_informacoes: `## Checklist de abertura do dia
- Acessar Portal CRC e Zendesk
- Verificar tickets, pendências e distribuição das demandas
- Verificar o rodízio dos processos especiais
- Verificar R.A., Google Meu Negócio, Contestação de Compra e PROCON
- Verificar o CSAT
- Identificar situações que precisam de direcionamento
- Acompanhamento do time entre 09h00 e 10h00

## Checklist do meio do dia
- Reavaliar o andamento da operação e os tickets pendentes
- Verificar os processos prioritários e a distribuição
- Identificar situações que precisam da gestão
- Acompanhar o CSAT
- Acompanhamento do time entre 15h00 e 16h00

## Checklist de encerramento
- Revisar pendências e o que pode ser resolvido
- Verificar processos prioritários
- Registrar decisões, ocorrências e situações que exigiram gestão
- Revisar indicadores e pendências para o próximo dia
- Relatório diário entre 17h30 e 18h00

## Relatório de encerramento dos 20 dias
Principais ocorrências, decisões, situações escaladas, evolução do CSAT, problemas, pendências, situações relevantes nos processos prioritários, percepção sobre a operação, oportunidades, planos de ação propostos e avaliação geral — com a visão crítica do substituto, não só os fatos.

## Checklist para o retorno do Supervisor
Relatórios diários dos 20 dias; relatório consolidado; principais ocorrências; decisões; situações escaladas; pendências; análise do CSAT; planos de ação propostos; registros no Portal CRC; informações relevantes sobre a operação.

## Outros pontos
- **Reuniões:** o substituto não participa das reuniões do Supervisor.
- **Projetos e campanhas:** nenhum em andamento que exija continuidade; demandas novas seguem o fluxo de escalonamento.
- **Acessos:** providenciar antes do início, principalmente o do CSAT.

## Princípio final
Prioridade: continuidade, estabilidade, controle e rastreabilidade. O substituto não precisa reinventar a operação — deve observar, acompanhar, executar, registrar e escalar quando necessário, preservando a cultura, a performance, a execução correta dos processos e a qualidade dos registros.`,
    raci: [],
  },

  // ---------------------------------------------------- Continuidade e tecnologia
  {
    codigo: 'POP 18',
    titulo: 'Continuidade Operacional (BCP)',
    categoria: 'Continuidade e tecnologia',
    ordem: 18,
    tipos_tratativa: [],
    objetivo: 'Garantir a continuidade das operações do CRC quando houver indisponibilidade de ferramentas, infraestrutura ou sistemas críticos, minimizando impactos ao cliente, à operação e à reputação. Estabelece planos de contingência, responsabilidades e fluxos alternativos. Aplica-se a todos os colaboradores do CRC, supervisão, Facilitador Interno, áreas técnicas, TI e áreas de apoio.',
    ferramentas: 'Planilha de contingência CRC (offline ou Google Sheets), Google Drive, WhatsApp, telefone, e-mail.',
    prazos: [{ rotulo: 'Retroalimentar o Zendesk', valor: 'até 24h após a normalização' }],
    fluxo_operacional: `## Zendesk indisponível
Total ou parcialmente — inacessível, instável ou com falhas críticas que impeçam registrar e acompanhar tickets.
1. Registrar todas as tratativas na planilha de contingência CRC (offline ou Google Sheets).
2. Manter os contatos com clientes normalmente por WhatsApp, telefone ou e-mail.
3. Guardar as evidências na pasta padrão do Google Drive.
4. Após a normalização, retroalimentar todos os registros no Zendesk em até **24 horas**.
5. O supervisor comunica a indisponibilidade à TI e monitora o tempo de recuperação.

## Internet local indisponível
Conexão do agente ou da operação indisponível ou instável.
1. Acionar imediatamente o supervisor por canal alternativo (telefone corporativo ou aplicativo interno).
2. Se possível, operar por conexão secundária (dados móveis ou backup).
3. Se for geral na operação, o supervisor aciona a TI e redistribui as demandas críticas para agentes com conexão.
4. Registrar depois todas as atividades nos sistemas oficiais.
5. Se acontecer durante o home office, o agente deve ir para a empresa para concluir o trabalho.

## Sistema do produto indisponível
Sistema fora do ar, instável ou com falha que afete vários clientes.
1. Registrar o incidente no Portal CRC e sinalizar ao supervisor.
2. O supervisor aciona N2, Programação e Gestão.
3. Iniciar comunicação proativa com os clientes afetados, com as macros de incidente sistêmico.
4. Dar atualizações periódicas aos clientes conforme orientação da área técnica.
5. O FI consolida o incidente para aprendizado e análise de causa raiz.`,
    criterio_qualidade: `## Princípios de continuidade
- A experiência do cliente é preservada mesmo em cenários de falha.
- A comunicação é proativa, transparente e controlada.
- Registros manuais são obrigatórios durante a contingência.
- A retomada inclui retroalimentar os dados nos sistemas oficiais.

## Comunicação em contingência
Toda comunicação externa segue macros homologadas. É proibido informar causas técnicas não validadas, prazos não aprovados ou falhas internas sensíveis. Em incidentes críticos, a comunicação pública é validada pela Gestão ou Diretoria.

## Registro, auditoria e aprendizado
Todo evento de indisponibilidade é registrado no Portal CRC e consolidado pelo FI. A liderança pode auditar periodicamente os registros. Após cada evento, registrar lições aprendidas, riscos e mecanismos de prevenção, que alimentam treinamentos, atualizações de POPs e planos de melhoria.`,
    outras_informacoes: `## Responsabilidades
**Agente CRC:** atender por canais alternativos, registrar evidências e controles manuais e retroalimentar os sistemas após a normalização.

**Supervisor CRC:** acionar os planos de contingência, comunicar TI, N2 e Gestão, redistribuir demandas críticas e validar os registros pós-contingência.

**Facilitador Interno (FI):** consolidar as ocorrências, identificar padrões e riscos e registrar os aprendizados.

**Áreas técnicas / TI:** atuar na recuperação e informar status e previsão de normalização.`,
    raci: [],
  },
  {
    codigo: 'POP 19',
    titulo: 'Aplicação de Inteligência Artificial (AI First)',
    categoria: 'Continuidade e tecnologia',
    ordem: 19,
    tipos_tratativa: [],
    objetivo: 'A cultura "AI First" estabelece que a Inteligência Artificial é a primeira ferramenta consultada para otimizar rotinas, analisar dados e estruturar comunicação — potencializando a capacidade analítica e produtiva de agentes e supervisores, para que o esforço humano vá para a empatia, a negociação e a decisão crítica.',
    ferramentas: 'Gemini for Google Workspace: Gmail, Google Drive e Docs, Google Chat e Google Meet.',
    prazos: [],
    fluxo_operacional: `## Casos de uso — a IA como copiloto
- **Resumo e triagem de históricos:** resumir históricos longos de interações no Zendesk, para o agente ter o contexto completo em segundos e cumprir o SLA de início de contato.
- **Redação e tom de voz:** refinar a escrita para uma linguagem empática, clara e objetiva, alimentando a IA com as macros oficiais para gerar respostas personalizadas sem descaracterizar o padrão.
- **Apoio ao Facilitador Interno:** consolidar os volumes da semana, processando os textos das reclamações para identificar padrões sistêmicos, sentimento e grau de recorrência.
- **Planos de ação:** em casos complexos (PROCON, incidentes críticos), rascunhar planos de ação e argumentações técnicas — sempre validados pela Supervisão.

## Ferramentas Google disponíveis
A empresa é parceira oficial do Google, e o Gemini já está embutido e seguro no ambiente de trabalho (LGPD). O uso é encorajado na rotina:
- Gemini no Gmail — apoio de escrita e leitura;
- Gemini no Google Drive e Docs — organização e defesa;
- Gemini no Google Chat — comunicação interna ágil;
- Gemini no Google Meet — foco no cliente e no alinhamento.`,
    criterio_qualidade: `## Uso e conformidade com a LGPD
- **Anonimização obrigatória:** é proibido inserir em prompts dados pessoais ou de clientes (nome completo, CPF, e-mail, telefone, endereço) ou dados financeiros (cartão, histórico bancário). Todo dado deve ser anonimizado antes da consulta.
- **Segredo industrial:** informações estratégicas, regras de negócio sigilosas, código-fonte e prints de sistemas internos não vão para ferramentas de IA não homologadas.
- **Transparência e rastreabilidade:** o uso de IA em decisões ou relatórios deve ser transparente, com fontes e métodos auditáveis pela gestão.

## Responsabilidade humana (human-in-the-loop)
- **Revisão crítica obrigatória:** a IA só sugere. A decisão final, a checagem da veracidade (evitando "alucinações"), o envio ao cliente e o encerramento da tratativa são responsabilidade exclusiva do agente e do supervisor.
- **Proibida a automação cega:** nada gerado por IA vai direto ao cliente sem leitura, conferência das regras de negócio e adaptação ao contexto real.`,
    outras_informacoes: '',
    raci: [],
  },
  {
    codigo: 'POP 20',
    titulo: 'Uso do WhatsApp — Canal Ouvidoria',
    categoria: 'Continuidade e tecnologia',
    ordem: 20,
    tipos_tratativa: [],
    objetivo: 'Canal exclusivo de segunda instância: o WhatsApp da Ouvidoria é usado estritamente para acompanhar tratativas em andamento ou dar retorno a manifestações já cadastradas (R.A., RI, GMN, PROCON, Contestação), centralizando a comunicação na identidade oficial da empresa e evitando canais duplicados e ruído.',
    ferramentas: 'WhatsApp da Ouvidoria, Zendesk, Google Drive.',
    prazos: [{ rotulo: 'Número oficial', valor: '(31) 2533-0311' }],
    fluxo_operacional: `## Operação e acessos
- **Responsabilidade da Supervisão:** a gestão da ferramenta e a distribuição de acessos aos agentes cabem ao Supervisor da área, garantindo conformidade e segurança.
- **Sinalizadores:** é obrigatório usar sinalizadores internos e categorizar por listas de transmissão ou etiquetas, para organizar, triar e localizar as demandas rapidamente.

## Registro e rastreabilidade (Zendesk)
- **Vinculação obrigatória:** toda interação no canal fica vinculada a um ticket ativo no Zendesk. Não há atendimento informal ou "em aberto".
- **Demandas de outras áreas e dúvidas simples:** mesmo interações rápidas, direcionamentos e dúvidas básicas geram um registro (ticket de resolução rápida), para auditoria e métricas de volume da Ouvidoria.
- **Histórico de mídias:** prints importantes, áudios e vídeos são anexados ao ticket do Zendesk, numa pasta do Google Drive compartilhada com a gestão, editável, com o nome igual ao ID do ticket.`,
    criterio_qualidade: `## Segurança e privacidade (LGPD)
- **Proteção de dados:** é proibido compartilhar pelo canal dados pessoais, informações sensíveis, dados financeiros ou cadastrais de terceiros e parceiros comerciais.
- **Confirmação de identidade:** antes de informar o andamento de um processo, validar a identidade do cliente confirmando dados cadastrais básicos.`,
    outras_informacoes: '',
    raci: [],
  },
  {
    codigo: 'POP 21',
    titulo: 'Apoio da Implantação',
    categoria: 'Continuidade e tecnologia',
    ordem: 21,
    tipos_tratativa: [],
    objetivo: 'Estabelecer critérios e orientações para pedir apoio do time de Implantação em treinamentos, de forma organizada, rastreável e direcionada a situações que exigem conhecimento especializado — proporcionando ao cliente uma experiência mais adequada quando outros recursos não bastarem para uma necessidade de capacitação, orientação ou uso da plataforma.',
    ferramentas: 'Portal CRC (Ferramentas Operacionais — Apoio Especializado).',
    prazos: [
      { rotulo: 'Limite mensal (global)', valor: '3h00' },
      { rotulo: 'Aprovação', valor: 'supervisor, antes do encaminhamento' },
    ],
    fluxo_operacional: `## Quando solicitar
- Treinamento sobre funcionalidades do GestãoClick.
- Orientação estruturada sobre um processo operacional.
- Apoio no uso correto de recursos da plataforma.

## Quando NÃO solicitar
- Dúvidas simples que o CRC ou o Suporte resolvem.
- Orientações que já estão na Base de Conhecimento.
- Correção de erros ou bugs do sistema.
- Pedidos que deveriam ir para o Suporte/N2.
- Demandas exclusivamente comerciais.
- Treinamentos decorrentes de não consultar os materiais disponíveis, quando o CRC pode orientar.

## Fluxo
O mesmo do Apoio Técnico ou N2: validar a situação no Portal CRC, em Ferramentas Operacionais.`,
    criterio_qualidade: `## Critérios de aprovação
O supervisor avalia antes de encaminhar à Implantação, considerando: necessidade real de apoio especializado, complexidade da demanda, objetivo esperado com o treinamento, saldo do limite mensal e impacto esperado na jornada do cliente. O simples pedido do cliente por treinamento não é, sozinho, aprovação automática.

## Limite de utilização
O CRC tem uma liberalidade global de **3h00 por mês** para apoio especializado, compartilhada entre as solicitações aprovadas. O Portal CRC controla o saldo automaticamente.`,
    outras_informacoes: '',
    raci: [],
  },
];

export const CATEGORIAS = ['Governança', 'Tratativas', 'Pessoas e rotina', 'Continuidade e tecnologia'];
