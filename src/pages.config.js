/**
 * pages.config.js — registro de rotas do Portal CRC.
 *
 * Cada página é importada com React.lazy: o navegador só baixa o código da
 * tela que a pessoa está abrindo, em vez do app inteiro de uma vez (eram
 * 2,7MB num chunk só, porque as 38 páginas vinham todas no import inicial).
 * App.jsx envolve as rotas num <Suspense>, então a troca é transparente —
 * só aparece o spinner de carregamento durante o download do pedaço.
 *
 * mainPage controla qual tela abre em "/".
 */
import { lazy } from 'react';
import { redirecionarPara } from './components/relatorios/hub/Redirecionar';
import { redirecionarParaPagina } from './components/ui/RedirecionarPagina';
import __Layout from './Layout.jsx';

const AuditoriaPontuacao = lazy(() => import('./pages/AuditoriaPontuacao'));
const SolucoesReplicaveis = lazy(() => import('./pages/SolucoesReplicaveis'));
const Apuracao = lazy(() => import('./pages/Apuracao'));
const Avisos = lazy(() => import('./pages/Avisos'));
const Cadastro = lazy(() => import('./pages/Cadastro'));
const ComoFunciona = lazy(() => import('./pages/ComoFunciona'));
const ConfigCategoriasTratativa = lazy(() => import('./pages/ConfigCategoriasTratativa'));
const ConfigElegibilidade = lazy(() => import('./pages/ConfigElegibilidade'));
const ConfigEtapasJornada = lazy(() => import('./pages/ConfigEtapasJornada'));
const ConfigMotivosJornada = lazy(() => import('./pages/ConfigMotivosJornada'));
const ConfigPermissoes = lazy(() => import('./pages/ConfigPermissoes'));
const ConfigSkills = lazy(() => import('./pages/ConfigSkills'));
const ConfigTiposObservacao = lazy(() => import('./pages/ConfigTiposObservacao'));
const ConfigTiposTratativa = lazy(() => import('./pages/ConfigTiposTratativa'));
const CicloColaborador = lazy(() => import('./pages/CicloColaborador'));
const Configuracoes = lazy(() => import('./pages/Configuracoes'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Escalas = lazy(() => import('./pages/Escalas'));
const GestaoFerias = lazy(() => import('./pages/GestaoFerias'));
const Hansei = lazy(() => import('./pages/Hansei'));
const JornadaCliente = lazy(() => import('./pages/JornadaCliente'));
const MinhaAgenda = lazy(() => import('./pages/MinhaAgenda'));
const MinhaPerformance = lazy(() => import('./pages/MinhaPerformance'));
const Observacoes = lazy(() => import('./pages/Observacoes'));
const Oraculo = lazy(() => import('./pages/Oraculo'));
const PDI = lazy(() => import('./pages/PDI'));
const POP = lazy(() => import('./pages/POP'));
const Pesquisas = lazy(() => import('./pages/Pesquisas'));
const PlanoSetorial = lazy(() => import('./pages/PlanoSetorial'));
const Relatorios = lazy(() => import('./pages/Relatorios'));
const RelatoriosApuracao = lazy(() => import('./pages/RelatoriosApuracao'));
const TratativaDetalhe = lazy(() => import('./pages/TratativaDetalhe'));
const Tratativas = lazy(() => import('./pages/Tratativas'));
const UploadFoto = lazy(() => import('./pages/UploadFoto'));
const FerramentasOperacionais = lazy(() => import('./pages/FerramentasOperacionais'));

export const PAGES = {
    "AnalyticsPreditivo": redirecionarPara('operacao'),
    "AuditoriaPontuacao": AuditoriaPontuacao,
    "SolucoesReplicaveis": SolucoesReplicaveis,
    "Apuracao": Apuracao,
    "Avisos": Avisos,
    "Cadastro": Cadastro,
    "ComoFunciona": ComoFunciona,
    "ConfigCategoriasTratativa": ConfigCategoriasTratativa,
    "ConfigElegibilidade": ConfigElegibilidade,
    "ConfigEtapasJornada": ConfigEtapasJornada,
    "ConfigMotivosJornada": ConfigMotivosJornada,
    "ConfigPermissoes": ConfigPermissoes,
    "ConfigSkills": ConfigSkills,
    "ConfigTiposObservacao": ConfigTiposObservacao,
    "ConfigTiposTratativa": ConfigTiposTratativa,
    "CicloColaborador": CicloColaborador,
    "Configuracoes": Configuracoes,
    "Dashboard": Dashboard,
    "Escalas": Escalas,
    "GestaoFerias": GestaoFerias,
    "Hansei": Hansei,
    "JornadaCliente": JornadaCliente,
    "MinhaAgenda": MinhaAgenda,
    "MinhaPerformance": MinhaPerformance,
    "Observacoes": Observacoes,
    "Oraculo": Oraculo,
    "PDI": PDI,
    "POP": POP,
    "Pesquisas": Pesquisas,
    "PlanoSetorial": PlanoSetorial,
    "Relatorios": Relatorios,
    "RelatoriosApuracao": RelatoriosApuracao,
    "RelatoriosTratativas": redirecionarPara('canais'),
    "TratativaDetalhe": TratativaDetalhe,
    "Tratativas": Tratativas,
    "Turnos": redirecionarParaPagina('Escalas'),
    "UploadFoto": UploadFoto,
    "FerramentasOperacionais": FerramentasOperacionais,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
