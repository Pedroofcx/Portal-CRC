/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AnalyticsPreditivo from './pages/AnalyticsPreditivo';
import AuditoriaPontuacao from './pages/AuditoriaPontuacao';
import Apuracao from './pages/Apuracao';
import Avisos from './pages/Avisos';
import Cadastro from './pages/Cadastro';
import ComoFunciona from './pages/ComoFunciona';
import ConfigCategoriasTratativa from './pages/ConfigCategoriasTratativa';
import ConfigElegibilidade from './pages/ConfigElegibilidade';
import ConfigEtapasJornada from './pages/ConfigEtapasJornada';
import ConfigMotivosJornada from './pages/ConfigMotivosJornada';
import ConfigPermissoes from './pages/ConfigPermissoes';
import ConfigSkills from './pages/ConfigSkills';
import ConfigTiposObservacao from './pages/ConfigTiposObservacao';
import ConfigTiposTratativa from './pages/ConfigTiposTratativa';
import CicloColaborador from './pages/CicloColaborador';
import Configuracoes from './pages/Configuracoes';
import Dashboard from './pages/Dashboard';
import Escalas from './pages/Escalas';
import GestaoFerias from './pages/GestaoFerias';
import Hansei from './pages/Hansei';
import HomeOfficeEscolha from './pages/HomeOfficeEscolha';
import JornadaCliente from './pages/JornadaCliente';
import MinhaPerformance from './pages/MinhaPerformance';
import Observacoes from './pages/Observacoes';
import Oraculo from './pages/Oraculo';
import PDI from './pages/PDI';
import POP from './pages/POP';
import Pesquisas from './pages/Pesquisas';
import PlanoSetorial from './pages/PlanoSetorial';
import Relatorios from './pages/Relatorios';
import RelatoriosApuracao from './pages/RelatoriosApuracao';
import RelatoriosTratativas from './pages/RelatoriosTratativas';
import TratativaDetalhe from './pages/TratativaDetalhe';
import Tratativas from './pages/Tratativas';
import Turnos from './pages/Turnos';
import Universidade from './pages/Universidade';
import UploadFoto from './pages/UploadFoto';
import FerramentasOperacionais from './pages/FerramentasOperacionais';
import __Layout from './Layout.jsx';

export const PAGES = {
    "AnalyticsPreditivo": AnalyticsPreditivo,
    "AuditoriaPontuacao": AuditoriaPontuacao,
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
    "HomeOfficeEscolha": HomeOfficeEscolha,
    "JornadaCliente": JornadaCliente,
    "MinhaPerformance": MinhaPerformance,
    "Observacoes": Observacoes,
    "Oraculo": Oraculo,
    "PDI": PDI,
    "POP": POP,
    "Pesquisas": Pesquisas,
    "PlanoSetorial": PlanoSetorial,
    "Relatorios": Relatorios,
    "RelatoriosApuracao": RelatoriosApuracao,
    "RelatoriosTratativas": RelatoriosTratativas,
    "TratativaDetalhe": TratativaDetalhe,
    "Tratativas": Tratativas,
    "Turnos": Turnos,
    "Universidade": Universidade,
    "UploadFoto": UploadFoto,
    "FerramentasOperacionais": FerramentasOperacionais,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};