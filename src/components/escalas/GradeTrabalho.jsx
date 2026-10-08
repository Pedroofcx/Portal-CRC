import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Cartao } from '@/components/ui/Cartao';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  TIPOS_TRABALHO, HOME_OFFICE_POR_DIA, MINIMO_PRESENCIAIS, trabalhoDe, avisosDoTrabalho,
} from '@/lib/escalas';

/**
 * Escala de Trabalho da semana: uma linha por pessoa, uma coluna por dia.
 * Clicar na célula troca o que a pessoa faz naquele dia. Três presenciais e
 * dois em home office — a regra do CRC — fica conferida na hora, no rodapé.
 */
const CORES = {
  presencial: 'bg-muted text-foreground border-border',
  home_office: 'bg-info-soft text-primary border-primary/25',
  day_off: 'bg-warning-soft text-warning border-warning/25',
  ferias: 'bg-success-soft text-success border-success/25',
  falta: 'bg-destructive/10 text-destructive border-destructive/25',
  atestado: 'bg-warning-soft text-warning border-warning/25',
  treinamento: 'bg-muted text-muted-foreground border-border',
};
const rotuloDoTipo = (tipo) => TIPOS_TRABALHO.find((t) => t.valor === tipo)?.rotulo ?? 'Sem marcação';

function Celula({ tipo, podeEditar, onEscolher, rotuloAcessivel }) {
  const classe = `w-full rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${CORES[tipo] || 'border-dashed border-border bg-card text-muted-foreground'}`;
  if (!podeEditar) return <span className={classe}>{rotuloDoTipo(tipo)}</span>;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={`${classe} hover:opacity-80`} aria-label={rotuloAcessivel}>
          {rotuloDoTipo(tipo)}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {TIPOS_TRABALHO.map((t) => (
          <DropdownMenuItem key={t.valor} onSelect={() => onEscolher(t.valor)}>{t.rotulo}</DropdownMenuItem>
        ))}
        <DropdownMenuItem onSelect={() => onEscolher(null)}>Sem marcação</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function GradeTrabalho({ pessoas, dias, mapa, podeEditar, salvando, onMarcar, onMontarSemana, onRepetirSemana }) {
  const avisos = useMemo(() => avisosDoTrabalho({ mapa, pessoas, dias }), [mapa, pessoas, dias]);

  const contagem = (data) => {
    const tipos = pessoas.map((p) => trabalhoDe(mapa, p.id, data));
    return {
      presenciais: tipos.filter((t) => t === 'presencial').length,
      emCasa: tipos.filter((t) => t === 'home_office').length,
      fora: tipos.filter((t) => t && t !== 'presencial' && t !== 'home_office').length,
    };
  };

  return (
    <div className="space-y-4">
      {podeEditar && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onMontarSemana} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Montar a semana'}
          </Button>
          <Button size="sm" variant="outline" onClick={onRepetirSemana} disabled={salvando}>
            Repetir a semana passada
          </Button>
          <p className="self-center text-xs text-muted-foreground">
            Montar distribui {HOME_OFFICE_POR_DIA} home office por dia, revezando quem ficou menos vezes em casa.
          </p>
        </div>
      )}

      <Cartao>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2 text-left font-medium">Pessoa</th>
                {dias.map((d) => (
                  <th key={d.data} className="px-1 py-2 text-left font-medium">
                    {d.rotulo}
                    <span className="block font-normal">{d.data.slice(8, 10)}/{d.data.slice(5, 7)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pessoas.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="py-2 pr-3 align-middle text-foreground">{p.nome_completo}</td>
                  {dias.map((d) => (
                    <td key={d.data} className="px-1 py-1.5 align-middle">
                      <Celula
                        tipo={trabalhoDe(mapa, p.id, d.data)}
                        podeEditar={podeEditar && !salvando}
                        rotuloAcessivel={`${p.nome_completo} em ${d.rotulo}`}
                        onEscolher={(tipo) => onMarcar(p, d.data, tipo)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border text-xs text-muted-foreground">
                <td className="py-2 pr-3">Presencial / home office</td>
                {dias.map((d) => {
                  const c = contagem(d.data);
                  const foraDaRegra = c.presenciais + c.emCasa > 0
                    && (c.presenciais < Math.min(MINIMO_PRESENCIAIS, c.presenciais + c.emCasa) || c.emCasa > HOME_OFFICE_POR_DIA);
                  return (
                    <td key={d.data} className={`px-1 py-2 tabular-nums ${foraDaRegra ? 'font-semibold text-destructive' : ''}`}>
                      {c.presenciais} / {c.emCasa}
                      {c.fora > 0 && <span className="block font-normal">{c.fora} fora</span>}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </Cartao>

      {podeEditar && (
      <Cartao titulo="Conferência da semana">
        {avisos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Semana dentro da regra: {MINIMO_PRESENCIAIS} presenciais e {HOME_OFFICE_POR_DIA} em home office por dia.
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {avisos.map((a, i) => (
              <li key={`${a.data}-${i}`} className={a.grave ? 'text-destructive' : 'text-muted-foreground'}>{a.texto}</li>
            ))}
          </ul>
        )}
      </Cartao>
      )}
    </div>
  );
}
