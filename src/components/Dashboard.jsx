import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts'
import { 
  Package, MapPin, AlertCircle, CheckCircle2, 
  TrendingUp, Monitor, Cpu, Database 
} from 'lucide-react'

const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

export default function Dashboard({ companyId }) {
  const [stats, setStats] = useState({
    total: 0,
    inStock: 0,
    operational: 0,
    alerts: 0
  })
  const [categoryData, setCategoryData] = useState([])
  const [statusData, setStatusData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (companyId) fetchDashboardData()
  }, [companyId])

  const fetchDashboardData = async () => {
    setLoading(true)
    
    // Traemos todos los activos de la empresa
    const { data: assets, error } = await supabase
      .from('assets')
      .select('*, tickets(status, priority)')
      .eq('company_id', companyId)

    if (!error && assets) {
      // 1. Cálculos de KPIs
      const total = assets.length
      const inStock = assets.filter(a => !a.x_pos).length
      const operational = assets.filter(a => a.status === 'disponible' || a.status === 'operativo').length
      const alerts = assets.filter(a => 
        a.tickets?.some(t => t.status === 'open' && (t.priority === 'critical' || t.priority === 'high'))
      ).length

      setStats({ total, inStock, operational, alerts })

      // 2. Procesar Datos para Gráfico de Categorías
      const categories = assets.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + 1
        return acc
      }, {})
      setCategoryData(Object.keys(categories).map(key => ({ name: key, value: categories[key] })))

      // 3. Procesar Datos para Gráfico de Estatus
      const statuses = assets.reduce((acc, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1
        return acc
      }, {})
      setStatusData(Object.keys(statuses).map(key => ({ name: key, count: statuses[key] })))
    }
    setLoading(false)
  }

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-[2rem] flex items-center justify-between shadow-xl">
      <div>
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1">{title}</p>
        <h3 className="text-3xl font-black text-white italic tracking-tighter">{value}</h3>
      </div>
      <div className={`p-4 rounded-2xl bg-black/40 border border-white/5 ${color}`}>
        <Icon size={24} />
      </div>
    </div>
  )

  if (loading) return <div className="h-full flex items-center justify-center animate-pulse text-blue-500 font-black italic uppercase tracking-widest">Cargando Inteligencia...</div>

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* SECCIÓN 1: BIG NUMBERS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Activos" value={stats.total} icon={Package} color="text-blue-500" />
        <StatCard title="En Stock" value={stats.inStock} icon={Database} color="text-purple-500" />
        <StatCard title="Operativos" value={stats.operational} icon={CheckCircle2} color="text-green-500" />
        <StatCard title="Alertas Críticas" value={stats.alerts} icon={AlertCircle} color="text-red-500" />
      </div>

      {/* SECCIÓN 2: GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Gráfico de Distribución por Categoría */}
        <div className="bg-gray-900/50 border border-gray-800 p-8 rounded-[2.5rem] shadow-2xl h-[450px] flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <Monitor className="text-blue-500" size={20} />
            <h3 className="text-xs font-black text-white uppercase tracking-widest italic">Distribución de Hardware</h3>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f1115', borderRadius: '1rem', border: '1px solid #1f2937' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de Estatus del Sistema */}
        <div className="bg-gray-900/50 border border-gray-800 p-8 rounded-[2.5rem] shadow-2xl h-[450px] flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <TrendingUp className="text-green-500" size={20} />
            <h3 className="text-xs font-black text-white uppercase tracking-widest italic">Estado de Salud del Parque IT</h3>
          </div>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis 
                    dataKey="name" 
                    stroke="#4b5563" 
                    fontSize={10} 
                    fontWeight="bold" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#9ca3af' }}
                />
                <YAxis stroke="#4b5563" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#0f1115', borderRadius: '1rem', border: '1px solid #1f2937' }}
                />
                <Bar dataKey="count" fill="#2563eb" radius={[10, 10, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* SECCIÓN 3: NOTAS O ALERTAS RÁPIDAS */}
      <div className="bg-blue-600/10 border border-blue-500/20 p-8 rounded-[2.5rem]">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-2xl">
            <Cpu className="text-white" size={24} />
          </div>
          <div>
            <h4 className="text-white font-black italic uppercase tracking-tighter">Resumen de Capacidad</h4>
            <p className="text-blue-300/70 text-xs font-bold leading-relaxed">
              Actualmente tienes <span className="text-white">{stats.total} equipos</span> bajo gestión. 
              El {((stats.operational / stats.total) * 100).toFixed(1)}% de tu infraestructura está operativa. 
              {stats.inStock > 0 && ` Tienes ${stats.inStock} equipos esperando ser instalados en el mapa.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}