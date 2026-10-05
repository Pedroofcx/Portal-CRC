/*
 * ATENÇÃO: a lógica da apuração mora AQUI (supabase/functions/api/apuracao/),
 * porque a Edge Function da API de integrações precisa dela e só enxerga a
 * própria pasta. O Portal importa deste mesmo arquivo (src/lib/apuracao e
 * src/components/apuracao têm só um repasse). Uma fonte só: o que a tela
 * importa e o que a API grava passam pelo MESMO cálculo.
 */
export * from '../../../supabase/functions/api/apuracao/datas.js';
