import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { 
  Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts'
import { 
  Package, AlertCircle, CheckCircle2, 
  Monitor, Cpu, Database, Layout 
} from 'lucide-react'

// Actualizamos los colores: Azul principal, Gris Stock, Azul claro, Verde Operativo, etc.
const COLORS = ['#2563eb', '#9ca3af', '#60a5fa', '#22c55e', '#3b82f6'];

export default function Dashboard({ companyId }) {
  const [stats, setStats] = useState({
    total: 0,
    inStock: 0,
    operational: 0,
    alerts: 0
  })
  const [categoryData, setCategoryData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (companyId) fetchDashboardData()
  }, [companyId])

  const fetchDashboardData = async () => {
    setLoading(true)
    
    const { data: assets, error } = await supabase
      .from('assets')
      .select('*, tickets(status, priority)')
      .eq('company_id', companyId)

    if (!error && assets) {
      const total = assets.length
      const inStock = assets.filter(a => a.status === 'en_stock').length
      const operational = assets.filter(a => a.status === 'disponible').length
      
      const alerts = assets.filter(a => 
        a.tickets?.some(t => t.status === 'open' && (t.priority === 'critical' || t.priority === 'high'))
      ).length

      setStats({ total, inStock, operational, alerts })

      // Procesar Datos para Gráfico de Categorías
      const categories = assets.reduce((acc, curr) => {
        acc[curr.category] = (acc[curr.category] || 0) + 1
        return acc
      }, {})
      setCategoryData(Object.keys(categories).map(key => ({ name: key, value: categories[key] })))
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

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center animate-pulse">
      <div className="h-12 w-12 border-t-2 border-blue-500 rounded-full animate-spin mb-4"></div>
      <span className="text-blue-500 font-black italic uppercase tracking-widest text-[10px]">Sincronizando Inteligencia...</span>
    </div>
  )

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* SECCIÓN 1: BIG NUMBERS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Activos" value={stats.total} icon={Package} color="text-blue-500" />
        <StatCard title="En Stock" value={stats.inStock} icon={Database} color="text-gray-400" />
        <StatCard title="Operativos" value={stats.operational} icon={CheckCircle2} color="text-green-500" />
        <StatCard title="Alertas Críticas" value={stats.alerts} icon={AlertCircle} color="text-red-500" />
      </div>

      {/* SECCIÓN 2: GRÁFICOS Y UTILIDAD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Gráfico de Distribución por Categoría (Ahora más ancho para balancear) */}
        <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 p-8 rounded-[2.5rem] shadow-2xl h-[450px] flex flex-col">
          <div className="flex items-center gap-3 mb-8">
            <Monitor className="text-blue-500" size={20} />
            <h3 className="text-xs font-black text-white uppercase tracking-widest italic">Análisis de Distribución Hardware</h3>
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
                  contentStyle={{ backgroundColor: '#0f1115', borderRadius: '1rem', border: '1px solid #1f2937', color: '#fff' }}
                  itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ESPACIO RESERVADO PARA MESA DE TRABAJO / ACTIVIDAD */}
        <div className="bg-gradient-to-b from-gray-900/50 to-black/20 border border-dashed border-gray-800 p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-center group">
          <div className="bg-blue-600/10 p-5 rounded-[2rem] mb-4 group-hover:scale-110 transition-transform duration-300">
            <Layout className="text-blue-500/50" size={32} />
          </div>
          <h4 className="text-white font-black italic uppercase text-[10px] tracking-widest mb-2">Módulo en Desarrollo</h4>
          <p className="text-gray-600 text-[9px] font-bold leading-relaxed uppercase tracking-tighter">
            Espacio reservado para <br/> Mapa Topológico o <br/> Feed de Actividad Reciente.
          </p>
        </div>

      </div>

      {/* SECCIÓN 3: RESUMEN DE CAPACIDAD */}
      <div className="bg-blue-600/10 border border-blue-500/20 p-8 rounded-[2.5rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
            <Cpu size={120} className="text-blue-500" />
        </div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-600/40">
            <Cpu className="text-white" size={24} />
          </div>
          <div>
            <h4 className="text-white font-black italic uppercase tracking-tighter text-lg">Reporte de Capacidad SamandTech</h4>
            <p className="text-blue-300/70 text-xs font-bold leading-relaxed">
              Actualmente gestionas <span className="text-white">{stats.total} activos</span>. 
              El {((stats.operational / stats.total) * 100).toFixed(1)}% de la infraestructura se encuentra en producción. 
              {stats.inStock > 0 && ` Tienes ${stats.inStock} unidades en reserva técnica.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}