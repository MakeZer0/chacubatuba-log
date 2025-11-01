'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Item } from './ItensListaRenderer'; // Reutiliza o tipo
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  ChartPieIcon,
  ListBulletIcon,
  CheckCircleIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

// Cores para os gráficos (consistentes com o tema)
const COLORS = [
  '#10B981', // emerald-600 (Cardápio)
  '#F59E0B', // amber-500 (Bebidas)
  '#EC4899', // pink-500 (Snacks - ajustado)
  '#F97316', // orange-500 (Jogos)
  '#EAB308', // yellow-500 (Lazer)
  '#06B6D4', // cyan-500 (Limpeza)
  '#64748B', // slate-500 (Pendentes)
];

// Tipos de Stats
type StatsGerais = {
  total: number;
  concluidos: number;
  dataGrafico: { name: string; value: number }[];
};

type StatsResponsaveis = {
  name: string;
  total: number;
  concluidos: number;
};

export default function DashboardRenderer() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ItensLista')
      .select('categoria, completo, responsavel'); // Só busca o que precisa

    if (error) {
      console.error('Erro ao buscar ItensLista:', error);
      setError('Não foi possível carregar os dados do dashboard.');
    } else {
      setItems(data as any[]); // Simplifica o tipo
    }
    setLoading(false);
  };

  // Busca inicial e Realtime (agora escutando 'ItensLista')
  useEffect(() => {
    fetchItems();

    const channel = supabase
      .channel('public:ItensLista:dashboard') // Canal diferente
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ItensLista' },
        (payload) => {
          console.log('Mudança recebida (Dashboard)!', payload);
          // Simplesmente re-busca os dados para manter os gráficos atualizados
          fetchItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Memoiza os cálculos estatísticos
  const statsGerais = useMemo((): StatsGerais => {
    const total = items.length;
    const concluidos = items.filter((item) => item.completo).length;

    const porCategoria = items.reduce(
      (acc, item) => {
        const cat = item.categoria || 'Sem Categoria';
        if (!acc[cat]) {
          acc[cat] = 0;
        }
        acc[cat]++;
        return acc;
      },
      {} as Record<string, number>
    );

    const dataGrafico = Object.keys(porCategoria).map((name) => ({
      name,
      value: porCategoria[name],
    }));

    return { total, concluidos, dataGrafico };
  }, [items]);

  const statsResponsaveis = useMemo((): StatsResponsaveis[] => {
    const porResponsavel = items.reduce(
      (acc, item) => {
        const resp = item.responsavel || 'Ninguém';
        if (resp.trim() === '') return acc; // Ignora responsáveis vazios

        if (!acc[resp]) {
          acc[resp] = { total: 0, concluidos: 0 };
        }
        acc[resp].total++;
        if (item.completo) {
          acc[resp].concluidos++;
        }
        return acc;
      },
      {} as Record<string, { total: number; concluidos: number }>
    );

    return Object.keys(porResponsavel)
      .map((name) => ({
        name,
        total: porResponsavel[name].total,
        concluidos: porResponsavel[name].concluidos,
      }))
      .sort((a, b) => b.total - a.total); // Ordena por quem tem mais itens
  }, [items]);

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg h-full text-center text-gray-500">
        Carregando dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 text-red-700 p-3 rounded-lg text-sm mb-4">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-lg flex items-center">
          <div className="p-3 rounded-full bg-emerald-100 text-emerald-600 mr-4">
            <ListBulletIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Total de Itens</div>
            <div className="text-3xl font-bold text-gray-900">
              {statsGerais.total}
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-lg flex items-center">
          <div className="p-3 rounded-full bg-blue-100 text-blue-600 mr-4">
            <CheckCircleIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Concluídos</div>
            <div className="text-3xl font-bold text-gray-900">
              {statsGerais.concluidos}
            </div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-lg flex items-center">
          <div className="p-3 rounded-full bg-orange-100 text-orange-600 mr-4">
            <UsersIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500">Responsáveis</div>
            <div className="text-3xl font-bold text-gray-900">
              {statsResponsaveis.length}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-5 rounded-xl shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <ChartPieIcon className="h-6 w-6 mr-2 text-gray-500" />
            Itens por Categoria
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={statsGerais.dataGrafico}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  // --- MUDANÇA: 'percent' tipado como 'any' para o build ---
                  label={(props: any) => {
                    const { name, percent } = props;
                    return `${name} (${(percent * 100).toFixed(0)}%)`;
                  }}
                  // --- Fim da Mudança ---
                >
                  {statsGerais.dataGrafico.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <UsersIcon className="h-6 w-6 mr-2 text-gray-500" />
            Itens por Responsável
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart
                data={statsResponsaveis}
                layout="vertical"
                margin={{ left: 10, right: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={80}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip />
                <Legend />
                <Bar dataKey="concluidos" name="Concluídos" fill="#10B981" />
                <Bar
                  dataKey="total"
                  name="Total"
                  fill="#64748B"
                  opacity={0.6}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

