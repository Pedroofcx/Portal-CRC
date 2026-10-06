import {
  obrigatorio, email, url, cpf, cnpj,
  numeroPositivo, dataNaoFutura, maximoItens, minimoCaracteres,
  emailCorporativo,
} from '../src/lib/validacao.js';
import { formatBRL, sanitizeSalario, temSalarioCadastrado, getSLAByType } from '../src/components/utils/helpers.js';
import { saudacao } from '../src/lib/saudacao.js';
import { primeiroNome } from '../src/lib/nomes.js';
import { resumoDoDia } from '../src/lib/resumoDoDia.js';
import { pontosDaFaixa, proximaFaixa } from '../src/lib/faixasIndicadores.js';
import { avaliarExigencia, volumePorCanal } from '../src/lib/elegibilidade.js';
import { pontosPorSemana, fimDoRitmo } from '../src/lib/ritmoSemanal.js';
import { posicaoNoRanking } from '../src/lib/posicaoRanking.js';
import { prazoDaTratativa, descreverPrazo, consumoDoPrazo, tempoEmPausa } from '../src/lib/prazoSla.js';
import { indicadoresDoCiclo } from '../src/lib/indicadoresCiclo.js';
import { conferirLinha } from './conferir-cores.mjs';
import { lerCsv, descobrirSeparador } from '../src/lib/csv.js';
import { detectarFonte, sugerirMapeamento, camposFaltando, periodoDoArquivo, vincularAgentes, conferirImportacao, lotesDeImportacao } from '../src/lib/apuracao/importacao.js';
import { normalizarData } from '../src/lib/apuracao/datas.js';
import { turnoDoHorario } from '../src/lib/escalas.js';
import { classificarTicket, filaDeNegativos, resumoDaFila } from '../src/lib/apuracao/ouvidoriaChat.js';
import { ligacoesAuditoria, resumoAuditoria } from '../src/lib/apuracao/auditoriaTelefone.js';
import { revisarLigacao } from '../src/lib/apuracao/revisaoTelefone.js';
import { indisponiveisEm, filaDoCanal, gradeDoMes, montarJustificativa, motivoDaJustificativa, resumoDeOverrides, filtrarHistorico, ultimosMeses } from '../src/lib/equidade.js';
import { vazioViraNulo } from '../src/lib/camposVazios.js';
import { decidir, permitido, extrairChave, sha256hex, validarNovaTratativa, slaDoTipo, paginacao, filtrosDeTratativas, CAMPOS_TRATATIVA, CAMPOS_COLABORADOR, RECURSOS, validarAtualizacaoTratativa, validarExclusao, ESTADOS_QUE_NAO_EXCLUEM, filtrosDeApuracao, resumoPorEtapa, CAMPOS_APURACAO, validarLoteApuracao, prepararImportacaoApi, ehIdDeLoteApi, novoIdDeLoteApi, MAXIMO_LINHAS_APURACAO, situacaoParaCliente, montarAcompanhamento, interpretarCodigo, cnpjValido, apenasDigitos, escolherDoCliente } from '../supabase/functions/api/politica.js';
import { montarNotificacoes, agruparPorCategoria as agruparNotificacoes, rotuloDoSelo, CATEGORIAS } from '../src/lib/notificacoes.js';
import { planejarSincronizacao, statusDoCiclo, fragmentosDasParcelas, normalizarEmail } from '../supabase/functions/sincronizar-gestaoclick/plano.js';
import { precisaSincronizar, HORAS_ATE_ATUALIZAR } from '../src/lib/sincronizacao.js';
import path from 'node:path';
import { carregarModuloJsx } from './lib/carregar-jsx.mjs';

// calculosApuracao.jsx é JS puro com extensão .jsx (sem elementos JSX de
// verdade) — carregado via esbuild porque o Node não importa .jsx direto.
const { calcularChat, calcularTelefone, validarConsistenciaTelefone, calcularCX } = await import('../supabase/functions/api/apuracao/calculos.js');
import { produtividadePorTurno } from '../src/lib/relatorios/turnos.js';
import { diasCorridos, saldoDoCiclo, situacaoDoCiclo, cicloParaAData, deFeriasEm, lotacaoNoPeriodo, conferirPedido, fragmentoDoPedido, proximasFerias } from '../src/lib/ferias.js';
import { situacaoDaPesquisa, quemRespondeu, resultadoDasPerguntas, resumoDaPesquisa, montarParticipacao } from '../src/lib/pesquisas.js';
import { segundaDaSemana, semanaDeReferencia, diasDaSemana, trabalhoDaSemana, trabalhoDe, montarSemanaDeTrabalho, avisosDoTrabalho, montarTurnosDaSemana, meuDiaNoTurno, equilibrioDoAtendimento, estadoNoTurno, definirEstado, proximoEstado, inverterDia, copiarDia, trabalhandoNaMetade } from '../src/lib/escalas.js';
import { mediaDasCompetencias, leiturasDoColaborador, palavrasRecorrentes, pontosDoRadar, evolucaoDasLeituras } from '../src/lib/competencias.js';
import { proximaVersao, popsParaCiencia, agruparPorCategoria, popsDoTipo, fotografia } from '../src/lib/pops.js';
import { filaDePendencias, avisosVisiveis, pesquisasVisiveis, obrigatoriasSemResposta, montarResposta } from '../src/lib/pendencias.js';
import { traduzirErro } from '../src/lib/erros.js';
import { formatDateSP, dataDoCalendario } from '../src/components/utils/helpers.js';
import { getMesReferencia } from '../src/components/ferramentas/apoio/constants.js';
import { montarBonus, somaDoBonus, ciclosEmOrdem } from '../src/lib/bonusManual.js';
import { vencidasDaEquipe, situacaoDoPrazo, ordenarPorPrazo, registrosNoCiclo, percentualNoSla, acompanhamentoDa } from '../src/lib/cicloEquipe.js';
import { calculateCSATPoints, calculateCXPoints, calculateTratativaPoints, situacaoReplicavel } from '../src/components/utils/helpers.js';
import { reaberturaDe, comReaberturaApurada, aberturasNoCiclo, cicloPagaAbertura, pontosDeTratativasNoCiclo, tratativaNosCiclo } from '../src/lib/pontuacaoCiclo.js';
import { extratoDoAgente } from '../src/lib/extratoPontos.js';
import { calcularDadosConsolidados, cicloDaData } from '../src/lib/hanseiDados.js';
import { desfechoDaContestacao, resumoFinanceiro } from '../src/lib/relatorios/financeiro.js';
import { pessoasNoPeriodo } from '../src/lib/relatorios/pessoas.js';
import { filaDeHoje, entradaESaida, tempoPorCanal, diagnosticoDeCarga } from '../src/lib/relatorios/operacao.js';
import { resumoDoCanal, distribuicaoDeChegada } from '../src/lib/relatorios/canais.js';
import { resumoQualidade, diaADiaQualidade, diaADiaEquipeQualidade } from '../src/lib/relatorios/qualidade.js';
import { resumoJornada } from '../src/lib/relatorios/jornada.js';
import {
  PERGUNTAS_AVD, NOTAS as NOTAS_AVD, limitarNota, competenciaDoEnvio, lerCarimbo, respostasDaLinha, notasDaResposta, serieMensalAvd, textosDaResposta,
} from '../src/lib/avd.js';

let passou = 0;
let falhou = 0;

function checa(nome, real, esperado) {
  const ok = esperado === null ? real === null : (real !== null && real.includes(esperado));
  if (ok) { passou++; console.log('  OK   ' + nome); }
  else { falhou++; console.log('  FALHA ' + nome + '\n        esperado: ' + esperado + '\n        obtido:   ' + real); }
}

console.log('\n== obrigatorio ==');
checa('vazio acusa', obrigatorio('O nome')(''), 'O nome é obrigatório');
checa('rotulo feminino concorda', obrigatorio('A prioridade')(''), 'A prioridade é obrigatória.');
checa('so espacos acusa', obrigatorio('O nome')('   '), 'obrigatório');
checa('array vazio acusa', obrigatorio('Um item')([]), 'obrigatório');
checa('preenchido passa', obrigatorio('O nome')('Pedro'), null);
checa('zero passa (numero valido)', obrigatorio('A qtd')(0), null);

console.log('\n== email ==');
checa('sem arroba acusa', email('pedro.com'), 'nome@empresa.com.br');
checa('sem dominio acusa', email('pedro@'), 'nome@empresa');
checa('valido passa', email('pedro@clickdigital.com.br'), null);
checa('vazio passa (obrigatoriedade e outra regra)', email(''), null);

console.log('\n== url ==');
checa('sem protocolo acusa', url('O link')('zendesk.com/1'), 'http:// ou https://');
checa('valida passa', url('O link')('https://zendesk.com/tickets/1'), null);

console.log('\n== cpf ==');
checa('curto diz quantos faltam', cpf('123'), 'Você digitou 3');
checa('repetido acusa', cpf('11111111111'), 'todos os dígitos são iguais');
checa('digito errado acusa', cpf('12345678900'), 'não é válido');
checa('valido passa', cpf('52998224725'), null);

console.log('\n== cnpj ==');
checa('curto diz quantos faltam', cnpj('123'), 'Você digitou 3');
checa('valido passa', cnpj('11222333000181'), null);
checa('com pontuacao passa', cnpj('11.222.333/0001-81'), null);

console.log('\n== numeroPositivo ==');
checa('zero acusa', numeroPositivo('O valor')('0'), 'maior que zero');
checa('negativo acusa', numeroPositivo('O valor')('-5'), 'maior que zero');
checa('texto acusa', numeroPositivo('O valor')('abc'), 'precisa ser um número');
checa('positivo passa', numeroPositivo('O valor')('1500.50'), null);
checa('virgula decimal passa', numeroPositivo('O valor')('1500,50'), null);

console.log('\n== dataNaoFutura ==');
const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
checa('futura acusa', dataNaoFutura('A data')(amanha), 'não pode ser uma data futura');
checa('passada passa', dataNaoFutura('A data')(ontem), null);

console.log('\n== maximoItens ==');
checa('excedente diz quanto', maximoItens(3, 'submotivos')([1, 2, 3, 4]), 'Você selecionou 4');
checa('no limite passa', maximoItens(3, 'submotivos')([1, 2, 3]), null);

console.log('\n== minimoCaracteres ==');
checa('curto diz quanto digitou', minimoCaracteres(10, 'A descrição')('abc'), 'Você digitou 3');

console.log('\n== formatBRL ==');
// Regressão do bug mais grave deste arquivo: formatBRL chamava
// sanitizeSalario e devolvia R$ 2.000,00 para QUALQUER valor zerado — em 82
// pontos de 14 arquivos, incluindo os relatórios financeiros.
checa('zero e zero, nao dois mil', formatBRL(0), 'R$ 0,00');
checa('nulo e zero', formatBRL(null), 'R$ 0,00');
checa('indefinido e zero', formatBRL(undefined), 'R$ 0,00');
checa('texto invalido e zero', formatBRL('abc'), 'R$ 0,00');
checa('valor normal formata', formatBRL(1500), 'R$ 1.500,00');
checa('string no formato BR formata', formatBRL('1.234,56'), 'R$ 1.234,56');
checa('negativo preserva o sinal', formatBRL(-50), 'R$ -50,00');

console.log('\n== sanitizeSalario ==');
// O comentário da função sempre prometeu 0 para valor inválido; o código
// aplicava R$ 2.000,00. Agora cumpre o que documenta.
checa('ausente devolve 0', String(sanitizeSalario(null)), '0');
checa('zero devolve 0', String(sanitizeSalario(0)), '0');
checa('negativo devolve 0', String(sanitizeSalario(-100)), '0');
checa('texto invalido devolve 0', String(sanitizeSalario('nao sei')), '0');
checa('numero valido passa', String(sanitizeSalario(3500)), '3500');
checa('formato BR passa', String(sanitizeSalario('R$ 3.500,00')), '3500');

console.log('\n== temSalarioCadastrado ==');
checa('sem salario e falso', String(temSalarioCadastrado({ salario: null })), 'false');
checa('com salario e verdadeiro', String(temSalarioCadastrado({ salario: 3500 })), 'true');

console.log('\n== saudacao (tela de entrada) ==');
// Limites definidos pelo Pedro: 00:00-12:00 dia, 12:01-18:00 tarde,
// 18:01-23:59 noite. Os de borda sao os que quebram com um < no lugar de <=.
const as = (h, m) => new Date(2026, 8, 18, h, m);
checa('00:00 e bom dia', saudacao(as(0, 0)), 'Bom dia');
checa('11:59 e bom dia', saudacao(as(11, 59)), 'Bom dia');
checa('12:00 ainda e bom dia', saudacao(as(12, 0)), 'Bom dia');
checa('12:01 ja e boa tarde', saudacao(as(12, 1)), 'Boa tarde');
checa('18:00 ainda e boa tarde', saudacao(as(18, 0)), 'Boa tarde');
checa('18:01 ja e boa noite', saudacao(as(18, 1)), 'Boa noite');
checa('23:59 e boa noite', saudacao(as(23, 59)), 'Boa noite');

console.log('\n== emailCorporativo (tela de entrada) ==');
const corp = emailCorporativo('clickdigital.com.br');
checa('dominio certo passa', corp('pedro.soares@clickdigital.com.br'), null);
checa('maiusculas passam', corp('Pedro.Soares@ClickDigital.com.BR'), null);
checa('espacos nas pontas passam', corp('  pedro@clickdigital.com.br '), null);
checa('vazio fica para o obrigatorio', corp(''), null);
checa('outro dominio acusa', corp('pedro@gmail.com'), '@clickdigital.com.br');
checa('dominio parecido acusa', corp('x@falsoclickdigital.com.br'), '@clickdigital.com.br');
checa('subdominio de fora acusa', corp('x@clickdigital.com.br.golpe.com'), '@clickdigital.com.br');
checa('dois arrobas acusa', corp('x@y@clickdigital.com.br'), '@clickdigital.com.br');

console.log('\n== primeiroNome (boas-vindas) ==');
checa('nome composto', primeiroNome('Ana Flávia Guelber Amarante'), 'Ana');
checa('nome simples', primeiroNome('Julliano Vasconcelos Belisario'), 'Julliano');
checa('acento preservado', primeiroNome('Bárbara Emanuella dos Santos'), 'Bárbara');
checa('caixa alta vira normal', primeiroNome('TEFÃO FURACÃO'), 'Tefão');
checa('espacos sobrando', primeiroNome('   Pedro   Henrique '), 'Pedro');
checa('e-mail nunca vira nome', primeiroNome('sirlene.guedes@clickdigital.com.br'), 'Time');
checa('vazio vira Time', primeiroNome(''), 'Time');
checa('nulo vira Time', primeiroNome(null), 'Time');

console.log('\n== resumoDoDia (boas-vindas) ==');
// 18/09/2026 14:00. Prazo = data_registro + sla_atribuido horas.
const agora = new Date(2026, 8, 18, 14, 0);
const h = (horasAtras) => new Date(agora.getTime() - horasAtras * 3600e3).toISOString();
const r = resumoDoDia([
  { status: 'em_andamento', data_registro: h(20), sla_atribuido: 24 },   // vence 18:00 hoje
  { status: 'registrada', data_registro: h(30), sla_atribuido: 24 },     // venceu 08:00 hoje
  { status: 'em_andamento', data_registro: h(1), sla_atribuido: 72 },    // vence em 3 dias
  { status: 'dependencia_externa', data_registro: h(2), sla_atribuido: null }, // sem prazo
  { status: 'encerrada', data_registro: h(50), sla_atribuido: 24 },      // fechada: fora
  { status: 'em_andamento', excluida: true, data_registro: h(50), sla_atribuido: 24 }, // excluida: fora
], agora);
checa('conta so as abertas', String(r.abertas), '4');
checa('vence hoje, ainda no prazo', String(r.vencemHoje), '1');
checa('ja vencida nao conta como hoje', String(r.vencidas), '1');
checa('lista vazia nao quebra', JSON.stringify(resumoDoDia([], agora)), '{"abertas":0,"vencemHoje":0,"vencidas":0}');

console.log('\n== faixas dos indicadores (Estrutura de Trabalho, sec. 4) ==');
checa('CSAT 84,9 nao pontua', String(pontosDaFaixa('csat', 84.9)), '0');
checa('CSAT 85 vale 7', String(pontosDaFaixa('csat', 85)), '7');
checa('CSAT 92 vale 9', String(pontosDaFaixa('csat', 92)), '9');
checa('CSAT 95 vale 10', String(pontosDaFaixa('csat', 95)), '10');
checa('performance 89,9 nao pontua', String(pontosDaFaixa('performance', 89.9)), '0');
checa('performance 90 vale 7', String(pontosDaFaixa('performance', 90)), '7');
checa('CX 4,2 vale 1', String(pontosDaFaixa('cx', 4.2)), '1');
checa('CX 4,4 vale 4', String(pontosDaFaixa('cx', 4.4)), '4');
checa('sem valor nao pontua', String(pontosDaFaixa('csat', null)), '0');
checa('proxima do CSAT 92 e 95 com +1', JSON.stringify(proximaFaixa('csat', 92)), '{"limiar":95,"pontos":10,"ganho":1}');
checa('proxima do CX 4,4 e 4,5 com +6', JSON.stringify(proximaFaixa('cx', 4.4)), '{"limiar":4.5,"pontos":10,"ganho":6}');
checa('proxima abaixo do minimo e a primeira faixa', JSON.stringify(proximaFaixa('performance', 80)), '{"limiar":90,"pontos":7,"ganho":7}');
checa('na faixa maxima nao ha proxima', String(proximaFaixa('csat', 97)), 'null');
checa('helpers antigos leem a mesma fonte', String(calculateCSATPoints(90) + calculateCXPoints(4.5)), '19');

console.log('\n== elegibilidade (exigencias cadastradas) ==');
const vol = volumePorCanal([
  { tipo_tratativa: 'reclame_aqui' }, { tipo_tratativa: 'reclame_aqui' }, { tipo_tratativa: 'reclame_aqui' }, { tipo_tratativa: 'reclame_aqui' },
  { tipo_tratativa: 'reclamacao_interna' }, { tipo_tratativa: 'reclamacao_interna' }, { tipo_tratativa: 'reclamacao_interna' },
  { tipo_tratativa: 'contestacao_compra' },
  { tipo_tratativa: 'google_meu_negocio', excluida: true },
]);
checa('conta por canal', JSON.stringify(vol), '{"reclamacao_interna":3,"reclame_aqui":4,"google_meu_negocio":0,"contestacao":1}');
checa('CSAT acima do minimo', avaliarExigencia({ tipo_validacao: 'csat_minimo', valor_minimo: 85 }, { csat: 88 }).status, 'ok');
checa('CSAT abaixo do minimo', avaliarExigencia({ tipo_validacao: 'csat_minimo', valor_minimo: 85 }, { csat: 80 }).status, 'pendente');
checa('sem apuracao nao e reprovacao', avaliarExigencia({ tipo_validacao: 'csat_minimo', valor_minimo: 85 }, {}).status, 'sem_dado');
checa('CX 4,2 cumpre minimo 4,2', avaliarExigencia({ tipo_validacao: 'avaliacoes_cx', valor_minimo: 4.2 }, { cx: 4.2 }).status, 'ok');
checa('canal abaixo de 4 fica pendente', avaliarExigencia({ tipo_validacao: 'volume_minimo_canal', volume_minimo_canal: 4 }, { volume: vol }).detalhe, '2 canal(is)');
checa('tipo sem fonte fica com o gestor', avaliarExigencia({ tipo_validacao: 'cursos_obrigatorios' }, {}).status, 'sem_dado');

console.log('\n== ritmo semanal ==');
// Sexta, 18/09/2026. Semana atual comeca segunda 14/09.
const hoje = new Date(2026, 8, 18, 15, 0);
const semanas = pontosPorSemana([
  { pontos: 2.5, data_encerramento: new Date(2026, 8, 14, 9).toISOString() },   // segunda desta semana
  { pontos: 1, data_encerramento: new Date(2026, 8, 18, 10).toISOString() },    // hoje
  { pontos: 1.5, data_encerramento: new Date(2026, 8, 13, 22).toISOString() },  // domingo: semana passada
  { pontos: 9, data_encerramento: new Date(2026, 5, 1).toISOString() },         // fora das 6 semanas
], hoje, 6);
checa('seis semanas', String(semanas.length), '6');
checa('esta semana soma segunda e hoje', String(semanas[5].pontos), '3.5');
checa('domingo cai na semana anterior', String(semanas[4].pontos), '1.5');
checa('fora da janela nao entra', String(semanas.reduce((a, s) => a + s.pontos, 0)), '5');

console.log('\n== posicao no ranking ==');
const rk = [{ id: 'a', totalPontos: 20 }, { id: 'b', totalPontos: 15 }, { id: 'c', totalPontos: 15 }, { id: 'd', totalPontos: 12.5 }];
checa('lider nao tem distancia', JSON.stringify(posicaoNoRanking(rk, 'a')), '{"posicao":1,"total":4,"distancia":0,"posicaoAcima":null}');
checa('empate divide a posicao', String(posicaoNoRanking(rk, 'c').posicao), '2');
checa('distancia e para quem esta logo acima', String(posicaoNoRanking(rk, 'd').distancia), '2.5');
checa('com empate acima, o alvo e o 2o e nao um 3o inexistente', String(posicaoNoRanking(rk, 'd').posicaoAcima), '2');
checa('empatado em 2o mira o 1o', String(posicaoNoRanking(rk, 'b').posicaoAcima), '1');
checa('fora do ranking devolve nulo', String(posicaoNoRanking(rk, 'z')), 'null');

console.log('\n== prazo do SLA (fila do operador) ==');
const ag = new Date(2026, 8, 18, 14, 0);
const emH = (h) => new Date(ag.getTime() + h * 3600e3);
checa('prazo = registro + sla', prazoDaTratativa({ data_registro: '2026-09-18T10:00:00Z', sla_atribuido: 24 }).toISOString(), '2026-09-19T10:00:00');
checa('sem sla nao tem prazo', String(prazoDaTratativa({ data_registro: '2026-09-18T10:00:00Z' })), 'null');
checa('vencido ha 2h', descreverPrazo(emH(-2), ag), 'vencido há 2h');
checa('menos de 1h em minutos', descreverPrazo(emH(0.75), ag), '45 min');
checa('23h nao vira 1 dia', descreverPrazo(emH(23.9), ag), '23h');
checa('um dia no singular', descreverPrazo(emH(30), ag), '1 dia');
checa('varios dias', descreverPrazo(emH(72), ag), '3 dias');
checa('metade do prazo consumida', String(consumoDoPrazo({ data_registro: emH(-12).toISOString(), sla_atribuido: 24 }, ag)), '0.5');

console.log('\n== dia de virada: so do Ciclo 3 em diante (decisao de 02/10/2026) ==');
{
  const c1 = { id: 'c1', nome: 'Ciclo 1', data_inicio: '2026-03-14', data_fim: '2026-06-16' };
  const c2 = { id: 'c2', nome: 'Ciclo 2', data_inicio: '2026-06-16', data_fim: '2026-09-16' };
  const c3 = { id: 'c3', nome: 'Ciclo 3', data_inicio: '2026-09-16', data_fim: '2026-12-16' };
  const enc = (iso) => ({ id: 'x', status: 'encerrada', data_encerramento: iso, data_registro: iso });
  checa('16/09 continua no Ciclo 2', String(tratativaNosCiclo(enc('2026-09-16T15:00:00'), c2)), 'true');
  checa('16/09 sai do Ciclo 3 (so conta no que termina)', String(tratativaNosCiclo(enc('2026-09-16T15:00:00'), c3)), 'false');
  checa('17/09 ja e do Ciclo 3', String(tratativaNosCiclo(enc('2026-09-17T15:00:00'), c3)), 'true');
  checa('ultimo segundo do dia 16 ainda e do ciclo que termina', String(tratativaNosCiclo(enc('2026-09-16T23:59:59.500'), c2)), 'true');
  checa('CICLO FECHADO NAO MUDA: 16/06 continua nos dois', `${tratativaNosCiclo(enc('2026-06-16T15:00:00'), c1)}/${tratativaNosCiclo(enc('2026-06-16T15:00:00'), c2)}`, 'true/true');
  const ab = { id: 'a', agente_responsavel_id: 'ag', data_registro: '2026-09-16T15:00:00' };
  checa('abertura de 16/09 conta so no Ciclo 2', `${aberturasNoCiclo([ab], c2).length}/${aberturasNoCiclo([ab], c3).length}`, '1/0');
  checa('Hansei: 16/09 vai para o ciclo que termina', cicloDaData([c3, c2], '2026-09-16').id, 'c2');
  checa('Hansei: 17/09 e do novo', cicloDaData([c3, c2], '2026-09-17').id, 'c3');
  checa('Hansei: 16/06 segue a ordem de sempre', cicloDaData([c2, c1], '2026-06-16').id, 'c2');
}

console.log('\n== SLA conta do inicio e pausa em dependencia externa (decisao de 02/10/2026) ==');
{
  const h = (hh, mm = 0) => new Date(Date.UTC(2026, 8, 22, hh, mm)).toISOString();
  const mudou = (de, para, quando) => ({ estado_anterior: de, estado_novo: para, data_mudanca: quando });
  // registrada 22/09 08:00, iniciada 10:00, 4h em dependencia externa (12h-16h), prazo 24h
  const t = {
    data_registro: h(8), data_inicio_tratativa: h(10), sla_atribuido: 24,
    historico_estados: [
      mudou(null, 'registrada', h(8)), mudou('registrada', 'tratativa_iniciada', h(10)),
      mudou('tratativa_iniciada', 'dependencia_externa', h(12)),
      { estado_anterior: 'dependencia_externa', estado_novo: 'dependencia_externa', data_mudanca: h(13), observacao: 'nota livre' },
      mudou('dependencia_externa', 'em_andamento', h(16)),
    ],
  };
  const ini = Date.parse(h(10));
  checa('conta do inicio, nao do registro', String(prazoDaTratativa({ ...t, historico_estados: [] }, new Date(h(11))).toISOString()), '2026-09-23T10:00:00');
  checa('pausa de 4h empurra o prazo', String(prazoDaTratativa(t, new Date(h(20))).toISOString()), '2026-09-23T14:00:00');
  checa('nota livre nao interrompe a pausa', String(tempoEmPausa(t.historico_estados, ini, Date.parse(h(20))) / 3600e3), '4');
  // dentro da pausa o prazo anda junto com o relogio: nunca vence enquanto pausada
  const parada = { ...t, historico_estados: t.historico_estados.slice(0, 3) };
  checa('pausada agora: prazo acompanha o relogio', String(prazoDaTratativa(parada, new Date(h(14))).toISOString()), '2026-09-23T12:00:00');
  // TRT-0363: dependencia externa 2s depois de iniciar ate encerrar => ~0 de tempo contado
  const trt0363 = [mudou('tratativa_iniciada', 'dependencia_externa', '2026-09-22T17:56:01.910Z'), mudou('dependencia_externa', 'encerrada', '2026-09-25T14:35:12.039Z')];
  const emPausa = tempoEmPausa(trt0363, Date.parse('2026-09-22T17:55:59.089Z'), Date.parse('2026-09-25T14:35:12.039Z'));
  const bruto = Date.parse('2026-09-25T14:35:12.039Z') - Date.parse('2026-09-22T17:55:59.089Z');
  checa('TRT-0363 conta so 2s de trabalho', String(Math.round((bruto - emPausa) / 1000)), '3');
  checa('historico ilegivel nao quebra', String(tempoEmPausa('x', 0, 10)), '0');
}

console.log('\n== indicadores do ciclo (ciclo inteiro, dia a dia) ==');
{
  const cicloT = { data_inicio: '2026-06-16', data_fim: '2026-09-16' };
  const tel = (data, lig, at, av, pos, neg = Math.max(0, av - pos)) => ({ data, telefone: { total_ligacoes: lig, total_atendidas: at, total_avaliadas: av, total_positivas: pos, total_negativas: neg } });
  const chat = (data, av, pos) => ({ data, chat: { total_avaliados: av, total_positivos: pos } });
  const apur = [
    // julho: importado duas vezes com o dia 10 repetido — vale o mais recente
    { id: 'a', tipo_apuracao: 'telefone', created_date: '2026-07-20', dados_por_data: [tel('2026-07-10', 10, 10, 10, 9), tel('2026-07-11', 10, 9, 10, 10)] },
    { id: 'b', tipo_apuracao: 'telefone', created_date: '2026-07-05', dados_por_data: [tel('2026-07-10', 99, 0, 99, 0)] },
    // dia fora do ciclo nao entra
    { id: 'c', tipo_apuracao: 'telefone', created_date: '2026-06-20', dados_por_data: [tel('2026-06-15', 50, 0, 50, 0)] },
    { id: 'd', tipo_apuracao: 'chat', created_date: '2026-08-01', dados_por_data: [chat('2026-07-30', 10, 8)] },
    { id: 'e', tipo_apuracao: 'cx', periodo_inicio: '2026-08-01', periodo_fim: '2026-08-31', created_date: '2026-09-01', historico_detalhado: [{ data: '2026-08-02', media: 4.4, observacao: 't1' }, { data: '2026-08-03', media: 4.6, observacao: 't2' }] },
    { id: 'f', tipo_apuracao: 'cx', periodo_inicio: '2026-09-01', periodo_fim: '2026-09-30', created_date: '2026-10-01', historico_detalhado: [{ data: '2026-09-02', media: 1, observacao: 't3' }] },
  ];
  const ind = indicadoresDoCiclo(apur, cicloT);
  checa('CSAT telefone: dias do ciclo, sem duplicar', String(ind.csat.telefone), '95');
  checa('CSAT = (telefone + chat) / 2', String(ind.csat.valor), '87.5');
  checa('performance = atendidas / ligacoes', String(ind.performance.valor), '95');
  checa('CX = media das avaliacoes; setembro fica para o Ciclo 3', String(ind.cx.valor), '4.5');
  checa('pontos: CSAT 87,5 = 7, performance 95 = 7, CX 4,5 = 10', `${ind.pontos.csat}/${ind.pontos.performance}/${ind.pontos.cx}/${ind.pontos.total}`, '7/7/10/24');
  checa('so um canal com avaliacao: usa esse canal', String(indicadoresDoCiclo([apur[3]], cicloT).csat.valor), '80');
  checa('sem apuracao no ciclo: aguardando e 0 ponto', `${indicadoresDoCiclo([apur[2]], cicloT).csat}/${indicadoresDoCiclo([apur[2]], cicloT).pontos.total}`, 'null/0');
  checa('sem ciclo nao ha indicador', String(indicadoresDoCiclo(apur, null).cx), 'null');
}

console.log('\n== tela do gestor: vencidas, registros e acompanhamento ==');
{
  const reg = (h) => emH(h).toISOString();
  const lista = [
    { id: 't1', status: 'em_andamento', agente_responsavel_id: 'A', agente_responsavel_nome: 'Ana Souza', data_registro: reg(-48), sla_atribuido: 24 },
    { id: 't2', status: 'tratativa_iniciada', agente_responsavel_id: 'A', data_registro: reg(-20), sla_atribuido: 24 },
    { id: 't3', status: 'aguardando_terceiro', agente_responsavel_id: 'B', data_registro: reg(-1), sla_atribuido: 72 },
    { id: 't4', status: 'encerrada', agente_responsavel_id: 'A', data_registro: reg(-90), sla_atribuido: 24 },
    { id: 't5', status: 'em_andamento', excluida: true, agente_responsavel_id: 'A', data_registro: reg(-90), sla_atribuido: 24 },
    { id: 't6', status: 'em_andamento', agente_responsavel_id: 'B', data_registro: reg(-5) },
    { id: 't7', status: 'em_andamento', agente_responsavel_id: 'B', data_registro: reg(-100), sla_atribuido: 24 },
    { id: 't8', status: 'em_andamento', agente_responsavel_id: 'C', data_registro: reg(-13), sla_atribuido: 24 },
  ];
  const r = vencidasDaEquipe(lista, ag);
  checa('abertas: encerrada e excluida ficam de fora', String(r.abertas), '6');
  checa('vencidas agora (nao o historico)', String(r.vencidas), '2');
  checa('vence ainda hoje', String(r.venceHoje), '1');
  checa('prazo 01:00 de amanha nao e "hoje"', situacaoDoPrazo(lista[7], ag), 'no_prazo');
  checa('sem SLA fica sem prazo', situacaoDoPrazo(lista[5], ag), 'sem_prazo');
  checa('empate em vencidas: mais abertas primeiro', r.porAgente.map((p) => p.id).join(','), 'B,A,C');
  checa('conta por agente', `${r.porAgente[1].abertas}/${r.porAgente[1].vencidas}/${r.porAgente[1].venceHoje}`, '2/1/1');
  checa('ordem por prazo: a mais atrasada primeiro, sem prazo no fim',
    ordenarPorPrazo(lista.filter((t) => ['t1', 't2', 't3', 't6', 't7', 't8'].includes(t.id))).map((t) => t.id).join(','),
    't7,t1,t2,t8,t3,t6');

  const cicloR = { data_inicio: '2026-06-16', data_fim: '2026-09-16' };
  const vol = registrosNoCiclo([
    { tipo_tratativa: 'reclame_aqui', data_registro: '2026-06-16T08:00:00' },
    { tipo_tratativa: 'reclame_aqui', data_registro: '2026-06-15T23:00:00' },
    { tipo_tratativa: 'contestacao_compra', data_registro: '2026-09-16T20:00:00' },
    { tipo_tratativa: 'contestacao', data_registro: '2026-09-17T08:00:00' },
  ], cicloR);
  checa('registro no 1o dia do ciclo conta', String(vol.reclame_aqui), '1');
  checa('ultimo dia conta; contestacao_compra vira contestacao', String(vol.contestacao), '1');
  checa('sem ciclo, nada conta', String(registrosNoCiclo([{ tipo_tratativa: 'reclame_aqui', data_registro: '2026-07-01' }], null).reclame_aqui), '0');

  checa('% no SLA ignora quem nao tem marcacao', String(percentualNoSla([{ encerrado_no_sla: true }, { encerrado_no_sla: true }, { encerrado_no_sla: false }, {}])).slice(0, 5), '66.66');
  checa('% no SLA sem marcacao nenhuma', String(percentualNoSla([{}, {}])), 'null');

  const ac = acompanhamentoDa('A', {
    pdis: [
      { colaborador_id: 'A', status: 'em_andamento', titulo: 'Comunicação', percentual_conclusao: 40, data_criacao: '2026-08-01' },
      { colaborador_id: 'A', status: 'concluido', titulo: 'Antigo' },
      { colaborador_id: 'B', status: 'em_andamento', titulo: 'De outra pessoa' },
    ],
    observacoes: [
      { colaboradores_ids: ['A', 'B'], titulo: 'Feedback 1:1', data_registro: reg(-72) },
      { colaboradores_ids: ['A'], titulo: 'Antigo', data_registro: reg(-500) },
      { colaboradores_ids: ['B'], titulo: 'De outra pessoa', data_registro: reg(-1) },
    ],
    hanseis: [{ colaborador_id: 'A', data_envio: '2026-09-10T12:00:00Z', visualizado: false }],
    ciclosFerias: [{ colaborador_id: 'A', fragmentos: [
      { data_inicio: '2026-09-01', data_fim: '2026-09-10' },
      { data_inicio: '2026-12-01', data_fim: '2026-12-10' },
      { data_inicio: '2026-10-05', data_fim: '2026-10-14', dias: 10 },
    ] }],
  }, ag);
  checa('PDI em andamento da pessoa', `${ac.pdi.titulo} ${ac.pdi.percentual}`, 'Comunicação 40');
  checa('ultimo feedback e o mais recente dela', `${ac.feedback.titulo} ${ac.feedback.dias}`, 'Feedback 1:1 3');
  checa('Hansei nao visualizado', String(ac.hansei.visualizado), 'false');
  checa('proximas ferias: ignora as que ja passaram', `${ac.ferias.inicio} ${ac.ferias.dias}`, '2026-10-05 10');
  checa('ciclo encerrado: ritmo para no ultimo dia', fimDoRitmo({ data_fim: '2026-09-16' }, ag).toDateString(), new Date(2026, 8, 16).toDateString());
  checa('ciclo em andamento: ritmo vai ate hoje', String(fimDoRitmo({ data_fim: '2026-12-16' }, ag).getTime()), String(ag.getTime()));
  checa('sem registro nenhum', JSON.stringify(acompanhamentoDa('Z', {}, ag)), '{"pdi":null,"feedback":null,"hansei":null,"ferias":null}');
}

console.log('\n== bonus manual e historico de ciclos ==');
{
  const ciclo = { id: 'c3', nome: 'Ciclo 3 2026', data_inicio: '2026-09-16', data_fim: '2026-12-16' };
  const pessoa = { id: 'p1', nome_completo: 'Dayane Santos' };
  const gestor = { id: 'g1', nome_completo: 'Pedro Soares' };
  const ok = montarBonus({ ciclo, pessoa, pontos: '2,5', descricao: '  Ajudou no mutirão  ', gestor });
  checa('virgula vira ponto', String(ok.registro.total_pontos), '2.5');
  checa('registro completo', `${ok.registro.tipo} ${ok.registro.ciclo_id} ${ok.registro.colaborador_id} ${ok.registro.lancado_por_id}`, 'bonus_manual c3 p1 g1');
  checa('motivo sem espacos nas pontas', `[${ok.registro.descricao}]`, '[Ajudou no mutirão]');
  checa('guarda o nome do ciclo', ok.registro.periodo_trimestre, 'Ciclo 3 2026');
  checa('zero pontos recusa', montarBonus({ ciclo, pessoa, pontos: '0', descricao: 'x', gestor }).erro, 'maior que zero');
  checa('pontos negativos recusa', montarBonus({ ciclo, pessoa, pontos: '-3', descricao: 'x', gestor }).erro, 'maior que zero');
  checa('texto no lugar de pontos recusa', montarBonus({ ciclo, pessoa, pontos: 'dez', descricao: 'x', gestor }).erro, 'maior que zero');
  checa('sem motivo recusa', montarBonus({ ciclo, pessoa, pontos: '3', descricao: '   ', gestor }).erro, 'motivo');
  checa('sem pessoa recusa', montarBonus({ ciclo, pessoa: null, pontos: '3', descricao: 'x', gestor }).erro, 'pessoa');
  checa('sem ciclo recusa', montarBonus({ ciclo: null, pessoa, pontos: '3', descricao: 'x', gestor }).erro, 'ciclo');
  checa('soma todos os lancamentos', String(somaDoBonus([{ total_pontos: 2.5 }, { total_pontos: 3 }, {}])), '5.5');
  checa('historico do mais recente ao mais antigo',
    ciclosEmOrdem([{ id: 'c1', data_inicio: '2026-03-14' }, { id: 'c3', data_inicio: '2026-09-16' }, { id: 'c2', data_inicio: '2026-06-16' }]).map((c) => c.id).join(','),
    'c3,c2,c1');
}

console.log('\n== datas sem hora (colunas date) nao perdem um dia ==');
checa('so data DD/MM/YYYY', formatDateSP('2026-09-16', 'DD/MM/YYYY'), '16/09/2026');
checa('so data DD/MM', formatDateSP('2026-09-16', 'DD/MM'), '16/09');
checa('so data DD/MM/YY', formatDateSP('2026-09-16', 'DD/MM/YY'), '16/09/26');
checa('so data em formato com hora mostra so a data', formatDateSP('2026-01-01'), '01/01/2026');
checa('data e hora continua no fuso de SP', formatDateSP('2026-09-16T02:30:00Z', 'DD/MM/YYYY HH:mm'), '15/09/2026');
checa('DD/MM/YY com hora nao mostra segundos', formatDateSP('2026-09-16T15:00:00Z', 'DD/MM/YY'), '16/09/26');
checa('vazio vira traco', formatDateSP(null), '-');
checa('invalida vira traco', formatDateSP('ontem'), '-');
checa('dataDoCalendario e meia-noite local', `${dataDoCalendario('2026-10-01').getDate()}/${dataDoCalendario('2026-10-01').getMonth() + 1}`, '1/10');
checa('dataDoCalendario recusa data com hora', String(dataDoCalendario('2026-10-01T10:00:00Z')), 'null');
checa('pedido do dia 1o conta no proprio mes', getMesReferencia(dataDoCalendario('2026-10-01')), '2026-10');

console.log('\n== erro de gravacao em portugues ==');
checa('RLS vira falta de permissao', traduzirErro(new Error('[CicloTrimestral.create] new row violates row-level security policy for table "ciclo_trimestral"')), 'não tem permissão');
checa('duplicado', traduzirErro(new Error('[Colaborador.create] duplicate key value violates unique constraint "colaborador_email_key"')), 'já existe um registro igual');
checa('check constraint', traduzirErro(new Error('new row for relation "pontuacao" violates check constraint "pontuacao_bonus_completo"')), 'fora do permitido');
checa('sem internet', traduzirErro(new Error('TypeError: Failed to fetch')), 'sem conexão');
checa('desconhecido mantem a mensagem sem o prefixo tecnico', traduzirErro(new Error('[Aviso.update] prazo expirado')), 'prazo expirado');
checa('sem mensagem', traduzirErro(null), 'erro desconhecido');

console.log('\n== central de pendencias (avisos e pesquisas) ==');
{
  const hoje = new Date(2026, 8, 21, 10, 0);
  const antigo = { id: 'c1', papel: 'agente', created_date: '2026-01-26T12:00:00Z' };
  const novo = { id: 'c2', papel: 'agente', created_date: '2026-09-15T12:00:00Z' };
  const gestor = { id: 'g1', papel: 'gestor', created_date: '2026-01-26T12:00:00Z' };
  const avisos = [
    { id: 'a1', tipo: 'informativo', destinatarios: 'todos', ativo: true, data_publicacao: '2026-03-01T12:00:00Z' },
    { id: 'a2', tipo: 'urgente', destinatarios: 'todos', ativo: true, data_publicacao: '2026-09-18T12:00:00Z' },
    { id: 'a3', tipo: 'alerta', destinatarios: 'gestores', ativo: true, data_publicacao: '2026-09-18T12:00:00Z' },
    { id: 'a4', tipo: 'comunicado', destinatarios: 'todos', ativo: false, data_publicacao: '2026-09-18T12:00:00Z' },
    { id: 'a5', tipo: 'comunicado', destinatarios: 'todos', ativo: true, data_publicacao: '2026-09-01T12:00:00Z', data_expiracao: '2026-09-10T12:00:00Z' },
    { id: 'a6', tipo: 'comunicado', destinatarios: 'todos', ativo: true, data_publicacao: '2026-09-30T12:00:00Z' },
  ];
  const pesquisas = [
    { id: 'p1', ativa: true, data_inicio: '2026-09-16', data_fim: '2030-12-31', created_date: '2026-09-16T10:00:00Z' },
    { id: 'p2', ativa: true, data_inicio: '2026-01-01', data_fim: '2026-02-09', created_date: '2026-01-01T10:00:00Z' },
    { id: 'p3', ativa: true, data_inicio: '2026-06-01', created_date: '2026-06-01T10:00:00Z' },
    { id: 'p4', ativa: true, data_inicio: '2026-10-01', created_date: '2026-09-20T10:00:00Z' },
  ];
  const ids = (fila) => fila.map((f) => f.item.id).join(',');

  const filaAntigo = filaDePendencias({ colaborador: antigo, avisos, pesquisas, agora: hoje });
  checa('urgente primeiro; inativo, expirado, futuro e de gestor ficam de fora', ids(filaAntigo), 'a2,a1,p3,p1');
  checa('pesquisa com periodo encerrado nao aparece', String(filaAntigo.some((f) => f.item.id === 'p2')), 'false');
  checa('pesquisa que so comeca depois nao aparece', String(filaAntigo.some((f) => f.item.id === 'p4')), 'false');

  const filaNovo = filaDePendencias({ colaborador: novo, avisos, pesquisas, agora: hoje });
  checa('cadastrado em 15/09 so recebe o publicado depois', ids(filaNovo), 'a2,p1');

  const leituras = [{ aviso_id: 'a2', colaborador_id: 'c1', confirmou: true }, { aviso_id: 'a1', colaborador_id: 'OUTRA', confirmou: true }];
  // Quem ja respondeu vem da participacao (migration 23): em pesquisa
  // anonima a resposta nao guarda o nome de ninguem.
  const participacoes = [{ pesquisa_id: 'p3', colaborador_id: 'c1' }];
  checa('confirmado e respondido saem; confirmacao de outra pessoa nao conta',
    ids(filaDePendencias({ colaborador: antigo, avisos, pesquisas, leituras, participacoes, agora: hoje })), 'a1,p1');
  checa('participacao de outra pessoa nao tira a pesquisa da minha fila',
    ids(filaDePendencias({ colaborador: antigo, avisos, pesquisas, leituras, participacoes: [{ pesquisa_id: 'p3', colaborador_id: 'OUTRA' }], agora: hoje })), 'a1,p3,p1');
  checa('tratado nesta sessao sai na hora, antes do banco responder',
    ids(filaDePendencias({ colaborador: antigo, avisos, pesquisas, tratados: new Set(['a2', 'p3']), agora: hoje })), 'a1,p1');
  checa('gestor recebe aviso de gestores', ids(filaDePendencias({ colaborador: gestor, avisos, pesquisas: [], agora: hoje })), 'a2,a3,a1');

  checa('lista de avisos do agente novo: so os depois do cadastro', avisosVisiveis(avisos, novo, hoje).map((a) => a.id).join(','), 'a2');
  checa('lista do gestor: todos', String(avisosVisiveis(avisos, gestor, hoje).length), '6');
  checa('lista de pesquisas do agente novo', pesquisasVisiveis(pesquisas, novo).map((p) => p.id).join(','), 'p1,p4');

  const pesq = { id: 'x', titulo: 'CSAT', tipo: 'csat', perguntas: [{ id: 'q1', obrigatoria: true }, { id: 'q2', obrigatoria: true }, { id: 'q3' }] };
  checa('obrigatorias sem resposta', obrigatoriasSemResposta(pesq, { q1: '4', q2: '  ' }).join(','), 'q2');
  const r = montarResposta(pesq, { q1: '4', q2: 'ok' }, { id: 'c1', nome_completo: 'Ana' }, hoje);
  checa('CSAT 4 e positivo', `${r.nota_calculada} ${r.sentimento}`, '4 positivo');
  checa('resposta leva todas as perguntas', String(r.respostas.length), '3');
  checa('NPS 7 e neutro', montarResposta({ ...pesq, tipo: 'nps' }, { q1: '7' }, { id: 'c1' }, hoje).sentimento, 'neutro');
  checa('resposta identificada guarda quem respondeu', `${r.colaborador_id}|${r.colaborador_nome}`, 'c1|Ana');
  const anonima = montarResposta({ ...pesq, anonima: true }, { q1: '4' }, { id: 'c1', nome_completo: 'Ana' }, hoje);
  checa('resposta anonima nao guarda o id', String(anonima.colaborador_id), 'null');
  checa('resposta anonima nao guarda o nome', String(anonima.colaborador_nome), 'null');
  checa('resposta anonima continua guardando a nota', String(anonima.nota_calculada), '4');
}

console.log('\n== POPs: versao, ciencia e busca ==');
{
  checa('ajuste sobe o menor', proximaVersao('1.0'), '1.1');
  checa('ajuste depois de 1.9', proximaVersao('1.9', 'ajuste'), '1.10');
  checa('nova versao sobe o maior', proximaVersao('1.3', 'nova'), '2.0');
  checa('sem versao comeca em 1.1', proximaVersao(null), '1.1');

  const pops = [
    { id: 'p1', versao: '1.0', ordem: 4, ativo: true, exige_ciencia: true, publicado_em: '2026-09-21T12:00:00Z', categoria: 'Tratativas', codigo: 'POP 04', titulo: 'Reclame Aqui', prazos: [{ rotulo: '1º contato', valor: 'até 1h' }], tipos_tratativa: ['reclame_aqui'] },
    { id: 'p2', versao: '2.0', ordem: 1, ativo: true, exige_ciencia: true, publicado_em: '2026-09-21T12:00:00Z', categoria: 'Tratativas', codigo: 'POP 01', titulo: 'Reclamação Interna — AC', tipos_tratativa: ['reclamacao_interna'] },
    { id: 'p3', versao: '1.0', ordem: 0, ativo: true, exige_ciencia: false, publicado_em: '2026-09-21T12:00:00Z', categoria: 'Governança', codigo: 'POP 00', titulo: 'Manual' },
    { id: 'p4', versao: '1.0', ordem: 9, ativo: false, exige_ciencia: true, publicado_em: '2026-09-21T12:00:00Z', categoria: 'Tratativas', codigo: 'POP 09', titulo: 'Antigo' },
    { id: 'p5', versao: '1.0', ordem: 5, ativo: true, exige_ciencia: true, publicado_em: '2026-01-01T12:00:00Z', categoria: 'Pessoas e rotina', codigo: 'POP 10', titulo: 'FI' },
  ];
  const ana = { id: 'c1', created_date: '2026-01-26T12:00:00Z' };
  const novo = { id: 'c2', created_date: '2026-09-22T12:00:00Z' };
  const leituras = [{ pop_id: 'p2', versao: '1.0', colaborador_id: 'c1' }];

  checa('ciencia: ordem, sem inativo e sem o que nao pede',
    popsParaCiencia({ pops, leituras, colaborador: ana }).map((p) => p.id).join(','), 'p2,p1');
  checa('ler a 1.0 nao vale para a 2.0', String(popsParaCiencia({ pops, leituras, colaborador: ana }).some((p) => p.id === 'p2')), 'true');
  checa('confirmada a versao atual, sai',
    popsParaCiencia({ pops, leituras: [...leituras, { pop_id: 'p2', versao: '2.0', colaborador_id: 'c1' }], colaborador: ana }).map((p) => p.id).join(','), 'p1');
  checa('gestor nao precisa confirmar o que publica', String(popsParaCiencia({ pops, colaborador: { ...ana, papel: 'gestor' } }).length), '0');
  checa('quem chegou depois nao recebe versao antiga', String(popsParaCiencia({ pops, colaborador: novo }).length), '0');
  checa('tratado na sessao sai na hora',
    popsParaCiencia({ pops, leituras, colaborador: ana, tratados: new Set(['p1@1.0']) }).map((p) => p.id).join(','), 'p2');

  const grupos = agruparPorCategoria(pops.filter((p) => p.ativo), '');
  checa('grupos na ordem das categorias', grupos.map((g) => g.categoria).join(','), 'Governança,Tratativas,Pessoas e rotina');
  checa('dentro do grupo, pela ordem', grupos[1].pops.map((p) => p.codigo).join(','), 'POP 01,POP 04');
  checa('busca sem acento acha com acento', agruparPorCategoria(pops, 'reclamacao')[0].pops[0].codigo, 'POP 01');
  checa('busca acha pelo prazo', agruparPorCategoria(pops, 'ate 1h')[0].pops[0].codigo, 'POP 04');
  checa('POPs do tipo', popsDoTipo(pops, 'reclamacao_interna').map((p) => p.id).join(','), 'p2');
  checa('fotografia guarda os campos do POP', Object.keys(fotografia(pops[0])).includes('prazos') ? 'sim' : 'nao', 'sim');
}

console.log('\n== inativadas (RA e GMN) pontuam so a partir do Ciclo 3 ==');
{
  const pts = (t) => String(calculateTratativaPoints(t).pontos);
  const ra = { tipo_tratativa: 'reclame_aqui', inativada_na_plataforma: true };
  const gmn = { tipo_tratativa: 'google_meu_negocio', inativada_na_plataforma: true };
  checa('RA inativada no Ciclo 3 vale 1', pts({ ...ra, data_encerramento: '2026-09-17T12:00:00.000Z' }), '1');
  checa('GMN inativada no Ciclo 3 vale 1', pts({ ...gmn, data_encerramento: '2026-10-01T15:00:00.000Z' }), '1');
  checa('16/09 as 23h (Brasilia) ainda e Ciclo 2: nao muda', pts({ ...ra, data_encerramento: '2026-09-17T02:00:00.000Z' }), '0');
  checa('17/09 a 0h (Brasilia) ja vale', pts({ ...gmn, data_encerramento: '2026-09-17T03:00:00.000Z' }), '1');
  checa('Ciclo 2 nao muda', pts({ ...gmn, data_encerramento: '2026-08-10T12:00:00.000Z' }), '0');
  checa('soma com a nota 10 + voltaria', pts({ ...ra, nota_reclame_aqui: 10, voltaria_fazer_negocio: true, data_encerramento: '2026-09-20T12:00:00.000Z' }), '4.5');
  checa('sem a marcacao nao pontua', pts({ tipo_tratativa: 'reclame_aqui', data_encerramento: '2026-09-20T12:00:00.000Z' }), '0');
  checa('outro tipo com a marcacao nao pontua', pts({ tipo_tratativa: 'contestacao', inativada_na_plataforma: true, data_encerramento: '2026-09-20T12:00:00.000Z' }), '0');
  checa('aparece no detalhamento', calculateTratativaPoints({ ...ra, data_encerramento: '2026-09-20T12:00:00.000Z' }).detalhes[0].tipo, 'Reclamação inativada');
}

console.log('\n== reabertura apurada pelos dados e 0,5 por abertura ==');
{
  const ri = { id: 'a', tipo_tratativa: 'reclamacao_interna', id_base_cliente: '506107  ', data_encerramento: '2026-08-01T12:00:00.000Z', status_reabertura: 'aguardando', agente_responsavel_id: 'ana', status: 'encerrada', encerrado_no_sla: true, data_registro: '2026-07-31T12:00:00.000Z' };
  const nova = (dias, extra = {}) => ({ id: `n${dias}`, tipo_tratativa: 'reclame_aqui', id_base_cliente: '506107', data_registro: new Date(Date.parse(ri.data_encerramento) + dias * 864e5).toISOString(), agente_responsavel_id: 'bia', status: 'em_andamento', ...extra });
  const depois = new Date('2026-09-01T00:00:00Z');
  checa('nova tratativa do cliente no 6o dia, com outro agente: reabriu', reaberturaDe(ri, [ri, nova(6)], depois).situacao, 'reabriu');
  checa('no 8o dia: nao conta como reabertura', reaberturaDe(ri, [ri, nova(8)], depois).situacao, 'nao_houve');
  checa('nova tratativa excluida nao conta', reaberturaDe(ri, [ri, nova(3, { excluida: true })], depois).situacao, 'nao_houve');
  checa('dentro dos 7 dias sem nada: aguardando', reaberturaDe(ri, [ri], new Date('2026-08-05T00:00:00Z')).situacao, 'aguardando');
  checa('7 dias sem nada: +1 sem ninguem confirmar', String(calculateTratativaPoints(comReaberturaApurada(ri, [ri], depois)).pontos), '2');
  checa('reabriu: perde o +1', String(calculateTratativaPoints(comReaberturaApurada(ri, [ri, nova(2)], depois)).pontos), '1');
  checa('gestor marcou que voltou por outro canal: vale', reaberturaDe({ ...ri, status_reabertura: 'cliente_reabriu' }, [ri], depois).situacao, 'reabriu');

  const ciclo1 = { data_inicio: '2026-03-14', data_fim: '2026-06-16' };
  const ciclo2 = { data_inicio: '2026-06-16', data_fim: '2026-09-16' };
  const reg = (d, extra = {}) => ({ id: d, agente_responsavel_id: 'ana', data_registro: `${d}T15:00:00.000Z`, status: 'em_andamento', tipo_tratativa: 'reclamacao_interna', ...extra });
  checa('Ciclo 2 paga abertura', String(cicloPagaAbertura(ciclo2)), 'true');
  checa('Ciclo 1 nao muda', String(aberturasNoCiclo([reg('2026-06-16')], ciclo1).length), '0');
  checa('abertas no Ciclo 2 contam, excluida nao', String(aberturasNoCiclo([reg('2026-07-01'), reg('2026-08-01'), reg('2026-08-02', { excluida: true }), reg('2026-10-01')], ciclo2).length), '2');
  const mapa = pontosDeTratativasNoCiclo([reg('2026-07-01'), { ...reg('2026-07-02'), status: 'encerrada', data_encerramento: '2026-07-03T12:00:00.000Z', encerrado_no_sla: true, status_reabertura: 'nao_houve' }], ciclo2,
    { encerrada: (t) => t.status === 'encerrada', noCiclo: (t, c) => t.data_encerramento >= c.data_inicio && t.data_encerramento <= `${c.data_fim}T23:59:59` }, depois);
  checa('abertura + encerramento somam para o agente', `${mapa.get('ana').pontosAbertura}+${mapa.get('ana').pontosEncerramento}`, '1+2');
}

console.log('\n== solucao replicavel: do Ciclo 2 em diante, so com aprovacao ==');
{
  const ri = (extra) => ({ tipo_tratativa: 'reclamacao_interna', solucao_replicavel: true, data_encerramento: '2026-07-10T12:00:00.000Z', ...extra });
  const pts = (t) => String(calculateTratativaPoints(t).pontos);
  checa('Ciclo 2 pendente: nao conta', pts(ri()), '0');
  checa('Ciclo 2 aprovada: conta 0,5', pts(ri({ solucao_replicavel_valida: true, solucao_replicavel_auditada: true })), '0.5');
  checa('Ciclo 2 contestada: nao conta', pts(ri({ solucao_replicavel_valida: false, solucao_replicavel_auditada: true })), '0');
  checa('Ciclo 1 (antes de 16/06): a marcacao basta', pts(ri({ data_encerramento: '2026-05-10T12:00:00.000Z' })), '0.5');
  checa('situacao: pendente', situacaoReplicavel(ri()), 'pendente');
  checa('situacao: contestada', situacaoReplicavel(ri({ solucao_replicavel_valida: false, solucao_replicavel_auditada: true })), 'contestada');
  checa('outro tipo nao entra na fila', String(situacaoReplicavel(ri({ tipo_tratativa: 'reclame_aqui' }))), 'null');
}

console.log('\n== extrato de pontos do agente ==');
{
  const ciclo2 = { data_inicio: '2026-06-16', data_fim: '2026-09-16' };
  const agora = new Date('2026-09-14T12:00:00Z');
  const t1 = { id: 't1', id_interno: 'TRT-1', nome_cliente: 'Ana', tipo_tratativa: 'reclamacao_interna', status: 'aguardando_confirmacao_reabertura', agente_responsavel_id: 'ag', id_base_cliente: '1', data_registro: '2026-09-09T12:00:00Z', data_encerramento: '2026-09-10T12:00:00Z', encerrado_no_sla: true, solucao_replicavel: true };
  const t2 = { id: 't2', id_interno: 'TRT-2', nome_cliente: 'Bia', tipo_tratativa: 'reclamacao_interna', status: 'encerrada', agente_responsavel_id: 'ag', id_base_cliente: '2', data_registro: '2026-07-01T12:00:00Z', data_encerramento: '2026-07-02T12:00:00Z', encerrado_no_sla: false, solucao_replicavel: true, solucao_replicavel_auditada: true, solucao_replicavel_valida: false, solucao_replicavel_parecer: 'Falta a causa raiz.' };
  const todas = [t1, t2];
  const registro = pontosDeTratativasNoCiclo(todas, ciclo2, { encerrada: (t) => ['encerrada', 'aguardando_confirmacao_reabertura'].includes(t.status), noCiclo: () => true }, agora).get('ag');
  const indicadores = { csat: { valor: 92 }, performance: null, cx: null, pontos: { csat: 9, performance: 0, cx: 0, total: 9 }, entraNoTotal: true };
  const ex = extratoDoAgente({ registro, indicadores, lancamentos: [{ total_pontos: 7, descricao: 'Ritmo', created_date: '2026-09-01' }], todas, agora });
  const grupo = (c) => ex.grupos.find((g) => g.chave === c);
  checa('encerradas: t1 SLA +1 (reabertura aguardando); t2 fora do prazo mas sem reabertura +1', String(grupo('tratativas').subtotal), '2');
  checa('aberturas: 2 x 0,5', String(grupo('aberturas').subtotal), '1');
  checa('indicadores somam', String(grupo('indicadores').subtotal), '9');
  checa('bonus entra', String(grupo('bonus').subtotal), '7');
  checa('total = soma dos grupos', String(ex.total), '19');
  checa('a caminho: sem reabertura com data', ex.aCaminho.find((a) => a.titulo.startsWith('Sem reabertura')).detalhe, 'Conta a partir de 17/09');
  checa('a caminho: replicavel pendente', String(ex.aCaminho.some((a) => a.titulo.startsWith('Solução replicável ·') && a.pontos === 0.5)), 'true');
  checa('contestada mostra o parecer', ex.aCaminho.find((a) => a.tom === 'negado').detalhe, 'Falta a causa raiz.');
}

console.log('\n== Hansei: numeros do periodo ==');
{
  const tel = (data, av, pos, lig = 10, at = 10, neg = Math.max(0, av - pos)) => ({ data, telefone: { total_ligacoes: lig, total_atendidas: at, total_avaliadas: av, total_positivas: pos, total_negativas: neg } });
  const apur = [
    { id: 'a', colaborador_id: 'ana', tipo_apuracao: 'telefone', created_date: '2026-04-20', dados_por_data: [tel('2026-04-06', 4, 4), tel('2026-04-07', 4, 0)] },
    // reimportação do dia 06 (mais antiga): não pode contar de novo
    { id: 'b', colaborador_id: 'ana', tipo_apuracao: 'telefone', created_date: '2026-04-10', dados_por_data: [tel('2026-04-06', 4, 4)] },
    { id: 'c', colaborador_id: 'ana', tipo_apuracao: 'cx', periodo_inicio: '2026-04-01', periodo_fim: '2026-04-30', created_date: '2026-05-01', dados_por_data: [{ data: '2026-03-10', chat: null, telefone: null }], historico_detalhado: [{ data: '2026-03-10', media: 4, observacao: 't1' }, { data: '2026-03-11', media: 5, observacao: 't2' }] },
  ];
  const d = calcularDadosConsolidados('ana', '2026-04-01', '2026-04-30', { tratativas: [], apuracoes: apur, bonus: [], ciclos: [] });
  checa('dia com 0% conta (antes sumia): 4 de 8 = 50%', String(d.csat_individual), '50');
  checa('dia reimportado nao duplica: 20 ligacoes atendidas', String(d.ligacoes_atendidas), '20');
  checa('CX agora e lida', String(d.cx_nota_media), '4.5');
}

console.log('\n== relatorio financeiro ==');
{
  const c = (status_resolucao_contestacao, extra = {}) => ({ tipo_tratativa: 'contestacao', status: 'encerrada', data_encerramento: '2026-08-10T15:00:00Z', valor_contestado_inicial: 1000, status_resolucao_contestacao, ...extra });
  checa('sem acordo: perde tudo', String(desfechoDaContestacao(c('sem_acordo')).perda), '1000');
  checa('contestou (duplicidade): perda', desfechoDaContestacao(c('contestou_pagamento_duplicidade')).grupo, 'perda');
  checa('pagou: recuperado, nada perdido', `${desfechoDaContestacao(c('pagou')).perda}/${desfechoDaContestacao(c('pagou')).recuperado}`, '0/1000');
  checa('cancelou: recuperado', desfechoDaContestacao(c('cancelou_contestacao')).grupo, 'recuperado');
  checa('acordo: perde so a diferenca', String(desfechoDaContestacao(c('acordo', { valor_contestado_final: 700 })).perda), '300');
  checa('em aberto: fora das somas', desfechoDaContestacao({ ...c('sem_acordo'), status: 'em_andamento' }).grupo, 'em_andamento');
  checa('encerrada sem desfecho: fora', desfechoDaContestacao(c(null)).grupo, 'sem_desfecho');
  const r = resumoFinanceiro([
    c('sem_acordo'), c('pagou'), c('acordo', { valor_contestado_final: 700 }),
    { ...c('sem_acordo'), status: 'em_andamento', data_encerramento: null, data_registro: '2026-08-11T12:00:00Z' },
    { tipo_tratativa: 'reclamacao_interna', status: 'encerrada', data_encerramento: '2026-08-12T12:00:00Z', houve_devolucao_financeira: true, valor_devolvido_cliente: 50, custo_operacional_reais: 20 },
    { tipo_tratativa: 'reclame_aqui', status: 'encerrada', data_encerramento: '2026-08-12T12:00:00Z', nota_reclame_aqui: 0, custo_operacional_reais: 10 },
    { tipo_tratativa: 'reclamacao_interna', status: 'encerrada', excluida: true, data_encerramento: '2026-08-12T12:00:00Z', houve_devolucao_financeira: true, valor_devolvido_cliente: 999 },
    { tipo_tratativa: 'reclamacao_interna', status: 'encerrada', data_encerramento: '2026-09-17T02:00:00Z', custo_operacional_reais: 5 },
  ], { inicio: '2026-08-01', fim: '2026-09-16' });
  checa('perda das contestacoes = 1000 + 300', String(r.custou.perdaContestacoes), '1300');
  checa('recuperado = 1000 (pagou) + 700 (acordo)', String(r.recuperado), '1700');
  checa('em andamento a parte', `${r.contestacoes.emAndamento.qtd}/${r.contestacoes.emAndamento.valor}`, '1/1000');
  checa('devolvido sem a excluida', String(r.custou.devolvido), '50');
  checa('16/09 as 23h (Brasilia) entra no fim 16/09', String(r.custou.custoOperacional), '35');
  checa('risco contado, nota 0 conta', String(r.risco.qtd), '1');
}

console.log('\n== relatorio de pessoas ==');
{
  const colaboradores = [{ id: 'a', nome_completo: 'Ana', papel: 'agente' }, { id: 'g', nome_completo: 'Gestor', papel: 'gestor' }, { id: 'x', nome_completo: 'Saiu', papel: 'agente', ativo: false }];
  const t = (id, extra) => ({ id, agente_responsavel_id: 'a', tipo_tratativa: 'reclamacao_interna', status: 'encerrada', data_registro: '2026-07-01T12:00:00Z', data_encerramento: '2026-07-02T12:00:00Z', ...extra });
  const lista = pessoasNoPeriodo({
    colaboradores,
    periodo: { inicio: '2026-07-01', fim: '2026-07-31' },
    tratativas: [t('1', { encerrado_no_sla: true }), t('2', { encerrado_no_sla: false }), t('3', { excluida: true }), t('4', { data_encerramento: '2026-08-02T12:00:00Z' })],
  });
  checa('so agentes ativos', lista.map((p) => p.nome).join(','), 'Ana');
  checa('encerradas no periodo, sem excluida', String(lista[0].encerradas), '2');
  checa('no prazo = 50%', String(lista[0].pctNoPrazo), '50');
}

console.log('\n== relatorio de operacao ==');
{
  const agora = new Date('2026-09-10T12:00:00Z');
  const aberta = (id, horasAtras, sla = 24, extra = {}) => ({ id, status: 'em_andamento', sla_atribuido: sla, data_registro: new Date(agora - horasAtras * 36e5).toISOString(), agente_responsavel_nome: 'Ana', ...extra });
  const fila = filaDeHoje([aberta('a', 30), aberta('b', 10), aberta('c', 1, 72), { ...aberta('d', 50), status: 'aguardando_confirmacao_reabertura' }, { ...aberta('e', 50), excluida: true }], agora);
  checa('fila so com abertas de verdade', String(fila.total), '3');
  checa('vencida, vence em 24h, no prazo', `${fila.vencidas}/${fila.vence24h}/${fila.noPrazo}`, '1/1/1');
  const enc = (id, dia, extra = {}) => ({ id, status: 'encerrada', data_registro: `${dia}T12:00:00Z`, data_encerramento: `${dia}T15:00:00Z`, ...extra });
  const es = entradaESaida([enc('1', '2026-09-01'), enc('2', '2026-09-02'), aberta('a', 30), aberta('b', 10)], { inicio: '2026-09-01', fim: '2026-09-30' }, agora);
  checa('periodo que nao acabou conta so ate hoje: 10 dias', String(es.dias), '10');
  checa('mesmo periodo para entrada e saida', `${es.entraram}/${es.sairam}`, '4/2');
  checa('dias para zerar = 2 abertas / 0,2 por dia', String(es.diasParaZerar), '10');
  const tc = tempoPorCanal([1, 2, 3, 100].map((h, i) => enc(String(i), '2026-09-05', { tipo_tratativa: 'reclame_aqui', tempo_total_minutos: h * 60, encerrado_no_sla: h < 24 })), { inicio: '2026-09-01', fim: '2026-09-30' });
  checa('mediana nao e puxada pelo caso de 100h', String(tc[0].medianaHoras), '2.5');
  checa('% no prazo', String(tc[0].pctNoPrazo), '75');
}

console.log('\n== relatorio de canais ==');
{
  const ra = (nota, extra = {}) => ({ tipo_tratativa: 'reclame_aqui', status: 'encerrada', data_encerramento: '2026-08-10T15:00:00Z', nota_reclame_aqui: nota, ...extra });
  const r = resumoDoCanal([ra(10, { voltaria_fazer_negocio: true }), ra(0), ra(8), ra(null)], 'reclame_aqui', { inicio: '2026-08-01', fim: '2026-08-31' });
  checa('nota media conta a nota 0: (10+0+8)/3 = 6', String(r.notaMedia), '6');
  checa('sem nota fica fora da media', `${r.avaliadas}/${r.semNota}`, '3/1');
  checa('faixas de nota', `${r.notas.ate6}/${r.notas.de7a8}/${r.notas.dez}`, '1/1/1');
  const c = resumoDoCanal([
    { tipo_tratativa: 'contestacao', status: 'encerrada', data_encerramento: '2026-08-10T15:00:00Z', status_resolucao_contestacao: 'contestou_prazo_cancelamento', valor_contestado_inicial: 10 },
    { tipo_tratativa: 'contestacao', status: 'em_andamento', data_registro: '2026-08-10T15:00:00Z' },
  ], 'contestacao', { inicio: '2026-08-01', fim: '2026-08-31' });
  checa('contestou aparece como perda', `${c.perdidas}/${c.emAndamento}`, '1/1');
}

console.log('\n== quando chegam as reclamacoes (hora e dia da semana) ==');
{
  // 2026-09-01 e terca-feira (confirmado: 2026-10-01 e quinta, 30 dias antes).
  // 14h em Brasilia (UTC-3) = 17h UTC.
  const t = (horaUTC, tipo = 'reclamacao_interna', extra = {}) => ({
    tipo_tratativa: tipo, data_registro: `2026-09-01T${String(horaUTC).padStart(2, '0')}:00:00Z`, ...extra,
  });
  const tratativas = [
    t(17), t(17), t(17), // 14h SP, 3x
    t(12), // 09h SP, 1x
    t(17, 'reclame_aqui'), // outro canal, mesma hora
    t(17, 'reclamacao_interna', { excluida: true }), // excluida nao conta
  ];
  const todos = distribuicaoDeChegada(tratativas, { tipo: 'todos', periodo: {} });
  checa('total soma os 4 canais, exclui a excluida', String(todos.total), '5');
  checa('pico as 14h (3 de reclamacao_interna + 1 de reclame_aqui)', `${todos.horaPico.hora}h:${todos.horaPico.qtd}`, '14h:4');
  checa('pico na terca-feira (todos caem no mesmo dia)', todos.diaPico.nome, 'Terça');

  const soReclamacaoInterna = distribuicaoDeChegada(tratativas, { tipo: 'reclamacao_interna', periodo: {} });
  checa('filtra por canal: so as 3+1 de reclamacao_interna (excluida fora)', String(soReclamacaoInterna.total), '4');

  const semDados = distribuicaoDeChegada([], { tipo: 'todos', periodo: {} });
  checa('sem dados nao quebra', `${semDados.total}/${semDados.horaPico}/${semDados.diaPico}`, '0/null/null');
}

console.log('\n== relatorio de qualidade ==');
{
  const tel = (data, av, pos, neg = Math.max(0, av - pos)) => ({ data, telefone: { total_ligacoes: 10, total_atendidas: 10, total_avaliadas: av, total_positivas: pos, total_negativas: neg } });
  const apuracoes = [
    // Ana: 1 avaliação, 0 positiva; Bia: 9 avaliações, 9 positivas
    { colaborador_id: 'a', tipo_apuracao: 'telefone', created_date: '2026-07-10', dados_por_data: [tel('2026-07-01', 1, 0)] },
    { colaborador_id: 'b', tipo_apuracao: 'telefone', created_date: '2026-07-10', dados_por_data: [tel('2026-07-01', 9, 9), tel('2026-08-01', 1, 1)] },
  ];
  const colaboradores = [{ id: 'a', nome_completo: 'Ana', papel: 'agente' }, { id: 'b', nome_completo: 'Bia', papel: 'agente' }];
  const q = resumoQualidade({ apuracoes, colaboradores, periodo: { inicio: '2026-07-01', fim: '2026-07-31' } });
  checa('equipe ponderada: 9 de 10 = 90% (media de medias daria 50%)', String(q.equipe.csatTelefone), '90');
  checa('agosto fora do periodo', String(q.meses.length), '1');
  checa('por pessoa', q.pessoas.map((p) => `${p.nome}:${p.csatTelefone}`).join(','), 'Ana:0,Bia:100');
  // Mes a mes de cada agente (o mesmo grafico da equipe, so da pessoa)
  const qTodos = resumoQualidade({ apuracoes, colaboradores, periodo: { inicio: '2026-07-01', fim: '2026-08-31' } });
  const bia = qTodos.pessoas.find((p) => p.id === 'b');
  checa('agente tem a serie mensal (jul e ago)', bia.meses.map((m) => m.mes).join(','), '2026-07,2026-08');
  checa('serie mensal do agente: CSAT de cada mes', bia.meses.map((m) => m.csatTelefone).join(','), '100,100');
  checa('agente sem apuracao em agosto so tem julho', qTodos.pessoas.find((p) => p.id === 'a').meses.map((m) => m.mes).join(','), '2026-07');
  checa('serie da equipe continua igual', qTodos.meses.map((m) => m.mes).join(','), '2026-07,2026-08');
}

console.log('\n== qualidade dia a dia: achar o dia ruim que puxou a semana ==');
{
  const tel = (data, pos, neg) => ({ data, telefone: { total_ligacoes: pos + neg + 1, total_atendidas: pos + neg + 1, total_avaliadas: pos + neg, total_positivas: pos, total_negativas: neg } });
  const apuracoes = [
    // Semana de 14/09/2026 (seg): dois dias bons (5/0) e um dia ruim (0/5)
    // que puxa a semana inteira para baixo.
    { colaborador_id: 'a', tipo_apuracao: 'telefone', created_date: '2026-09-20', dados_por_data: [
      tel('2026-09-14', 5, 0), tel('2026-09-15', 0, 5), tel('2026-09-16', 5, 0),
    ] },
    // Reimportado por cima do dia 15: a versao mais recente vale, nao soma.
    { colaborador_id: 'a', tipo_apuracao: 'telefone', created_date: '2026-09-21', dados_por_data: [
      tel('2026-09-15', 4, 1),
    ] },
  ];
  const { dias, semanas } = diaADiaQualidade({ apuracoes, colaboradorId: 'a', periodo: { inicio: '2026-09-14', fim: '2026-09-18' } });
  checa('tres dias no periodo', String(dias.length), '3');
  checa('dia 15 vale a reimportacao mais recente (4/1), nao a original (0/5)', String(dias.find((d) => d.dia === '2026-09-15').csatTelefone), '80');
  checa('uma semana so (seg-sex)', String(semanas.length), '1');
  // Semana: 5+4+5 positivas / (5+4+5 + 0+1+0 negativas) = 14/15.
  checa('csat da semana pondera os tres dias juntos', semanas[0].csatTelefone.toFixed(2), (14 / 15 * 100).toFixed(2));
  checa('semana comeca na segunda 14/09', semanas[0].inicio, '2026-09-14');
  checa('semana termina na sexta 18/09', semanas[0].fim, '2026-09-18');
}

console.log('\n== qualidade dia a dia da EQUIPE (preditivo): soma todo mundo, nao um agente so ==');
{
  const tel = (data, pos, neg) => ({ data, telefone: { total_ligacoes: pos + neg, total_atendidas: pos + neg, total_avaliadas: pos + neg, total_positivas: pos, total_negativas: neg } });
  const colaboradores = [{ id: 'a', papel: 'agente', nome_completo: 'Ana' }, { id: 'b', papel: 'agente', nome_completo: 'Bia' }];
  const apuracoes = [
    // Dia 01: Ana manda muito bem (10/0), Bia so-so (1/1) -> soma 11/1
    { colaborador_id: 'a', tipo_apuracao: 'telefone', created_date: '2026-09-20', dados_por_data: [tel('2026-09-01', 10, 0), tel('2026-09-02', 0, 10)] },
    { colaborador_id: 'b', tipo_apuracao: 'telefone', created_date: '2026-09-20', dados_por_data: [tel('2026-09-01', 1, 1), tel('2026-09-02', 1, 1)] },
  ];
  const equipe = diaADiaEquipeQualidade({ apuracoes, colaboradores, periodo: {} });
  checa('dois dias no historico inteiro (sem limite de periodo)', String(equipe.dias.length), '2');
  const dia1 = equipe.dias.find((d) => d.dia === '2026-09-01');
  const dia2 = equipe.dias.find((d) => d.dia === '2026-09-02');
  checa('dia 01 soma as duas pessoas: (10+1)/(11+1) = 91.67%', dia1.csatTelefone.toFixed(2), (11 / 12 * 100).toFixed(2));
  checa('dia 02 e o pior (Ana foi mal): (0+1)/12 = 8.33%', dia2.csatTelefone.toFixed(2), (1 / 12 * 100).toFixed(2));
  checa('uma semana so, com os dois dias dentro', String(equipe.semanas.length), '1');
  checa('csat da semana pondera as 4 pessoas-dia: (11+1)/24', equipe.semanas[0].csatTelefone.toFixed(2), (12 / 24 * 100).toFixed(2));
}

console.log('\n== relatorio da jornada ==');
{
  const t = (extra) => ({ status: 'encerrada', data_registro: '2026-08-01T12:00:00Z', data_encerramento: '2026-08-02T12:00:00Z', ...extra });
  const j = resumoJornada([
    t({ etapa_jornada_nome: 'Uso', motivo_nome: 'Erro', custo_operacional_reais: 100, houve_devolucao_financeira: true, valor_devolvido_cliente: 50, id_base_cliente: '1' }),
    t({ etapa_jornada_nome: 'Uso', motivo_nome: 'Erro', custo_operacional_reais: 10, id_base_cliente: '1 ' }),
    t({ etapa_jornada_nome: 'Cobrança', motivo_nome: 'Boleto', custo_operacional_reais: 20, id_base_cliente: '2' }),
    t({ etapa_jornada_nome: 'Uso', excluida: true, custo_operacional_reais: 999 }),
  ], { inicio: '2026-08-01', fim: '2026-08-31' });
  checa('etapa mais cara primeiro, custo oficial + devolvido', `${j.etapas[0].nome}:${j.etapas[0].custo}`, 'Uso:160');
  checa('cliente recorrente pelo id (com espaco)', `${j.recorrentes.length}:${j.recorrentes[0]?.qtd}`, '1:2');
}

console.log('\n== o time esta sobrecarregado? ==');
{
  const agora = new Date('2026-09-10T12:00:00Z');
  const periodo = { inicio: '2026-09-01', fim: '2026-09-30' };
  const colaboradores = [{ id: 'a', papel: 'agente', nome_completo: 'Ana' }];
  const aberta = (id, horasAtras) => ({ id, status: 'em_andamento', sla_atribuido: 24, agente_responsavel_id: 'a', agente_responsavel_nome: 'Ana', data_registro: new Date(agora - horasAtras * 36e5).toISOString() });
  const enc = (id, dia) => ({ id, status: 'encerrada', agente_responsavel_id: 'a', agente_responsavel_nome: 'Ana', data_registro: `${dia}T12:00:00Z`, data_encerramento: `${dia}T15:00:00Z` });
  // fila grande, tudo vencido, entra mais do que sai
  const sobrecarga = Array.from({ length: 12 }, (_, i) => aberta(`x${i}`, 100)).concat([enc('e1', '2026-09-02')]);
  const d1 = diagnosticoDeCarga({ tratativas: sobrecarga, colaboradores, periodo, agora });
  checa('sobrecarregado com 3+ sinais', `${d1.veredito}/${d1.graves >= 3}`, 'sobrecarregado/true');
  checa('diz a fila por pessoa', d1.sinais.find((s) => s.chave === 'por_agente').texto, '12.0 tratativas abertas');
  // nada na fila e tudo encerrado no período
  const tranquilo = [enc('e1', '2026-09-02'), enc('e2', '2026-09-03')];
  const d2 = diagnosticoDeCarga({ tratativas: tranquilo, colaboradores, periodo, agora });
  checa('da conta quando sai mais do que entra', d2.veredito, 'da_conta');
}

console.log('\n== leitura de pessoas (Observacoes -> Oraculo) ==');
{
  const leitura = (id, dia, humanas, tecnicas, palavras = []) => ({
    id, tipo: 'leitura', colaboradores_ids: ['a'], data_registro: `${dia}T12:00:00Z`,
    competencias: { humanas, tecnicas }, palavras_chave: palavras,
  });
  const todas = [
    leitura('l1', '2026-09-01', { comunicacao: 4, empatia: 2 }, { negociacao: 5 }, [{ palavra: 'clareza' }, { palavra: 'ritmo' }]),
    leitura('l2', '2026-09-20', { comunicacao: 2 }, { negociacao: 3 }, ['clareza']),
    { id: 'o1', tipo: 'one_on_one', colaboradores_ids: ['a'], data_registro: '2026-09-10T12:00:00Z' },
    leitura('l3', '2026-09-05', { comunicacao: 5 }, {}, []),
  ];
  const minhas = leiturasDoColaborador(todas, 'a');
  checa('so as leituras, da mais nova para a mais antiga', minhas.map((l) => l.id).join(','), 'l2,l3,l1');
  checa('outro colaborador nao entra', String(leiturasDoColaborador(todas, 'b').length), '0');

  const m = mediaDasCompetencias(minhas);
  checa('media da competencia avaliada', m.humanas.comunicacao.toFixed(2), ((4 + 2 + 5) / 3).toFixed(2));
  checa('competencia nunca avaliada fica vazia', m.humanas.disciplina, null);
  checa('media do grupo ignora o vazio', m.humanas_geral.toFixed(2), (((11 / 3) + 2) / 2).toFixed(2));
  checa('media do grupo tecnico', String(m.tecnicas_geral), '4');

  const equipe = mediaDasCompetencias([leitura('l9', '2026-09-01', { comunicacao: 3 }, {})]);
  const radar = pontosDoRadar('humanas', m, equipe);
  checa('radar tem as seis competencias humanas', String(radar.length), '6');
  checa('radar compara pessoa e equipe', `${radar[0].pessoa.toFixed(2)}/${radar[0].equipe}`, `${(11 / 3).toFixed(2)}/3`);

  const evo = evolucaoDasLeituras(minhas);
  checa('evolucao vai da mais antiga para a mais nova', evo.map((e) => e.id).join(','), 'l1,l3,l2');
  const palavras = palavrasRecorrentes(minhas);
  checa('palavra repetida vem primeiro', `${palavras[0].palavra}:${palavras[0].vezes}`, 'clareza:2');
}

console.log('\n== escalas (trabalho e turno) ==');
{
  checa('segunda da semana de uma quinta', segundaDaSemana('2026-09-24'), '2026-09-21');
  checa('segunda continua sendo ela mesma', segundaDaSemana('2026-09-21'), '2026-09-21');
  checa('domingo pertence a semana que comecou na segunda', segundaDaSemana('2026-09-27'), '2026-09-21');
  checa('semana de referencia no formato do Base44', semanaDeReferencia('2026-09-24'), '2026-W39');

  const dias = diasDaSemana('2026-09-21');
  checa('cinco dias uteis', `${dias.length}:${dias[0].data}:${dias[4].data}`, '5:2026-09-21:2026-09-25');

  const pessoas = ['Ana', 'Bia', 'Caio', 'Duda', 'Eva'].map((n, i) => ({ id: `p${i}`, nome_completo: n }));

  // atribuicao antiga, por periodo, vale para todos os dias que ela cobre
  const mapa = trabalhoDaSemana([
    { id: 'a1', colaborador_id: 'p0', data_inicio: '2026-09-21', data_fim: '2026-09-23', tipo_evento: 'home_office', created_date: '2026-09-01' },
    { id: 'a2', colaborador_id: 'p0', data_inicio: '2026-09-22', data_fim: '2026-09-22', tipo_evento: 'presencial', created_date: '2026-09-20' },
    { id: 'a3', colaborador_id: 'p1', data_inicio: '2026-09-21', tipo_evento: 'ferias', created_date: '2026-09-01' },
  ], dias);
  checa('periodo antigo cobre o dia', trabalhoDe(mapa, 'p0', '2026-09-23'), 'home_office');
  checa('marcacao mais recente ganha do periodo', trabalhoDe(mapa, 'p0', '2026-09-22'), 'presencial');
  checa('sem data_fim vale so o dia de inicio', String(trabalhoDe(mapa, 'p1', '2026-09-22')), 'null');

  const plano = montarSemanaDeTrabalho({ pessoas, dias });
  const emCasaNaSegunda = pessoas.filter((p) => plano.get(`${p.id}|2026-09-21`) === 'home_office');
  const presenciaisNaSegunda = pessoas.filter((p) => plano.get(`${p.id}|2026-09-21`) === 'presencial');
  checa('dois em casa por dia', String(emCasaNaSegunda.length), '2');
  checa('tres presenciais por dia', String(presenciaisNaSegunda.length), '3');
  const porPessoa = pessoas.map((p) => dias.filter((d) => plano.get(`${p.id}|${d.data}`) === 'home_office').length);
  checa('reveza: ninguem fica em casa 3 dias na semana', String(Math.max(...porPessoa)), '2');
  checa('e ninguem fica sem nenhum dia', String(Math.min(...porPessoa)), '2');

  // quem esta indisponivel nao ocupa vaga nem e sorteado
  const indisponiveis = new Map([['p0|2026-09-21', 'ferias']]);
  const plano2 = montarSemanaDeTrabalho({ pessoas, dias, indisponiveis });
  checa('quem esta de ferias nao recebe marcacao', String(plano2.get('p0|2026-09-21')), 'undefined');
  checa('com 4 disponiveis so 1 vai para casa', String(pessoas.filter((p) => plano2.get(`${p.id}|2026-09-21`) === 'home_office').length), '1');

  const mapaCheio = new Map();
  pessoas.forEach((p) => dias.forEach((d) => mapaCheio.set(`${p.id}|${d.data}`, { tipo: plano.get(`${p.id}|${d.data}`) })));
  checa('semana montada nao gera aviso', String(avisosDoTrabalho({ mapa: mapaCheio, pessoas, dias }).length), '0');
  mapaCheio.set(`p0|2026-09-21`, { tipo: 'home_office' });
  mapaCheio.set(`p1|2026-09-21`, { tipo: 'home_office' });
  mapaCheio.set(`p2|2026-09-21`, { tipo: 'home_office' });
  const avisos = avisosDoTrabalho({ mapa: mapaCheio, pessoas, dias });
  checa('acusa home office demais', avisos.find((av) => av.texto.includes('home office'))?.texto, '3 em home office');
  checa('acusa presenciais de menos', avisos.find((av) => av.texto.includes('presencial'))?.texto, 'só 2 presencial(is)');

  // turno: 2 atendem de manha, os outros analisam, e a tarde inverte
  const presentes = new Map(dias.map((d) => [d.data, pessoas.map((p) => ({ colaborador_id: p.id, colaborador_nome: p.nome_completo }))]));
  const turnos = montarTurnosDaSemana({ dias, presentesPorDia: presentes });
  checa('duas pessoas atendendo de manha', String(turnos[0].manha.length), '2');
  checa('duas pessoas atendendo a tarde', String(turnos[0].tarde.length), '2');
  const mesmaPessoa = turnos[0].manha.some((m) => turnos[0].tarde.some((t) => t.colaborador_id === m.colaborador_id));
  checa('quem atendeu de manha nao atende a tarde', String(mesmaPessoa), 'false');
  checa('a dupla da manha muda no dia seguinte', String(turnos[0].manha[0].colaborador_id === turnos[1].manha[0].colaborador_id), 'false');
  checa('meu dia: atende de manha e analisa a tarde', `${meuDiaNoTurno(turnos[0], turnos[0].manha[0].colaborador_id).manha}/${meuDiaNoTurno(turnos[0], turnos[0].manha[0].colaborador_id).tarde}`, 'atendendo/analisando');
  checa('dia cancelado nao tem turno', String(meuDiaNoTurno({ ...turnos[0], cancelado: true }, turnos[0].manha[0].colaborador_id)), 'null');
  const equilibrio = equilibrioDoAtendimento(turnos);
  checa('ninguem atende o dobro do outro na semana', String(equilibrio[0].metades - equilibrio[equilibrio.length - 1].metades <= 1), 'true');

  // Turno de verdade: quem so trabalha de manha, quem so de tarde, e a troca
  // dia a dia (pedido de Pedro em 24/09/2026).
  const dia = turnos[0];
  const quemAtende = dia.manha[0];
  const quemAnalisa = dia.analisa_manha.find((p) => !dia.manha.some((m) => m.colaborador_id === p.colaborador_id));
  checa('quem nao atende de manha esta analisando', estadoNoTurno(dia, quemAnalisa.colaborador_id, 'manha'), 'analisando');
  checa('todo mundo presente trabalha na metade', String(trabalhandoNaMetade(dia, 'manha').length), '5');

  const soDeTarde = definirEstado(dia, quemAtende, 'manha', 'fora');
  checa('da para tirar alguem da manha inteira', estadoNoTurno(soDeTarde, quemAtende.colaborador_id, 'manha'), 'fora');
  checa('e ele continua escalado a tarde', String(estadoNoTurno(soDeTarde, quemAtende.colaborador_id, 'tarde') !== 'fora'), 'true');
  checa('quem saiu da manha nao conta mais como trabalhando', String(trabalhandoNaMetade(soDeTarde, 'manha').length), '4');
  checa('o clique gira atende para analisa', proximoEstado('atendendo'), 'analisando');
  checa('depois analisa para fora', proximoEstado('analisando'), 'fora');
  checa('e fora volta para atende', proximoEstado('fora'), 'atendendo');

  const invertido = inverterDia(dia);
  checa('inverter troca manha por tarde', String(invertido.manha[0].colaborador_id === dia.tarde[0].colaborador_id), 'true');
  checa('inverter troca tambem quem analisa', String(invertido.analisa_manha.length === dia.analisa_tarde.length), 'true');
  checa('quem atendia de manha passa a atender a tarde', estadoNoTurno(invertido, quemAtende.colaborador_id, 'tarde'), 'atendendo');

  const copiado = copiarDia(dia, { dia: 'terca', data: '2026-09-22', manha: [], tarde: [], analisa_manha: [], analisa_tarde: [] });
  checa('copiar mantem a data do dia de destino', copiado.data, '2026-09-22');
  checa('copiar traz a escalacao do outro dia', String(copiado.manha.length === dia.manha.length), 'true');
}

console.log('\n== pesquisas (quem respondeu e anonimato) ==');
{
  const pesquisa = {
    id: 'ps1', titulo: 'Kaizen', tipo: 'personalizada', ativa: true,
    data_inicio: '2026-09-01', data_fim: '2026-09-30',
    perguntas: [
      { id: 'q1', texto: 'Nota da semana', tipo_resposta: 'escala_1_5' },
      { id: 'q2', texto: 'Voltaria?', tipo_resposta: 'sim_nao' },
      { id: 'q3', texto: 'O que melhorar', tipo_resposta: 'texto' },
      { id: 'q4', texto: 'Quais canais', tipo_resposta: 'multipla_escolha_multipla', opcoes: ['telefone', 'chat'] },
    ],
  };
  checa('pesquisa no ar dentro do periodo', situacaoDaPesquisa(pesquisa, '2026-09-15'), 'no_ar');
  checa('agendada antes de comecar', situacaoDaPesquisa(pesquisa, '2026-08-20'), 'agendada');
  checa('encerrada depois do fim', situacaoDaPesquisa(pesquisa, '2026-10-02'), 'encerrada');
  checa('arquivada quando ativa e false', situacaoDaPesquisa({ ...pesquisa, ativa: false }, '2026-09-15'), 'arquivada');
  checa('sem periodo fica no ar', situacaoDaPesquisa({ id: 'x', ativa: true }, '2026-09-15'), 'no_ar');

  const pessoas = [
    { id: 'c1', nome_completo: 'Ana' },
    { id: 'c2', nome_completo: 'Bia' },
    { id: 'c3', nome_completo: 'Caio' },
  ];
  const participacoes = [
    { pesquisa_id: 'ps1', colaborador_id: 'c1', respondida_em: '2026-09-10T12:00:00Z' },
    { pesquisa_id: 'ps1', colaborador_id: 'c9', colaborador_nome: 'Quem saiu', respondida_em: '2026-09-10T12:00:00Z' },
    { pesquisa_id: 'outra', colaborador_id: 'c2', respondida_em: '2026-09-10T12:00:00Z' },
  ];
  const q = quemRespondeu({ pesquisa, participacoes, pessoas });
  checa('quem respondeu', q.responderam.map((p) => p.nome_completo).join(','), 'Ana');
  checa('quem falta', q.faltam.map((p) => p.nome_completo).join(','), 'Bia,Caio');
  checa('participacao de outra pesquisa nao conta', String(q.responderam.length), '1');
  checa('quem saiu da equipe aparece a parte', String(q.deDesligados.length), '1');
  checa('taxa de resposta', q.taxa.toFixed(1), '33.3');

  // resposta anonima: sem nome, mas a participacao existe
  const respostas = [
    { pesquisa_id: 'ps1', colaborador_id: null, nota_calculada: 4, sentimento: 'positivo', respostas: [
      { pergunta_id: 'q1', resposta: '4' }, { pergunta_id: 'q2', resposta: 'sim' },
      { pergunta_id: 'q3', resposta: 'mais tempo de analise' }, { pergunta_id: 'q4', resposta: 'telefone,chat' },
    ] },
    { pesquisa_id: 'ps1', colaborador_id: null, nota_calculada: 2, sentimento: 'negativo', respostas: [
      { pergunta_id: 'q1', resposta: '2' }, { pergunta_id: 'q2', resposta: 'nao' },
      { pergunta_id: 'q3', resposta: '' }, { pergunta_id: 'q4', resposta: 'chat' },
    ] },
    { pesquisa_id: 'outra', colaborador_id: 'c2', nota_calculada: 5, sentimento: 'positivo', respostas: [] },
  ];
  const [r1, r2, r3, r4] = resultadoDasPerguntas(pesquisa, respostas);
  checa('media da escala', String(r1.media), '3');
  checa('distribuicao da escala em ordem de nota', r1.opcoes.map((o) => o.opcao).join(','), '2,4');
  checa('sim e nao em portugues', r2.opcoes.map((o) => `${o.opcao}:${o.vezes}`).join(','), 'Sim:1,Não:1');
  checa('texto vazio nao entra', String(r3.textos.length), '1');
  checa('pergunta de texto nao tem media', String(r3.media), 'null');
  checa('multipla escolha conta cada opcao', r4.opcoes.map((o) => `${o.opcao}:${o.vezes}`).join(','), 'chat:2,telefone:1');

  const resumo = resumoDaPesquisa(pesquisa, respostas);
  checa('so as respostas desta pesquisa', String(resumo.respostas), '2');
  checa('media das notas', String(resumo.media), '3');
  checa('sentimentos contados', `${resumo.sentimentos.positivo}/${resumo.sentimentos.negativo}`, '1/1');

  const part = montarParticipacao(pesquisa, { id: 'c1', nome_completo: 'Ana' }, new Date('2026-09-24T10:00:00Z'));
  checa('participacao guarda quem e quando', `${part.pesquisa_id}|${part.colaborador_id}|${part.respondida_em.slice(0, 10)}`, 'ps1|c1|2026-09-24');
}

console.log('\n== ferias (saldo, vencimento e pedido) ==');
{
  const hoje = '2026-09-24';
  checa('dias corridos contam as duas pontas', String(diasCorridos('2026-10-01', '2026-10-15')), '15');

  const ciclo = { aquisitivo_inicio: '2025-01-01', aquisitivo_fim: '2025-12-31', concessivo_fim: '2026-12-31', dias_direito: 30, abono_dias: 0, dias_utilizados: 10 };
  const saldo = saldoDoCiclo(ciclo, hoje);
  checa('saldo desconta o que ja foi usado', String(saldo.restantes), '20');
  checa('dias ate vencer', String(saldo.diasAteVencer), '98');
  checa('ciclo com saldo e prazo fica parcialmente utilizado', situacaoDoCiclo(ciclo, hoje), 'parcialmente_utilizado');
  checa('abono tambem consome saldo', String(saldoDoCiclo({ ...ciclo, abono_dias: 10 }, hoje).restantes), '10');
  checa('ciclo vencendo em menos de 90 dias', situacaoDoCiclo({ ...ciclo, concessivo_fim: '2026-11-01' }, hoje), 'vencendo');
  checa('ciclo vencido', situacaoDoCiclo({ ...ciclo, concessivo_fim: '2026-08-01' }, hoje), 'vencido');
  checa('ciclo em aquisicao', situacaoDoCiclo({ ...ciclo, aquisitivo_fim: '2026-12-31' }, hoje), 'em_aquisicao');
  checa('ciclo sem saldo', situacaoDoCiclo({ ...ciclo, dias_utilizados: 30 }, hoje), 'utilizado');

  const ciclos = [
    { ...ciclo, id: 'velho', concessivo_fim: '2026-12-31' },
    { ...ciclo, id: 'novo', aquisitivo_fim: '2026-12-31', concessivo_fim: '2027-12-31', dias_utilizados: 0 },
  ];
  checa('usa primeiro o ciclo que vence antes', cicloParaAData(ciclos, '2026-11-01', hoje)?.id, 'velho');

  const solicitacoes = [
    { id: 's1', colaborador_id: 'c1', colaborador_nome: 'Ana', status: 'aprovada', data_inicio: '2026-11-02', data_fim: '2026-11-16' },
    { id: 's2', colaborador_id: 'c2', colaborador_nome: 'Bia', status: 'em_analise', data_inicio: '2026-11-10', data_fim: '2026-11-20' },
    { id: 's3', colaborador_id: 'c3', colaborador_nome: 'Caio', status: 'recusada', data_inicio: '2026-11-10', data_fim: '2026-11-20' },
  ];
  checa('de ferias no dia', deFeriasEm(solicitacoes, '2026-11-12').map((s) => s.colaborador_nome).join(','), 'Ana,Bia');
  checa('pedido recusado nao ocupa vaga', String(deFeriasEm(solicitacoes, '2026-11-18').length), '1');

  const lot = lotacaoNoPeriodo(solicitacoes, '2026-11-01', '2026-11-30');
  checa('pico de pessoas fora no periodo', String(lot.pico), '2');
  checa('dia do pico', lot.diaDoPico, '2026-11-10');

  const base = { colaborador_id: 'c9', data_inicio: '2026-11-05', data_fim: '2026-11-19', venda_dias: 0 };
  const ok = conferirPedido({ pedido: base, solicitacoes, ciclo: ciclos[0], hoje });
  checa('pedido dentro das regras passa', String(ok.erros.length), '0');
  checa('mas avisa que fecha o limite de tres', ok.avisos.find((a) => a.includes('limite')) || '', 'ficam fora ao mesmo tempo');
  checa('conta os dias do pedido', String(ok.dias), '15');

  const cheio = [...solicitacoes, { id: 's4', colaborador_id: 'c4', colaborador_nome: 'Duda', status: 'aprovada', data_inicio: '2026-11-08', data_fim: '2026-11-12' }];
  const quarto = conferirPedido({ pedido: base, solicitacoes: cheio, ciclo: ciclos[0], hoje });
  checa('o quarto pedido no mesmo periodo e barrado', quarto.erros.find((e) => e.includes('limite')) || '', 'O limite é 3');

  const emCima = conferirPedido({ pedido: { ...base, data_inicio: '2026-10-01', data_fim: '2026-10-15' }, solicitacoes, ciclo: ciclos[0], hoje });
  checa('antecedencia minima de 30 dias', emCima.erros.find((e) => e.includes('antecedência')) || '', '30 dias de antecedência');

  const curto = conferirPedido({ pedido: { ...base, data_fim: '2026-11-07' }, solicitacoes, ciclo: ciclos[0], hoje });
  checa('periodo de menos de 5 dias e barrado', curto.erros.find((e) => e.includes('5 dias')) || '', 'ao menos 5 dias');

  const semSaldo = conferirPedido({ pedido: base, solicitacoes, ciclo: { ...ciclos[0], dias_utilizados: 25 }, hoje });
  checa('pedido maior que o saldo e barrado', semSaldo.erros.find((e) => e.includes('saldo')) || '', 'saldo deste período é de 5');

  const vendaDemais = conferirPedido({ pedido: { ...base, venda_dias: 11 }, solicitacoes, ciclo: ciclos[0], hoje });
  checa('venda acima de 10 dias e barrada', vendaDemais.erros.find((e) => e.includes('venda')) || '', 'no máximo 10 dias');

  const repetido = conferirPedido({ pedido: { ...base, colaborador_id: 'c1' }, solicitacoes, ciclo: ciclos[0], hoje });
  checa('pedido repetido da mesma pessoa e barrado', repetido.erros.find((e) => e.includes('já tem')) || '', 'já tem um pedido');

  const frag = fragmentoDoPedido({ id: 's9', data_inicio: '2026-11-05', data_fim: '2026-11-19', venda_dias: 5 });
  checa('fragmento leva dias e abono', `${frag.dias}/${frag.abono_dias}/${frag.status}`, '15/5/aprovado');
  checa('proximas ferias so as aprovadas em pe', proximasFerias(solicitacoes, hoje).map((s) => s.colaborador_nome).join(','), 'Ana');
}

console.log('\n== produtividade por turno ==');
{
  checa('08:00 e manha', turnoDoHorario('08:00'), 'manha');
  checa('11:59 ainda e manha', turnoDoHorario('11:59'), 'manha');
  checa('12:00 ja e tarde', turnoDoHorario('12:00'), 'tarde');
  checa('18:00 e tarde', turnoDoHorario('18:00'), 'tarde');
  checa('aceita segundos', turnoDoHorario('09:30:00'), 'manha');
  checa('sem horario nao chuta', String(turnoDoHorario('')), 'null');

  const periodo = { inicio: '2026-09-21', fim: '2026-09-25' };
  const colaboradores = [{ id: 'c1', nome_completo: 'Ana', email: 'ana@x.com' }, { id: 'c2', nome_completo: 'Bia', email: 'bia@x.com' }];
  // 12:00 em Sao Paulo = 15:00 UTC; 09:00 SP = 12:00 UTC.
  const t = (id, dono, horaUtc, status = 'encerrada') => ({
    id, agente_responsavel_id: dono, status,
    data_registro: `2026-09-22T${horaUtc}:00:00Z`,
  });
  const tratativas = [
    t('t1', 'c1', '12'), // 09h SP — manha
    t('t2', 'c1', '13', 'em_andamento'), // 10h SP — manha
    t('t3', 'c2', '18'), // 15h SP — tarde
    t('t4', 'c2', '20'), // 17h SP — tarde
    { ...t('t5', 'c1', '12'), excluida: true },
    { ...t('t6', 'c1', '12'), data_registro: '2026-10-01T12:00:00Z' }, // fora do periodo
  ];
  const escalas = [{
    semana_referencia: '2026-W39',
    turnos: [{
      dia: 'terca', data: '2026-09-22', cancelado: false,
      manha: [{ colaborador_id: 'c1', colaborador_nome: 'Ana' }],
      analisa_manha: [{ colaborador_id: 'c2', colaborador_nome: 'Bia' }],
      tarde: [{ colaborador_id: 'c2', colaborador_nome: 'Bia' }],
      analisa_tarde: [],
    }],
  }];

  const r = produtividadePorTurno({ escalas, tratativas, colaboradores, periodo });
  checa('conta pelo horario, nao pela escala', `${r.manha.tratativas}/${r.tarde.tratativas}`, '2/2');
  checa('excluida e fora do periodo ficam de fora', String(r.total), '4');
  checa('encerradas da manha', String(r.manha.encerradas), '1');
  checa('quantos estavam escalados de manha', String(r.manha.escalados), '2');
  checa('e de tarde', String(r.tarde.escalados), '1');
  checa('tratativas por pessoa escalada na tarde', String(r.tarde.porPessoaEscalada), '2');
  checa('parte da manha', String(Math.round(r.parteDaManha)), '50');
  checa('por pessoa: Ana so de manha', r.pessoas.map((p) => `${p.nome}:${p.manha}/${p.tarde}`).join(','), 'Ana:2/0,Bia:0/2');
  checa('serie por dia', `${r.dias[0].data}:${r.dias[0].manha}/${r.dias[0].tarde}`, '2026-09-22:2/2');
  checa('dia cancelado nao conta escalado', String(produtividadePorTurno({
    escalas: [{ turnos: [{ ...escalas[0].turnos[0], cancelado: true }] }], tratativas, colaboradores, periodo,
  }).manha.escalados), '0');
}

console.log('\n== leitor de csv ==');
{
  const NL = String.fromCharCode(10);
  const csv = [
    'Agente;Data;Observacao;CSAT',
    'Ana;01/09/2026;"Cliente reclamou do prazo, mas entendeu";5',
    'Bia;02/09/2026;sem virgula aqui;4',
    '"Caio ""Junior""";03/09/2026;"quebra' + NL + 'de linha dentro do campo";3',
  ].join(NL);
  const r = lerCsv(csv);
  checa('descobre o ponto e virgula do Excel brasileiro', descobrirSeparador(csv), ';');
  checa('le as quatro colunas', r.colunas.join(','), 'Agente,Data,Observacao,CSAT');
  checa('tres linhas de dados', String(r.linhas.length), '3');
  checa('virgula dentro de aspas nao quebra a coluna', r.linhas[0].Observacao, 'Cliente reclamou do prazo, mas entendeu');
  checa('csat da primeira linha continua no lugar', r.linhas[0].CSAT, '5');
  checa('aspas duplas viram uma aspa', r.linhas[2].Agente, 'Caio "Junior"');
  checa('quebra de linha dentro do campo nao vira linha nova', r.linhas[2].Observacao, 'de linha dentro do campo');

  const comVirgula = lerCsv('Agente,Data' + NL + 'Ana,01/09/2026');
  checa('tambem le arquivo com virgula', comVirgula.colunas.length + ':' + comVirgula.linhas[0].Agente, '2:Ana');
  checa('arquivo vazio avisa', lerCsv('').avisos[0], 'vazio');
  const bom = String.fromCharCode(65279) + 'Agente,Data' + NL + 'Ana,01/09/2026';
  checa('BOM do Excel nao suja o nome da coluna', lerCsv(bom).colunas[0], 'Agente');
  const torto = lerCsv(['a,b,c', '1,2', '1,2,3'].join(NL));
  checa('linha com colunas de menos e avisada', torto.avisos[0], '1 linha(s) com um n');
}

console.log('\n== importacao da apuracao ==');
{
  checa('data brasileira', normalizarData('01/09/2026'), '2026-09-01');
  checa('data com hora do zendesk', normalizarData('2026-09-01T14:30:00Z'), '2026-09-01');
  checa('data com ano de dois digitos', normalizarData('1/9/26'), '2026-09-01');
  checa('texto que nao e data', String(normalizarData('ontem')), 'null');

  const colunas55 = ['Agente', 'Data', 'Ligação de Origem', 'Status da Ligação', 'FCR', 'CSAT'];
  const colunasZd = ['Atribuído a', 'ID do Ticket', 'Criado em', 'Satisfação Boa', 'Satisfação Ruim'];
  const colunasCx = ['Colaborador', 'Data', 'Empatia', 'Cordialidade', 'Comunicação', 'Escrita', 'Profissionalismo', 'Resolução', 'Observação'];
  checa('reconhece o 55pbx', detectarFonte(colunas55), '55pbx');
  checa('reconhece o zendesk', detectarFonte(colunasZd), 'zendesk');
  checa('reconhece a planilha de cx', detectarFonte(colunasCx), 'planilha_cx');
  checa('arquivo estranho nao e chutado', String(detectarFonte(['coluna 1', 'coluna 2'])), 'null');

  const mapa = sugerirMapeamento(colunas55, 'telefone');
  checa('mapeia agente e data sozinho', mapa.agente + '|' + mapa.data, 'Agente|Data');
  checa('mapeia origem e status', mapa.origem + '|' + mapa.status, 'Ligação de Origem|Status da Ligação');

  // As colunas de verdade do relatório do 55PBX (report.csv, 24/09/2026) --
  // nomes bem diferentes do que a gente supôs antes de ver o arquivo real.
  const colunas55Real = [
    'Chamada', 'Operador', 'Data', 'Fila', 'Id ligação de origem', 'I D Do Ticket',
    'Pergunta3 1 SIM O NAO', 'Pergunta3 2 NOTA 1 a 5', 'Quantidade de Transbordos', 'Motivo de Desconexão',
  ];
  checa('reconhece o 55pbx de verdade', detectarFonte(colunas55Real), '55pbx');
  const mapaReal = sugerirMapeamento(colunas55Real, 'telefone');
  checa('agente vem do Operador', mapaReal.agente, 'Operador');
  // "Fila" é um id de fila de atendimento, não indica transferência -- quem
  // indica é "Id ligação de origem" ("<id> - transferência fila"). Fila não
  // pode ganhar essa disputa.
  checa('origem e a ligacao de origem, nao a Fila', mapaReal.origem, 'Id ligação de origem');
  checa('status vem da coluna Chamada', mapaReal.status, 'Chamada');
  checa('fcr vem da Pergunta3 1', mapaReal.fcr, 'Pergunta3 1 SIM O NAO');
  checa('csat vem da Pergunta3 2', mapaReal.csat, 'Pergunta3 2 NOTA 1 a 5');
  checa('nada faltando quando o mapa esta completo', String(camposFaltando('telefone', mapa).length), '0');
  checa('acusa campo obrigatorio faltando', camposFaltando('telefone', { agente: 'Agente' })[0], 'Data');

  // As colunas de verdade do relatorio de chat do Zendesk (2026-09-24): o
  // agente nao vinha sendo reconhecido porque a coluna real e "Nome do
  // atribuido", sem o " a" no final que os sinonimos tinham -- ninguem batia
  // nem por substring, e a importacao ficava travada pedindo pra escolher
  // Agente a mao toda vez.
  const colunasChatReal = ['ID do ticket', 'Nome do atribuído', 'Criação do ticket - Data', 'Tickets com satisfação boa', 'Tickets com satisfação ruim'];
  checa('reconhece o zendesk de verdade', detectarFonte(colunasChatReal), 'zendesk');
  const mapaChatReal = sugerirMapeamento(colunasChatReal, 'chat');
  checa('agente vem do Nome do atribuido', mapaChatReal.agente, 'Nome do atribuído');
  checa('nada faltando no mapa do chat real', String(camposFaltando('chat', mapaChatReal).length), '0');

  const lembrado = sugerirMapeamento(['Quem atendeu', 'Dia', 'Origem', 'Status', 'FCR', 'CSAT'], 'telefone', { agente: 'Quem atendeu', data: 'Dia' });
  checa('o que o gestor corrigiu antes ganha da adivinhacao', lembrado.agente + '|' + lembrado.data, 'Quem atendeu|Dia');

  const linhas = [
    { Agente: 'Ana Flavia G. Amarante', Data: '16/09/2026' },
    { Agente: 'Ana Flavia G. Amarante', Data: '17/09/2026' },
    { Agente: 'Fulano Externo', Data: '18/09/2026' },
    { Agente: '', Data: '18/09/2026' },
    { Agente: 'Ana Flavia G. Amarante', Data: 'ontem' },
  ];
  const per = periodoDoArquivo(linhas, 'Data');
  checa('periodo sai do arquivo', per.inicio + ' a ' + per.fim, '2026-09-16 a 2026-09-18');
  checa('e sabe quantos dias tem', String(per.dias.length), '3');

  const colaboradores = [
    { id: 'c1', nome_completo: 'Ana Flávia Guelber Amarante', ativo: true },
    { id: 'c2', nome_completo: 'Bárbara Emanuella dos Santos', ativo: true },
    { id: 'c3', nome_completo: 'Quem Saiu', ativo: false },
  ];
  const vinc = vincularAgentes(['Ana Flávia Guelber Amarante', 'Barbara E. dos Santos', 'Fulano Externo', 'Quem Saiu'], colaboradores);
  checa('nome igual liga sozinho', vinc[0].colaborador_id + '/' + vinc[0].origem, 'c1/automatico');
  checa('primeiro e ultimo nome tambem ligam', vinc[1].colaborador_id + '/' + vinc[1].origem, 'c2/automatico');
  checa('desconhecido fica sem vinculo', vinc[2].origem, 'sem_vinculo');
  checa('pessoa inativa nao e ligada', vinc[3].origem, 'sem_vinculo');
  const comLembrete = vincularAgentes(['Fulano Externo'], colaboradores, { 'Fulano Externo': 'c2' });
  checa('vinculo lembrado vale', comLembrete[0].colaborador_id + '/' + comLembrete[0].origem, 'c2/lembrado');

  const existentes = [{
    tipo_apuracao: 'telefone', colaborador_id: 'c1',
    dados_por_data: [{ data: '2026-09-16' }, { data: '2026-09-15' }],
  }];
  const mapeamento = { agente: 'Agente', data: 'Data', origem: 'o', status: 's', fcr: 'f', csat: 'c' };
  const conf = conferirImportacao({
    tipo: 'telefone', linhas, colaboradores, apuracoesExistentes: existentes, mapeamento,
    vinculos: { 'Ana Flavia G. Amarante': 'c1' },
  });
  checa('conta o que foi lido', String(conf.linhasLidas), '5');
  checa('conta o que serve', String(conf.linhasValidas), '3');
  checa('diz por que descartou', conf.descartadas.map((d) => d.quantidade + ' ' + d.motivo).join(' | '), '1 sem o nome do agente | 1 sem data');
  checa('avisa quem ficou sem pessoa do Portal', conf.avisos.find((a) => a.includes('sem pessoa')) || '', 'Fulano Externo');
  checa('avisa dia ja importado', conf.avisos.find((a) => a.includes('substitui')) || '', '1 dia(s) já tinham sido importados');
  checa('nao libera salvar com agente solto', String(conf.pronta), 'false');

  const conf2 = conferirImportacao({
    tipo: 'telefone', linhas: linhas.slice(0, 2), colaboradores, apuracoesExistentes: [], mapeamento,
    vinculos: { 'Ana Flavia G. Amarante': 'c1' },
  });
  checa('libera salvar quando esta tudo ligado', String(conf2.pronta), 'true');
  checa('pede o campo que falta antes de conferir', conferirImportacao({ tipo: 'telefone', linhas, mapeamento: { agente: 'Agente' } }).faltando[0], 'Data');

  const lotes = lotesDeImportacao([
    { id: 'a1', importacao_id: 'imp1', tipo_apuracao: 'telefone', arquivo_nome: 'setembro.csv', data_apuracao: '2026-09-20T10:00:00Z', periodo_inicio: '2026-09-16', periodo_fim: '2026-09-18', dados_por_data: [{ data: '2026-09-16' }] },
    { id: 'a2', importacao_id: 'imp1', tipo_apuracao: 'telefone', arquivo_nome: 'setembro.csv', data_apuracao: '2026-09-20T10:00:00Z', periodo_inicio: '2026-09-16', periodo_fim: '2026-09-20', dados_por_data: [{ data: '2026-09-17' }] },
    { id: 'a3', tipo_apuracao: 'chat', data_apuracao: '2026-09-21T10:00:00Z', dados_por_data: [] },
  ]);
  checa('duas importacoes no historico', String(lotes.length), '2');
  checa('a mais recente vem primeiro', lotes[0].tipo, 'chat');
  checa('o lote junta as pessoas e os dias', lotes[1].pessoas + '/' + lotes[1].dias + '/' + lotes[1].fim, '2/2/2026-09-20');
  checa('apuracao antiga aparece como avulsa', String(lotes[0].avulsa), 'true');
  const antigas = lotesDeImportacao([
    { id: 'v1', tipo_apuracao: 'chat', data_apuracao: '2026-05-25T10:00:10Z', periodo_inicio: '2026-05-01', periodo_fim: '2026-05-31', dados_por_data: [{ data: '2026-05-04' }] },
    { id: 'v2', tipo_apuracao: 'chat', data_apuracao: '2026-05-25T10:00:12Z', periodo_inicio: '2026-05-01', periodo_fim: '2026-05-31', dados_por_data: [{ data: '2026-05-05' }] },
    { id: 'v3', tipo_apuracao: 'telefone', data_apuracao: '2026-05-25T10:00:12Z', periodo_inicio: '2026-05-01', periodo_fim: '2026-05-31', dados_por_data: [{ data: '2026-05-05' }] },
  ]);
  checa('importacoes antigas do mesmo momento viram um lote so', String(antigas.length), '2');
  checa('e o lote antigo soma as pessoas', String(antigas.find((l) => l.tipo === 'chat').pessoas), '2');
}

console.log('\n== telefone (55PBX): FCR 1 + nota 3 e neutro, nao negativo ==');
{
  // Regra real do 55PBX de Pedro (arquivo report.csv, 24/09/2026):
  //   FCR 1 + CSAT 4 ou 5 -> positiva
  //   FCR 1 + CSAT 1 ou 2 -> negativa
  //   FCR 1 + CSAT 3      -> NEUTRA (antes entrava como negativa por engano)
  //   FCR 2, qualquer CSAT -> negativa sempre
  //   FCR 1 sem CSAT valido -> incompleta: erro operacional do cliente,
  //     NAO conta como avaliada (Pedro, 24/09/2026)
  const mapeamento = { agente: 'Agente', data: 'Data', origem: 'Origem', status: 'Status', fcr: 'FCR', csat: 'CSAT' };
  const linha = (id, fcr, csat) => ({ Agente: 'Ana', Data: '10/09/2026', Origem: '', Status: 'Atendida', FCR: fcr === null ? '' : String(fcr), CSAT: csat === null ? '' : String(csat) });
  const linhas = [
    linha('t1', 1, 5), linha('t2', 1, 4),       // positivas
    linha('t3', 1, 1), linha('t4', 1, 2),       // negativas de verdade
    linha('t5', 1, 3), linha('t6', 1, 3),       // neutras -- o caso corrigido
    linha('t7', 2, 5), linha('t8', 2, null),    // FCR 2: negativa sempre, com ou sem nota
    linha('t9', 1, null),                       // incompleta: respondeu FCR, nao deu nota
  ];
  const r = calcularTelefone(linhas, mapeamento).Ana;
  checa('positivas', String(r.totalPositivas), '2');
  checa('negativas de verdade (1,2 e os dois FCR2)', String(r.totalNegativas), '4');
  checa('duas neutras (fcr1+nota3)', String(r.totalNeutras), '2');
  checa('uma incompleta (fcr1 sem nota)', String(r.totalIncompletas), '1');
  checa('avaliadas fecha com positivas+negativas+neutras (incompleta fica fora)', String(r.totalAvaliadas), String(r.totalPositivas + r.totalNegativas + r.totalNeutras));
  checa('avaliadas = 8 (a incompleta nao conta)', String(r.totalAvaliadas), '8');
  // CSAT oficial = positivas / (positivas + negativas) = 2 / 6, NAO 2/9.
  checa('csat exclui neutras e incompletas do denominador', r.csatPercentual.toFixed(2), (2 / 6 * 100).toFixed(2));
  checa('sem a correcao o csat sairia 2/9 = 22%: confirma que nao e isso', String(Math.abs(r.csatPercentual - (2 / 9 * 100)) > 1), 'true');

  const validacao = validarConsistenciaTelefone(r);
  checa('a soma dos baldes bate com avaliadas (sem alerta)', String(validacao.ok), 'true');
}

console.log('\n== telefone (55PBX): transferencia de fila pelo relatorio real ==');
{
  // No relatorio real, quem indica transbordo e "Id ligacao de origem"
  // (populado com "<id> - transferencia fila"), nao uma coluna "origem"
  // categorica como Receptiva/Transferencia. Uma ligacao transferida conta
  // como atendida, mas nunca gera avaliacao -- mesmo tendo FCR/CSAT no
  // arquivo, eles sao ignorados.
  const mapeamento = { agente: 'Operador', data: 'Data', origem: 'Id ligação de origem', status: 'Chamada', fcr: 'Pergunta3 1 SIM O NAO', csat: 'Pergunta3 2 NOTA 1 a 5' };
  const linhas = [
    { Operador: 'Dayane Santos', Data: '14/09/2026', 'Id ligação de origem': '', Chamada: 'Atendida', 'Pergunta3 1 SIM O NAO': '1', 'Pergunta3 2 NOTA 1 a 5': '5' },
    { Operador: 'Dayane Santos', Data: '14/09/2026', 'Id ligação de origem': '1789416523.14818 - transferência fila', Chamada: 'Atendida', 'Pergunta3 1 SIM O NAO': '1', 'Pergunta3 2 NOTA 1 a 5': '2' },
  ];
  const r = calcularTelefone(linhas, mapeamento)['Dayane Santos'];
  checa('as duas ligacoes contam no total', String(r.totalLigacoes), '2');
  checa('as duas contam como atendidas (a transferida tambem)', String(r.totalAtendidas), '2');
  checa('uma transferencia detectada', String(r.totalTransferencias), '1');
  checa('so a ligacao direta gera avaliacao', String(r.totalAvaliadas), '1');
  checa('a nota da ligacao transferida (CSAT 2) nao entra em nada', String(r.totalNegativas), '0');
  checa('csat sai 100% -- so a ligacao direta (nota 5) conta', String(r.csatPercentual), '100');
}

console.log('\n== CX: media divide pela quantidade de criterios avaliados, nao por 6 fixo ==');
{
  // Regra de Pedro (24/09/2026): soma as notas dos criterios preenchidos e
  // divide pela QUANTIDADE de criterios avaliados naquela linha -- uma
  // coluna em branco nao vira nota zero, so sai do denominador.
  const mapeamento = {
    agente: 'Agente', data: 'Data',
    empatia: 'Empatia', cordialidade: 'Cordialidade', comunicacao: 'Comunicacao',
    escrita: 'Escrita', profissionalismo: 'Profissionalismo', resolucao: 'Resolucao',
  };
  const linhas = [
    // Todos os 6 preenchidos: media = (5+5+5+5+5+5)/6 = 5.
    { Agente: 'Ana', Data: '10/09/2026', Empatia: '5', Cordialidade: '5', Comunicacao: '5', Escrita: '5', Profissionalismo: '5', Resolucao: '5' },
    // So 2 dos 6 preenchidos: media = (4+2)/2 = 3, NAO (4+2+0+0+0+0)/6 = 1.
    { Agente: 'Ana', Data: '11/09/2026', Empatia: '4', Cordialidade: '', Comunicacao: '2', Escrita: '', Profissionalismo: '', Resolucao: '' },
    // Nenhum criterio preenchido: nao e avaliacao de verdade, fica de fora.
    { Agente: 'Ana', Data: '12/09/2026', Empatia: '', Cordialidade: '', Comunicacao: '', Escrita: '', Profissionalismo: '', Resolucao: '' },
  ];
  const r = calcularCX(linhas, mapeamento).Ana;
  checa('linha vazia nao conta como avaliacao', String(r.totalAvaliacoes), '2');
  checa('linha com todos os 6 criterios: media 5', String(r.avaliacoes[0].media), '5');
  checa('linha com so 2 criterios: media 3 (nao 1)', String(r.avaliacoes[1].media), '3');
  checa('criterio em branco fica nulo, nao vira zero', String(r.avaliacoes[1].cordialidade), 'null');
  checa('mediaCX da pessoa: (5 + 3) / 2 = 4', String(r.mediaCX), '4');
}

console.log('\n== chat (Zendesk): calculo bruto, sem coluna de nota ==');
{
  // O Zendesk nao manda nota nenhuma no arquivo -- so bom/ruim. calcularChat
  // fica no basico; quem classifica ticket por ticket e a tela Ouvidoria,
  // depois de salvo (proximo bloco).
  const mapeamento = { agente: 'Agente', data: 'Data', ticket: 'Ticket', bom: 'Bom', ruim: 'Ruim' };
  const linha = (ticket, bom, ruim) => ({ Agente: 'Ana', Data: '10/09/2026', Ticket: ticket, Bom: String(bom), Ruim: String(ruim) });
  const linhas = [
    linha('t1', 1, 0), linha('t2', 1, 0),
    linha('t3', 0, 1), linha('t4', 0, 1), linha('t5', 0, 1), linha('t6', 0, 1),
    linha('t7', 0, 0),
  ];
  const r = calcularChat(linhas, mapeamento).Ana;
  checa('positivos', String(r.totalPositivos), '2');
  checa('negativos brutos (todo "ruim" conta)', String(r.totalNegativos), '4');
  checa('cada historico sai com nota nula, pronto para classificar depois', String(r.historico.every((h) => h.nota === null)), 'true');
  checa('nao sobra rastro de ouvidoria no calculo (isso e so na tela)', String(r.totalNeutros), 'undefined');
}

console.log('\n== auditoria do telefone: conferir a classificacao automatica ==');
{
  // Diferente do chat, aqui nao ha nada pra classificar -- a fila serve so
  // pra conferir que a formula (FCR+CSAT) classificou certo cada ligacao.
  const mapeamento = { agente: 'Agente', data: 'Data', origem: 'Origem', status: 'Status', fcr: 'FCR', csat: 'CSAT' };
  const linha = (fcr, csat, origem = '') => ({ Agente: 'Ana', Data: '10/09/2026', Origem: origem, Status: 'Atendida', FCR: fcr === null ? '' : String(fcr), CSAT: csat === null ? '' : String(csat) });
  const linhas = [
    linha(1, 5), linha(1, 1), linha(1, 3), linha(1, null), linha(2, 5),
    linha(1, 4, '123 - transferência fila'),
  ];
  const resultados = calcularTelefone(linhas, mapeamento);
  const apuracaoTel = { id: 'apt1', tipo_apuracao: 'telefone', colaborador_id: 'c1', colaborador_nome: 'Ana', historico_detalhado: resultados.Ana.historico };

  const ligs = ligacoesAuditoria([apuracaoTel]);
  checa('seis ligacoes na auditoria', String(ligs.length), '6');
  const resumo = resumoAuditoria(ligs);
  checa('uma de cada categoria (menos negativa, que tem duas: fcr1 csat1 e fcr2)', JSON.stringify({ p: resumo.positiva, neg: resumo.negativa, n: resumo.neutra, i: resumo.incompleta, t: resumo.transferencia }), JSON.stringify({ p: 1, neg: 2, n: 1, i: 1, t: 1 }));
  checa('filtro por categoria funciona', String(ligacoesAuditoria([apuracaoTel], { categoria: 'transferencia' }).length), '1');
  checa('filtro por colaborador funciona', String(ligacoesAuditoria([apuracaoTel], { colaboradorId: 'outro' }).length), '0');
}

console.log('\n== revisao de negativas do telefone: confirmar ou remover, com motivo ==');
{
  // Pedro (30/09/2026): ligacao muda (falha tecnica) e o cliente avalia
  // negativo mesmo assim. Diferente da ouvidoria do chat, aqui a remocao
  // MUDA o csat oficial -- a negativa contestada some da conta, como se a
  // ligacao nunca tivesse sido avaliada.
  const apuracaoBase = {
    id: 'apt2',
    tipo_apuracao: 'telefone',
    colaborador_id: 'c1',
    colaborador_nome: 'Ana',
    canal_telefone: { csat: 40, fcr: 100, performance: 100, avaliados: 5, total_atendimentos: 5 },
    dados_por_data: [
      { data: '2026-09-10', telefone: { total_ligacoes: 3, total_atendidas: 3, total_avaliadas: 3, total_positivas: 2, total_negativas: 1, csat: 66.67 } },
      { data: '2026-09-11', telefone: { total_ligacoes: 2, total_atendidas: 2, total_avaliadas: 2, total_positivas: 0, total_negativas: 2, csat: 0 } },
    ],
    historico_detalhado: [
      { data: '2026-09-10', status: 'Atendida', fcr: 1, csat: 5, isPositiva: true, isNegativa: false },
      { data: '2026-09-10', status: 'Atendida', fcr: 1, csat: 4, isPositiva: true, isNegativa: false },
      { data: '2026-09-10', status: 'Atendida', fcr: 1, csat: 1, isPositiva: false, isNegativa: true },
      { data: '2026-09-11', status: 'Atendida', fcr: 2, csat: 2, isPositiva: false, isNegativa: true },
      { data: '2026-09-11', status: 'Atendida', fcr: 2, csat: 1, isPositiva: false, isNegativa: true },
    ],
  };
  // csat oficial antes: (2+0) / (2+0+3) = 2/5 = 40%.
  checa('csat de partida bate com o canal_telefone dado', String(apuracaoBase.canal_telefone.csat), '40');

  const revisandoPositiva = revisarLigacao(apuracaoBase, 0, 'confirmado', null, { nome_completo: 'Pedro' });
  checa('so negativa pode ser revisada -- positiva fica intacta', String(revisandoPositiva.historico_detalhado[0].revisao), 'undefined');

  const semMotivo = (() => { try { revisarLigacao(apuracaoBase, 2, 'removido', '', { nome_completo: 'Pedro' }); return null; } catch (e) { return e.message; } })();
  checa('remover exige motivo', String(!!semMotivo), 'true');

  const patch = revisarLigacao(apuracaoBase, 2, 'removido', 'Ligacao muda, sem audio -- falha tecnica confirmada', { id: 'g1', nome_completo: 'Pedro Soares' });
  const diaRevisado = patch.dados_por_data.find((d) => d.data === '2026-09-10').telefone;
  checa('negativa removida sai do total do dia', String(diaRevisado.total_negativas), '0');
  checa('tambem sai de avaliadas do dia (como incompleta)', String(diaRevisado.total_avaliadas), '2');
  checa('csat do dia sobe pra 100 (so as duas positivas restam)', String(diaRevisado.csat), '100');
  checa('o outro dia nao mudou', String(patch.dados_por_data.find((d) => d.data === '2026-09-11').telefone.total_negativas), '2');
  // csat oficial depois: positivas=2, negativas=1 (so a do dia 11 x2 menos... espera: dia 10 negativas=0, dia 11 negativas=2) => 2/(2+2)=50%.
  checa('csat oficial (canal_telefone) recalculado: 2/(2+2) = 50%', String(patch.canal_telefone.csat), '50');
  checa('avaliados oficiais tambem cairam', String(patch.canal_telefone.avaliados), '4');
  checa('a ligacao guarda quem revisou e o motivo', patch.historico_detalhado[2].revisao.motivo, 'Ligacao muda, sem audio -- falha tecnica confirmada');
  checa('e o nome de quem revisou', patch.historico_detalhado[2].revisao.por_nome, 'Pedro Soares');
  checa('as outras ligacoes do historico ficam intactas', String(patch.historico_detalhado[3].revisao), 'undefined');

  const apuracaoComRevisao = { ...apuracaoBase, ...patch };
  const confirmando = revisarLigacao(apuracaoComRevisao, 3, 'confirmado', null, { nome_completo: 'Pedro Soares' });
  checa('confirmar negativo nao muda os numeros', String(confirmando.canal_telefone.csat), String(apuracaoComRevisao.canal_telefone.csat));
  checa('mas fica registrado como confirmado', confirmando.historico_detalhado[3].revisao.status, 'confirmado');

  const desfazendo = revisarLigacao({ ...apuracaoComRevisao, historico_detalhado: patch.historico_detalhado }, 2, null, null, {});
  checa('desfazer a revisao volta o csat oficial pro original (40%)', String(desfazendo.canal_telefone.csat), '40');
}

console.log('\n== ouvidoria do chat: classificacao manual, ticket por ticket ==');
{
  // Pedro (24/09/2026, corrigindo a primeira versao): o campo de nota no
  // mapeamento saiu. Depois de importado, ele revisa cada "ruim" e diz se e
  // 1, 2 (negativo de verdade) ou 3 (neutro). So isso muda o comparativo --
  // nunca o csat oficial.
  const apuracaoBase = {
    id: 'ap1',
    tipo_apuracao: 'chat',
    colaborador_id: 'c1',
    colaborador_nome: 'Ana',
    canal_chat: { csat: 33.333333, avaliados: 6, total_atendimentos: 7 },
    dados_por_data: [
      { data: '2026-09-10', chat: { total_chats: 3, total_avaliados: 3, total_positivos: 2, total_negativos: 1, csat: 66.6667 } },
      { data: '2026-09-11', chat: { total_chats: 4, total_avaliados: 3, total_positivos: 0, total_negativos: 3, csat: 0 } },
    ],
    historico_detalhado: [
      { data: '2026-09-10', ticket: 't1', bom: 1, ruim: 0, nota: null },
      { data: '2026-09-10', ticket: 't2', bom: 1, ruim: 0, nota: null },
      { data: '2026-09-10', ticket: 't3', bom: 0, ruim: 1, nota: null },
      { data: '2026-09-11', ticket: 't4', bom: 0, ruim: 1, nota: null },
      { data: '2026-09-11', ticket: 't5', bom: 0, ruim: 1, nota: null },
      { data: '2026-09-11', ticket: 't6', bom: 0, ruim: 1, nota: null },
    ],
  };

  const fila0 = filaDeNegativos([apuracaoBase]);
  checa('a fila tem so os "ruim"', String(fila0.length), '4');
  const resumo0 = resumoDaFila(fila0);
  checa('nada classificado ainda', String(resumo0.naoClassificados), '4');

  // Classifica t3 como 1 (negativo confirmado)
  let atual = { ...apuracaoBase, ...classificarTicket(apuracaoBase, 't3', 1) };
  checa('t3 vira nota 1 no historico', String(atual.historico_detalhado.find((h) => h.ticket === 't3').nota), '1');
  checa('nota 1 nao e neutro -- csat oficial nao mexe', String(atual.canal_chat.csat), '33.333333');
  checa('ainda nao ha neutro nenhum', String(atual.canal_chat.total_neutros), '0');

  // Classifica t4 e t5 como 3 (neutro) e t6 como 2
  atual = { ...atual, ...classificarTicket(atual, 't4', 3) };
  atual = { ...atual, ...classificarTicket(atual, 't5', 3) };
  atual = { ...atual, ...classificarTicket(atual, 't6', 2) };

  checa('dois neutros no total', String(atual.canal_chat.total_neutros), '2');
  checa('negativos confirmados tira os neutros (4 brutos - 2 neutros)', String(atual.canal_chat.negativos_confirmados), '2');
  checa('csat sem neutros sobe (positivos / avaliados-neutros)', atual.canal_chat.csat_sem_neutros.toFixed(2), (2 / 4 * 100).toFixed(2));
  checa('csat oficial continua intocado', String(atual.canal_chat.csat), '33.333333');
  checa('flag de classificacao liga', String(atual.canal_chat.tem_nota), 'true');

  const dia11 = atual.dados_por_data.find((d) => d.data === '2026-09-11');
  checa('o dia 11 carrega os dois neutros dele', String(dia11.chat.total_neutros), '2');
  checa('e o dia 11 fica marcado como classificado', String(dia11.chat.tem_nota), 'true');
  const dia10 = atual.dados_por_data.find((d) => d.data === '2026-09-10');
  checa('o dia 10 nao tem neutro (so t3, que e nota 1)', String(dia10.chat.total_neutros), '0');
  checa('mas o dia 10 tambem fica marcado, porque t3 foi classificado', String(dia10.chat.tem_nota), 'true');

  // Desclassificar (nota null) volta ao estado bruto naquele ticket.
  const desfeito = { ...atual, ...classificarTicket(atual, 't6', null) };
  checa('desfazer tira do "classificado"', String(desfeito.historico_detalhado.find((h) => h.ticket === 't6').nota), 'null');

  const filaFinal = filaDeNegativos([atual], { apenasNaoClassificados: true });
  checa('so falta o que nunca foi tocado', String(filaFinal.length), '0');
}

console.log('\n== equidade: rodizio que pula quem esta ausente ==');
{
  const ag = (id, nome) => ({ id, nome_completo: nome });
  const A = [ag('sir', 'Sirlene'), ag('ana', 'Ana'), ag('bia', 'Bia'), ag('cla', 'Clara')];
  const d = (agente_id, tipo, data, extra = {}) => ({ agente_id, tipo_tratativa: tipo, data_atribuicao: data, horario_atribuicao: '10:00', ...extra });
  const hist = [
    d('sir', 'reclame_aqui', '2026-08-01'), d('ana', 'reclame_aqui', '2026-08-05'),
    d('bia', 'reclame_aqui', '2026-08-10'), d('cla', 'reclame_aqui', '2026-09-02'),
  ];
  const semAusencia = filaDoCanal('reclame_aqui', A, hist, new Map(), '2026-10-02');
  checa('sem ausencia, o mais antigo e o proximo', semAusencia.sugerido.agente.nome_completo, 'Sirlene');

  const ferias = [{ colaborador_id: 'sir', status: 'aprovada', data_inicio: '2026-09-28', data_fim: '2026-10-10' }];
  const ind = indisponiveisEm('2026-10-02', { solicitacoes: ferias });
  const comFerias = filaDoCanal('reclame_aqui', A, hist, ind, '2026-10-02');
  checa('ferias aprovadas pulam para a proxima', comFerias.sugerido.agente.nome_completo, 'Ana');
  checa('quem esta de ferias vai para o fim da fila', comFerias.fila[3].agente.nome_completo, 'Sirlene');
  checa('fila explica o motivo', comFerias.fila[3].motivo, 'Férias');
  checa('fila diz ate quando', comFerias.fila[3].ate, '2026-10-10');
  checa('lista quem foi pulado a frente', comFerias.puladosAFrente[0].agente.nome_completo, 'Sirlene');

  const emAnalise = indisponiveisEm('2026-10-02', { solicitacoes: [{ ...ferias[0], status: 'em_analise' }] });
  checa('ferias so em analise nao pulam', String(emAnalise.size), '0');
  const depois = indisponiveisEm('2026-10-11', { solicitacoes: ferias });
  checa('depois das ferias volta a valer', String(depois.size), '0');
  checa('ao voltar e a primeira da fila', filaDoCanal('reclame_aqui', A, hist, depois, '2026-10-11').sugerido.agente.nome_completo, 'Sirlene');

  const escala = [{ colaborador_id: 'ana', tipo_evento: 'falta', data_inicio: '2026-10-02', data_fim: '2026-10-03', created_date: '2026-10-02T09:00:00Z' }];
  checa('falta na escala pula', indisponiveisEm('2026-10-02', { atribuicoes: escala }).get('ana').motivo, 'Ausente');
  const voltou = [...escala, { colaborador_id: 'ana', tipo_evento: 'presencial', data_inicio: '2026-10-02', data_fim: '2026-10-02', created_date: '2026-10-02T10:00:00Z' }];
  checa('marcacao mais recente (presencial) libera', String(indisponiveisEm('2026-10-02', { atribuicoes: voltou }).has('ana')), 'false');
  checa('escala inativa e ignorada', String(indisponiveisEm('2026-10-02', { atribuicoes: [{ ...escala[0], ativa: false }] }).size), '0');

  checa('quem nunca recebeu vem antes', filaDoCanal('procon', A, hist, new Map(), '2026-10-02').sugerido.agente.nome_completo, 'Ana');
  checa('conta o mes do canal', String(filaDoCanal('reclame_aqui', A, hist, new Map(), '2026-09-15').fila.find((l) => l.agente.id === 'cla').noMes), '1');
  checa('mes sem atribuicao conta zero', String(filaDoCanal('reclame_aqui', A, hist, new Map(), '2026-10-02').fila.find((l) => l.agente.id === 'cla').noMes), '0');

  const grade = gradeDoMes('2026-09', A, hist, ['reclame_aqui', 'procon']);
  checa('grade: quem recebeu no mes', String(grade.find((g) => g.agente.id === 'cla').porCanal.reclame_aqui), '1');
  checa('grade: zerados do mes', grade.find((g) => g.agente.id === 'ana').zerados.join(','), 'reclame_aqui,procon');

  console.log('\n== equidade: overrides e historico ==');
  checa('justificativa com motivo e texto', montarJustificativa('carga', 'muitas abertas'), 'Carga do dia: muitas abertas');
  checa('justificativa so com motivo', montarJustificativa('atestado'), 'Indisponível (atestado ou imprevisto)');
  checa('motivo volta do texto gravado', motivoDaJustificativa('Carga do dia: x').valor, 'carga');
  checa('texto antigo livre', motivoDaJustificativa('estava em reuniao').valor, 'texto-livre');
  checa('vazio vira sem motivo', motivoDaJustificativa('').valor, 'sem');
  const ov = [
    d('ana', 'procon', '2026-09-03', { override_rodizio: true, justificativa_override: 'Carga do dia', agente_sugerido_nome: 'Bia' }),
    d('ana', 'procon', '2026-09-04', { override_rodizio: true, justificativa_override: '', agente_sugerido_nome: 'Bia' }),
    d('bia', 'procon', '2026-09-05'),
  ];
  const res = resumoDeOverrides(ov);
  checa('resumo: total', String(res.total), '2');
  checa('resumo: percentual', String(res.percentual), '67');
  checa('resumo: quem foi pulado', `${res.porPulado[0].rotulo}=${res.porPulado[0].qtd}`, 'Bia=2');
  checa('historico: so override', String(filtrarHistorico(ov, { soOverride: true }).length), '2');
  checa('historico: por agente', String(filtrarHistorico(ov, { agenteId: 'bia' }).length), '1');
  checa('historico: mais recente primeiro', filtrarHistorico(ov)[0].data_atribuicao, '2026-09-05');
  checa('historico: busca ticket', String(filtrarHistorico([{ ...ov[0], ticket_id: '975357' }], { busca: '9753' }).length), '1');
  checa('ultimos meses atravessam o ano', ultimosMeses('2026-02-10', 3).join(','), '2026-02,2026-01,2025-12');
}

console.log('\n== campos vazios viram nulo antes de gravar ==');
{
  const r = vazioViraNulo('Tratativa', { categoria_contestacao: '', prioridade: 'alta', link_intranet: '', descricao_solucao: '', data_primeira_contratacao: '' });
  checa('lista fechada vazia vira nulo', String(r.categoria_contestacao), 'null');
  checa('data vazia vira nulo', String(r.data_primeira_contratacao), 'null');
  checa('valor preenchido fica', r.prioridade, 'alta');
  checa('texto livre vazio continua vazio', JSON.stringify(r.descricao_solucao), '""');
  checa('link vazio vira nulo (Google nao exige)', String(r.link_intranet), 'null');
  checa('entidade sem regra nao muda', vazioViraNulo('Aviso', { titulo: '' }).titulo, '');
  checa('nao altera o objeto de entrada', (() => { const o = { categoria_contestacao: '' }; vazioViraNulo('Tratativa', o); return JSON.stringify(o); })(), '""');
}

console.log('\n== api de integracoes: quem passa ==');
{
  const agora = new Date('2026-10-05T12:00:00Z');
  const chaveOk = { ativa: true, expira_em: null };
  const integ = (extra = {}) => ({ ativa: true, recursos: { tratativas: { ler: true, gravar: false }, colaboradores: { ler: true } }, limite_por_minuto: 5, ...extra });
  const dec = (extra) => decidir({ geral: true, chave: chaveOk, integracao: integ(), recurso: 'tratativas', acao: 'ler', agora, usoNoUltimoMinuto: 0, ...extra });
  const cod = (r) => (r.ok ? 'ok' : `${r.status} ${r.codigo}`);

  checa('tudo certo passa', cod(dec()), 'ok');
  checa('chave geral desligada derruba tudo (503)', cod(dec({ geral: false })), '503 integracoes_desligadas');
  checa('chave inexistente (401)', cod(dec({ chave: null, integracao: null })), '401 chave_invalida');
  checa('chave desativada (401)', cod(dec({ chave: { ativa: false } })), '401 chave_desativada');
  checa('chave vencida (401)', cod(dec({ chave: { ativa: true, expira_em: '2026-10-01T00:00:00Z' } })), '401 chave_expirada');
  checa('chave que ainda nao venceu passa', cod(dec({ chave: { ativa: true, expira_em: '2026-12-01T00:00:00Z' } })), 'ok');
  checa('integracao desligada (403)', cod(dec({ integracao: integ({ ativa: false }) })), '403 integracao_desligada');
  checa('ler liberado, gravar nao: gravar recusa', cod(dec({ acao: 'gravar' })), '403 sem_permissao');
  checa('ler e gravar separados: so gravar liberado, ler recusa', cod(dec({ integracao: integ({ recursos: { tratativas: { ler: false, gravar: true } } }) })), '403 sem_permissao');
  checa('ler e gravar juntos: os dois passam', cod(dec({ acao: 'gravar', integracao: integ({ recursos: { tratativas: { ler: true, gravar: true } } }) })), 'ok');
  checa('recurso nao liberado recusa', cod(dec({ recurso: 'ciclos' })), '403 sem_permissao');
  checa('ping nao exige recurso', cod(dec({ recurso: null, acao: null, integracao: integ({ recursos: {} }) })), 'ok');
  checa('limite por minuto (429)', cod(dec({ usoNoUltimoMinuto: 5 })), '429 limite_excedido');
  checa('abaixo do limite passa', cod(dec({ usoNoUltimoMinuto: 4 })), 'ok');
  checa('geral desligada vence tudo, ate chave invalida', cod(dec({ geral: false, chave: null, integracao: null })), '503 integracoes_desligadas');
  checa('permitido: so true libera', String(permitido({ x: { ler: 'sim' } }, 'x', 'ler')), 'false');

  const cab = (mapa) => (n) => mapa[n] ?? null;
  const chaveTeste = `crc_${'a1'.repeat(24)}`;
  checa('chave por Authorization Bearer', extrairChave(cab({ authorization: `Bearer ${chaveTeste}` })), chaveTeste);
  checa('chave por x-api-key', extrairChave(cab({ 'x-api-key': chaveTeste })), chaveTeste);
  checa('chave com formato errado e ignorada', String(extrairChave(cab({ authorization: 'Bearer abc' }))), 'null');
  checa('sem cabecalho nenhum', String(extrairChave(cab({}))), 'null');
  checa('sha256 conhecido', await sha256hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');

  console.log('\n== api de integracoes: o que entra e o que sai ==');
  const ok = { nome_cliente: 'Cliente X', cnpj_cliente: '11222333000181', tipo_tratativa: 'reclame_aqui', prioridade: 'alta' };
  const val = (corpo) => validarNovaTratativa(corpo);
  checa('minimo valido', String(val(ok).erros.length), '0');
  checa('obrigatorios faltando', val({}).erros.join(' | '), 'nome_cliente é obrigatório');
  checa('tipo invalido', val({ ...ok, tipo_tratativa: 'x' }).erros.join(' | '), 'tipo_tratativa: valor inválido');
  checa('prioridade invalida', val({ ...ok, prioridade: 'urgente' }).erros.join(' | '), 'prioridade: valor inválido');
  checa('campo desconhecido e recusado', val({ ...ok, custo_operacional_reais: 10 }).erros.join(' | '), 'campos não aceitos: custo_operacional_reais');
  checa('status nao pode ser enviado', val({ ...ok, status: 'encerrada' }).erros.join(' | '), 'campos não aceitos: status');
  checa('pontuacao nao pode ser enviada', val({ ...ok, encerrado_no_sla: true }).erros.join(' | '), 'encerrado_no_sla');
  checa('link sem http', val({ ...ok, link_zendesk: 'zendesk.com/1' }).erros.join(' | '), 'http');
  checa('cnpj precisa de 14 digitos', val({ ...ok, cnpj_cliente: '123' }).erros.join(' | '), '14 dígitos');
  checa('cnpj formatado vira so digitos', val({ ...ok, cnpj_cliente: '11.222.333/0001-81' }).dados.cnpj_cliente, '11222333000181');
  checa('plano invalido', val({ ...ok, plano_cliente: 'Diamante' }).erros.join(' | '), 'plano_cliente: valor inválido');
  checa('data invalida', val({ ...ok, data_primeira_contratacao: '01/02/2024' }).erros.join(' | '), 'AAAA-MM-DD');
  checa('valor negativo', val({ ...ok, valor_contratacao_plano_atual: -1 }).erros.join(' | '), 'valor_contratacao_plano_atual');
  checa('corpo que nao e objeto', val([]).erros.join(' | '), 'objeto JSON');
  checa('vazio nao vira chave', JSON.stringify(Object.keys(val({ ...ok, link_intranet: '' }).dados)), '["nome_cliente","tipo_tratativa","prioridade","cnpj_cliente"]');
  checa('contestacao exige o case', val({ ...ok, tipo_tratativa: 'contestacao' }).erros.join(' | '), 'numero_case_contestacao é obrigatório');
  checa('contestacao completa passa', String(val({ ...ok, tipo_tratativa: 'contestacao', numero_case_contestacao: 'C1', motivo_contestacao: 'x', valor_contestado_inicial: 100, prazo_sla_dias: 5 }).erros.length), '0');
  checa('campo de contestacao fora de contestacao', val({ ...ok, numero_case_contestacao: 'C1' }).erros.join(' | '), 'só vale para contestação');
  checa('motivo de contestacao limita 150', val({ ...ok, tipo_tratativa: 'contestacao', numero_case_contestacao: 'C1', motivo_contestacao: 'x'.repeat(151), valor_contestado_inicial: 1, prazo_sla_dias: 5 }).erros.join(' | '), 'no máximo 150');

  for (const tipo of ['reclamacao_interna', 'reclame_aqui', 'google_meu_negocio', 'contestacao', 'procon', 'administrativas']) {
    checa(`prazo da API = prazo da tela (${tipo})`, String(slaDoTipo(tipo)), String(getSLAByType(tipo)));
  }

  checa('campos de saida: custo nunca sai', String(CAMPOS_TRATATIVA.some((c) => /custo|perda|churn/.test(c))), 'false');
  checa('campos de colaborador: sem salario nem e-mail', String(CAMPOS_COLABORADOR.some((c) => /salario|email|promocoes/.test(c))), 'false');

  const q = (s) => new URLSearchParams(s);
  checa('paginacao padrao', JSON.stringify(paginacao(q(''))), '{"limite":50,"pagina":1,"de":0,"ate":49}');
  checa('paginacao limita a 200', String(paginacao(q('limite=9999')).limite), '200');
  checa('paginacao pagina 3', String(paginacao(q('limite=10&pagina=3')).de), '20');
  checa('filtro de status invalido vira erro', filtrosDeTratativas(q('status=banana')).erros.join(' | '), 'status inválido');
  checa('filtro valido', filtrosDeTratativas(q('tipo=procon&desde=2026-09-01')).filtros.tipo, 'procon');
  checa('data de filtro invalida', filtrosDeTratativas(q('ate=ontem')).erros.join(' | '), 'AAAA-MM-DD');
  checa('todo recurso tem ao menos a acao ler', String(Object.values(RECURSOS).every((r) => r.acoes.ler)), 'true');
  console.log('\n== api: acompanhamento no WhatsApp, tickets e atualizacao ==');
  checa('TRT com zeros', JSON.stringify(interpretarCodigo('TRT-0012')), '{"tipo":"trt","valor":"TRT-0012"}');
  checa('TRT sem zeros e minusculo vira o mesmo', JSON.stringify(interpretarCodigo(' trt-12 ')), '{"tipo":"trt","valor":"TRT-0012"}');
  checa('ticket numerico', JSON.stringify(interpretarCodigo('1089224')), '{"tipo":"ticket","valor":"1089224"}');
  checa('ticket com cerquilha', JSON.stringify(interpretarCodigo('#1089224')), '{"tipo":"ticket","valor":"1089224"}');
  checa('codigo com espaco e invalido', String(interpretarCodigo('12 34')), 'null');
  checa('codigo com aspas e invalido (nada de injecao no filtro)', String(interpretarCodigo(`1',ticket_zendesk.neq.'`)), 'null');
  checa('codigo com virgula e invalido', String(interpretarCodigo('1,2')), 'null');
  checa('codigo vazio e invalido', String(interpretarCodigo('')), 'null');

  checa('estado registrada: frase de cliente', situacaoParaCliente('registrada').situacao, 'Recebida');
  checa('em andamento', situacaoParaCliente('em_andamento').situacao, 'Em atendimento');
  checa('iniciada = em andamento', situacaoParaCliente('tratativa_iniciada').situacao, 'Em atendimento');
  checa('dependencia externa', situacaoParaCliente('dependencia_externa').situacao, 'Aguardando retorno');
  checa('financeiro', situacaoParaCliente('aguardando_financeiro').situacao, 'Em análise financeira');
  checa('encerrada', situacaoParaCliente('encerrada').situacao, 'Concluída');
  checa('aguardando reabertura conta como concluida', situacaoParaCliente('aguardando_confirmacao_reabertura').situacao, 'Concluída');
  checa('estado desconhecido nao quebra', situacaoParaCliente('xpto').situacao, 'Em andamento');

  const bruta = {
    id_interno: 'TRT-0123', status: 'em_andamento', ticket_zendesk: '555', ticket_clickdesk: null,
    resumo_whatsapp: '  Estamos ajustando a cobranca e damos retorno amanha.  ', resumo_whatsapp_atualizado_em: '2026-10-05T10:00:00Z',
    nome_cliente: 'SEGREDO LTDA', custo_operacional_reais: 99, agente_responsavel_nome: 'Fulana', valor_devolvido_cliente: 500, historico_estados: [{ observacao: 'interno' }],
  };
  const acomp = montarAcompanhamento(bruta);
  checa('acompanhamento usa o resumo do agente (sem espacos)', acomp.resumo, 'Estamos ajustando a cobranca e damos retorno amanha.');
  checa('acompanhamento marca que e do atendente', String(acomp.resumo_do_atendente), 'true');
  checa('acompanhamento so tem os campos de cliente', JSON.stringify(Object.keys(acomp)), '["codigo","ticket_zendesk","ticket_clickdesk","situacao","resumo","resumo_do_atendente","atualizado_em"]');
  checa('acompanhamento nao vaza nome, custo, agente nem historico', String(/SEGREDO|99|Fulana|500|interno/.test(JSON.stringify(acomp))), 'false');
  const semResumo = montarAcompanhamento({ ...bruta, resumo_whatsapp: null });
  checa('sem resumo: frase padrao do estado', semResumo.resumo, 'A sua solicitação está em atendimento pela nossa equipe.');
  checa('sem resumo: nao e do atendente', String(semResumo.resumo_do_atendente), 'false');
  checa('resumo so com espacos vira padrao', montarAcompanhamento({ ...bruta, resumo_whatsapp: '   ' }).resumo_do_atendente === false ? 'padrao' : 'proprio', 'padrao');
  checa('atualizado_em cai para updated_date', montarAcompanhamento({ ...bruta, resumo_whatsapp_atualizado_em: null, updated_date: '2026-10-01T00:00:00Z' }).atualizado_em, '2026-10-01');

  const at = (c) => validarAtualizacaoTratativa(c);
  checa('atualizar: ticket valido', JSON.stringify(at({ ticket_clickdesk: 'CD-77' }).dados), '{"ticket_clickdesk":"CD-77"}');
  checa('atualizar: corpo vazio e recusado', at({}).erros.join(' | '), 'ao menos um campo');
  checa('atualizar: status nao pode ser mudado por aqui', at({ status: 'encerrada' }).erros.join(' | '), 'campos não aceitos: status');
  checa('atualizar: nome do cliente tambem nao', at({ nome_cliente: 'x' }).erros.join(' | '), 'campos não aceitos');
  checa('atualizar: null limpa o ticket', String(at({ ticket_zendesk: null }).dados.ticket_zendesk), 'null');
  checa('atualizar: resumo acima de 600', at({ resumo_whatsapp: 'x'.repeat(601) }).erros.join(' | '), 'no máximo 600');
  checa('atualizar: resumo de 600 passa', String(at({ resumo_whatsapp: 'x'.repeat(600) }).erros.length), '0');
  checa('atualizar: ticket com espaco', at({ ticket_zendesk: '12 34' }).erros.join(' | '), 'letras, números');
  checa('atualizar: dados_clickdesk objeto passa', JSON.stringify(at({ dados_clickdesk: { cliente: 'X', fila: 'suporte' } }).dados.dados_clickdesk), '{"cliente":"X","fila":"suporte"}');
  checa('atualizar: dados_clickdesk lista e recusada', at({ dados_clickdesk: [1] }).erros.join(' | '), 'objeto JSON');
  checa('atualizar: dados_clickdesk enorme e recusado', at({ dados_clickdesk: { x: 'a'.repeat(21000) } }).erros.join(' | '), 'passa de 20000');
  checa('criar aceita ticket e resumo', String(val({ ...ok, ticket_zendesk: '555', ticket_clickdesk: 'CD-1', resumo_whatsapp: 'Recebido.' }).erros.length), '0');
  checa('criar: ticket invalido', val({ ...ok, ticket_zendesk: 'a b' }).erros.join(' | '), 'letras, números');
  const semCnpjOk = { nome_cliente: 'Cliente PF', tipo_tratativa: 'reclame_aqui', prioridade: 'alta' };
  checa('criar: sem CNPJ e sem marcar nao passa', val(semCnpjOk).erros.join(' | '), 'cnpj_cliente é obrigatório');
  checa('criar: cliente_sem_cnpj true dispensa o CNPJ', String(val({ ...semCnpjOk, cliente_sem_cnpj: true }).erros.length), '0');
  checa('criar: cliente_sem_cnpj grava a marca', String(val({ ...semCnpjOk, cliente_sem_cnpj: true }).dados.cliente_sem_cnpj), 'true');
  checa('criar: sem CNPJ nao grava cnpj_cliente', String('cnpj_cliente' in val({ ...semCnpjOk, cliente_sem_cnpj: true }).dados), 'false');
  checa('criar: CNPJ e sem-CNPJ juntos sao recusados', val({ ...ok, cliente_sem_cnpj: true }).erros.join(' | '), 'não os dois');
  checa('criar: cliente_sem_cnpj precisa ser booleano', val({ ...semCnpjOk, cliente_sem_cnpj: 'sim' }).erros.join(' | '), 'true ou false');
  checa('criar: cliente_sem_cnpj false exige CNPJ', val({ ...semCnpjOk, cliente_sem_cnpj: false }).erros.join(' | '), 'cnpj_cliente é obrigatório');
  const gmn = { nome_cliente: 'Maria (Google)', tipo_tratativa: 'google_meu_negocio' };
  checa('google: so o nome basta (sem CNPJ, prioridade, links)', String(val(gmn).erros.length), '0');
  checa('google: o nome continua obrigatorio', val({ tipo_tratativa: 'google_meu_negocio' }).erros.join(' | '), 'nome_cliente é obrigatório');
  checa('google: grava dados_localizados true', String(val({ ...gmn, dados_localizados: true }).dados.dados_localizados), 'true');
  checa('google: sem a marca nao grava nada', String('dados_localizados' in val(gmn).dados && val(gmn).dados.dados_localizados !== undefined), 'false');
  checa('google: dados_localizados precisa ser booleano', val({ ...gmn, dados_localizados: 'sim' }).erros.join(' | '), 'true ou false');
  checa('google: CNPJ preenchido ainda e conferido', val({ ...gmn, cnpj_cliente: '123' }).erros.join(' | '), 'cnpj_cliente inválido');
  checa('outro tipo: dados_localizados e ignorado', String(val({ ...ok, dados_localizados: true }).dados.dados_localizados), 'undefined');
  checa('outro tipo: continua exigindo CNPJ e prioridade', val({ nome_cliente: 'X', tipo_tratativa: 'reclame_aqui' }).erros.length > 1 ? 'sim' : 'nao', 'sim');
  checa('criar: CNPJ invalido e recusado', val({ ...ok, cnpj_cliente: '11222333000182' }).erros.join(' | '), 'cnpj_cliente inválido');
  checa('criar: CNPJ valido vira so digitos', val({ ...ok, cnpj_cliente: '11.222.333/0001-81' }).dados.cnpj_cliente, '11222333000181');
  checa('acompanhamento: cliente sem CNPJ nunca e entregue', String(escolherDoCliente([{ cnpj_cliente: null, cliente_sem_cnpj: true }], '11222333000181')), 'null');

  console.log('\n== api: excluir, apuracao e jornada ==');
  checa('excluir exige justificativa', validarExclusao({}).erros.join(' | '), 'justificativa é obrigatória');
  checa('justificativa curta e recusada', validarExclusao({ justificativa: 'curto' }).erros.join(' | '), 'mínimo de 10');
  checa('justificativa so com espacos e recusada', validarExclusao({ justificativa: '            ' }).erros.join(' | '), 'mínimo de 10');
  checa('justificativa valida passa', validarExclusao({ justificativa: 'Registrada em duplicidade' }).dados.justificativa, 'Registrada em duplicidade');
  checa('excluir recusa campo extra', validarExclusao({ justificativa: 'Registrada em duplicidade', status: 'x' }).erros.join(' | '), 'campos não aceitos');
  checa('excluir recusa justificativa enorme', validarExclusao({ justificativa: 'x'.repeat(501) }).erros.join(' | '), 'no máximo 500');
  checa('encerrada nao e excluida por API', String(ESTADOS_QUE_NAO_EXCLUEM.includes('encerrada')), 'true');
  checa('aguardando reabertura tambem nao', String(ESTADOS_QUE_NAO_EXCLUEM.includes('aguardando_confirmacao_reabertura')), 'true');
  checa('em andamento pode ser excluida', String(ESTADOS_QUE_NAO_EXCLUEM.includes('em_andamento')), 'false');

  const q2 = (x) => new URLSearchParams(x);
  checa('apuracao: filtro por tipo valido', filtrosDeApuracao(q2('tipo=chat')).filtros.tipo, 'chat');
  checa('apuracao: tipo invalido', filtrosDeApuracao(q2('tipo=zap')).erros.join(' | '), 'tipo inválido');
  checa('apuracao: colaborador_id com aspas e recusado', filtrosDeApuracao(q2("colaborador_id=a'b")).erros.join(' | '), 'colaborador_id inválido');
  checa('apuracao: datas', JSON.stringify(filtrosDeApuracao(q2('desde=2026-09-01&ate=2026-09-30')).filtros), '{"desde":"2026-09-01","ate":"2026-09-30"}');
  checa('apuracao: data invalida', filtrosDeApuracao(q2('desde=1/9')).erros.join(' | '), 'AAAA-MM-DD');
  checa('apuracao nao expoe o historico detalhado', String(CAMPOS_APURACAO.includes('historico_detalhado')), 'false');
  checa('apuracao expoe os dias', String(CAMPOS_APURACAO.includes('dados_por_data')), 'true');

  const etapas = [{ id: 'e1', nome: 'Onboarding' }, { id: 'e2', nome: 'Suporte' }];
  const trs = [
    { etapa_jornada_id: 'e1', status: 'encerrada', encerrado_no_sla: true, tempo_total_minutos: 100, valor_devolvido_cliente: 50.5 },
    { etapa_jornada_id: 'e1', status: 'encerrada', encerrado_no_sla: false, tempo_total_minutos: 300, valor_devolvido_cliente: 0, houve_reabertura: true },
    { etapa_jornada_id: 'e1', status: 'em_andamento' },
    { etapa_jornada_id: 'e2', status: 'aguardando_confirmacao_reabertura', encerrado_no_sla: true, tempo_total_minutos: 60 },
    { etapa_jornada_id: null, status: 'registrada', custo_operacional_reais: 999 },
  ];
  const res = resumoPorEtapa(trs, etapas);
  const e1 = res.find((l) => l.etapa === 'Onboarding');
  checa('jornada: ordena pelo volume', res[0].etapa, 'Onboarding');
  checa('jornada: total e em aberto', `${e1.total}/${e1.encerradas}/${e1.em_aberto}`, '3/2/1');
  checa('jornada: percentual no prazo', String(e1.percentual_no_prazo), '50');
  checa('jornada: tempo medio das encerradas', String(e1.tempo_medio_minutos), '200');
  checa('jornada: valor devolvido', String(e1.valor_devolvido), '50.5');
  checa('jornada: reabertas', String(e1.reabertas), '1');
  checa('jornada: aguardando reabertura conta como encerrada', String(res.find((l) => l.etapa === 'Suporte').encerradas), '1');
  checa('jornada: sem etapa vai para o grupo proprio', String(res.some((l) => l.etapa === 'Sem etapa definida' && l.etapa_id === null)), 'true');
  checa('jornada: sem encerradas, percentual nulo', String(res.find((l) => l.etapa === 'Sem etapa definida').percentual_no_prazo), 'null');
  checa('jornada: nunca sai custo operacional', String(/custo/.test(JSON.stringify(res))), 'false');
  checa('jornada: lista vazia', JSON.stringify(resumoPorEtapa([], etapas)), '[]');

  console.log('\n== api: envio de linhas brutas da apuracao ==');
  const tel = (o) => ({ agente: 'Ana Souza', data: '2026-09-21', origem: '', status: 'Atendida', fcr: '1', csat: '5', ...o });
  const lote = (registros, extra = {}) => ({ fonte: '55pbx', registros, ...extra });
  const colabs = [{ id: 'c-ana', nome_completo: 'Ana Maria Souza', ativo: true }, { id: 'c-bia', nome_completo: 'Bia Lima', ativo: true }, { id: 'c-inativa', nome_completo: 'Carla Dias', ativo: false }];

  checa('lote valido', String(validarLoteApuracao(lote([tel()])).erros.length), '0');
  checa('fonte invalida', validarLoteApuracao({ fonte: 'zap', registros: [tel()] }).erros.join(' | '), 'fonte inválida');
  checa('sem registros', validarLoteApuracao({ fonte: '55pbx', registros: [] }).erros.join(' | '), 'ao menos um item');
  checa('registro com campo desconhecido', validarLoteApuracao(lote([tel({ ramal: '1' })])).erros.join(' | '), 'campos não aceitos para 55pbx: ramal');
  checa('registro sem agente', validarLoteApuracao(lote([tel({ agente: '' })])).erros.join(' | '), 'falta agente');
  checa('registro sem data', validarLoteApuracao(lote([tel({ data: undefined })])).erros.join(' | '), 'falta data');
  checa('ligacao sem pesquisa (fcr e csat vazios) e valida', String(validarLoteApuracao(lote([tel({ fcr: '', csat: '' })])).erros.length), '0');
  checa('campo extra de outra fonte e recusado', validarLoteApuracao({ fonte: 'zendesk', registros: [tel()] }).erros.join(' | '), 'campos não aceitos para zendesk');
  checa('corpo que nao e objeto', validarLoteApuracao([]).erros.join(' | '), 'objeto JSON');
  checa('chave extra no corpo', validarLoteApuracao({ ...lote([tel()]), x: 1 }).erros.join(' | '), 'campos não aceitos: x');
  checa('numeros viram texto, como num CSV', validarLoteApuracao(lote([tel({ fcr: 1, csat: 5 })])).lote.linhas[0].csat, '5');
  checa('vinculos precisam ser objeto', validarLoteApuracao(lote([tel()], { vinculos: ['a'] })).erros.join(' | '), 'vinculos deve ser um objeto');
  checa('vinculo com id malformado', validarLoteApuracao(lote([tel()], { vinculos: { Ana: "a'b" } })).erros.join(' | '), 'deve ser o id do colaborador');
  checa('limite de linhas por envio', validarLoteApuracao(lote(new Array(MAXIMO_LINHAS_APURACAO + 1).fill(tel()))).erros.join(' | '), 'passa de 20000');
  checa('muitos erros nao enchem a resposta', String(validarLoteApuracao(lote(new Array(50).fill({ nada: 1 }))).erros.length <= 8), 'true');

  const prep = (registros, extra = {}, vinc = {}) => prepararImportacaoApi({ lote: validarLoteApuracao(lote(registros, { vinculos: vinc })).lote, colaboradores: colabs, integracaoNome: 'Teste', importacaoId: 'imp-api-teste-0001', ...extra });
  const rA = prep([
    tel({ fcr: '1', csat: '5' }), tel({ fcr: '1', csat: '4' }), tel({ fcr: '1', csat: '3' }),
    tel({ fcr: '2', csat: '' }), tel({ fcr: '1', csat: '' }), tel({ origem: 'x - transferência fila' }),
    tel({ status: 'Abandonada', fcr: '', csat: '' }),
  ]);
  const dia = rA.registros[0].dados_por_data[0].telefone;
  checa('liga o nome ao colaborador (nome do meio)', rA.registros[0].colaborador_id, 'c-ana');
  checa('classificacao: 2 positivas (fcr1+nota4/5)', String(dia.total_positivas), '2');
  checa('classificacao: nota 3 e neutra', String(dia.total_neutras), '1');
  checa('classificacao: fcr 2 e negativa', String(dia.total_negativas), '1');
  checa('classificacao: fcr 1 sem nota e incompleta', String(dia.total_incompletas), '1');
  checa('transferencia conta ligacao e nao avalia', String(dia.transferencias), '1');
  checa('total de ligacoes do dia', String(dia.total_ligacoes), '7');
  checa('csat do dia exclui neutras (positivas / positivas+negativas)', String(Math.round(dia.csat * 10) / 10), String(Math.round((2 / 3) * 1000) / 10));
  checa('canal_telefone calculado', String(rA.registros[0].canal_telefone.total_atendimentos), '7');
  checa('origem do registro e a API', rA.registros[0].arquivo_nome, 'api:Teste');
  checa('quem apurou', rA.registros[0].apurado_por_nome, 'API: Teste');
  checa('lote tem o id de lote da API', rA.registros[0].importacao_id, 'imp-api-teste-0001');
  checa('fonte gravada', rA.registros[0].fonte, '55pbx');
  checa('linhas lidas e validas', `${rA.linhasLidas}/${rA.linhasValidas}`, '7/7');
  checa('periodo do lote', JSON.stringify(rA.periodo), '{"inicio":"2026-09-21","fim":"2026-09-21"}');
  checa('modo incremental como no CSV', rA.registros[0].modo, 'incremental');

  const rB = prep([tel({ agente: 'Zé Desconhecido' }), tel({ agente: 'Bia Lima' })]);
  checa('nome sem vinculo e listado (e nada e gravado pela metade)', rB.semVinculo.join(','), 'Zé Desconhecido');
  checa('quem tem vinculo continua sendo preparado', rB.registros.map((r) => r.colaborador_id).join(','), 'c-bia');
  const rC = prep([tel({ agente: 'Zé Desconhecido' })], {}, { 'Zé Desconhecido': 'c-bia' });
  checa('vinculos informados resolvem o nome', String(rC.semVinculo.length) + rC.registros[0].colaborador_id, '0c-bia');
  const rD = prep([tel({ agente: 'Carla Dias' })]);
  checa('colaborador inativo nao e ligado sozinho', rD.semVinculo.join(','), 'Carla Dias');
  checa('linha sem data valida e descartada na conta', String(prep([tel(), tel({ data: 'ontem' })]).linhasValidas), '1');

  const chat = (o) => ({ agente: 'Bia Lima', ticket: '1', data: '2026-09-21', bom: '1', ruim: '0', ...o });
  const rE = prepararImportacaoApi({ lote: validarLoteApuracao({ fonte: 'zendesk', registros: [chat(), chat({ ticket: '2', bom: '0', ruim: '1' }), chat({ ticket: '3', bom: '0', ruim: '0' })] }).lote, colaboradores: colabs, integracaoNome: 'Teste', importacaoId: 'imp-api-teste-0002' });
  const diaChat = rE.registros[0].dados_por_data[0].chat;
  checa('chat: total, avaliados, positivos e negativos', `${diaChat.total_chats}/${diaChat.total_avaliados}/${diaChat.total_positivos}/${diaChat.total_negativos}`, '3/2/1/1');
  checa('chat: csat do dia', String(diaChat.csat), '50');

  const cx = (o) => ({ agente: 'Ana Souza', data: '2026-09-21', empatia: '5', cordialidade: '5', comunicacao: '4', escrita: '4', profissionalismo: '5', resolucao: '5', ...o });
  const rF = prepararImportacaoApi({ lote: validarLoteApuracao({ fonte: 'planilha_cx', registros: [cx(), cx({ empatia: '3' })] }).lote, colaboradores: colabs, integracaoNome: 'Teste', importacaoId: 'imp-api-teste-0003' });
  checa('cx: calcula a media das avaliacoes', rF.registros[0].tipo_apuracao + ':' + String(rF.registros[0].avaliacao_cx.total_avaliacoes), 'cx:2');

  checa('id de lote da API valido', String(ehIdDeLoteApi(novoIdDeLoteApi())), 'true');
  checa('id de lote do CSV nao e da API (nao se desfaz por aqui)', String(ehIdDeLoteApi('imp-1727000000000-abcde')), 'false');
  checa('id de lote com lixo e recusado', String(ehIdDeLoteApi("imp-api-1' or '1'='1")), 'false');
  checa('recurso acompanhamento so tem ler', JSON.stringify(Object.keys(RECURSOS.acompanhamento.acoes)), '["ler"]');
  checa('tratativas tem ler, gravar, atualizar e excluir', JSON.stringify(Object.keys(RECURSOS.tratativas.acoes)), '["ler","gravar","atualizar","excluir"]');
  checa('campos de saida incluem os tickets', String(['ticket_zendesk', 'ticket_clickdesk', 'resumo_whatsapp'].every((c) => CAMPOS_TRATATIVA.includes(c))), 'true');
  checa('atualizar exige permissao propria (ler nao basta)', cod(decidir({ geral: true, chave: chaveOk, integracao: integ({ recursos: { tratativas: { ler: true, gravar: true } } }), recurso: 'tratativas', acao: 'atualizar', agora, usoNoUltimoMinuto: 0 })), '403 sem_permissao');
  checa('acompanhamento liberado sem liberar tratativas', cod(decidir({ geral: true, chave: chaveOk, integracao: integ({ recursos: { acompanhamento: { ler: true } } }), recurso: 'acompanhamento', acao: 'ler', agora, usoNoUltimoMinuto: 0 })), 'ok');
  checa('acompanhamento liberado nao abre tratativas', cod(decidir({ geral: true, chave: chaveOk, integracao: integ({ recursos: { acompanhamento: { ler: true } } }), recurso: 'tratativas', acao: 'ler', agora, usoNoUltimoMinuto: 0 })), '403 sem_permissao');

  console.log('\n== api: o CNPJ como senha do acompanhamento ==');
  checa('cnpj valido (so digitos)', String(cnpjValido('11222333000181')), 'true');
  checa('cnpj valido (formatado)', String(cnpjValido('11.222.333/0001-81')), 'true');
  checa('cnpj valido (com tab e espaco, como no banco)', String(cnpjValido(' 11.222.333/0001-81 ' + String.fromCharCode(9))), 'true');
  checa('cnpj com digito verificador errado', String(cnpjValido('11222333000182')), 'false');
  checa('cnpj curto', String(cnpjValido('123')), 'false');
  checa('cnpj todo igual', String(cnpjValido('11111111111111')), 'false');
  checa('cnpj vazio', String(cnpjValido('')), 'false');
  checa('cnpj nulo', String(cnpjValido(null)), 'false');
  for (const c of ['11222333000181', '62781329000194', '19164968000181', '32952352000133', '11111111111111', '12345678000100', '00000000000191']) {
    checa(`mesma conta da tela (${c})`, String(cnpjValido(c)), String(cnpj(c) === null));
  }
  checa('apenasDigitos', apenasDigitos(' 62.781.329/0001-94 '), '62781329000194');

  const linhas = [
    { id_interno: 'TRT-0010', cnpj_cliente: '62.781.329/0001-94 ', data_registro: '2026-01-01' },
    { id_interno: 'TRT-0010', cnpj_cliente: '19.164.968/0001-81', data_registro: '2026-02-01' },
    { id_interno: 'TRT-0010', cnpj_cliente: null, data_registro: '2026-03-01' },
    { id_interno: 'TRT-0010', cnpj_cliente: '19164968000181', data_registro: '2026-04-01' },
  ];
  checa('escolhe pelo CNPJ (codigo repetido: o CNPJ desempata)', escolherDoCliente(linhas, '62781329000194').data_registro, '2026-01-01');
  checa('mesmo cliente duas vezes: fica a mais recente', escolherDoCliente(linhas, '19.164.968/0001-81').data_registro, '2026-04-01');
  checa('CNPJ que nao e de nenhuma', String(escolherDoCliente(linhas, '11222333000181')), 'null');
  checa('tratativa sem CNPJ cadastrado nunca e entregue', String(escolherDoCliente([{ cnpj_cliente: null }, { cnpj_cliente: '' }], '11222333000181')), 'null');
  checa('CNPJ informado incompleto nao casa', String(escolherDoCliente(linhas, '62781329')), 'null');
  checa('CNPJ informado vazio nao casa com cadastro vazio', String(escolherDoCliente([{ cnpj_cliente: '' }], '')), 'null');

}

console.log('\n== sino de notificacoes ==');
{
  const agora = new Date('2026-10-05T15:00:00Z');
  const agente = { id: 'a1', papel: 'agente', nome_completo: 'Ana', created_date: '2026-01-01T00:00:00Z' };
  const gestor = { id: 'g1', papel: 'gestor', nome_completo: 'Pedro', created_date: '2026-01-01T00:00:00Z' };
  const titulos = (lista) => lista.map((n) => n.titulo).join(' | ');
  const base = (extra = {}) => montarNotificacoes({ colaborador: agente, agora, ...extra });

  checa('sem colaborador, sem sino', String(montarNotificacoes({ agora }).length), '0');
  checa('sem nada pendente', String(base().length), '0');

  const atr = [{ id: 'd1', agente_id: 'a1', confirmado_pelo_agente: false, ticket_id: '123', tipo_tratativa: 'reclame_aqui', prioridade: 'alta' }];
  checa('ticket atribuido aparece com canal e prioridade', titulos(base({ atribuicoes: atr })) + ' / ' + base({ atribuicoes: atr })[0].detalhe, 'Ticket #123 / Reclame Aqui · prioridade alta');
  checa('atribuicao de outra pessoa nao aparece', String(base({ atribuicoes: [{ ...atr[0], agente_id: 'outra' }] }).length), '0');
  checa('atribuicao ja confirmada nao aparece', String(base({ atribuicoes: [{ ...atr[0], confirmado_pelo_agente: true }] }).length), '0');

  const hans = [{ id: 'h1', periodo_inicio: '2026-09-17', periodo_fim: '2026-09-30' }];
  checa('hansei novo para o agente, com o periodo', base({ hanseis: hans })[0].detalhe, 'Período 17/09 a 30/09');
  checa('o gestor nao recebe hansei novo', String(montarNotificacoes({ colaborador: gestor, hanseis: hans, agora }).length), '0');

  const aviso = { id: 'av1', titulo: 'Troca de turno', ativo: true, destinatarios: 'todos', tipo: 'informativo', data_publicacao: '2026-09-01' };
  checa('aviso a confirmar aparece', titulos(base({ avisos: [aviso] })), 'Troca de turno');
  checa('aviso confirmado some (continua pendente ate agir)', String(base({ avisos: [aviso], leituras: [{ aviso_id: 'av1', colaborador_id: 'a1', confirmou: true }] }).length), '0');
  checa('aviso para gestores nao chega ao agente', String(base({ avisos: [{ ...aviso, destinatarios: 'gestores' }] }).length), '0');
  checa('aviso anterior ao cadastro nao chega (regra da central)', String(base({ avisos: [{ ...aviso, data_publicacao: '2025-12-01' }] }).length), '0');
  checa('aviso expirado nao chega', String(base({ avisos: [{ ...aviso, data_expiracao: '2026-09-15' }] }).length), '0');
  checa('aviso urgente vem primeiro dentro da categoria', titulos(base({ avisos: [aviso, { ...aviso, id: 'av2', titulo: 'Queda do sistema', tipo: 'urgente' }] })).split(' | ')[0], 'Queda do sistema');

  const pesq = { id: 'p1', titulo: 'Clima de outubro', ativa: true, data_inicio: '2026-09-20', data_fim: '2026-10-20' };
  checa('pesquisa a responder, com o prazo', titulos(base({ pesquisas: [pesq] })) + ' / ' + base({ pesquisas: [pesq] })[0].detalhe, 'Clima de outubro / Responda até 20/10');
  checa('pesquisa respondida some', String(base({ pesquisas: [pesq], participacoes: [{ pesquisa_id: 'p1', colaborador_id: 'a1' }] }).length), '0');
  checa('pesquisa fora do periodo nao aparece', String(base({ pesquisas: [{ ...pesq, data_fim: '2026-10-01' }] }).length), '0');

  const pop = { id: 'pop1', titulo: 'POP 11 - Reclame Aqui', versao: 3, ativo: true, exige_ciencia: true, publicado_em: '2026-09-10', ordem: 1 };
  checa('pop com versao nova pede ciencia', base({ pops: [pop] })[0].detalhe, 'Versão 3 · confirme a leitura');
  checa('pop ja lido na versao atual some', String(base({ pops: [pop], leiturasPop: [{ pop_id: 'pop1', versao: 3, colaborador_id: 'a1' }] }).length), '0');
  checa('pop lido numa versao antiga volta', String(base({ pops: [pop], leiturasPop: [{ pop_id: 'pop1', versao: 2, colaborador_id: 'a1' }] }).length), '1');
  checa('gestor nao confirma pop', String(montarNotificacoes({ colaborador: gestor, pops: [pop], agora }).length), '0');

  const mk = (id, horas, extra = {}) => ({ id, status: 'em_andamento', agente_responsavel_id: 'a1', agente_responsavel_nome: 'Ana', sla_atribuido: horas, data_registro: '2026-10-01T12:00:00Z', historico_estados: [], ...extra });
  const vencida = mk('t1', 24);
  const deOutra = mk('t2', 24, { agente_responsavel_id: 'outra' });
  const noPrazo = mk('t3', 24 * 30);
  const fechada = mk('t4', 24, { status: 'encerrada' });
  const ag1 = base({ tratativasAbertas: [vencida, deOutra, noPrazo, fechada] });
  checa('agente: so as vencidas DELE', ag1[0].titulo, '1 tratativa sua com o prazo vencido');
  checa('agente: link ja filtrado nele', ag1[0].para, '/Tratativas?situacao=vencidas&agente=a1');
  checa('tratativa encerrada nao conta como vencida', String(base({ tratativasAbertas: [fechada] }).length), '0');
  checa('gestor: as vencidas da equipe', montarNotificacoes({ colaborador: gestor, tratativasAbertas: [vencida, deOutra, noPrazo], agora })[0].titulo, '2 tratativas da equipe com o prazo vencido');
  checa('gestor: link sem filtro de pessoa', montarNotificacoes({ colaborador: gestor, tratativasAbertas: [vencida], agora })[0].para, '/Tratativas?situacao=vencidas');
  const hoje = mk('t5', 24 * 4 + 4);
  checa('vence hoje aparece', titulos(base({ tratativasAbertas: [hoje] })), '1 tratativa sua vence hoje');

  const fer = (id, status, extra = {}) => ({ id, status, colaborador_id: 'a1', data_inicio: '2026-12-10', data_fim: '2026-12-20', updated_date: '2026-10-03T00:00:00Z', ...extra });
  checa('ferias aprovadas avisam', titulos(base({ solicitacoesFerias: [fer('f1', 'aprovada')] })), 'Férias aprovadas (10/12 a 20/12)');
  checa('ferias recusadas avisam', titulos(base({ solicitacoesFerias: [fer('f1', 'recusada')] })), 'Pedido de férias recusado (10/12 a 20/12)');
  checa('sugestao de outra data avisa', titulos(base({ solicitacoesFerias: [fer('f1', 'sugestao_nova_data')] })), 'Outra data sugerida para as suas férias (10/12 a 20/12)');
  checa('ferias em analise nao avisam o agente', String(base({ solicitacoesFerias: [fer('f1', 'em_analise')] }).length), '0');
  checa('ferias de outra pessoa nao aparecem', String(base({ solicitacoesFerias: [fer('f1', 'aprovada', { colaborador_id: 'outra' })] }).length), '0');
  checa('decisao antiga (mais de 30 dias) nao e novidade', String(base({ solicitacoesFerias: [fer('f1', 'aprovada', { updated_date: '2026-08-01T00:00:00Z' })] }).length), '0');
  checa('novidade marcada como vista some', String(base({ solicitacoesFerias: [fer('f1', 'aprovada')], vistas: new Set(['ferias-f1-aprovada']) }).length), '0');
  // Ler uma notificacao (qualquer uma) a faz sumir; um numero novo volta a aparecer
  const venc = base({ tratativasAbertas: [vencida] });
  checa('qualquer item pode ser lido e some', String(base({ tratativasAbertas: [vencida], vistas: new Set([venc[0].id]) }).length), '0');
  checa('o id do prazo vencido leva a quantidade', venc[0].id, 'tratativas-vencidas@1');
  checa('lida com 1 vencida, aparece de novo com 2', String(base({ tratativasAbertas: [vencida, mk('t9', 24)], vistas: new Set(['tratativas-vencidas@1']) }).length), '1');
  const contestada = { id: 'tc1', id_interno: 'TRT-0100', agente_responsavel_id: 'a1', solucao_replicavel_auditada_em: '2026-10-05T10:00:00Z' };
  const sCont = base({ replicaveisContestadas: [contestada] });
  checa('agente e avisado da solucao replicavel contestada', sCont.map((n) => n.titulo).join(' | '), 'Solução replicável contestada (TRT-0100)');
  checa('o aviso leva para a tratativa', sCont[0].para, '/TratativaDetalhe?id=tc1');
  checa('so o agente da tratativa recebe', String(base({ replicaveisContestadas: [{ ...contestada, agente_responsavel_id: 'outro' }] }).length), '0');
  checa('contestacao nova (outra data) volta a avisar apos leitura', String(base({ replicaveisContestadas: [{ ...contestada, solucao_replicavel_auditada_em: '2026-10-09T10:00:00Z' }], vistas: new Set([sCont[0].id]) }).length), '1');
  checa('ferias e informativa (pode ser marcada como vista)', String(base({ solicitacoesFerias: [fer('f1', 'aprovada')] })[0].informativa), 'true');
  checa('ticket atribuido NAO e informativo (so some quando confirma)', String(base({ atribuicoes: atr })[0].informativa), 'false');

  const pedidos = [fer('f2', 'em_analise', { colaborador_id: 'x' }), fer('f3', 'em_analise', { colaborador_id: 'y' }), fer('f4', 'em_analise', { colaborador_id: 'g1' })];
  checa('gestor com permissao: pedidos de ferias para aprovar (nao conta o proprio)', titulos(montarNotificacoes({ colaborador: gestor, permissoes: ['aprovar_ferias'], solicitacoesFerias: pedidos, agora })), '2 pedidos de férias para aprovar');
  checa('sem a permissao, nao ve pedidos de outros', String(montarNotificacoes({ colaborador: gestor, permissoes: [], solicitacoesFerias: pedidos, agora }).length), '0');
  checa('replicaveis para aprovar (com permissao)', titulos(montarNotificacoes({ colaborador: gestor, permissoes: ['aprovar_solucao_replicavel'], replicaveisPendentes: 3, agora })), '3 soluções replicáveis para aprovar');
  checa('replicaveis sem permissao: nada', String(montarNotificacoes({ colaborador: gestor, permissoes: [], replicaveisPendentes: 3, agora }).length), '0');
  checa('permissoes tambem aceitam Set', String(montarNotificacoes({ colaborador: gestor, permissoes: new Set(['aprovar_solucao_replicavel']), replicaveisPendentes: 1, agora }).length), '1');

  const tudo = base({ atribuicoes: atr, hanseis: hans, avisos: [aviso], pesquisas: [pesq], pops: [pop], tratativasAbertas: [vencida], solicitacoesFerias: [fer('f1', 'aprovada')] });
  checa('ordem do sino: atribuicao, tratativa, hansei, pesquisa, aviso, pop, ferias', tudo.map((n) => n.categoria).join(','), 'atribuicao,tratativa,hansei,pesquisa,aviso,pop,ferias');
  checa('todo id e unico', String(new Set(tudo.map((n) => n.id)).size === tudo.length), 'true');
  checa('todo item leva a uma tela', String(tudo.every((n) => n.para.startsWith('/'))), 'true');
  checa('agrupa por categoria na ordem do sino', agruparNotificacoes(tudo).map((g) => g.chave).join(','), 'atribuicao,tratativa,hansei,pesquisa,aviso,pop,ferias');
  checa('categoria vazia nao aparece', String(agruparNotificacoes(base({ hanseis: hans })).length), '1');
  checa('toda categoria tem rotulo', String(CATEGORIAS.every((c) => c.rotulo)), 'true');
  checa('selo vazio', rotuloDoSelo(0), '');
  checa('selo com numero', rotuloDoSelo(7), '7');
  checa('selo 9+', rotuloDoSelo(10), '9+');
}

console.log('\n== conector Gestao Click: ferias ==');
{
  const HOJE = '2026-10-05';
  const AGORA = '2026-10-05T15:00:00.000Z';

  // o status do ciclo tem que ser o MESMO que a tela calcula
  const amostras = [
    { aquisitivo_fim: '2026-11-03', dias_direito: 30, abono_dias: 0, dias_utilizados: 0, concessivo_fim: '2027-11-03' },
    { aquisitivo_fim: '2025-11-03', dias_direito: 30, abono_dias: 0, dias_utilizados: 30, concessivo_fim: '2026-10-25' },
    { aquisitivo_fim: '2025-11-03', dias_direito: 30, abono_dias: 10, dias_utilizados: 20, concessivo_fim: '2026-10-25' },
    { aquisitivo_fim: '2025-03-17', dias_direito: 30, abono_dias: 0, dias_utilizados: 10, concessivo_fim: '2026-03-01' },
    { aquisitivo_fim: '2025-03-17', dias_direito: 30, abono_dias: 0, dias_utilizados: 10, concessivo_fim: '2026-12-01' },
    { aquisitivo_fim: '2025-03-17', dias_direito: 30, abono_dias: 0, dias_utilizados: 10, concessivo_fim: '2028-12-01' },
    { aquisitivo_fim: '2025-03-17', dias_direito: 30, abono_dias: 0, dias_utilizados: 0, concessivo_fim: '2028-12-01' },
    { aquisitivo_fim: '2025-03-17', dias_direito: 30, abono_dias: 0, dias_utilizados: 0, concessivo_fim: '2026-03-01' },
  ];
  checa('status do ciclo igual ao da tela (8 amostras)', amostras.map((a) => statusDoCiclo(a, HOJE) === situacaoDoCiclo(a, HOJE)).join(','), 'true,true,true,true,true,true,true,true');
  checa('e-mail comparado sem maiuscula nem espaco', normalizarEmail(' Ana@Click.COM.br '), 'ana@click.com.br');

  const fr = fragmentosDasParcelas('P1', [{ ordem: 2, dias: 15, inicio: '2026-10-13', fim: '2026-10-27', status: 'planejada' }, { ordem: 1, dias: 15, inicio: '2026-01-12', fim: '2026-01-26', status: 'concluida' }]);
  checa('parcelas viram fragmentos na ordem', fr.map((f) => f.id).join(','), 'gc-P1-1,gc-P1-2');
  checa('fragmento planejado e marcado', fr[1].observacao, 'Gestão Click (planejada)');
  checa('fragmento com os dias da parcela', String(fr[0].dias + fr[1].dias), '30');

  // --- um cenario inteiro -------------------------------------------------------
  const empresaColabs = [
    { id: 'e1', nome: 'Ana', email: 'ana@click.com', departamento: 'CRC', cargo: 'Analista', salario: null },
    { id: 'e2', nome: 'Bia', email: 'BIA@click.com', departamento: 'CRC', cargo: 'Analista' },
    { id: 'e3', nome: 'Caio', email: 'caio@click.com', departamento: 'CX' },
    { id: 'e4', nome: 'Duda', email: 'duda@click.com', departamento: 'CRC' },
  ];
  const portalColabs = [
    { id: 'pa', nome_completo: 'Ana Souza', email: 'ana@click.com', data_admissao: '2022-11-02', cargo_atual: 'Analista II' },
    { id: 'pb', nome_completo: 'Bia Lima', email: 'bia@click.com', data_admissao: '2023-03-18' },
    { id: 'pd1', nome_completo: 'Duda A', email: 'duda@click.com' },
    { id: 'pd2', nome_completo: 'Duda B', email: 'duda@click.com' },
  ];
  const f1 = { id: 'G1', colaborador: { id: 'e1', departamento: 'CRC' }, aquisitivo: { inicio: '2024-11-04', fim: '2025-11-03' }, vencimento: '2026-10-25', dias_direito: 30, dias_gozados: 30, saldo: 0, abono: false, abono_dias: 0, parcelas: [
    { ordem: 1, dias: 10, inicio: '2025-12-29', fim: '2026-01-07', status: 'concluida' }, { ordem: 2, dias: 10, inicio: '2026-02-10', fim: '2026-02-20', status: 'concluida' }, { ordem: 3, dias: 10, inicio: '2026-09-23', fim: '2026-10-02', status: 'concluida' }] };
  const f2 = { id: 'G2', colaborador: { id: 'e1' }, aquisitivo: { inicio: '2025-11-04', fim: '2026-11-03' }, vencimento: '2027-11-03', dias_direito: 30, dias_gozados: 0, saldo: 30, abono: false, parcelas: [] };
  const f3 = { id: 'G3', colaborador: { id: 'e2' }, aquisitivo: { inicio: '2024-11-04', fim: '2025-11-03' }, vencimento: '2026-10-20', dias_direito: 30, dias_gozados: 30, saldo: 0, abono: false, parcelas: [
    { ordem: 1, dias: 15, inicio: '2026-01-12', fim: '2026-01-26', status: 'concluida' }, { ordem: 2, dias: 15, inicio: '2026-10-13', fim: '2026-10-27', status: 'planejada' }] };
  const f4 = { id: 'G4', colaborador: { id: 'e3' }, aquisitivo: { inicio: '2025-01-01', fim: '2025-12-31' }, vencimento: '2026-12-31', dias_direito: 30, dias_gozados: 0, parcelas: [] };
  const f5 = { id: 'G5', colaborador: { id: 'e9-desligado' }, aquisitivo: { inicio: '2024-01-01', fim: '2024-12-31' }, vencimento: '2025-12-31', dias_direito: 30, dias_gozados: 0, parcelas: [] };
  const ciclosPortal = [
    { id: 'c-antigo', colaborador_id: 'pa', aquisitivo_inicio: '2024-11-04', aquisitivo_fim: '2025-11-03', concessivo_fim: '2026-10-25', dias_direito: 30, abono_dias: 0, dias_utilizados: 30, fragmentos: [], status: 'utilizado', colaborador_setor: 'CRC' },
    { id: 'c-so-portal', colaborador_id: 'pa', aquisitivo_inicio: '2018-01-01', aquisitivo_fim: '2018-12-31', concessivo_fim: '2019-12-31', dias_direito: 30, abono_dias: 0, dias_utilizados: 30, fragmentos: [], status: 'utilizado' },
  ];
  const rodar = (extra = {}) => planejarSincronizacao({
    empresaColaboradores: empresaColabs, empresaFerias: [f1, f2, f3, f4, f5], portalColaboradores: portalColabs,
    portalCiclos: ciclosPortal, portalSolicitacoes: [], hoje: HOJE, agoraIso: AGORA, ...extra,
  });
  const { plano, resumo } = rodar();

  checa('liga as pessoas pelo e-mail (Bia em maiuscula casa)', String(resumo.colaboradores_ligados), '2');
  checa('sem correspondente e e-mail repetido nao sao ligados', String(resumo.colaboradores_sem_correspondente), '2');
  checa('aviso de e-mail repetido', String(plano.avisos.some((a) => a.tipo === 'email_repetido')), 'true');
  checa('aviso de quem nao esta no Portal', String(plano.avisos.some((a) => a.tipo === 'sem_correspondente' && /caio/i.test(a.mensagem))), 'true');
  checa('periodo de pessoa nao ligada e ignorado (Caio e o desligado)', String(resumo.periodos_ignorados), '2');
  checa('ciclo igual ao que ja existia e ADOTADO (nao duplica)', plano.ciclosAtualizar.map((c) => c.id).join(','), 'c-antigo');
  checa('o ciclo adotado ganha o id do Gestao Click', plano.ciclosAtualizar[0].dados.gestaoclick_id, 'G1');
  checa('ciclo adotado traz as 3 parcelas como fragmentos', String(plano.ciclosAtualizar[0].dados.fragmentos.length), '3');
  checa('criou 2 ciclos novos (periodo em aquisicao e o da Bia)', String(plano.ciclosCriar.length), '2');
  const novoBia = plano.ciclosCriar.find((c) => c.colaborador_id === 'pb');
  checa('ciclo novo: direito, dias usados e vencimento do Gestao Click', `${novoBia.dias_direito}/${novoBia.dias_utilizados}/${novoBia.concessivo_fim}`, '30/30/2026-10-20');
  checa('ciclo novo: setor, nome e admissao do Portal', `${novoBia.colaborador_setor}/${novoBia.colaborador_nome}/${novoBia.data_admissao}`, 'CRC/Bia Lima/2023-03-18');
  checa('ciclo novo: status calculado (tudo usado = utilizado)', novoBia.status, 'utilizado');
  checa('periodo em aquisicao fica em_aquisicao', plano.ciclosCriar.find((c) => c.gestaoclick_id === 'G2').status, 'em_aquisicao');
  checa('ciclo que so existe no Portal nao e tocado', String(plano.ciclosAtualizar.concat(plano.ciclosCriar).some((c) => c.id === 'c-so-portal')), 'false');
  checa('so a parcela PLANEJADA vira ferias aprovada (as de antes nao)', plano.solicitacoesCriar.map((s) => `${s.colaborador_id}:${s.data_inicio}`).join(','), 'pb:2026-10-13');
  const sol = plano.solicitacoesCriar[0];
  checa('ferias importada: aprovada, origem e chave', `${sol.status}/${sol.origem}/${sol.gestaoclick_id}`, 'aprovada/gestaoclick/G3:2');
  checa('ferias importada: periodo aquisitivo e dias', `${sol.periodo_aquisitivo_inicio}/${sol.dias_corridos}/${sol.venda_dias}`, '2024-11-04/15/0');
  checa('nunca leva salario', String(JSON.stringify(plano).includes('salario')), 'false');

  // aplica o plano num "banco" de mentira para provar que rodar de novo nao muda nada
  const aplicar = (pl, ciclos, sols) => {
    const c = ciclos.map((x) => ({ ...x }));
    pl.ciclosAtualizar.forEach((u) => Object.assign(c.find((x) => x.id === u.id), u.dados));
    pl.ciclosCriar.forEach((n, i) => c.push({ id: `novo-${c.length + i}`, ...n }));
    const t = sols.map((x) => ({ ...x }));
    pl.solicitacoesAtualizar.forEach((u) => Object.assign(t.find((x) => x.id === u.id), u.dados));
    pl.solicitacoesCancelar.forEach((u) => Object.assign(t.find((x) => x.id === u.id), u.dados));
    pl.solicitacoesCriar.forEach((n, i) => t.push({ id: `sol-${t.length + i}`, ...n }));
    return { c, t };
  };
  const estado1 = aplicar(plano, ciclosPortal, []);
  const seg = rodar({ portalCiclos: estado1.c, portalSolicitacoes: estado1.t });
  checa('rodar de novo: nenhum ciclo criado nem alterado', `${seg.plano.ciclosCriar.length}/${seg.plano.ciclosAtualizar.length}`, '0/0');
  checa('rodar de novo: nenhuma ferias nova, alterada ou cancelada', `${seg.plano.solicitacoesCriar.length}/${seg.plano.solicitacoesAtualizar.length}/${seg.plano.solicitacoesCancelar.length}`, '0/0/0');

  // --- Escala de Trabalho ---------------------------------------------------------
  const esc = plano.escalaCriar;
  checa('escala: um registro de Ferias por parcela (3 de G1 + 2 de G3)', String(esc.length), '5');
  checa('escala: tipo ferias, ativa e com a chave da parcela', `${esc[0].tipo_evento}/${esc[0].ativa}/${esc[0].escala_id}`, 'ferias/true/gc-ferias:G1:1');
  checa('escala: parcela PASSADA tambem entra (historico da escala)', String(esc.some((e) => e.data_inicio === '2025-12-29' && e.data_fim === '2026-01-07')), 'true');
  checa('escala: a parcela planejada entra com o periodo certo', String(esc.some((e) => e.colaborador_id === 'pb' && e.data_inicio === '2026-10-13' && e.data_fim === '2026-10-27')), 'true');
  checa('escala: nome e origem legiveis', esc[0].escala_nome, 'Férias (Gestão Click)');
  checa('escala: periodo sem parcelas nao gera registro', String(esc.some((e) => e.escala_id.startsWith('gc-ferias:G2'))), 'false');
  const apl = (pl, escala) => {
    const e = escala.map((x) => ({ ...x }));
    pl.escalaAtualizar.forEach((u) => Object.assign(e.find((x) => x.id === u.id), u.dados));
    pl.escalaDesativar.forEach((u) => Object.assign(e.find((x) => x.id === u.id), u.dados));
    pl.escalaCriar.forEach((n, i) => e.push({ id: `esc-${e.length + i}`, ...n }));
    return e;
  };
  const escala1 = apl(plano, []);
  const seg2 = rodar({ portalCiclos: estado1.c, portalSolicitacoes: estado1.t, portalEscala: escala1 });
  checa('escala: rodar de novo nao cria, atualiza nem desativa nada', `${seg2.plano.escalaCriar.length}/${seg2.plano.escalaAtualizar.length}/${seg2.plano.escalaDesativar.length}`, '0/0/0');
  const g3b = { ...f3, parcelas: [f3.parcelas[0], { ordem: 2, dias: 15, inicio: '2026-10-20', fim: '2026-11-03', status: 'planejada' }] };
  const g3c = { ...f3, dias_gozados: 15, parcelas: [f3.parcelas[0]] };
  const remarcada = rodar({ empresaFerias: [f1, f2, g3b, f4, f5], portalCiclos: estado1.c, portalSolicitacoes: estado1.t, portalEscala: escala1 });
  checa('escala: parcela remarcada atualiza o MESMO registro (nao duplica)', `${remarcada.plano.escalaAtualizar.length}/${remarcada.plano.escalaCriar.length}/${remarcada.plano.escalaAtualizar[0].dados.data_inicio}`, '1/0/2026-10-20');
  const semParcela = rodar({ empresaFerias: [f1, f2, g3c, f4, f5], portalCiclos: estado1.c, portalSolicitacoes: estado1.t, portalEscala: escala1 });
  checa('escala: parcela que sumiu e DESATIVADA, nao apagada', `${semParcela.plano.escalaDesativar.length}/${semParcela.plano.escalaDesativar[0].dados.ativa}`, '1/false');
  const jaDesativada = rodar({ empresaFerias: [f1, f2, g3c, f4, f5], portalCiclos: estado1.c, portalSolicitacoes: estado1.t, portalEscala: apl(semParcela.plano, escala1) });
  checa('escala: o que ja foi desativado nao e desativado de novo', String(jaDesativada.plano.escalaDesativar.length), '0');
  const reativada = rodar({ portalCiclos: estado1.c, portalSolicitacoes: estado1.t, portalEscala: apl(semParcela.plano, escala1) });
  checa('escala: se a parcela volta, o registro e reativado', `${reativada.plano.escalaAtualizar.length}/${reativada.plano.escalaAtualizar[0]?.dados.ativa}`, '1/true');
  checa('escala: registro manual de outra origem nunca e tocado', String(rodar({ portalEscala: [{ id: 'm1', escala_id: 'direct', colaborador_id: 'pa', data_inicio: '2026-10-06', data_fim: '2026-10-06', tipo_evento: 'presencial', ativa: true }] }).plano.escalaDesativar.length), '0');
  checa('escala: o resumo conta os lancamentos', String(resumo.escala_criadas), '5');
  checa('rodar de novo: o resumo diz sem mudanca', String(seg.resumo.ciclos_sem_mudanca), '3');
  // o jsonb do banco devolve as chaves dos fragmentos em outra ordem: nao pode contar como mudanca
  const reordenado = estado1.c.map((c) => ({ ...c, fragmentos: (c.fragmentos ?? []).map((f) => Object.fromEntries(Object.entries(f).reverse())) }));
  const reord = rodar({ portalCiclos: reordenado, portalSolicitacoes: estado1.t });
  checa('chaves em outra ordem (jsonb) nao contam como mudanca', `${reord.plano.ciclosAtualizar.length}/${reord.resumo.ciclos_sem_mudanca}`, '0/3');


  // a data da parcela mudou la
  const f3b = { ...f3, parcelas: [f3.parcelas[0], { ordem: 2, dias: 15, inicio: '2026-10-20', fim: '2026-11-03', status: 'planejada' }] };
  const mudou = rodar({ empresaFerias: [f1, f2, f3b, f4, f5], portalCiclos: estado1.c, portalSolicitacoes: estado1.t });
  checa('parcela remarcada atualiza as datas das ferias', mudou.plano.solicitacoesAtualizar.map((u) => `${u.dados.data_inicio}..${u.dados.data_fim}`).join(','), '2026-10-20..2026-11-03');
  checa('e nao cria uma segunda', String(mudou.plano.solicitacoesCriar.length), '0');

  // a parcela sumiu la
  const f3c = { ...f3, dias_gozados: 15, parcelas: [f3.parcelas[0]] };
  const sumiu = rodar({ empresaFerias: [f1, f2, f3c, f4, f5], portalCiclos: estado1.c, portalSolicitacoes: estado1.t });
  checa('parcela que sumiu de la deixa de travar (cancelada)', sumiu.plano.solicitacoesCancelar.map((u) => u.dados.status).join(','), 'cancelada');
  checa('o ciclo reflete os dias gozados novos', String(sumiu.plano.ciclosAtualizar.find((c) => c.dados.gestaoclick_id === 'G3').dados.dias_utilizados), '15');

  // pedido do Portal com as mesmas datas e adotado, nao duplicado
  const pedidoPortal = { id: 'ped1', colaborador_id: 'pb', colaborador_nome: 'Bia Lima', data_inicio: '2026-10-13', data_fim: '2026-10-27', status: 'em_analise', origem: 'portal' };
  const adotou = rodar({ portalSolicitacoes: [pedidoPortal] });
  checa('pedido do Portal com as mesmas datas e adotado', `${adotou.plano.solicitacoesCriar.length}/${adotou.plano.solicitacoesAtualizar[0].id}/${adotou.plano.solicitacoesAtualizar[0].dados.status}`, '0/ped1/aprovada');

  // aprovado so no Portal: avisa para lancar la
  const soNoPortal = { id: 'ped2', colaborador_id: 'pa', colaborador_nome: 'Ana Souza', data_inicio: '2026-12-10', data_fim: '2026-12-20', status: 'aprovada', origem: 'portal' };
  const avisou = rodar({ portalSolicitacoes: [soNoPortal] });
  checa('aprovada so no Portal gera aviso para lancar no Gestao Click', String(avisou.plano.avisos.some((a) => a.tipo === 'lancar_no_gestaoclick' && /10\/12 a 20\/12/.test(a.mensagem))), 'true');
  checa('e nao e cancelada nem mexida (o Portal nao e apagado)', String(avisou.plano.solicitacoesCancelar.length + avisou.plano.solicitacoesAtualizar.length), '0');

  // ferias ja encerradas no Portal nao geram aviso
  const antiga = rodar({ portalSolicitacoes: [{ ...soNoPortal, id: 'ped3', data_inicio: '2026-01-10', data_fim: '2026-01-20' }] });
  checa('ferias passadas do Portal nao geram aviso', String(antiga.plano.avisos.some((a) => a.tipo === 'lancar_no_gestaoclick')), 'false');

  // abono e divergencia de parcelas
  const abono5 = rodar({ empresaFerias: [{ ...f2, abono: true, abono_dias: 5 }] });
  checa('abono fora de 0 ou 10 vira aviso e e gravado como 0', `${abono5.plano.avisos.some((a) => a.tipo === 'abono_invalido')}/${abono5.plano.ciclosCriar[0].abono_dias}`, 'true/0');
  const abono10 = rodar({ empresaFerias: [{ ...f2, abono: true, abono_dias: 10 }] });
  checa('abono de 10 dias e aceito', String(abono10.plano.ciclosCriar[0].abono_dias), '10');
  const diverge = rodar({ empresaFerias: [{ ...f3, dias_gozados: 20 }] });
  checa('parcelas que nao somam os dias gozados viram aviso', String(diverge.plano.avisos.some((a) => a.tipo === 'parcelas_divergentes')), 'true');
  const agoraS = new Date('2026-10-05T15:00:00Z');
  const horas = (h) => new Date(agoraS.getTime() - h * 3600000).toISOString();
  checa('sync automatica: conector desligado nao roda', String(precisaSincronizar({ ativo: false, ultimo_sucesso_em: null }, agoraS)), 'false');
  checa('sync automatica: nunca rodou, roda', String(precisaSincronizar({ ativo: true, ultimo_sucesso_em: null }, agoraS)), 'true');
  checa('sync automatica: dados de 1h nao rodam', String(precisaSincronizar({ ativo: true, ultimo_sucesso_em: horas(1) }, agoraS)), 'false');
  checa('sync automatica: dados de 5h59 nao rodam', String(precisaSincronizar({ ativo: true, ultimo_sucesso_em: horas(HORAS_ATE_ATUALIZAR - 0.02) }, agoraS)), 'false');
  checa('sync automatica: dados de mais de 6h rodam', String(precisaSincronizar({ ativo: true, ultimo_sucesso_em: horas(7) }, agoraS)), 'true');
  checa('sync automatica: nao roda por cima de uma em andamento', String(precisaSincronizar({ ativo: true, ultimo_sucesso_em: horas(9), ultimo_resultado: 'rodando', ultima_execucao_em: horas(0.02) }, agoraS)), 'false');
  checa('sync automatica: execucao travada ha mais de 5 min nao bloqueia', String(precisaSincronizar({ ativo: true, ultimo_sucesso_em: horas(9), ultimo_resultado: 'rodando', ultima_execucao_em: horas(0.5) }, agoraS)), 'true');
  checa('sync automatica: depois de erro, tenta de novo se os dados estao velhos', String(precisaSincronizar({ ativo: true, ultimo_sucesso_em: horas(30), ultimo_resultado: 'erro' }, agoraS)), 'true');
  checa('sem periodos, nada a fazer', JSON.stringify(rodar({ empresaFerias: [] }).resumo.periodos_recebidos), '0');
}

console.log('\n== conferencia de cores (o verificador pega o que deve) ==');
const cor = (html) => conferirLinha(html).join(' | ') || null;
checa('ambar sobre ambar', cor('<div className="bg-warning text-warning">'), 'texto da cor do fundo (warning)');
checa('branco sobre cinza-claro', cor('<p className="bg-muted text-white">'), 'texto branco sobre fundo claro');
checa('card azul cheio', cor('<Card className="border-0 bg-primary text-white">'), 'card inteiro de cor cheia');
checa('fundo claro -soft passa', cor('<Card className="bg-warning-soft text-warning">'), null);
checa('ramos diferentes da condicao passam', cor("<b className={`p-2 ${x ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>"), null);
checa('superficie escura passa', cor('<div className="bg-muted superficie-escura text-white">'), null);
checa('mesmo ramo com erro e pego', cor("<b className={`p-2 ${x ? 'bg-muted text-white' : 'bg-card'}`}>"), 'texto branco sobre fundo claro');

console.log('\n== AVD: nota, mes de referencia, carimbo e serie mensal ==');
{
  checa('nota 11 vale 10', String(limitarNota('11')), '10');
  checa('nota negativa vale 0', String(limitarNota('-2')), '0');
  checa('virgula decimal', String(limitarNota('8,5')), '8.5');
  checa('vazio nao vira zero', String(limitarNota('')), 'null');
  checa('texto nao e nota', String(limitarNota('bom')), 'null');
  checa('envio no fim do mes e do proprio mes', competenciaDoEnvio('2026-02-27'), '2026-02');
  checa('envio na virada conta o mes anterior', competenciaDoEnvio('2026-07-03'), '2026-06');
  checa('dia 15 ainda e do mes anterior', competenciaDoEnvio('2026-08-15'), '2026-07');
  checa('dia 16 e do proprio mes', competenciaDoEnvio('2026-08-16'), '2026-08');
  checa('janeiro volta para dezembro', competenciaDoEnvio('2026-01-05'), '2025-12');
  checa('carimbo M/D', JSON.stringify(lerCarimbo('7/31/2026 15:24:51', '2026-07-31')), '{"dia":"2026-07-31","hora":"15:24:51"}');
  checa('carimbo D/M (planilha de agosto)', lerCarimbo('04/09/2026 15:47:49', '2026-08-31').dia, '2026-09-04');
  checa('carimbo ambiguo vale o mais perto do mes do arquivo', lerCarimbo('7/3/2026 16:14:47', '2026-05-31').dia, '2026-07-03');
  checa('carimbo invalido', String(lerCarimbo('ontem', '2026-05-31')), 'null');
  checa('o modelo tem 22 perguntas', String(PERGUNTAS_AVD.length), '22');
  checa('ids das perguntas sao unicos', String(new Set(PERGUNTAS_AVD.map((p) => p.id)).size), '22');
  checa('toda nota tem pergunta no modelo', String(NOTAS_AVD.every((n) => PERGUNTAS_AVD.some((p) => p.id === n.chave && p.tipo_resposta === 'escala_0_10'))), 'true');

  const colunas = PERGUNTAS_AVD.map((p) => (p.tipo_resposta === 'escala_0_10' ? '9' : `texto de ${p.id}`));
  colunas[PERGUNTAS_AVD.findIndex((p) => p.id === 'inovacao_nota')] = '11';
  const { respostas, ajustes } = respostasDaLinha(colunas);
  checa('linha vira uma resposta por pergunta', String(respostas.length), '22');
  checa('nota 11 vira 10 e e registrada', JSON.stringify(ajustes), '[{"pergunta":"inovacao_nota","de":"11","para":10}]');
  checa('media geral considera o 10', notasDaResposta(respostas).geral.toFixed(3), ((12 * 9 + 10) / 13).toFixed(3));
  checa('media do bloco maturidade (9, 10, 9)', notasDaResposta(respostas).porBloco.maturidade.toFixed(2), '9.33');
  checa('resposta vazia nao quebra', String(notasDaResposta([]).geral), 'null');
  checa('textos por bloco so os preenchidos', String(textosDaResposta(respostas).every((b) => b.itens.length > 0)), 'true');
  checa('bloco de nota pura nao tem texto', String(textosDaResposta(respostas).some((b) => b.bloco === 'clima')), 'false');

  const mk = (nota) => respostasDaLinha(PERGUNTAS_AVD.map((p) => (p.tipo_resposta === 'escala_0_10' ? String(nota) : ''))).respostas;
  const serie = serieMensalAvd([
    { competencia: '2026-04', respostas: mk(8) }, { competencia: '2026-03', respostas: mk(10) }, { competencia: '2026-03', respostas: mk(6) },
  ]);
  checa('serie em ordem de mes', serie.map((m) => m.competencia).join(','), '2026-03,2026-04');
  checa('duas respostas no mes viram a media', String(serie[0].geral), '8');
  checa('rotulo do mes', serie[1].rotulo, 'abr/26');
}

console.log('\n' + passou + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
