import React, { useMemo } from 'react';
import { Cartao, Linha } from '@/components/ui/Cartao';
import { ComoCalculamos } from '@/components/relatorios/hub/Pecas';
import { projetarCsatDoMes } from '@/lib/relatorios/previsaoCsat';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const pct = (v) => (v === null || v === undefined ? '—' : `${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);
const dataCurta = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const hojeIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Preditivo do mês — o CSAT da equipe até hoje e para onde ele caminha até o
 * fim do mês. A conta mora em src/lib/relatorios/previsaoCsat.js.
 */
export default function PreditivoMes({ apuracoes, colaboradores, fonteChat }) {
  const hoje = hojeIso();
  const p = useMemo(() => projetarCsatDoMes({ apuracoes, colaboradores, fonteChat, hoje }), [apuracoes, colaboradores, fonteChat, hoje]);
  const nomeDoMes = `${MESES[Number(hoje.slice(5, 7)) - 1]} de ${hoje.slice(0, 4)}`;

  if (!p) {
    return (
      <Cartao titulo={`Previsão de ${nomeDoMes}`}>
        <p className="text-sm text-foreground">Ainda não há apuração importada neste mês.</p>
        <p className="mt-1 text-sm text-muted-foreground">Importe os arquivos na aba Importar e a previsão aparece aqui.</p>
      </Cartao>
    );
  }

  const [ritmoMes, ritmoRecente] = p.cenarios;
  const f = p.proximaFaixa;

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-6 xl:grid-cols-5">
        <Cartao titulo={`CSAT de ${nomeDoMes} até agora`} className="xl:col-span-2">
          <p className="text-4xl font-bold tracking-tight tabular-nums text-foreground">{pct(p.atual.csat)}</p>
          <p className="text-sm text-muted-foreground">com dados até {dataCurta(p.ultimoDia)} · {p.atual.pontos} ponto(s) de CSAT hoje</p>
          <div className="mt-4 divide-y divide-border border-t border-border">
            <Linha rotulo="CSAT do telefone" detalhe={`${p.atual.avaliacoesTelefone} avaliações`} valor={pct(p.atual.csatTelefone)} />
            <Linha rotulo="CSAT do chat" detalhe={`${p.atual.avaliacoesChat} avaliações`} valor={pct(p.atual.csatChat)} />
          </div>
        </Cartao>

        <Cartao titulo="Como o mês deve fechar" className="xl:col-span-3">
          {p.mesFechado ? (
            <p className="text-sm text-muted-foreground">O mês já tem dados até o último dia útil: o número ao lado é o fechamento.</p>
          ) : (
            <>
              <div className="divide-y divide-border">
                <Linha rotulo={ritmoMes.rotulo} detalhe="o que falta chega com o CSAT que o mês já tem" valor={`${pct(ritmoMes.csat)} · ${ritmoMes.pontos} pts`} forte />
                <Linha rotulo={ritmoRecente.rotulo} detalhe="o que falta chega com o CSAT da última semana" valor={`${pct(ritmoRecente.csat)} · ${ritmoRecente.pontos} pts`} forte />
                <Linha rotulo="No pior caso" detalhe="tudo que falta chega negativo" valor={`${pct(p.piso.csat)} · ${p.piso.pontos} pts`} />
                <Linha rotulo="No melhor caso" detalhe="tudo que falta chega positivo" valor={`${pct(p.teto.csat)} · ${p.teto.pontos} pts`} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Faltam {p.restantesUteis} dia(s) útil(eis); devem chegar cerca de {p.avaliacoesQueFaltam.telefone} avaliações de telefone e {p.avaliacoesQueFaltam.chat} de chat.
              </p>
              {f && (
                <p className="mt-3 rounded-lg border border-border p-3 text-sm text-foreground">
                  {f.alcancavel
                    ? (f.csatNecessario === 0
                      ? `A próxima faixa (${f.limiar}%, +${f.ganho} ponto(s)) já está garantida pelo que o mês tem.`
                      : `Para chegar na próxima faixa (${f.limiar}%, +${f.ganho} ponto(s)), o resto do mês precisa fechar com cerca de ${pct(f.csatNecessario)} de CSAT.`)
                    : `A próxima faixa (${f.limiar}%) não é mais alcançável neste mês, nem com tudo positivo daqui para frente.`}
                </p>
              )}
            </>
          )}
        </Cartao>
      </div>

      <ComoCalculamos>
        <p><strong>É uma estimativa, não um resultado.</strong> Parte do CSAT do mês até o último dia importado, com a mesma regra da premiação: cada canal junta todas as avaliações e o CSAT é a média de telefone e chat.</p>
        <p>As avaliações que faltam vêm do ritmo médio por dia apurado, vezes os dias úteis (segunda a sexta) até o fim do mês; feriados não são descontados. O pior e o melhor caso não são estimativa: são os limites do que ainda pode acontecer.</p>
        <p>Quando o chat tem Zendesk e ClickDesk juntos, o chat entra com o CSAT já combinado, e a previsão dele é aproximada. A escolha da fonte do chat acima vale aqui também.</p>
      </ComoCalculamos>
    </div>
  );
}
