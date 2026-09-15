/**
 * Este componente existia para uma única coisa: chamar db.appLogs.logUserInApp(),
 * a telemetria da plataforma Base44, que registrava as visitas de página no
 * painel deles. Fora do Base44 essa API não existe e o registro não teria para
 * onde ir — então a chamada foi removida, e não substituída por um equivalente
 * que não faz nada.
 *
 * O componente foi mantido porque o App.jsx o monta e porque a leitura do nome
 * da página a partir da rota é útil se um dia quisermos registrar navegação de
 * verdade. Se isso acontecer, o destino natural é a entidade LogAuditoria — mas
 * aí com critério, senão a trilha de auditoria vira ruído de navegação.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

import { pagesConfig } from '@/pages.config';

export default function NavigationTracker() {
    const location = useLocation();
    const { isAuthenticated } = useAuth();
    const { Pages, mainPage } = pagesConfig;
    const mainPageKey = mainPage ?? Object.keys(Pages)[0];

    useEffect(() => {
        if (!isAuthenticated) return;

        const pathname = location.pathname;
        let pageName;

        if (pathname === '/' || pathname === '') {
            pageName = mainPageKey;
        } else {
            const pathSegment = pathname.replace(/^\//, '').split('/')[0];
            const matchedKey = Object.keys(Pages).find(
                key => key.toLowerCase() === pathSegment.toLowerCase()
            );
            pageName = matchedKey || null;
        }

        // Sem destino para o registro hoje. pageName fica calculado e disponível
        // para quem for implementar o registro de navegação.
        void pageName;
    }, [location, isAuthenticated, Pages, mainPageKey]);

    return null;
}
