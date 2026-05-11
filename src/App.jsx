import React, { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
// Agregamos GitBranch a los iconos
import { 
  LayoutDashboard, ChevronDown, LogOut, Box, 
  Menu, X as CloseIcon, PieChart, GitBranch 
} from 'lucide-react' 

// Importación de tus componentes
import MapViewer from './components/MapViewer'
import Login from './components/Login'
import Inventory from './components/Inventory'
import Dashboard from './components/Dashboard'
import TopologyMap from './components/TopologyMap'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  
  const [activeTab, setActiveTab] = useState('dashboard') 
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Manejo de Sesión de Supabase
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

  // Cargar empresas al iniciar sesión
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

  // Pantalla de Carga
  if (loading) {
    return (
      <div className="h-screen bg-[#0f1115] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-blue-500 font-black tracking-widest text-[10px] uppercase italic">Iniciando SAMANDTECH...</p>
        </div>
      </div>
    )
  }

  // Gate de Login
  if (!session) return <Login />

  return (
    <div className="h-screen flex bg-[#0f1115] text-white overflow-hidden relative font-sans">
      
      {/* --- CAPA DE CIERRE (Solo Móvil) --- */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[150] lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* --- 2. SIDEBAR (MENÚ LATERAL) --- */}
      <aside className={`
        fixed inset-y-0 left-0 z-[200] w-64 bg-[#0d0f12] border-r border-white/5 flex flex-col p-6 transition-transform duration-300
        lg:relative lg:translate-x-0 
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-xl font-black text-blue-500 italic uppercase tracking-tighter">SAMANDTECH</h1>
          <button onClick={() => setIsMenuOpen(false)} className="lg:hidden text-gray-500"><CloseIcon/></button>
        </div>
        
        <nav className="flex-1 space-y-2">
          {/* BOTÓN: DASHBOARD */}
          <button 
            onClick={() => { setActiveTab('dashboard'); setIsMenuOpen(false); }}
            className={`flex items-center gap-3 w-full p-4 rounded-2xl transition-all ${
              activeTab === 'dashboard' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <PieChart size={20} /> 
            <span className="text-xs font-black uppercase tracking-widest">Dashboard</span>
          </button>

          {/* BOTÓN: MAPA FÍSICO */}
          <button 
            onClick={() => { setActiveTab('map'); setIsMenuOpen(false); }}
            className={`flex items-center gap-3 w-full p-4 rounded-2xl transition-all ${
              activeTab === 'map' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <LayoutDashboard size={20} /> 
            <span className="text-xs font-black uppercase tracking-widest">Mapa Físico</span>
          </button>

          {/* BOTÓN: TOPOLOGÍA (NUEVO) */}
          <button 
            onClick={() => { setActiveTab('topology'); setIsMenuOpen(false); }}
            className={`flex items-center gap-3 w-full p-4 rounded-2xl transition-all ${
              activeTab === 'topology' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <GitBranch size={20} /> 
            <span className="text-xs font-black uppercase tracking-widest">Topología</span>
          </button>

          {/* BOTÓN: INVENTARIO */}
          <button 
            onClick={() => { setActiveTab('inventory'); setIsMenuOpen(false); }}
            className={`flex items-center gap-3 w-full p-4 rounded-2xl transition-all ${
              activeTab === 'inventory' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <Box size={20} /> 
            <span className="text-xs font-black uppercase tracking-widest">Inventario</span>
          </button>
        </nav>

        {/* BOTÓN: SALIR */}
        <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 w-full p-4 mt-auto text-gray-500 hover:text-red-400 transition-colors">
          <LogOut size={20} /> <span className="text-xs font-black uppercase tracking-widest">Cerrar Sesión</span>
        </button>
      </aside>

      {/* --- 3. CONTENIDO PRINCIPAL --- */}
      <main className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
        
        <header className="h-20 border-b border-white/5 flex items-center px-4 lg:px-8 justify-between bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="lg:hidden p-3 bg-gray-800 text-white rounded-2xl active:scale-95 transition-all"
            >
              <Menu size={24} />
            </button>

            <div className="hidden sm:flex items-center gap-3">
              <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Cliente:</span>
              <div className="relative">
                <select 
                  value={selectedCompanyId} 
                  onChange={(e) => setSelectedCompanyId(e.target.value)}
                  className="bg-gray-900 border border-gray-700 text-blue-400 text-[10px] font-black rounded-xl px-4 py-2 outline-none appearance-none pr-10 uppercase tracking-widest cursor-pointer"
                >
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-2.5 text-gray-500 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-gray-900/50 px-4 py-2 rounded-full border border-gray-800">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] text-gray-400 font-black uppercase truncate max-w-[80px] sm:max-w-none tracking-tighter">
                {session.user.email}
              </span>
          </div>
        </header>

        <section className="flex-1 relative overflow-hidden bg-black">
          {selectedCompanyId && (
            <>
              {activeTab === 'dashboard' && (
                <div className="p-4 lg:p-8 h-full overflow-y-auto custom-scrollbar">
                  <Dashboard companyId={selectedCompanyId} />
                </div>
              )}

              {activeTab === 'map' && (
                <MapViewer companyId={selectedCompanyId} session={session} />
              )}

              {/* VISTA DE TOPOLOGÍA */}
              {activeTab === 'topology' && (
                <TopologyMap companyId={selectedCompanyId} session={session} />
              )}

              {activeTab === 'inventory' && (
                <div className="p-4 lg:p-8 h-full overflow-y-auto custom-scrollbar">
                  <Inventory companyId={selectedCompanyId} session={session} />
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  )
}

export default App