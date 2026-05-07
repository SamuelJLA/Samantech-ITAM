import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { 
  Monitor, Server, Laptop, Router, Printer, 
  Network, Cpu, Box, X, MousePointer2,
  Plus, Minus, Maximize, User, Zap, HardDrive, Terminal, Layers,
  Package 
} from 'lucide-react'
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

const ICON_REPO = {
  pc: Monitor,
  server: Server,
  laptop: Laptop,
  router: Router,
  printer: Printer,
  switch: Network,
  ups: Cpu,
  workstation: Monitor,
  default: Box
}

const MapViewer = ({ companyId }) => {
  const [mapData, setMapData] = useState(null)
  const [assets, setAssets] = useState([])
  const [unplacedAssets, setUnplacedAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [activeAsset, setActiveAsset] = useState(null)

  useEffect(() => {
    loadMapAndAssets()
  }, [companyId])

  const loadMapAndAssets = async () => {
    if (!companyId) return
    setLoading(true)
    
    const { data: map } = await supabase.from('maps_config').select('*').eq('company_id', companyId).single()
    
    const { data: items } = await supabase
      .from('assets')
      .select(`*, tickets(status, priority)`)
      .eq('company_id', companyId)
      .not('x_pos', 'is', null)

    const { data: unplaced } = await supabase
      .from('assets')
      .select('*')
      .eq('company_id', companyId)
      .is('x_pos', null)
      
    setMapData(map)
    setAssets(items || [])
    setUnplacedAssets(unplaced || [])
    setLoading(false)
  }

  const handleMapClick = async (e) => {
    if (!editMode || !selectedAssetId) return

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const { error } = await supabase
      .from('assets')
      .update({ 
        x_pos: x.toFixed(2), 
        y_pos: y.toFixed(2),
        map_id: mapData.id 
      })
      .eq('id', selectedAssetId)

    if (!error) {
      setSelectedAssetId('')
      loadMapAndAssets() 
    }
  }

  const handleRelocate = (asset) => {
    setActiveAsset(null);
    setEditMode(true);
    setSelectedAssetId(asset.id);
  }

  const handleMoveToStock = async (asset) => {
    const { error } = await supabase
      .from('assets')
      .update({ x_pos: null, y_pos: null, map_id: null })
      .eq('id', asset.id)

    if (!error) {
      setActiveAsset(null);
      loadMapAndAssets();
    }
  }

  const getStatusStyle = (asset) => {
    const openTickets = asset.tickets?.filter(t => t.status === 'open') || []
    if (openTickets.some(t => t.priority === 'critical' || t.priority === 'high')) {
      return "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.7)]"
    }
    return openTickets.length > 0 ? "bg-yellow-500" : "bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]"
  }

  if (loading) return <div className="h-full flex items-center justify-center text-blue-400 font-mono italic text-xs uppercase tracking-widest animate-pulse">Sincronizando...</div>
  if (!mapData) return <div className="h-full flex items-center justify-center text-gray-500 italic border-2 border-dashed border-gray-800 rounded-3xl uppercase text-[10px] font-bold">Sin plano configurado</div>

  return (
    <div className="w-full h-full flex flex-col gap-4 relative overflow-hidden">
      
      {/* HEADER DE HERRAMIENTAS - RESPONSIVO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-900/50 p-4 rounded-2xl border border-gray-800 backdrop-blur-md gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => {
              setEditMode(!editMode)
              setSelectedAssetId('')
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black transition-all uppercase tracking-widest ${
              editMode ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <MousePointer2 size={16} /> {editMode ? 'MODO INSTALACIÓN' : 'MODO EXPLORACIÓN'}
          </button>

          {selectedAssetId && (
            <div className="flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 px-3 py-2 rounded-xl animate-pulse">
              <span className="text-[9px] md:text-[10px] font-black text-blue-400 uppercase italic tracking-tighter">
                Ubicando: {assets.find(a => a.id === selectedAssetId)?.name || unplacedAssets.find(a => a.id === selectedAssetId)?.name}
              </span>
            </div>
          )}
        </div>
        <div className="text-left md:text-right w-full md:w-auto border-t md:border-t-0 border-white/5 pt-2 md:pt-0">
          <p className="text-[10px] text-blue-500 font-black uppercase tracking-tighter">SAMANDTECH ITAM</p>
          <p className="text-[8px] text-gray-500 font-bold uppercase">{mapData.name || 'Planta Principal'}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden relative">
        
        {/* 📦 SIDEBAR DE STOCK - RESPONSIVO (Overlay en móvil, fijo en desktop) */}
        {editMode && (
          <div className="absolute inset-y-0 left-0 z-[60] w-64 md:relative md:w-72 bg-gray-900/95 md:bg-gray-900/50 border-r md:border border-gray-800 rounded-r-3xl md:rounded-3xl flex flex-col overflow-hidden animate-in slide-in-from-left duration-300 shadow-2xl backdrop-blur-xl md:backdrop-blur-none">
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-3">
                <Layers size={18} className="text-blue-500" />
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Equipos en Stock</h3>
              </div>
              {/* Botón para cerrar sidebar solo visible en móvil si quieres */}
              <button onClick={() => setEditMode(false)} className="md:hidden text-gray-500"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {unplacedAssets.length > 0 ? (
                unplacedAssets.map(asset => {
                  const Icon = ICON_REPO[asset.category?.toLowerCase()] || ICON_REPO.default
                  const isSelected = selectedAssetId === asset.id
                  return (
                    <button
                      key={asset.id}
                      onClick={() => setSelectedAssetId(isSelected ? '' : asset.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${
                        isSelected 
                          ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-600/20' 
                          : 'bg-black/20 border-white/5 hover:border-blue-500/50 hover:bg-black/40'
                      }`}
                    >
                      <div className={`p-2 rounded-xl ${isSelected ? 'bg-white/20' : 'bg-gray-800 group-hover:bg-blue-500/10'}`}>
                        <Icon size={18} className={isSelected ? 'text-white' : 'text-blue-400'} />
                      </div>
                      <div>
                        <p className={`text-[11px] font-black uppercase tracking-tight ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                          {asset.name}
                        </p>
                        <p className={`text-[9px] font-bold ${isSelected ? 'text-blue-100' : 'text-gray-600'}`}>
                          {asset.category}
                        </p>
                      </div>
                    </button>
                  )
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2 opacity-30">
                  <Box size={40} className="text-gray-500" />
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Sin equipos pendientes</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ÁREA DEL MAPA - OCUPA TODO EL ESPACIO DISPONIBLE */}
        <div className="flex-1 rounded-3xl overflow-hidden border border-gray-800 bg-black/40 relative shadow-inner">
          <TransformWrapper
            initialScale={1}
            minScale={0.2}
            maxScale={4}
            centerOnInit={true}
            doubleClick={{ disabled: true }}
            limitToBounds={false}
            panning={{ velocityDisabled: true }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-50">
                  <button onClick={() => zoomIn(0.2)} className="bg-gray-900/90 border border-gray-700 text-white p-3 rounded-xl hover:bg-blue-600 shadow-2xl backdrop-blur-md active:scale-95 transition-all"><Plus size={20} /></button>
                  <button onClick={() => zoomOut(0.2)} className="bg-gray-900/90 border border-gray-700 text-white p-3 rounded-xl hover:bg-blue-600 shadow-2xl backdrop-blur-md active:scale-95 transition-all"><Minus size={20} /></button>
                  <button onClick={() => resetTransform()} className="bg-gray-900/90 border border-gray-700 text-white p-3 rounded-xl hover:bg-gray-700 shadow-2xl backdrop-blur-md active:scale-95 transition-all"><Maximize size={20} /></button>
                </div>

                <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%" }}>
                  <div className={`relative ${selectedAssetId ? 'cursor-crosshair' : ''}`} onClick={handleMapClick}>
                    <img src={mapData.image_url} className="w-full h-auto min-w-[1000px] md:min-w-[1200px] object-contain opacity-60 pointer-events-none" alt="Plano" />

                    {assets.map((asset) => {
                      const DeviceIcon = ICON_REPO[asset.category?.toLowerCase()] || ICON_REPO.default
                      const isBeingMoved = selectedAssetId === asset.id;

                      return (
                        <div 
                          key={asset.id}
                          className={`absolute group cursor-pointer transition-all ${isBeingMoved ? 'opacity-20 scale-50' : 'opacity-100'}`}
                          style={{ top: `${asset.y_pos}%`, left: `${asset.x_pos}%`, transform: 'translate(-50%, -50%)' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!editMode) setActiveAsset(asset);
                          }}
                        >
                          <div className={`p-1.5 md:p-2 rounded-lg md:rounded-xl border border-white/10 group-hover:scale-125 transition-all ${getStatusStyle(asset)}`}>
                            <DeviceIcon size={14} className="text-white md:w-4 md:h-4" />
                          </div>
                          {/* Tooltip oculto en móvil para no estorbar */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden md:group-hover:block bg-gray-900 border border-gray-700 p-2 rounded-lg shadow-2xl z-40 pointer-events-none min-w-[120px]">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-tighter text-center">{asset.name}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>

          {/* 📑 MODAL FICHA TÉCNICA - RESPONSIVO */}
          {activeAsset && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setActiveAsset(null)}></div>
              <div className="relative bg-gray-900 border border-gray-800 w-[95%] md:w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                
                <div className="p-5 md:p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl ${getStatusStyle(activeAsset)}`}>
                      {React.createElement(ICON_REPO[activeAsset.category?.toLowerCase()] || ICON_REPO.default, { size: 24, className: "text-white" })}
                    </div>
                    <div>
                      <h3 className="text-lg md:text-2xl font-black text-white tracking-tighter italic uppercase">{activeAsset.name}</h3>
                      <p className="text-[8px] md:text-[9px] font-black text-blue-500 uppercase tracking-widest">{activeAsset.category} • {activeAsset.status}</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveAsset(null)} className="text-gray-500 hover:text-white p-2 bg-white/5 rounded-full"><X size={24} /></button>
                </div>

                <div className="p-6 md:p-8 space-y-6 md:space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {/* Grid de Red - Apilable en móvil */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                    <div className="bg-white/5 p-3 md:p-4 rounded-2xl md:rounded-3xl border border-white/5">
                      <p className="text-[8px] font-bold text-gray-500 uppercase mb-1">IP Address</p>
                      <p className="text-xs md:text-sm font-mono text-blue-400 font-bold">{activeAsset.ip_address || '---'}</p>
                    </div>
                    <div className="bg-white/5 p-3 md:p-4 rounded-2xl md:rounded-3xl border border-white/5">
                      <p className="text-[8px] font-bold text-gray-500 uppercase mb-1">MAC Address</p>
                      <p className="text-xs md:text-sm font-mono text-gray-300">{activeAsset.mac_address || '---'}</p>
                    </div>
                    <div className="bg-white/5 p-3 md:p-4 rounded-2xl md:rounded-3xl border border-white/5">
                      <p className="text-[8px] font-bold text-gray-500 uppercase mb-1">Usuario</p>
                      <p className="text-xs md:text-sm text-white font-bold">{activeAsset.last_user || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 px-2 text-purple-500"><Cpu size={16}/><h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hardware</h4></div>
                    <div className="grid grid-cols-2 gap-2 md:gap-3">
                      {activeAsset.specs && Object.entries(activeAsset.specs).map(([key, value]) => (
                        <div key={key} className="flex flex-col md:flex-row justify-between md:items-center bg-black/40 px-4 py-2.5 md:py-3 rounded-xl md:rounded-2xl border border-white/5">
                          <span className="text-[8px] md:text-[10px] font-bold text-purple-400/70 uppercase">{key}</span>
                          <span className="text-[10px] md:text-xs text-gray-300 font-bold italic truncate">{value || 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 px-2 text-yellow-500"><Terminal size={16}/><h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notas Técnicas</h4></div>
                    <div className="bg-yellow-500/5 border border-yellow-500/20 p-4 rounded-2xl md:rounded-3xl text-[11px] md:text-sm text-gray-300 italic">{activeAsset.notes || 'Sin observaciones.'}</div>
                  </div>
                </div>

                <div className="p-5 md:p-6 bg-black/40 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  <button 
                    onClick={() => handleRelocate(activeAsset)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 md:py-4 rounded-2xl md:rounded-3xl text-[9px] md:text-[10px] transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <MousePointer2 size={14}/> Reubicar
                  </button>
                  <button 
                    onClick={() => handleMoveToStock(activeAsset)}
                    className="bg-gray-800 hover:bg-gray-700 text-gray-400 font-black py-3.5 md:py-4 rounded-2xl md:rounded-3xl text-[9px] md:text-[10px] transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Package size={14}/> Mover a Stock
                  </button>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MapViewer