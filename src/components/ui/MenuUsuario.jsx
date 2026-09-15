import React from 'react';
import { Link } from 'react-router-dom';
import db from '@/api/db';
import { createPageUrl } from '@/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Award, ChevronDown, LogOut } from 'lucide-react';

/**
 * Identificação de quem está usando o sistema, com o menu da conta.
 *
 * Ficava no rodapé do menu lateral. Subiu para o canto superior direito, que é
 * onde a convenção de sistemas web coloca a conta — e onde o olho procura.
 *
 * Efeito colateral bom: quando o menu lateral é recolhido, o usuário some
 * junto se estiver lá dentro. Na barra superior, ele permanece.
 */
export default function MenuUsuario({ user, colaborador, compacto = false }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2.5 rounded-lg p-1 pr-2 transition-colors hover:bg-accent"
          aria-label="Menu da conta"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={colaborador?.foto_url} />
            <AvatarFallback className="bg-primary text-xs text-primary-foreground">
              {user?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>

          {!compacto && (
            <>
              <span className="min-w-0 text-left">
                <span className="block truncate text-sm font-medium leading-tight text-foreground">
                  {user?.full_name || 'Usuário'}
                </span>
                <span className="block text-xs capitalize leading-tight text-muted-foreground">
                  {colaborador?.papel || 'Agente'}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link to={createPageUrl('MinhaPerformance')} className="flex items-center gap-2">
            <Award className="h-4 w-4" aria-hidden="true" />
            Minha Performance
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => db.auth.logout()} className="text-destructive">
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
