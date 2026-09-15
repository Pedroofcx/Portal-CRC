/**
 * Paleta dos gráficos.
 *
 * O recharts recebe cor por atributo (`fill`, `stroke`), não por classe CSS —
 * então não dá para usar `bg-chart-1`. Mas dá para referenciar a variável
 * diretamente, e é isso que este arquivo faz: os gráficos passam a beber da
 * mesma fonte que o resto da interface.
 *
 * Antes, cada gráfico escolhia seu hex. Havia 32 cores cravadas em 22
 * arquivos, e a mesma série aparecia azul num relatório e roxa em outro.
 *
 * Para trocar a paleta inteira, edite --chart-1..5 em src/index.css.
 */

const v = (nome) => `hsl(var(${nome}))`;

/** Série categórica, na ordem de uso. */
export const SERIE_GRAFICO = [
  v('--chart-1'),
  v('--chart-2'),
  v('--chart-3'),
  v('--chart-4'),
  v('--chart-5'),
];

/** Cores com significado, para quando a série não se aplica. */
export const CORES_GRAFICO = {
  serie1: v('--chart-1'),
  serie2: v('--chart-2'),
  serie3: v('--chart-3'),
  serie4: v('--chart-4'),
  serie5: v('--chart-5'),

  sucesso: v('--success'),
  atencao: v('--warning'),
  critico: v('--critical'),
  destrutivo: v('--destructive'),

  /** Elementos estruturais do gráfico. */
  grade: v('--border'),
  eixo: v('--muted-foreground'),
  texto: v('--foreground'),
};

/** Cor da n-ésima série, ciclando quando há mais séries que cores. */
export function corDaSerie(indice) {
  return SERIE_GRAFICO[indice % SERIE_GRAFICO.length];
}
