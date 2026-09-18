/**
 * Frases da tela de entrada, em dois grupos que se misturam no revezamento.
 *
 * CLÁSSICAS — êxito, conquista, autocontrole e sabedoria. Só entram frases
 * com autoria confirmada na obra de origem. Muita frase famosa circula com o
 * nome errado ("a excelência é um hábito" é de Will Durant resumindo
 * Aristóteles, não de Aristóteles), e uma citação falsa na primeira tela do
 * sistema desmente o próprio tema da sabedoria. Traduções livres.
 *
 * DA EQUIPE — os bordões do próprio time. Autoria confirmada de outro jeito:
 * foram ditas aqui.
 *
 * Para acrescentar: um objeto novo no grupo certo, com `texto` e `autor`
 * (e `fonte`, nas clássicas, para quem quiser conferir).
 */
export const CLASSICAS = [
  {
    texto: 'Aquele que vence os outros é forte; aquele que vence a si mesmo é poderoso.',
    autor: 'Lao-Tsé',
    fonte: 'Tao Te Ching, 33',
  },
  {
    texto: 'Não é porque as coisas são difíceis que não ousamos; é porque não ousamos que elas são difíceis.',
    autor: 'Sêneca',
    fonte: 'Cartas a Lucílio, 104',
  },
  {
    texto: 'O que impede a ação faz a ação avançar. O que está no caminho se torna o caminho.',
    autor: 'Marco Aurélio',
    fonte: 'Meditações, V.20',
  },
  {
    texto: 'Primeiro diga a si mesmo quem você quer ser; depois faça o que precisa ser feito.',
    autor: 'Epicteto',
    fonte: 'Discursos, III.23',
  },
  {
    texto: 'Uma jornada de mil léguas começa com um único passo.',
    autor: 'Lao-Tsé',
    fonte: 'Tao Te Ching, 64',
  },
  {
    texto: 'Sofremos mais na imaginação do que na realidade.',
    autor: 'Sêneca',
    fonte: 'Cartas a Lucílio, 13',
  },
  {
    texto: 'Não são as coisas que nos perturbam, mas o julgamento que fazemos delas.',
    autor: 'Epicteto',
    fonte: 'Manual, 5',
  },
  {
    texto: 'O caráter de uma pessoa é o seu destino.',
    autor: 'Heráclito',
    fonte: 'Fragmento 119',
  },
  {
    texto: 'A alma se tinge da cor dos seus pensamentos.',
    autor: 'Marco Aurélio',
    fonte: 'Meditações, V.16',
  },
  {
    texto: 'Enquanto adiamos, a vida passa.',
    autor: 'Sêneca',
    fonte: 'Cartas a Lucílio, 1',
  },
];

const DA_EQUIPE = [
  { texto: 'VAGABUNDO!', autor: 'Aninha' },
  { texto: 'Ai gente...', autor: 'Dayane' },
  { texto: 'Eu, como uma ex-secretária executiva...', autor: 'Sirlene' },
  { texto: 'Eu sinceramente espero o universo.', autor: 'Bárbara' },
  { texto: 'Emote de rato.', autor: 'Julliano' },
  { texto: 'Attention, please.', autor: 'Pedrão' },
];

export const FRASES = [...CLASSICAS, ...DA_EQUIPE];
