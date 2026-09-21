// Utilitários de validação de férias conforme CLT e regras internas

export function calcularDiasUteis(dataInicio, dataFim) {
  let count = 0;
  let current = new Date(dataInicio);
  const end = new Date(dataFim);
  
  while (current <= end) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export function calcularDiasCorridos(dataInicio, dataFim) {
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  const diffTime = Math.abs(fim - inicio);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

export function validarFracionamento(diasSolicitados, numeroFracoes) {
  const erros = [];
  
  if (numeroFracoes > 3) {
    erros.push('CLT permite no máximo 3 fracionamentos');
  }
  
  if (numeroFracoes === 1 && diasSolicitados < 14) {
    erros.push('Período único de férias deve ter no mínimo 14 dias corridos (Art. 134 CLT)');
  }
  
  if (numeroFracoes > 1 && diasSolicitados < 5) {
    erros.push('Cada fração deve ter no mínimo 5 dias corridos');
  }
  
  return { valido: erros.length === 0, erros };
}

export function validarVendaDias(diasVenda) {
  if (diasVenda > 10) {
    return { valido: false, erro: 'CLT permite vender no máximo 10 dias (1/3 de 30)' };
  }
  return { valido: true };
}

export function validarPeriodoConcessivo(dataInicio, concessivoFim) {
  const inicio = new Date(dataInicio);
  const fim = new Date(concessivoFim);
  
  if (inicio > fim) {
    return { 
      valido: false, 
      erro: 'Férias fora do período concessivo. Risco de dobra de férias pela CLT.' 
    };
  }
  
  return { valido: true };
}

export function calcularDataLimitePagamento(dataInicio) {
  const limite = new Date(dataInicio);
  limite.setDate(limite.getDate() - 2);
  return limite.toISOString().split('T')[0];
}

export function verificarSobreposicaoStaff(
  dataInicio, 
  dataFim, 
  todasSolicitacoes, 
  colaboradorId,
  isStaff
) {
  if (!isStaff) return { valido: true };
  
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);
  
  const conflitos = todasSolicitacoes.filter(sol => {
    if (sol.colaborador_id === colaboradorId) return false;
    if (!sol.staff_critico) return false;
    if (sol.status === 'recusada' || sol.status === 'cancelada') return false;
    
    const solInicio = new Date(sol.data_inicio);
    const solFim = new Date(sol.data_fim);
    
    // Verificar sobreposição
    return (inicio <= solFim && fim >= solInicio);
  });
  
  if (conflitos.length > 0) {
    return {
      valido: false,
      erro: 'Já existe outro colaborador de staff crítico com férias aprovadas/em análise neste período',
      conflitos
    };
  }
  
  return { valido: true };
}

export function verificarIntervaloMinimo(
  dataInicio,
  todasSolicitacoes,
  colaboradorId,
  isStaff
) {
  if (!isStaff) return { valido: true };
  
  // As datas daqui são "só data" lidas em UTC dos dois lados — as contas
  // batem. Só a data MOSTRADA precisa de timeZone: 'UTC', senão sai um dia antes.
  const inicio = new Date(dataInicio);
  const INTERVALO_MINIMO_DIAS = 2;
  
  // Encontrar a última férias de staff que terminou antes desta data
  const feriasAnteriores = todasSolicitacoes
    .filter(sol => {
      if (sol.colaborador_id === colaboradorId) return false;
      if (!sol.staff_critico) return false;
      if (sol.status !== 'aprovada') return false;
      
      const solFim = new Date(sol.data_fim);
      return solFim < inicio;
    })
    .sort((a, b) => new Date(b.data_fim) - new Date(a.data_fim));
  
  if (feriasAnteriores.length > 0) {
    const ultimaFerias = feriasAnteriores[0];
    const fimUltimaFerias = new Date(ultimaFerias.data_fim);
    const diasDiferenca = Math.ceil((inicio - fimUltimaFerias) / (1000 * 60 * 60 * 24));
    
    if (diasDiferenca < INTERVALO_MINIMO_DIAS) {
      return {
        valido: false,
        erro: `É necessário aguardar ${INTERVALO_MINIMO_DIAS} dias úteis após o retorno de outro staff crítico. Próxima data disponível: ${new Date(fimUltimaFerias.getTime() + INTERVALO_MINIMO_DIAS * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`,
        ultimaFerias
      };
    }
  }
  
  return { valido: true };
}

export function executarValidacaoCompleta(dados, todasSolicitacoes) {
  const validacoes = [];
  const erros = [];
  
  // 1. Calcular dias
  const diasCorridos = calcularDiasCorridos(dados.data_inicio, dados.data_fim);
  const diasUteis = calcularDiasUteis(dados.data_inicio, dados.data_fim);
  
  validacoes.push({
    regra: 'Cálculo de dias',
    aprovada: true,
    mensagem: `${diasCorridos} dias corridos, ${diasUteis} dias úteis`
  });
  
  // 2. Fracionamento
  const validFrac = validarFracionamento(diasCorridos, dados.numeroFracoes || 1);
  validacoes.push({
    regra: 'Fracionamento CLT',
    aprovada: validFrac.valido,
    mensagem: validFrac.valido ? 'Fracionamento permitido' : validFrac.erros.join(', ')
  });
  if (!validFrac.valido) erros.push(...validFrac.erros);
  
  // 3. Venda de dias
  if (dados.venda_dias > 0) {
    const validVenda = validarVendaDias(dados.venda_dias);
    validacoes.push({
      regra: 'Venda de dias (abono)',
      aprovada: validVenda.valido,
      mensagem: validVenda.valido ? `${dados.venda_dias} dias vendidos (dentro do limite)` : validVenda.erro
    });
    if (!validVenda.valido) erros.push(validVenda.erro);
  }
  
  // 4. Período concessivo
  const validConcessivo = validarPeriodoConcessivo(dados.data_inicio, dados.periodo_concessivo_fim);
  validacoes.push({
    regra: 'Período concessivo',
    aprovada: validConcessivo.valido,
    mensagem: validConcessivo.valido ? 'Dentro do período concessivo' : validConcessivo.erro
  });
  if (!validConcessivo.valido) erros.push(validConcessivo.erro);
  
  // 5. Sobreposição de staff
  const validSobreposicao = verificarSobreposicaoStaff(
    dados.data_inicio,
    dados.data_fim,
    todasSolicitacoes,
    dados.colaborador_id,
    dados.staff_critico
  );
  validacoes.push({
    regra: 'Sobreposição de staff',
    aprovada: validSobreposicao.valido,
    mensagem: validSobreposicao.valido ? 'Sem conflitos de staff' : validSobreposicao.erro
  });
  if (!validSobreposicao.valido) erros.push(validSobreposicao.erro);
  
  // 6. Intervalo mínimo
  const validIntervalo = verificarIntervaloMinimo(
    dados.data_inicio,
    todasSolicitacoes,
    dados.colaborador_id,
    dados.staff_critico
  );
  validacoes.push({
    regra: 'Intervalo mínimo entre staff',
    aprovada: validIntervalo.valido,
    mensagem: validIntervalo.valido ? 'Intervalo adequado' : validIntervalo.erro
  });
  if (!validIntervalo.valido) erros.push(validIntervalo.erro);
  
  return {
    valido: erros.length === 0,
    validacoes,
    erros,
    diasCorridos,
    diasUteis,
    dataLimitePagamento: calcularDataLimitePagamento(dados.data_inicio)
  };
}