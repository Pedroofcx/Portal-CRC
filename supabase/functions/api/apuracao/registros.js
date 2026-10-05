/*
 * ATENÇÃO: a lógica da apuração mora AQUI (supabase/functions/api/apuracao/),
 * porque a Edge Function da API de integrações precisa dela e só enxerga a
 * própria pasta. O Portal importa deste mesmo arquivo (src/lib/apuracao e
 * src/components/apuracao têm só um repasse). Uma fonte só: o que a tela
 * importa e o que a API grava passam pelo MESMO cálculo.
 */

/** O período de uma pessoa: o primeiro e o último dia que o arquivo trouxe dela. */
export function periodoDaPessoa(resultado) {
  const dias = Object.keys(resultado.porData ?? {}).sort();
  if (dias.length === 0) return null;
  return { inicio: dias[0], fim: dias[dias.length - 1] };
}

/** Monta os registros de Apuracao de uma importação. */
export function registrosDaImportacao({ resultados, tipo, fonte, vinculos, colaboradores, arquivo, conferencia, quem, importacaoId }) {
  return Object.entries(resultados).map(([nomeNoArquivo, r]) => {
    const colaboradorId = vinculos[nomeNoArquivo];
    const colab = colaboradores.find((c) => c.id === colaboradorId);
    const periodo = periodoDaPessoa(r) ?? conferencia.periodo ?? { inicio: null, fim: null };

    const base = {
      colaborador_id: colaboradorId,
      colaborador_nome: colab?.nome_completo || nomeNoArquivo,
      periodo_inicio: periodo.inicio,
      periodo_fim: periodo.fim,
      modo: 'incremental',
      tipo_apuracao: tipo,
      intervalo: 'total',
      fonte,
      importacao_id: importacaoId,
      arquivo_nome: arquivo?.name ?? null,
      linhas_lidas: conferencia.linhasLidas,
      linhas_descartadas: conferencia.linhasLidas - conferencia.linhasValidas,
      historico_detalhado: r.historico ?? r.avaliacoes ?? [],
      data_apuracao: new Date().toISOString(),
      apurado_por_id: quem?.id ?? null,
      apurado_por_nome: quem?.nome_completo ?? null,
    };

    base.dados_por_data = Object.values(r.porData ?? {}).map((dia) => {
      const registro = { data: dia.data };
      if (tipo === 'telefone') {
        registro.telefone = {
          total_ligacoes: dia.total_ligacoes || 0,
          total_atendidas: dia.total_atendidas || 0,
          total_sem_transferencia: dia.total_sem_transferencia || 0,
          total_avaliadas: dia.total_avaliadas || 0,
          total_positivas: dia.total_positivas || 0,
          total_negativas: dia.total_negativas || 0,
          // Neutras (FCR 1 + nota 3) e incompletas (FCR 1 sem nota válida)
          // ficam de fora do CSAT — só aqui para conferência (24/09/2026).
          total_neutras: dia.total_neutras || 0,
          total_incompletas: dia.total_incompletas || 0,
          nota4: dia.nota4 || 0,
          nota5: dia.nota5 || 0,
          performance: dia.performance || 0,
          csat: dia.csat || 0,
          percentual_avaliados: dia.percentual_avaliados || 0,
          transferencias: dia.transferencias || 0,
        };
      } else if (tipo === 'chat') {
        registro.chat = {
          total_chats: dia.total_chats || 0,
          total_avaliados: dia.total_avaliados || 0,
          total_positivos: dia.total_positivos || 0,
          total_negativos: dia.total_negativos || 0,
          percentual_avaliados: dia.percentual_avaliados || 0,
          csat: dia.csat || 0,
          // Ouvidoria (24/09/2026): nasce zerado — ninguem classificou ainda
          // nenhum ticket. A tela Ouvidoria marca, ticket por ticket, quais
          // "ruim" sao nota 3 (neutro) e recalcula estes campos por cima do
          // que foi salvo aqui (src/lib/apuracao/ouvidoriaChat.js).
          total_neutros: dia.total_neutros || 0,
          negativos_confirmados: dia.negativos_confirmados ?? (dia.total_negativos || 0),
          csat_sem_neutros: dia.csat_sem_neutros ?? (dia.csat || 0),
          tem_nota: false,
        };
      } else {
        registro.cx = {
          media_dia: dia.media_dia || 0,
          total_avaliacoes_dia: dia.total_avaliacoes_dia || 0,
        };
      }
      return registro;
    });

    if (tipo === 'telefone') {
      base.canal_telefone = {
        csat: r.csatPercentual || 0,
        fcr: r.fcrPercentual || 0,
        performance: r.performance || 0,
        avaliados: r.totalAvaliadas || 0,
        total_atendimentos: r.totalLigacoes || 0,
        total_neutras: r.totalNeutras || 0,
        total_incompletas: r.totalIncompletas || 0,
      };
      base.satisfacao_media = r.csatPercentual || 0;
      base.percentual_avaliados = r.percentualAvaliados || 0;
    } else if (tipo === 'chat') {
      base.canal_chat = {
        csat: r.csatPercentual || 0,
        avaliados: r.totalAvaliados || 0,
        total_atendimentos: r.totalChats || 0,
        // Ouvidoria: comparativo informativo, nunca usado na premiacao.
        tem_nota: !!r.temNotaChat,
        total_neutros: r.totalNeutros || 0,
        negativos_confirmados: r.negativosConfirmados ?? (r.totalNegativos || 0),
        csat_sem_neutros: r.csatSemNeutros ?? (r.csatPercentual || 0),
      };
      base.satisfacao_media = r.csatPercentual || 0;
      base.percentual_avaliados = r.percentualAvaliados || 0;
    } else {
      base.avaliacao_cx = {
        nota_media: r.mediaCX || 0,
        total_avaliacoes: r.totalAvaliacoes || 0,
      };
      base.satisfacao_media = r.mediaCX || 0;
    }

    return base;
  });
}
