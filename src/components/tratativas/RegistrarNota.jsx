import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Plus } from 'lucide-react';

/**
 * Área de registro de nota na tratativa.
 *
 * Conforme documentacao/regras-ui-ux.md:
 *   - é o elemento de maior destaque da área de ação;
 *   - expande sozinha conforme a digitação;
 *   - o botão fica imediatamente abaixo do campo, sem obrigar a rolar a
 *     página até o fim para salvar;
 *   - tem atalhos de resposta padrão.
 *
 * A tratativa só registrava histórico quando o STATUS mudava. Não havia como
 * anotar "cliente pediu prazo até sexta" sem inventar uma transição de estado
 * — então esse tipo de informação vivia fora do sistema, no Zendesk ou na
 * cabeça de quem atendeu.
 *
 * A nota entra em historico_estados mantendo o estado atual nos dois campos,
 * o que a distingue de uma transição sem precisar de coluna nova no banco.
 */

const ATALHOS = [
  'Cliente contatado, aguardando retorno.',
  'Sem resposta do cliente até o momento.',
  'Encaminhado ao setor responsável.',
  'Cliente solicitou prazo adicional.',
];

export default function RegistrarNota({ onRegistrar, salvando = false, desabilitado = false }) {
  const [texto, setTexto] = useState('');
  const campoRef = useRef(null);

  const ajustarAltura = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
  };

  const inserirAtalho = (frase) => {
    const novo = texto.trim() ? `${texto.trim()} ${frase}` : frase;
    setTexto(novo);
    campoRef.current?.focus();
    requestAnimationFrame(() => ajustarAltura(campoRef.current));
  };

  const enviar = () => {
    const limpo = texto.trim();
    if (!limpo || salvando) return;
    onRegistrar(limpo);
    setTexto('');
    if (campoRef.current) campoRef.current.style.height = 'auto';
  };

  const aoTeclar = (e) => {
    // Ctrl+Enter envia. Enter sozinho quebra linha, porque uma nota de
    // atendimento costuma ter mais de um parágrafo.
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="nova-nota">Registrar andamento</Label>

      <textarea
        id="nova-nota"
        ref={campoRef}
        rows={3}
        value={texto}
        disabled={desabilitado}
        onChange={(e) => { setTexto(e.target.value); ajustarAltura(e.target); }}
        onKeyDown={aoTeclar}
        placeholder="O que aconteceu nesta tratativa?"
        className="w-full resize-none rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-50"
      />

      {!desabilitado && (
        <div className="flex flex-wrap items-center gap-2">
          {ATALHOS.map((frase) => (
            <button
              key={frase}
              type="button"
              onClick={() => inserirAtalho(frase)}
              className="rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {frase}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Ctrl + Enter para registrar
        </p>
        <Button onClick={enviar} disabled={!texto.trim() || salvando || desabilitado} size="sm">
          {salvando
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />Registrando...</>
            : <><Plus className="mr-2 h-4 w-4" aria-hidden="true" />Registrar</>}
        </Button>
      </div>
    </div>
  );
}
