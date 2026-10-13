import React, { useState } from 'react';
import { Cartao, Linha } from '@/components/ui/Cartao';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { calcularCsat, zonaDoCsat } from '@/lib/relatorios/previsaoCsat';

/**
 * Calculadora de CSAT — só conta na tela, não grava nada. Digita quantas
 * respostas teve cada nota (1 a 5) e vê o CSAT: satisfeitos (notas 4 e 5) ÷
 * total de respostas. É a conta simples de mercado; o número oficial da
 * premiação segue as regras de cada canal (ver "Como calculamos" na Análise).
 */
const CAMPOS = [
  { nota: '1', grupo: 'Insatisfeitos', classe: 'bg-destructive/15 text-destructive' },
  { nota: '2', grupo: 'Insatisfeitos', classe: 'bg-destructive/15 text-destructive' },
  { nota: '3', grupo: 'Neutros', classe: 'bg-warning-soft text-warning' },
  { nota: '4', grupo: 'Satisfeitos', classe: 'bg-success-soft text-success' },
  { nota: '5', grupo: 'Satisfeitos', classe: 'bg-success-soft text-success' },
];

const VAZIO = { 1: '', 2: '', 3: '', 4: '', 5: '' };
const fmt = (v) => (v === null ? '—' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);

/** Medidor em meia-lua: o arco enche conforme o CSAT. */
function Medidor({ valor }) {
  const meio = Math.PI * 80;
  const cheio = valor === null ? 0 : Math.min(100, Math.max(0, valor)) / 100;
  return (
    <svg viewBox="0 0 200 115" className="mx-auto w-full max-w-xs" role="img" aria-label={valor === null ? 'CSAT sem respostas' : `CSAT ${fmt(valor)}`}>
      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="hsl(var(--muted))" strokeWidth="14" strokeLinecap="round" />
      <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="hsl(var(--primary))" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${meio * cheio} ${meio}`} />
      <text x="100" y="92" textAnchor="middle" className="fill-foreground" style={{ fontSize: 34, fontWeight: 700 }}>{valor === null ? '—' : Math.round(valor)}</text>
      <text x="100" y="110" textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10, letterSpacing: 3 }}>CSAT %</text>
    </svg>
  );
}

export default function CalculadoraCsat() {
  const [notas, setNotas] = useState(VAZIO);
  const r = calcularCsat(notas);
  const zona = zonaDoCsat(r.csat);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <Cartao titulo="Quantas respostas teve cada nota?">
        <div className="grid grid-cols-5 gap-2">
          {CAMPOS.map((c) => (
            <div key={c.nota} className="space-y-1.5 text-center">
              <span className={`block rounded-md py-1 text-xs font-semibold ${c.classe}`}>{c.grupo}</span>
              <label htmlFor={`nota-${c.nota}`} className="block text-sm font-medium text-foreground">Nota {c.nota}</label>
              <Input
                id={`nota-${c.nota}`}
                type="number"
                min="0"
                inputMode="numeric"
                className="text-center"
                value={notas[c.nota]}
                onChange={(e) => setNotas((a) => ({ ...a, [c.nota]: e.target.value }))}
                placeholder="0"
              />
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Nada aqui é salvo: é só uma conta na tela.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setNotas(VAZIO)}>Limpar</Button>
        </div>
        <div className="mt-4 divide-y divide-border border-t border-border">
          <Linha rotulo="Total de respostas" valor={r.total} />
          <Linha rotulo="Satisfeitos (notas 4 e 5)" valor={r.satisfeitos} />
          <Linha rotulo="Neutros (nota 3)" valor={r.neutros} />
          <Linha rotulo="Insatisfeitos (notas 1 e 2)" valor={r.insatisfeitos} />
          <Linha rotulo="Média das notas" valor={r.mediaDasNotas === null ? '—' : r.mediaDasNotas.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} />
        </div>
      </Cartao>

      <Cartao titulo="Resultado">
        <Medidor valor={r.csat} />
        {r.csat === null ? (
          <p className="mt-2 text-center text-sm text-muted-foreground">Digite as respostas para ver o CSAT.</p>
        ) : (
          <div className="mt-2 text-center">
            <p className="text-sm text-foreground">
              Faixa de pontos do Portal: <span className="font-semibold">{zona.nome}</span> · {r.pontos} ponto(s) de CSAT
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {r.proxima ? `A próxima faixa começa em ${r.proxima.limiar}% e vale +${r.proxima.ganho} ponto(s).` : 'Já na faixa máxima.'}
            </p>
          </div>
        )}
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
          CSAT = satisfeitos (notas 4 e 5) ÷ total de respostas. É o padrão de CX e a mesma conta da premiação: a nota 3
          é neutra, não conta como satisfeita nem como negativa, mas fica na base.
        </p>
      </Cartao>
    </div>
  );
}
