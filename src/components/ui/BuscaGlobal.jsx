import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import db from '@/api/db';
import { createPageUrl } from '@/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import { Search, CornerDownLeft } from 'lucide-react';

/**
 * Busca global de tratativas.
 *
 * Procura por número interno (TRT-0347), nome do cliente, ID da base e link do
 * Zendesk — que são os quatro jeitos pelos quais alguém da operação se refere a
 * um caso. Quem atende recebe "o ticket 1083347" ou "a reclamação da Márcia",
 * raramente os dois.
 *
 * A busca é feita sobre a lista já carregada, no navegador: são centenas de
 * tratativas, não milhares, e filtrar localmente responde a cada tecla sem ida
 * ao servidor. Se o volume crescer muito, isto vira uma consulta com índice de
 * texto no Postgres — o ponto de troca é este componente, e só ele.
 *
 * Teclado: Ctrl+K abre, setas percorrem, Enter abre, Esc fecha.
 */
export default function BuscaGlobal() {
  const [termo, setTermo] = useState('');
  const [aberto, setAberto] = useState(false);
  const [selecionado, setSelecionado] = useState(0);
  const campoRef = useRef(null);
  const caixaRef = useRef(null);
  const navigate = useNavigate();

  const { data: tratativas = [] } = useQuery({
    queryKey: ['busca-tratativas'],
    queryFn: () => db.entities.Tratativa.list('-created_date', 2000),
    staleTime: 300000,
  });

  const resultados = useMemo(() => {
    const t = termo.trim().toLowerCase();
    if (t.length < 2) return [];
    return tratativas
      .filter((x) =>
        [x.id_interno, x.nome_cliente, x.id_base_cliente, x.link_zendesk]
          .some((campo) => campo && String(campo).toLowerCase().includes(t))
      )
      .slice(0, 8);
  }, [termo, tratativas]);

  useEffect(() => setSelecionado(0), [termo]);

  // Ctrl+K / Cmd+K coloca o cursor na busca de qualquer lugar do sistema.
  useEffect(() => {
    const atalho = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        campoRef.current?.focus();
      }
    };
    window.addEventListener('keydown', atalho);
    return () => window.removeEventListener('keydown', atalho);
  }, []);

  // Clique fora fecha a lista.
  useEffect(() => {
    const fora = (e) => {
      if (caixaRef.current && !caixaRef.current.contains(e.target)) setAberto(false);
    };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, []);

  const abrir = (tratativa) => {
    setAberto(false);
    setTermo('');
    navigate(createPageUrl('TratativaDetalhe') + `?id=${tratativa.id}`);
  };

  const aoTeclar = (e) => {
    if (!resultados.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelecionado((i) => (i + 1) % resultados.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelecionado((i) => (i - 1 + resultados.length) % resultados.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      abrir(resultados[selecionado]);
    } else if (e.key === 'Escape') {
      setAberto(false);
    }
  };

  const semResultado = aberto && termo.trim().length >= 2 && resultados.length === 0;

  return (
    <div ref={caixaRef} className="relative w-full max-w-md">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        ref={campoRef}
        type="search"
        value={termo}
        onChange={(e) => { setTermo(e.target.value); setAberto(true); }}
        onFocus={() => setAberto(true)}
        onKeyDown={aoTeclar}
        placeholder="Buscar tratativa por número, cliente ou ticket"
        aria-label="Buscar tratativa"
        className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-16 text-sm text-foreground placeholder:text-muted-foreground"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        Ctrl K
      </kbd>

      {(resultados.length > 0 || semResultado) && aberto && (
        <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          {semResultado ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              Nada encontrado para “{termo.trim()}”.
            </p>
          ) : (
            <ul role="listbox">
              {resultados.map((t, i) => (
                <li key={t.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === selecionado}
                    onMouseEnter={() => setSelecionado(i)}
                    onClick={() => abrir(t)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${
                      i === selecionado ? 'bg-accent' : 'hover:bg-accent/60'
                    }`}
                  >
                    <span className="shrink-0 font-mono text-xs font-medium text-muted-foreground">
                      {t.id_interno || '—'}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                      {t.nome_cliente || 'Sem cliente'}
                    </span>
                    <StatusBadge status={t.status} />
                    {i === selecionado && (
                      <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
