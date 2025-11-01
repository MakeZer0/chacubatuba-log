'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase/client';
import type { Item } from './ItensListaRenderer';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Cores para os gráficos (verde = concluído, vermelho = pendente)
const COLORS_STATUS = ['#059669', '#EF4444']; // emerald-600, red-500
// Paleta de cores para categorias
const COLORS_CATEGORIAS = [
  '#a7f3d0', // emerald-200
  '#bae6fd', // blue-200
  '#fde68a', // yellow-200
  '#fed7aa', // orange-200
  '#fbcfe8', // pink-200
  '#d8b4fe', // purple-200
  '#a5f3fc', // cyan-200
];

export default function DashboardRenderer() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Busca inicial e Realtime
  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('ItensLista').select('*');
      if (error) {
        console.error('Erro ao buscar ItensLista:', error);
        setError('Não foi possível carregar os dados do dashboard.');
      } else {
        setItems(data as Item[]);
      }
      setLoading(false);
    };

    fetchItems();

    // Assinatura Realtime para manter os gráficos vivos
    const channel = supabase
      .channel('public:ItensLista-dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ItensLista' },
        (payload) => {
          // A forma mais simples de manter os stats corretos
          // é recarregar tudo em qualquer mudança.
          fetchItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // --- Processamento de Dados para os Gráficos ---

  // 1. Stats Gerais
  const statsGerais = useMemo(() => {
    const total = items.length;
    const concluidos = items.filter((item) => item.completo).length;
    const pendentes = total - concluidos;
    return {
      total,
      concluidos,
      pendentes,
      dataGrafico: [
        { name: 'Concluídos', value: concluidos },
        { name: 'Pendentes', value: pendentes },
      ],
    };
  }, [items]);

  // 2. Stats por Categoria
  const statsPorCategoria = useMemo(() => {
    const contagem = items.reduce((acc, item) => {
      if (!acc[item.categoria]) {
        acc[item.categoria] = { name: item.categoria, total: 0, pendentes: 0 };
      }
      acc[item.categoria].total += 1;
      if (!item.completo) {
        acc[item.categoria].pendentes += 1;
      }
      return acc;
    }, {} as Record<string, { name: string; total: number; pendentes: number }>);

    return Object.values(contagem).sort((a, b) => b.total - a.total);
  }, [items]);

  // 3. Stats por Responsável
  const statsPorResponsavel = useMemo(() => {
    const contagem = items.reduce((acc, item) => {
      const responsavel = item.responsavel || 'Sem responsável';
      if (!acc[responsavel]) {
        acc[responsavel] = { name: responsavel, total: 0, pendentes: 0 };
      }
      acc[responsavel].total += 1;
      if (!item.completo) {
        acc[responsavel].pendentes += 1;
      }
      return acc;
    }, {} as Record<string, { name: string; total: number; pendentes: number }>);

    return Object.values(contagem).sort((a, b) => b.total - a.total);
  }, [items]);

  // --- Renderização ---

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Card 1: Resumo Geral */}
      <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Resumo Geral</h3>
        <div className="flex justify-around text-center">
          <div>
            <p className="text-3xl font-bold text-emerald-600">
              {statsGerais.total}
            </p>
            <p className="text-sm text-gray-500">Total de Itens</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-red-500">
              {statsGerais.pendentes}
            </p>
            <p className="text-sm text-gray-500">Itens Pendentes</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-700">
              {statsGerais.concluidos}
            </p>
            <p className="text-sm text-gray-500">Itens Concluídos</p>
          </div>
        </div>
      </div>

      {/* Card 2: Gráfico de Pizza (Status) */}
      <div className="bg-white p-6 rounded-xl shadow-lg h-80">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          Status dos Itens
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={statsGerais.dataGrafico}
              cx="50%"
              cy="50%" // Ajustado para centralizar
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }) =>
                `${name} (${(percent * 100).toFixed(0)}%)`
              }
            >
              {statsGerais.dataGrafico.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS_STATUS[index % COLORS_STATUS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Card 3: Gráfico de Barras (Categorias) */}
      <div className="bg-white p-6 rounded-xl shadow-lg h-80">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          Itens por Categoria
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={statsPorCategoria}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={80} />
            <Tooltip />
            <Legend />
            <Bar dataKey="pendentes" name="Pendentes" stackId="a" fill="#EF4444" />
            <Bar dataKey="total" name="Total" fill="#059669" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Card 4: Gráfico de Barras (Responsáveis) */}
      <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-lg h-96">
        <h3 className="text-xl font-bold text-gray-800 mb-4">
          Itens por Responsável
        </h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={statsPorResponsavel}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="pendentes"
              name="Pendentes"
              stackId="a"
              fill="#EF4444"
            />
            <Bar
              dataKey="total"
              name="Total"
              stackId="b"
              fill="#059669"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
