import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import PageHeader from '@/components/ui/PageHeader';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import StatCard from '@/components/ui/StatCard';
import FluxoJornadaVisual from '@/components/jornada/FluxoJornadaVisual';
import RelatorioImpactoFinanceiro from '@/components/jornada/RelatorioImpactoFinanceiro';
import MatrizEsforcoImpacto from '@/components/jornada/MatrizEsforcoImpacto';
import SalariosColaboradoresJornada from '@/components/jornada/SalariosColaboradoresJornada';
import PerfilComercialClienteAgregado from '@/components/jornada/PerfilComercialClienteAgregado';
import FiltroPeriodoJornada from '@/components/jornada/FiltroPeriodoJornada';
import ConfigFinanceiraJornada, { getConfigValor } from '@/components/jornada/ConfigFinanceiraJornada';
import GraficoBenchmarkingJornada from '@/components/jornada/GraficoBenchmarkingJornada';
import ResumoIAEtapa from '@/components/jornada/ResumoIAEtapa';
import InteligenciaFinanceiraJornada from '@/components/jornada/InteligenciaFinanceiraJornada';
import { PARAMETROS_PADRAO } from '@/components/jornada/inteligenciaFinanceira';
import { calcularRangePeriodo, dataDentroDoRange } from '@/components/utils/periodoJornada';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { FileBarChart } from 'lucide-react';
import { 
  Map, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  Target,
  Download,
  Filter,
  GitBranch,
  RefreshCw,
  Database,
  DollarSign,
  BarChart3,
  Brain
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function JornadaCliente() {
  const [visualizacao, setVisualizacao] = useState('fluxo');
  const [tipoPeriodo, setTipoPeriodo] = useState('mes_atual');
  const [customInicio, setCustomInicio] = useState('');
  const [customFim, setCustomFim] = useState('');
  const queryClient = useQueryClient();