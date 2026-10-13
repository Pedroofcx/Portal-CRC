/**
 * Documentação técnica — Regras de negócio centrais.
 *
 * As regras que atravessam vários módulos. O PORQUÊ de cada decisão (e a data)
 * está em documentacao/decisoes-de-regra.md; aqui está o COMO e onde mora no
 * código. Cada seção: { id, titulo, fonte, paragrafos[], itens[{rotulo,texto}],
 * tabela?: { colunas[], linhas[][] } }.
 */

export const secoesDeRegras = [
  {
    id: 'estados',
    titulo: 'Máquina de estados da tratativa',
    fonte: 'transicao_de_status_permitida() (migration 8); FSM_TRANSITIONS e a barra de estado em src/pages/TratativaDetalhe.jsx',
    paragrafos: [
      'A regra de verdade mora no banco: o gatilho valida_transicao_tratativa recusa qualquer mudança fora da matriz (service_role passa, para importação e correção). A tela só mostra os botões permitidos, e os mostra FIXOS no topo, ao lado de "Excluir Tratativa", em qualquer guia — iniciar a tratativa dispara o contador de SLA e não pode ficar escondido.',
    ],
    tabela: {
      colunas: ['De', 'Pode ir para'],
      linhas: [
        ['registrada', 'tratativa_iniciada, excluida'],
        ['tratativa_iniciada / em_andamento / dependencia_externa', 'tratativa_iniciada, em_andamento, dependencia_externa, aguardando_financeiro, encerrada, aguardando_confirmacao_reabertura, excluida'],
        ['aguardando_financeiro', 'em_andamento, dependencia_externa, encerrada, excluida'],
        ['encerrada', 'aguardando_confirmacao_reabertura, excluida'],
        ['aguardando_confirmacao_reabertura', 'encerrada, em_andamento, excluida'],
        ['excluida', 'terminal (reverter exige o SQL Editor, de propósito)'],
      ],
    },
    itens: [
      { rotulo: 'Botões da barra', texto: 'Registrada: Iniciar Tratativa. Iniciada: Em Andamento, Dependência Externa, encerrar. Em andamento: Dependência Externa, encerrar. Dependência externa: Em Andamento, encerrar. Contestação ainda ganha Congelar SLA (pede a data de envio da defesa) e, congelada, Retorno do Financeiro — Reativar.' },
      { rotulo: 'Contestação', texto: 'Nasce já em em_andamento, com data_inicio_tratativa igual ao registro. O desfecho final (a favor do emissor, do estabelecimento, protesto recusado, outros) é registrado à parte, em desfecho_contestacao.' },
      { rotulo: 'Reclamação interna', texto: 'Ao encerrar, o agente leva a tratativa para aguardando_confirmacao_reabertura (7 dias corridos). Passada a janela, "Concluir e passar para Encerrada" a fecha de vez. O ponto de "sem reabertura" não depende desse clique (ver Reabertura).' },
      { rotulo: 'Encerramento exige', texto: 'Etapa da jornada e causa primária; devolução financeira (sim/não) em reclamação interna, Reclame Aqui e GMN; nota do Reclame Aqui (0 a 10); em contestação, status da resolução e status final. O motivo/submotivos podem ser confirmados ou mantidos.' },
      { rotulo: 'Histórico', texto: 'historico_estados é uma lista só de acréscimos: cada mudança grava estado anterior e novo, quem, quando e a observação. Nota livre grava a entrada com o mesmo estado nos dois campos (é assim que se distingue nota de transição).' },
      { rotulo: 'Exclusão', texto: 'Soft delete: excluida, justificativa (mínimo de 10 caracteres), quem e quando. Tratativa excluída sai de todo indicador e da pontuação.' },
    ],
  },
  {
    id: 'sla',
    titulo: 'SLA',
    fonte: 'migrations 9, 38, 39 e 40; src/lib/prazoSla.js; documentacao/decisoes-de-regra.md',
    paragrafos: [
      'Decisão de Pedro em 02/10/2026: o SLA conta do INÍCIO da tratativa e PAUSA em dependência externa e em aguardando financeiro, sem teto de pausa. A regra vale para tratativas encerradas de 17/09/2026 em diante; as anteriores ficam como foram apuradas (a premiação dos ciclos 1 e 2 já tem decisão humana em cima).',
    ],
    itens: [
      { rotulo: 'Prazo em horas', texto: 'sla_horas(): reclamação interna e padrão 24 h; Reclame Aqui 48 h; Google Meu Negócio 72 h; contestação usa o prazo informado em dias × 24 (72 h quando não informado). Fica gravado em sla_atribuido.' },
      { rotulo: 'Tempo de SLA', texto: 'tempo_sla_efetivo_minutos(início, encerramento, histórico): minutos corridos do início ao encerramento menos minutos_pausados(). Início = data_inicio_tratativa, ou o registro se nunca foi iniciada.' },
      { rotulo: 'Pausa', texto: 'O histórico é lido como linha do tempo de ESTADOS: só contam as entradas em que o estado mudou. Nota livre em dependência externa não interrompe a pausa.' },
      { rotulo: 'Resultado', texto: 'encerrado_no_sla = tempo ≤ sla_atribuido × 60. O gatilho calcula na entrada em encerrada OU em aguardando_confirmacao_reabertura (migration 39); antes, a reclamação interna ficava sem SLA até alguém clicar em Concluir.' },
      { rotulo: 'Quem grava', texto: 'Só o servidor: aa_protege_campos_calculados descarta o que o navegador mandar.' },
      { rotulo: 'Tratativas abertas', texto: 'prazoDaTratativa() em src/lib/prazoSla.js usa a mesma régua: prazo = início + sla_atribuido + tempo já pausado. Em pausa o prazo anda junto com o relógio (nunca vence enquanto pausada). Quem ainda não foi iniciada conta do registro, para a fila continuar acusando o que ninguém pegou. Alimenta a fila do operador, a faixa de vencidas do gestor, o resumo do dia e os relatórios.' },
      { rotulo: 'Risco aceito', texto: 'Sem teto, uma tratativa parada em dependência externa por meses conta como dentro do SLA (72 das 349 encerradas passaram mais de 90% do tempo em pausa). Se o indicador ficar bom demais, o teto de dias de pausa é o primeiro ajuste.' },
    ],
  },
  {
    id: 'custo',
    titulo: 'Custo operacional',
    fonte: 'custo_operacional() e custo_operacional_ajustado() (migrations 10 e 11)',
    itens: [
      { rotulo: 'Conta', texto: 'Custo por minuto = salário × 1,6 (encargos) ÷ 220 h ÷ 60, vezes os minutos de trabalho da tratativa. Nulo quando falta o salário do agente: não inventa número.' },
      { rotulo: 'Carga simultânea', texto: 'Os minutos de trabalho são divididos pelo número de tratativas que a pessoa atendia ao mesmo tempo (custo_operacional_ajustado é o oficial).' },
      { rotulo: 'Duas réguas de tempo', texto: 'SLA mede a espera do cliente; custo mede o trabalho. Uma tratativa pode estourar o SLA e custar pouco.' },
      { rotulo: 'Quem vê', texto: 'Permissão ver_custo_operacional (migration 36): sem ela a view devolve nulo. Relatórios e a Jornada do Cliente mostram o custo só para quem tem.' },
    ],
  },
  {
    id: 'pontuacao-tratativa',
    titulo: 'Pontuação de uma tratativa',
    fonte: 'calculateTratativaPoints() em src/components/utils/helpers.js; src/lib/pontuacaoCiclo.js',
    paragrafos: [
      'Calculada ao vivo no navegador, nunca gravada. A mesma função serve ao ranking, ao "Meu ciclo", à Auditoria de Pontuação, ao Hansei e aos relatórios. Os campos de que ela depende são protegidos no banco (calculados pelo servidor ou congelados no encerramento).',
    ],
    tabela: {
      colunas: ['Tipo', 'Regra', 'Máximo'],
      linhas: [
        ['Reclamação interna', 'Encerramento no SLA +1; sem reabertura em 7 dias +1; solução replicável +0,5 (Ciclo 2 em diante, só depois da aprovação do gestor)', '2,5'],
        ['Reclame Aqui', 'Nota 7 ou 8: +0,5; nota 9: +1,5; nota 10: +2,5; "voltaria a fazer negócio" +1 (só para nota acima de 8); reclamação inativada +1 (encerrada de 17/09/2026 em diante)', '3,5 (+1 inativada)'],
        ['Google Meu Negócio', 'Reavaliação positiva +2; exclusão de avaliação negativa +1; avaliação inativada +1 (encerrada de 17/09/2026 em diante)', '1 a 2 (+1 inativada)'],
        ['Contestação', 'Cancelamento da contestação, pagamento integral ou acordo de custo reduzido: +2,5. Perda (sem contato, sem acordo, cliente contestou) não pontua', '2,5'],
        ['Administrativa e Procon', 'Sem pontos de encerramento', '0'],
        ['Qualquer tipo', 'Cada abertura de ticket vale +0,5 para o agente responsável, no ciclo do REGISTRO (Ciclo 2 em diante)', '0,5'],
      ],
    },
    itens: [
      { rotulo: 'Reabertura', texto: 'O +1 de "sem reabertura" é perdido se o MESMO cliente (id_base_cliente) abrir qualquer nova tratativa, com qualquer agente, em até 7 dias corridos depois do encerramento. Passados os 7 dias sem nova abertura, o ponto conta sozinho, sem ninguém confirmar (reaberturaDe/comReaberturaApurada). O gestor ainda pode registrar que o cliente voltou por um canal fora do Portal (cliente_reabriu). Não exige encerrar no prazo.' },
      { rotulo: 'Solução replicável', texto: 'Do Ciclo 2 em diante o +0,5 só entra depois que o gestor APROVA, uma a uma, em Soluções replicáveis (contestar exige parecer, que o agente vê). No Ciclo 1 basta a marcação.' },
      { rotulo: 'Contestação', texto: 'Os valores que contam vêm de status_resolucao_contestacao (pagou, acordo, cancelou_contestacao). O desfecho_contestacao registrado na tela é informativo e não entra no cálculo hoje.' },
      { rotulo: 'Reclame Aqui', texto: 'A nota é obrigatória para encerrar: antes ela podia ficar vazia e a tratativa pontuava 0 sem aviso.' },
    ],
  },
  {
    id: 'pontuacao-ciclo',
    titulo: 'Pontuação do ciclo, ranking e premiação',
    fonte: 'src/lib/pontuacaoCiclo.js, bonusManual.js, indicadoresCiclo.js, faixasIndicadores.js, extratoPontos.js; hooks useRankingCiclo e usePontuacaoAgente',
    paragrafos: [
      'A premiação é um ranking sem teto de pontos. O total de uma pessoa no ciclo é: pontos de encerramento + pontos de abertura + indicadores + bônus manual.',
    ],
    itens: [
      { rotulo: 'Em que ciclo cada ponto cai', texto: 'Tratativa que atravessa ciclos não prejudica o agente: a abertura vale no ciclo do registro e o encerramento no ciclo da conclusão, independentemente de quando começou.' },
      { rotulo: 'Quais estados contam', texto: 'encerrada e aguardando_confirmacao_reabertura (STATUS_ENCERRADOS), não excluídas e com agente responsável.' },
      { rotulo: 'Dia de virada', texto: 'O dia 16 é fim de um ciclo e início do seguinte. Do Ciclo 3 em diante ele pertence ao ciclo que TERMINA (instanteNoCiclo). Os ciclos 1 e 2 seguem como foram apurados, com o dia de início contando (DIA_DE_VIRADA_VALE_DESDE = 2026-09-16). Vale para pontos de encerramento, de abertura, registros por canal e o ciclo do Hansei.' },
      { rotulo: 'Indicadores (Ciclo 2 em diante)', texto: 'CSAT = (CSAT do telefone + CSAT do chat) ÷ 2, cada canal no ciclo inteiro (canal sem avaliação sai da média). Performance = ligações atendidas ÷ ligações. CX = média de todas as avaliações. Cada dia apurado conta uma vez (o mais recente vale).' },
      { rotulo: 'Faixas de pontos', texto: 'CSAT: 85 a 89% = 7, 90 a 94% = 9, 95% ou mais = 10. Performance: 100% = 10, 90 a 99% = 7, abaixo de 90% não pontua. CX: média 4,5 ou mais = 10, 4,3 a 4,4 = 4, 4,2 = 1.' },
      { rotulo: 'Bônus manual', texto: 'Lançamento do gestor em pontuacao (tipo bonus_manual, ciclo_id, total_pontos, descrição). O ranking soma todos os lançamentos da pessoa no ciclo. Usado, por exemplo, para o ritmo de atualização do ticket (faixas 10 / 7 / 4), lançado a partir do Zendesk.' },
      { rotulo: 'Elegibilidade', texto: 'As exigências (Configurações > Elegibilidade) decidem o ✓ de verdade, com três estados: cumprida, pendente e sem dado (não saber é diferente de não cumprir). Canal com menos de 4 registros no trimestre não entra na validação. Já a PONTUAÇÃO, do Ciclo 3 em diante, segue a Estrutura de Trabalho: um canal (R.A., Google Meu Negócio, Reclamação Interna ou Contestação) só começa a ser computado quando TODOS os colaboradores que atuam em reclamações têm pelo menos 1 registro nele no ciclo. Enquanto um não tiver, os pontos daquele canal (encerramento e abertura) ficam retidos para todo mundo, à parte, e passam a contar quando o último registra; se o trimestre acabar assim, o canal é desconsiderado. Os ciclos 1 e 2 seguem como foram apurados.' },
      { rotulo: 'Ciclos fechados', texto: 'Os ciclos 1 e 2 estão congelados: nenhuma correção posterior pode alterar o resultado deles. Regra nova entra sempre com data de corte. A migration 40 devolveu o SLA dos fechados ao que foi apurado.' },
    ],
  },
  {
    id: 'apuracao',
    titulo: 'Apuração: telefone, chat e CX',
    fonte: 'src/lib/csv.js, src/lib/apuracao/*, src/components/apuracao/*',
    itens: [
      { rotulo: 'Telefone (55PBX)', texto: 'Transferência de fila conta como atendida (performance) mas nunca gera avaliação. FCR 1 + nota 4 ou 5 = positiva; FCR 1 + nota 1 ou 2 = negativa; FCR 1 + nota 3 = neutra (avaliada, a favor de ninguém); FCR 2 = sempre negativa; FCR 1 sem nota válida = incompleta (nem conta como avaliada). CSAT = positivas ÷ (positivas + negativas + neutras), padrão de CX, do Ciclo 3 (17/09/2026) em diante; nos ciclos 1 e 2 as neutras ficam fora da base. As incompletas nunca entram.' },
      { rotulo: 'Chat (Zendesk)', texto: 'O arquivo não traz nota. "Boa" é positiva e "ruim" conta como negativa na premiação. A classificação de quais "ruim" são nota 3 (neutro) é manual, ticket a ticket, na aba Ouvidoria, e aparece à parte, sem mudar o resultado oficial.' },
      { rotulo: 'CX', texto: 'Média das notas dos critérios PREENCHIDOS de cada avaliação (critério em branco sai da conta, não vira zero). A avaliação CX é por mês de apuração e entra no ciclo em que o mês termina.' },
      { rotulo: 'Importação', texto: 'Leitor de CSV de verdade (aspas, ; ou ,, BOM). A tela mostra a conferência antes de salvar (linhas lidas e descartadas, dias já importados, quem ficou sem vínculo). Cada importação é um lote (importacao_id) que pode ser desfeito.' },
    ],
  },
  {
    id: 'indicadores-financeiros',
    titulo: 'Financeiro e Jornada do Cliente',
    fonte: 'src/lib/relatorios/financeiro.js, src/components/jornada/inteligenciaFinanceira.js',
    itens: [
      { rotulo: 'Custo oficial', texto: 'O custo operacional dos relatórios é o do servidor (custo_operacional_ajustado). Contestação é lida por desfecho: perda, acordo (perde só a diferença; o acordado conta como recuperado), recuperado e em andamento (fora das somas até encerrar).' },
      { rotulo: 'Risco reputacional', texto: 'Só contagem, sem valor em R$ (o valor fixo antigo era inventado e saiu da conta em 22/09/2026).' },
      { rotulo: 'Impacto na Jornada', texto: 'devolução + custo operacional + perda de receita + retrabalho por etapa, com parâmetros do gestor (custo/hora, encargos, carga horária, tolerância) guardados em configuracao. Linhas de benchmark são faixas de referência, não limites.' },
    ],
  },
];
