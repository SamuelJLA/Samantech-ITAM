import React, { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
// Importamos 'Menu' para el botón de hamburguesa
import { LayoutDashboard, ChevronDown, LogOut, Box, Menu, X as CloseIcon } from 'lucide-react' 
import MapViewer from './components/MapViewer'
import Login from './components/Login'
import Inventory from './components/Inventory'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [activeTab, setActiveTab] = useState('map') 
  
  // --- NUEVO ESTADO: CONTROL DEL MENÚ MÓVIL ---
  const [isMenuOpen, setIsMenuOpen] = useState(false)

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
      <div className="h-screen bg-[#0f1115] flex items-center justify-center text-center">
         <div>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4 mx-auto"></div>
          <p className="text-blue-500 font-black tracking-widest text-xs uppercase italic">Sincronizando SAMANDTECH...</p>
        </div>
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <div className="h-screen flex bg-[#0f1115] text-white overflow-hidden relative">
      
      {/* 1. OVERLAY (Capa oscura al abrir menú en móvil) */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* 2. SIDEBAR RESPONSIVO */}
      <aside className={`
        fixed inset-y-0 left-0 z-[100] w-64 bg-[#0f1115] border-r border-gray-800 flex flex-col p-6 transition-transform duration-300
        md:relative md:translate-x-0 
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-xl font-black text-blue-500 tracking-tighter italic uppercase">SAMANDTECH</h1>
          {/* Botón para cerrar en móvil */}
          <button onClick={() => setIsMenuOpen(false)} className="md:hidden text-gray-500 hover:text-white">
            <CloseIcon size={24} />
          </button>
        </div>
        
        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => { setActiveTab('map'); setIsMenuOpen(false); }}
            className={`flex items-center gap-3 w-full p-4 rounded-2xl transition-all ${
              activeTab === 'map' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <LayoutDashboard size={20} /> 
            <span className="text-xs font-black uppercase tracking-widest">Panel Maestro</span>
          </button>

          <button 
            onClick={() => { setActiveTab('inventory'); setIsMenuOpen(false); }}
            className={`flex items-center gap-3 w-full p-4 rounded-2xl transition-all ${
              activeTab === 'inventory' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <Box size={20} /> 
            <span className="text-xs font-black uppercase tracking-widest">Gestión Activos</span>
          </button>
        </nav>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 w-full p-4 mt-auto text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-2xl transition-all duration-200"
        >
          <LogOut size={20} /> 
          <span className="text-xs font-black uppercase tracking-widest">Salir</span>
        </button>
      </aside>

      {/* 3. ÁREA PRINCIPAL */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 border-b border-gray-800 flex items-center px-4 md:px-8 justify-between bg-black/10 backdrop-blur-md">
          <div className="flex items-center gap-4">
            {/* BOTÓN HAMBURGUESA (Solo visible en móvil) */}
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="md:hidden p-2 bg-gray-800 text-white rounded-xl hover:bg-blue-600 transition-all"
            >
              <Menu size={20} />
            </button>

            <div className="hidden sm:flex items-center gap-3">
              <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Cliente:</span>
              <div className="relative">
                <select 
                  value={selectedCompanyId} 
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="bg-gray-900 border border-gray-700 text-blue-400 text-[10px] font-black rounded-xl px-4 py-2 appearance-none pr-10 cursor-pointer focus:border-blue-500 outline-none uppercase tracking-widest"
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-2.5 text-gray-500 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-gray-900/50 px-4 py-2 rounded-full border border-gray-800">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] md:text-[10px] text-gray-400 font-black uppercase tracking-tighter truncate max-w-[100px] md:max-w-none">
                {session.user.email}
              </span>
          </div>
        </header>

        {/* CONTENIDO DINÁMICO */}
        <section className="flex-1 overflow-hidden">
          {selectedCompanyId && (
            activeTab === 'map' 
              ? <MapViewer companyId={selectedCompanyId} /> 
              : <div className="p-4 md:p-8 h-full overflow-y-auto"><Inventory companyId={selectedCompanyId} /></div>
          )}
        </section>
      </main>
    </div>
  )
}

export default App