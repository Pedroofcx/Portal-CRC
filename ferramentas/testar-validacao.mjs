import {
  obrigatorio, email, url, cpf, cnpj,
  numeroPositivo, dataNaoFutura, maximoItens, minimoCaracteres,
  emailCorporativo,
} from '../src/lib/validacao.js';
import { formatBRL, sanitizeSalario, temSalarioCadastrado } from '../src/components/utils/helpers.js';
import { saudacao } from '../src/lib/saudacao.js';
import { primeiroNome } from '../src/lib/nomes.js';
import { resumoDoDia } from '../src/lib/resumoDoDia.js';
import { pontosDaFaixa, proximaFaixa } from '../src/lib/faixasIndicadores.js';
import { avaliarExigencia, volumePorCanal } from '../src/lib/elegibilidade.js';
import { pontosPorSemana, fimDoRitmo } from '../src/lib/ritmoSemanal.js';
import { posicaoNoRanking } from '../src/lib/posicaoRanking.js';
import { prazoDaTratativa, descreverPrazo, consumoDoPrazo } from '../src/lib/prazoSla.js';
import { indicadoresDoCiclo } from '../src/lib/indicadoresCiclo.js';
import { conferirLinha } from './conferir-cores.mjs';
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
import { reaberturaDe, comReaberturaApurada, aberturasNoCiclo, cicloPagaAbertura, pontosDeTratativasNoCiclo } from '../src/lib/pontuacaoCiclo.js';
import { extratoDoAgente } from '../src/lib/extratoPontos.js';
import { calcularDadosConsolidados } from '../src/lib/hanseiDados.js';
import { desfechoDaContestacao, resumoFinanceiro } from '../src/lib/relatorios/financeiro.js';
import { pessoasNoPeriodo } from '../src/lib/relatorios/pessoas.js';
import { filaDeHoje, entradaESaida, tempoPorCanal, diagnosticoDeCarga } from '../src/lib/relatorios/operacao.js';
import { resumoDoCanal } from '../src/lib/relatorios/canais.js';
import { resumoQualidade } from '../src/lib/relatorios/qualidade.js';
import { resumoJornada } from '../src/lib/relatorios/jornada.js';

let passou = 0;
let falhou = 0;

function checa(nome, real, esperado) {
  const ok = esperado === null ? real === null : (real !== null && real.includes(esperado));
  if (ok) { passou++; console.log('  OK   ' + nome); }
  else { falhou++; console.log('  FALHA ' + nome + '\n        esperado: ' + esperado + '\n        obtido:   ' + real); }
}

console.log('\n== obrigatorio ==');
checa('vazio acusa', obrigatorio('O nome')(''), 'O nome é obrigatório');
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

console.log('\n== indicadores do ciclo (ciclo inteiro, dia a dia) ==');
{
  const cicloT = { data_inicio: '2026-06-16', data_fim: '2026-09-16' };
  const tel = (data, lig, at, av, pos) => ({ data, telefone: { total_ligacoes: lig, total_atendidas: at, total_avaliadas: av, total_positivas: pos } });
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
  const tel = (data, av, pos, lig = 10, at = 10) => ({ data, telefone: { total_ligacoes: lig, total_atendidas: at, total_avaliadas: av, total_positivas: pos } });
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

console.log('\n== relatorio de qualidade ==');
{
  const tel = (data, av, pos) => ({ data, telefone: { total_ligacoes: 10, total_atendidas: 10, total_avaliadas: av, total_positivas: pos } });
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

console.log('\n== conferencia de cores (o verificador pega o que deve) ==');
const cor = (html) => conferirLinha(html).join(' | ') || null;
checa('ambar sobre ambar', cor('<div className="bg-warning text-warning">'), 'texto da cor do fundo (warning)');
checa('branco sobre cinza-claro', cor('<p className="bg-muted text-white">'), 'texto branco sobre fundo claro');
checa('card azul cheio', cor('<Card className="border-0 bg-primary text-white">'), 'card inteiro de cor cheia');
checa('fundo claro -soft passa', cor('<Card className="bg-warning-soft text-warning">'), null);
checa('ramos diferentes da condicao passam', cor("<b className={`p-2 ${x ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>"), null);
checa('superficie escura passa', cor('<div className="bg-muted superficie-escura text-white">'), null);
checa('mesmo ramo com erro e pego', cor("<b className={`p-2 ${x ? 'bg-muted text-white' : 'bg-card'}`}>"), 'texto branco sobre fundo claro');

console.log('\n' + passou + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
