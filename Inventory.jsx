import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { 
  Plus, Package, Network, Cpu, FileText, X, 
  Save, Pencil, Trash2, Search, AlertTriangle, CheckCircle2 
} from 'lucide-react'

export default function Inventory({ companyId }) {
  const [assets, setAssets] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingAssetId, setEditingAssetId] = useState(null)
  
  // ESTADOS PARA UI PERSONALIZADA
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, name: '' })
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })

  // ESTADO COMPLETO DEL ACTIVO (Hardware incluido)
  const [newAsset, setNewAsset] = useState({
    name: '', category: 'Workstation', serial_number: '',
    last_user: '', ip_address: '', mac_address: '', notes: '',
    cpu: '', ram: '', storage: '', os: ''
  })

  useEffect(() => {
    if (companyId) fetchAssets()
  }, [companyId])

  const fetchAssets = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('assets')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    setAssets(data || [])
    setLoading(false)
  }

  const showToast = (message, type = 'success') => {
    setNotification({ show: true, message, type })
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000)
  }

  const filteredAssets = assets.filter(asset => {
    const query = searchQuery.toLowerCase()
    return (
      asset.name?.toLowerCase().includes(query) ||
      asset.serial_number?.toLowerCase().includes(query) ||
      asset.ip_address?.toLowerCase().includes(query) ||
      asset.last_user?.toLowerCase().includes(query)
    )
  })

  const handleEdit = (asset) => {
    setEditingAssetId(asset.id)
    setNewAsset({
      name: asset.name || '',
      category: asset.category || 'Workstation',
      serial_number: asset.serial_number || '',
      last_user: asset.last_user || '',
      ip_address: asset.ip_address || '',
      mac_address: asset.mac_address || '',
      notes: asset.notes || '',
      cpu: asset.specs?.cpu || '',
      ram: asset.specs?.ram || '',
      storage: asset.specs?.storage || '',
      os: asset.specs?.os || ''
    })
    setIsModalOpen(true)
  }

  const confirmDelete = async () => {
    const { error } = await supabase.from('assets').delete().eq('id', deleteConfirm.id)
    if (!error) {
      showToast(`Equipo "${deleteConfirm.name}" eliminado`, 'success')
      fetchAssets()
    } else {
      showToast("Error al eliminar", 'error')
    }
    setDeleteConfirm({ isOpen: false, id: null, name: '' })
  }

  const handleSaveAsset = async (e) => {
    e.preventDefault()
    const assetData = {
      name: newAsset.name,
      category: newAsset.category,
      serial_number: newAsset.serial_number || null,
      last_user: newAsset.last_user,
      ip_address: newAsset.ip_address,
      mac_address: newAsset.mac_address,
      notes: newAsset.notes,
      company_id: companyId,
      specs: { 
        cpu: newAsset.cpu, 
        ram: newAsset.ram, 
        storage: newAsset.storage, 
        os: newAsset.os 
      }
    }

    let error;
    if (editingAssetId) {
      const { error: updateError } = await supabase.from('assets').update(assetData).eq('id', editingAssetId)
      error = updateError
    } else {
      const { error: insertError } = await supabase.from('assets').insert([{ ...assetData, status: 'disponible' }])
      error = insertError
    }

    if (!error) {
      showToast(editingAssetId ? "Cambios sincronizados" : "Activo registrado")
      closeModal()
      fetchAssets()
    } else {
      showToast("Error en la DB: " + error.message, 'error')
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingAssetId(null)
    setNewAsset({
      name: '', category: 'Workstation', serial_number: '', 
      last_user: '', ip_address: '', mac_address: '', notes: '',
      cpu: '', ram: '', storage: '', os: ''
    })
  }

  return (
    <div className="p-8 space-y-6 relative min-h-screen">
      
      {/* 🔔 TOAST NOTIFICATION */}
      {notification.show && (
        <div className="fixed top-8 right-8 z-[300] animate-in slide-in-from-right-10 duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl ${
            notification.type === 'success' 
              ? 'bg-green-500/10 border-green-500/20 text-green-400' 
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}>
            <CheckCircle2 size={20} />
            <span className="text-xs font-black uppercase tracking-widest">{notification.message}</span>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-white tracking-tighter italic uppercase">Gestión de Inventario</h1>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
            <span className="h-1 w-1 bg-blue-500 rounded-full animate-pulse"></span> SamandTech ITAM Pro
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center gap-2"
        >
          <Plus size={18} /> Nuevo Activo
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="relative group max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
        <input 
          type="text"
          placeholder="Buscar equipo, IP, serial o usuario..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-900/50 border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-white text-xs outline-none focus:border-blue-500 transition-all placeholder:text-gray-600 font-bold"
        />
      </div>

      {/* TABLA DE ACTIVOS */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-[2.5rem] overflow-x-auto shadow-2xl">
        <table className="w-full text-left text-[11px] min-w-[800px]">
          <thead>
            <tr className="border-b border-gray-800 bg-black/40 text-gray-400 uppercase font-black tracking-widest">
              <th className="p-6">Nombre / Serial</th>
              <th className="p-6">Categoría</th>
              <th className="p-6">IP / MAC</th>
              <th className="p-6">Usuario</th>
              <th className="p-6 text-center">Estatus</th>
              <th className="p-6 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {filteredAssets.map(asset => (
              <tr key={asset.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="p-6">
                  <p className="text-white font-black uppercase tracking-tight">{asset.name}</p>
                  <p className="text-[9px] text-gray-500 font-mono">{asset.serial_number || 'N/A'}</p>
                </td>
                <td className="p-6 text-blue-400 font-black uppercase italic">{asset.category}</td>
                <td className="p-6">
                  <p className="text-gray-300 font-mono font-bold">{asset.ip_address || '---'}</p>
                  <p className="text-[9px] text-gray-600 font-mono">{asset.mac_address || '---'}</p>
                </td>
                <td className="p-6 text-gray-300 font-bold">{asset.last_user || '---'}</td>
                <td className="p-6 text-center">
                  <span className="bg-green-500/10 text-green-500 px-3 py-1 rounded-full font-black text-[9px] uppercase border border-green-500/10">
                    {asset.status}
                  </span>
                </td>
                <td className="p-6">
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => handleEdit(asset)} className="p-2.5 bg-gray-800 text-gray-400 hover:text-white hover:bg-blue-600 rounded-xl transition-all active:scale-90 shadow-lg">
                      <Pencil size={14} />
                    </button>
                    <button 
                      onClick={() => setDeleteConfirm({ isOpen: true, id: asset.id, name: asset.name })}
                      className="p-2.5 bg-gray-800 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-90"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ⚠️ MODAL DE BORRADO CUSTOM */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}></div>
          <div className="relative bg-gray-900 border border-red-500/20 w-full max-w-sm rounded-[3rem] shadow-2xl p-10 text-center animate-in zoom-in-95 duration-200">
            <div className="bg-red-500/10 w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-inner">
              <AlertTriangle className="text-red-500" size={40} />
            </div>
            <h3 className="text-white text-xl font-black italic uppercase tracking-tighter mb-2">¿Eliminar Equipo?</h3>
            <p className="text-gray-500 text-xs leading-relaxed mb-10">
              Vas a eliminar a <span className="text-red-400 font-bold">{deleteConfirm.name}</span>. Esta acción no se puede revertir.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })} className="bg-gray-800 text-gray-400 font-black py-4 rounded-2xl hover:bg-gray-700 transition-all text-[10px] uppercase tracking-widest">Volver</button>
              <button onClick={confirmDelete} className="bg-red-600 text-white font-black py-4 rounded-2xl hover:bg-red-500 transition-all text-[10px] uppercase tracking-widest shadow-xl shadow-red-600/20">Sí, Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* 🖥️ MODAL DE REGISTRO / EDICIÓN (HARDWARE COMPLETO) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={closeModal}></div>
          <form 
            onSubmit={handleSaveAsset}
            className="relative bg-gray-900 border border-gray-800 w-[95%] md:w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/20">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-600/30"><Package className="text-white" size={24} /></div>
                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                  {editingAssetId ? 'Actualizar Sistema' : 'Nuevo Registro IT'}
                </h2>
              </div>
              <button type="button" onClick={closeModal} className="text-gray-500 hover:text-white p-2 bg-white/5 rounded-full"><X size={24} /></button>
            </div>

            {/* Modal Body */}
            <div className="p-10 max-h-[70vh] overflow-y-auto space-y-10 custom-scrollbar">
              
              {/* Bloque 1: General */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 text-blue-500 px-2"><FileText size={16} /> <span className="text-[10px] font-black uppercase tracking-[0.2em]">General</span></div>
                <div className="grid grid-cols-2 gap-5">
                  <input required className="bg-black/50 border border-gray-800 rounded-2xl p-4 text-white text-xs outline-none focus:border-blue-500 transition-all font-bold" placeholder="Nombre (Ej: PIZ-WRK-01)" value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} />
                  <select className="bg-black/50 border border-gray-800 rounded-2xl p-4 text-white text-xs outline-none focus:border-blue-500 font-bold" value={newAsset.category} onChange={e => setNewAsset({...newAsset, category: e.target.value})}>
                    <option value="Workstation">PC Escritorio</option>
                    <option value="Server">Servidor</option>
                    <option value="Laptop">Laptop</option>
                    <option value="Switch">Switch / Router</option>
                    <option value="UPS">UPS / Energía</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <input className="bg-black/50 border border-gray-800 rounded-2xl p-4 text-white text-xs outline-none focus:border-blue-500 font-mono" placeholder="Serial Number" value={newAsset.serial_number} onChange={e => setNewAsset({...newAsset, serial_number: e.target.value})} />
                  <input className="bg-black/50 border border-gray-800 rounded-2xl p-4 text-white text-xs outline-none focus:border-blue-500 font-bold" placeholder="Usuario Actual" value={newAsset.last_user} onChange={e => setNewAsset({...newAsset, last_user: e.target.value})} />
                </div>
              </div>

              {/* Bloque 2: Red */}
              <div className="space-y-5 pt-6 border-t border-white/5">
                <div className="flex items-center gap-2 text-green-500 px-2"><Network size={16} /> <span className="text-[10px] font-black uppercase tracking-[0.2em]">Conectividad</span></div>
                <div className="grid grid-cols-2 gap-5">
                  <input className="bg-black/50 border border-gray-800 rounded-2xl p-4 text-white text-xs outline-none focus:border-green-500 font-mono" placeholder="IP Address" value={newAsset.ip_address} onChange={e => setNewAsset({...newAsset, ip_address: e.target.value})} />
                  <input className="bg-black/50 border border-gray-800 rounded-2xl p-4 text-white text-xs outline-none focus:border-green-500 font-mono uppercase" placeholder="MAC Address" value={newAsset.mac_address} onChange={e => setNewAsset({...newAsset, mac_address: e.target.value})} />
                </div>
              </div>

              {/* Bloque 3: Hardware (ESTO FALTABA) */}
              <div className="space-y-5 pt-6 border-t border-white/5">
                <div className="flex items-center gap-2 text-purple-500 px-2"><Cpu size={16} /> <span className="text-[10px] font-black uppercase tracking-[0.2em]">Hardware & OS</span></div>
                <div className="grid grid-cols-2 gap-5">
                  <input className="bg-black/50 border border-gray-800 rounded-2xl p-4 text-white text-xs outline-none focus:border-purple-500" placeholder="Procesador (CPU)" value={newAsset.cpu} onChange={e => setNewAsset({...newAsset, cpu: e.target.value})} />
                  <input className="bg-black/50 border border-gray-800 rounded-2xl p-4 text-white text-xs outline-none focus:border-purple-500" placeholder="Memoria RAM" value={newAsset.ram} onChange={e => setNewAsset({...newAsset, ram: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <input className="bg-black/50 border border-gray-800 rounded-2xl p-4 text-white text-xs outline-none focus:border-purple-500" placeholder="Disco / SSD" value={newAsset.storage} onChange={e => setNewAsset({...newAsset, storage: e.target.value})} />
                  <input className="bg-black/50 border border-gray-800 rounded-2xl p-4 text-white text-xs outline-none focus:border-purple-500" placeholder="Sistema Operativo" value={newAsset.os} onChange={e => setNewAsset({...newAsset, os: e.target.value})} />
                </div>
              </div>

              {/* Bloque 4: Notas */}
              <div className="space-y-3 pt-6 border-t border-white/5">
                <label className="text-[10px] font-black text-gray-500 uppercase px-2">Notas / Mañas Técnicas</label>
                <textarea className="w-full bg-black/50 border border-gray-800 rounded-[2rem] p-6 text-white text-xs outline-none focus:border-yellow-500 h-32 resize-none transition-all" placeholder="Escribe detalles del equipo..." value={newAsset.notes} onChange={e => setNewAsset({...newAsset, notes: e.target.value})} />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-8 bg-black/40 border-t border-white/5">
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-[2rem] shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 uppercase text-[11px] tracking-widest">
                <Save size={20} /> {editingAssetId ? 'Actualizar Ficha Técnica' : 'Sincronizar en Inventario'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}