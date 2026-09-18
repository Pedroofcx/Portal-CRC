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
import { pontosPorSemana } from '../src/lib/ritmoSemanal.js';
import { posicaoNoRanking } from '../src/lib/posicaoRanking.js';
import { prazoDaTratativa, descreverPrazo, consumoDoPrazo } from '../src/lib/prazoSla.js';
import { indicadoresDoCiclo } from '../src/lib/indicadoresCiclo.js';
import { calculateCSATPoints, calculateCXPoints } from '../src/components/utils/helpers.js';

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
checa('performance 94,9 nao pontua', String(pontosDaFaixa('performance', 94.9)), '0');
checa('performance 97 vale 7', String(pontosDaFaixa('performance', 97)), '7');
checa('CX 4,2 vale 1', String(pontosDaFaixa('cx', 4.2)), '1');
checa('CX 4,4 vale 4', String(pontosDaFaixa('cx', 4.4)), '4');
checa('sem valor nao pontua', String(pontosDaFaixa('csat', null)), '0');
checa('proxima do CSAT 92 e 95 com +1', JSON.stringify(proximaFaixa('csat', 92)), '{"limiar":95,"pontos":10,"ganho":1}');
checa('proxima do CX 4,4 e 4,5 com +6', JSON.stringify(proximaFaixa('cx', 4.4)), '{"limiar":4.5,"pontos":10,"ganho":6}');
checa('proxima abaixo do minimo e a primeira faixa', JSON.stringify(proximaFaixa('performance', 80)), '{"limiar":95,"pontos":7,"ganho":7}');
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

console.log('\n== indicadores do ciclo (previa) ==');
const cicloT = { data_inicio: '2026-06-16', data_fim: '2026-09-16' };
const apur = [
  { tipo_apuracao: 'telefone', periodo_inicio: '2026-07-01', periodo_fim: '2026-07-31', canal_telefone: { csat: 90, performance: 96 } },
  { tipo_apuracao: 'telefone', periodo_inicio: '2026-08-01', periodo_fim: '2026-08-31', canal_telefone: { csat: 93, performance: 101 } },
  { tipo_apuracao: 'chat', periodo_inicio: '2026-08-01', periodo_fim: '2026-08-31', canal_chat: { csat: 70 } },
  { tipo_apuracao: 'cx', periodo_inicio: '2026-08-01', periodo_fim: '2026-08-31', avaliacao_cx: { nota_media: 4.4 } },
  { tipo_apuracao: 'telefone', periodo_inicio: '2026-05-01', periodo_fim: '2026-05-31', canal_telefone: { csat: 99, performance: 110 } },
];
const ind = indicadoresDoCiclo(apur, cicloT);
checa('usa o ultimo mes do ciclo', String(ind.csat.valor), '93');
checa('prefere o CSAT do telefone', ind.csat.canal, 'telefone');
checa('diz de qual mes veio', ind.csat.mes, 'agosto');
checa('performance do ultimo mes', String(ind.performance.valor), '101');
checa('CX do ultimo mes', String(ind.cx.valor), '4.4');
checa('mes fora do ciclo nao entra', String(indicadoresDoCiclo([apur[4]], cicloT).csat), 'null');
checa('sem telefone usa o chat', indicadoresDoCiclo([apur[2]], cicloT).csat.canal, 'chat');
checa('sem ciclo nao ha indicador', String(indicadoresDoCiclo(apur, null).cx), 'null');

console.log('\n' + passou + ' passaram, ' + falhou + ' falharam');
process.exit(falhou ? 1 : 0);
