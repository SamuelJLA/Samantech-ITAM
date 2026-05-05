import React, { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
// Añadimos 'Box' para el icono de inventario
import { LayoutDashboard, ChevronDown, LogOut, Box } from 'lucide-react' 
import MapViewer from './components/MapViewer'
import Login from './components/Login'
import Inventory from './components/Inventory' // <--- 1. IMPORTAMOS EL NUEVO COMPONENTE

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  
  // 2. ESTADO PARA LA NAVEGACIÓN (Por defecto el mapa)
  const [activeTab, setActiveTab] = useState('map') 

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) fetchCompanies()
  }, [session])

  const fetchCompanies = async () => {
    const { data, error } = await supabase.from('companies').select('*').order('name')
    if (!error && data) {
      setCompanies(data)
      setSelectedCompanyId(data[0]?.id || '')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="h-screen bg-[#0f1115] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-blue-500 font-bold tracking-widest text-xs uppercase">Iniciando SAMANDTECH...</p>
        </div>
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <div className="h-screen flex bg-[#0f1115] text-white overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-gray-800 flex flex-col p-6 bg-black/20">
        <h1 className="text-xl font-bold text-blue-500 mb-10 tracking-tighter">SAMANDTECH</h1>
        
        <nav className="flex-1 space-y-2">
          {/* BOTÓN MAPA */}
          <button 
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all ${
              activeTab === 'map' ? 'bg-blue-500/10 text-blue-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <LayoutDashboard size={20} /> 
            <span className="text-sm font-medium">Panel Maestro</span>
          </button>

          {/* BOTÓN INVENTARIO (NUEVO) */}
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-3 w-full p-3 rounded-lg transition-all ${
              activeTab === 'inventory' ? 'bg-blue-500/10 text-blue-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <Box size={20} /> 
            <span className="text-sm font-medium">Gestión de Activos</span>
          </button>
        </nav>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 w-full p-3 mt-auto text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all duration-200"
        >
          <LogOut size={20} /> 
          <span className="text-sm font-medium">Finalizar Sesión</span>
        </button>
      </aside>

      <main className="flex-1 flex flex-col">
        {/* HEADER */}
        <header className="h-16 border-b border-gray-800 flex items-center px-8 justify-between bg-black/10">
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Cliente:</span>
            <div className="relative">
              <select 
                value={selectedCompanyId} 
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="bg-gray-900 border border-gray-700 text-blue-400 text-xs font-bold rounded-lg px-3 py-1.5 appearance-none pr-8 cursor-pointer focus:border-blue-500 outline-none"
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2 top-2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-gray-900/50 px-3 py-1.5 rounded-full border border-gray-800">
             <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
             <span className="text-[10px] text-gray-400 font-bold">{session.user.email}</span>
          </div>
        </header>

        {/* CONTENIDO DINÁMICO (3. AQUÍ HACEMOS EL SUICHE) */}
        <section className="flex-1 p-8 overflow-y-auto">
          {selectedCompanyId && (
            activeTab === 'map' 
              ? <MapViewer companyId={selectedCompanyId} /> 
              : <Inventory companyId={selectedCompanyId} />
          )}
        </section>
      </main>
    </div>
  )
}

export default App