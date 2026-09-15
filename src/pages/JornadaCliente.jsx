/**
 * PÁGINA INCOMPLETA — PENDENTE DE RECUPERAÇÃO
 *
 * O export do Base44 truncou este arquivo na linha 50, no meio da declaração
 * do componente. O mesmo truncamento está no PortalCrc.zip, ou seja, o corte
 * aconteceu na origem e não há outra cópia local.
 *
 * O trecho que sobreviveu está preservado em JornadaCliente.jsx.truncado —
 * 20 imports e a abertura do componente, o que já revela boa parte da
 * estrutura da página. Todos os componentes que ela usa continuam íntegros
 * em src/components/jornada/, então o que falta é apenas a montagem da tela.
 *
 * Como recuperar, em ordem de custo:
 *   1. Abrir a página no portal do Base44 e copiar o código pelo construtor.
 *   2. Reconstruir a partir dos componentes de src/components/jornada/ e das
 *      regras em documentacao/regras-de-negocio-base44.json (módulo "jornada").
 *
 * Até lá, esta tela avisa em vez de quebrar o sistema inteiro.
 */

import React from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export default function JornadaCliente() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Jornada do Cliente"
        description="Página pendente de recuperação"
      />
      <Card>
        <CardContent className="flex gap-4 p-6">
          <AlertTriangle className="h-6 w-6 shrink-0 text-amber-500" aria-hidden="true" />
          <div className="space-y-2">
            <h2 className="font-semibold">Esta página não veio completa do Base44</h2>
            <p className="text-sm text-muted-foreground">
              O arquivo foi cortado durante a exportação. Os componentes da
              Jornada do Cliente estão todos preservados — falta apenas remontar
              a tela que os organiza.
            </p>
            <p className="text-sm text-muted-foreground">
              Nenhuma outra página do sistema foi afetada.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
