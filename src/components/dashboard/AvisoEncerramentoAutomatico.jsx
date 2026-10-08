import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, X } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { encerradasAutomaticamente, textoDoAviso } from '@/lib/encerramentoAutomatico';
import { formatDateSP } from '@/components/utils/helpers';
import { primeiroNome } from '@/lib/nomes';

const chaveDoAviso = (ids) => `portal_crc_aviso_enc_auto_${ids.join(',').slice(0, 180)}`;

/**
 * Na tela inicial: "X tickets que aguardavam confirmação foram encerrados".
 * A gestão vê os de toda a equipe; o agente, só os dele (quem chama passa as
 * tratativas já filtradas). Fica por 7 dias; "Entendi" esconde até chegar um
 * encerramento novo.
 */
export default function AvisoEncerramentoAutomatico({ tratativas, mostrarAgente = false }) {
  const encerradas = useMemo(() => encerradasAutomaticamente(tratativas), [tratativas]);
  const ids = encerradas.map((t) => t.id);
  const [dispensado, setDispensado] = useState(() => {
    try { return Boolean(ids.length) && localStorage.getItem(chaveDoAviso(ids)) === '1'; } catch { return false; }
  });

  if (encerradas.length === 0 || dispensado) return null;

  const dispensar = () => {
    try { localStorage.setItem(chaveDoAviso(ids), '1'); } catch { /* sem armazenamento: vale só nesta tela */ }
    setDispensado(true);
  };

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{textoDoAviso(encerradas.length)}</p>
          <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {encerradas.slice(0, 6).map((t) => (
              <li key={t.id}>
                <Link to={createPageUrl(`TratativaDetalhe?id=${t.id}`)} className="font-medium text-primary hover:underline">
                  {t.id_interno}
                </Link>
                <span className="text-muted-foreground">
                  {mostrarAgente && t.agente_responsavel_nome ? ` · ${primeiroNome(t.agente_responsavel_nome)}` : ''}
                  {` · ${formatDateSP(t.encerrada_automaticamente_em, 'DD/MM')}`}
                  {t.cliente_reabriu ? ' · cliente reabriu' : ''}
                </span>
              </li>
            ))}
            {encerradas.length > 6 && <li className="text-muted-foreground">e mais {encerradas.length - 6}</li>}
          </ul>
        </div>
        <button type="button" onClick={dispensar} className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Entendi, esconder este aviso" title="Entendi">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
