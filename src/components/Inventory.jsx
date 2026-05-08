import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { 
  Plus, Package, Network, Cpu, FileText, X, 
  Save, Pencil, Trash2, Search, AlertTriangle, CheckCircle2,
  Clock, Building2 // Agregamos Building2 para el icono de Dpto
} from 'lucide-react'
import AssetTimeline from './AssetTimeline'

export default function Inventory({ companyId, session }) {
  const [assets, setAssets] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingAssetId, setEditingAssetId] = useState(null)
  const [originalAsset, setOriginalAsset] = useState(null)

  // --- ESTADOS PARA DEPARTAMENTOS ---
  const [departments, setDepartments] = useState([])
  const [isAddingDept, setIsAddingDept] = useState(false)
  const [newDeptName, setNewDeptName] = useState('')

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, name: '' })
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })

  const [newAsset, setNewAsset] = useState({
    name: '', category: 'Workstation', serial_number: '',
    last_user: '', ip_address: '', mac_address: '', notes: '',
    cpu: '', ram: '', storage: '', os: '',
    department_id: '' // <--- Nuevo campo
  })

  useEffect(() => {
    if (companyId) {
      fetchAssets()
      fetchDepartments()
    }
  }, [companyId])

  const fetchAssets = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('assets')
      .select('*, departments(name)') // Traemos el nombre del dpto también
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    setAssets(data || [])
    setLoading(false)
  }

  const fetchDepartments = async () => {
    const { data } = await supabase
      .from('departments')
      .select('*')
      .eq('company_id', companyId)
      .order('name')
    setDepartments(data || [])
  }

  const handleAddDepartment = async () => {
    if (!newDeptName.trim()) return
    const { data, error } = await supabase
      .from('departments')
      .insert([{ name: newDeptName, company_id: companyId }])
      .select().single()

    if (!error) {
      setDepartments([...departments, data])
      setNewAsset({ ...newAsset, department_id: data.id })
      setNewDeptName('')
      setIsAddingDept(false)
      showToast("Departamento creado")
    }
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
      asset.last_user?.toLowerCase().includes(query) ||
      asset.departments?.name?.toLowerCase().includes(query)
    )
  })

  const handleEdit = (asset) => {
    const dataToEdit = {
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
      os: asset.specs?.os || '',
      department_id: asset.department_id || ''
    }
    
    setEditingAssetId(asset.id)
    setNewAsset(dataToEdit)
    setOriginalAsset(dataToEdit)
    setIsModalOpen(true)
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
      department_id: newAsset.department_id || null, // <--- Guardamos el dpto
      specs: { 
        cpu: newAsset.cpu, 
        ram: newAsset.ram, 
        storage: newAsset.storage, 
        os: newAsset.os 
      }
    }

    if (editingAssetId) {
      const hasChanges = JSON.stringify(newAsset) !== JSON.stringify(originalAsset);
      if (!hasChanges) {
        showToast("Sin cambios detectados", "info");
        closeModal();
        return;
      }

      const { error: updateError } = await supabase.from('assets').update(assetData).eq('id', editingAssetId)
      if (!updateError) {
        await supabase.from('asset_history').insert([{
          asset_id: editingAssetId,
          event_type: 'actualizacion',
          description: `Actualización técnica en: ${assetData.name}`,
          technician_email: session?.user?.email
        }])
        showToast("Sincronizado")
        closeModal()
        fetchAssets()
      }
    } else {
      const { data: insertedAsset, error: insertError } = await supabase
        .from('assets')
        .insert([{ ...assetData, status: 'en_stock' }])
        .select().single()

      if (!insertError) {
        await supabase.from('asset_history').insert([{
          asset_id: insertedAsset.id,
          event_type: 'creacion',
          description: `Registro inicial.`,
          technician_email: session?.user?.email
        }])
        showToast("Registrado en Stock")
        closeModal()
        fetchAssets()
      }
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingAssetId(null)
    setOriginalAsset(null)
    setIsAddingDept(false)
    setNewAsset({
      name: '', category: 'Workstation', serial_number: '', 
      last_user: '', ip_address: '', mac_address: '', notes: '',
      cpu: '', ram: '', storage: '', os: '', department_id: ''
    })
  }

  const confirmDelete = async () => {
    const { error } = await supabase.from('assets').delete().eq('id', deleteConfirm.id)
    if (!error) {
      showToast(`Eliminado`, 'success')
      fetchAssets()
    }
    setDeleteConfirm({ isOpen: false, id: null, name: '' })
  }

  return (
    <div className="p-8 space-y-6 relative min-h-screen">
      
      {/* 🔔 NOTIFICACIÓN */}
      {notification.show && (
        <div className="fixed top-8 right-8 z-[300] animate-in slide-in-from-right-10 duration-300">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl ${
            notification.type === 'success' 
              ? 'bg-green-500/10 border-green-500/20 text-green-400' 
              : notification.type === 'info'
              ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
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
          <h1 className="text-3xl font-black text-white tracking-tighter italic uppercase">Inventario IT</h1>
          <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
            <span className="h-1 w-1 bg-blue-500 rounded-full animate-pulse"></span> S A M A N D T E C H
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center gap-2"
        >
          <Plus size={18} /> Nuevo Registro IT
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="relative group max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
        <input 
          type="text"
          placeholder="Buscar por equipo, dpto, IP o serial..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-900/50 border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-white text-xs outline-none focus:border-blue-500 transition-all placeholder:text-gray-600 font-bold"
        />
      </div>

      {/* TABLA */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-[2.5rem] overflow-x-auto shadow-2xl">
        <table className="w-full text-left text-[11px] min-w-[800px]">
          <thead>
            <tr className="border-b border-gray-800 bg-black/40 text-gray-400 uppercase font-black tracking-widest">
              <th className="p-6">Equipo / Dpto</th>
              <th className="p-6">Categoría</th>
              <th className="p-6">Red</th>
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
                  <p className="text-[9px] text-blue-500 font-bold uppercase italic">{asset.departments?.name || 'SIN ASIGNAR'}</p>
                </td>
                <td className="p-6 text-gray-400 font-bold uppercase">{asset.category}</td>
                <td className="p-6 font-mono">
                  <p className="text-gray-300 font-bold">{asset.ip_address || '---'}</p>
                </td>
                <td className="p-6 text-gray-300 font-bold">{asset.last_user || '---'}</td>
                <td className="p-6 text-center">
                   <span className={`px-3 py-1 rounded-full font-black text-[9px] uppercase border transition-all ${
                    asset.status === 'en_stock' 
                      ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' 
                      : 'bg-green-500/10 text-green-500 border-green-500/10'
                  }`}>
                    {asset.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-6">
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => handleEdit(asset)} className="p-2.5 bg-gray-800 text-gray-400 hover:text-white hover:bg-blue-600 rounded-xl transition-all active:scale-90"><Pencil size={14} /></button>
                    <button onClick={() => setDeleteConfirm({ isOpen: true, id: asset.id, name: asset.name })} className="p-2.5 bg-gray-800 text-gray-400 hover:text-red-500 rounded-xl transition-all"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DE REGISTRO / EDICIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={closeModal}></div>
          <form 
            onSubmit={handleSaveAsset}
            className="relative bg-gray-900 border border-gray-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/20">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 p-3 rounded-2xl"><Package className="text-white" size={24} /></div>
                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                  {editingAssetId ? 'Actualizar Ficha' : 'Nuevo Registro IT'}
                </h2>
              </div>
              <button type="button" onClick={closeModal} className="text-gray-500 hover:text-white"><X size={24} /></button>
            </div>

            {/* Modal Body */}
            <div className="p-10 max-h-[70vh] overflow-y-auto space-y-10 custom-scrollbar">
              
              {/* Bloque 1: General & Dpto */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-blue-500 px-2"><FileText size={16} /> <span className="text-[10px] font-black uppercase tracking-[0.2em]">General</span></div>
                
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase px-2">Nombre del Activo</label>
                    <input required className="w-full bg-black/50 border border-gray-800 rounded-2xl p-4 text-white text-xs outline-none focus:border-blue-500 font-bold" placeholder="Ej: CAR-SRV-01" value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-500 uppercase px-2">Categoría</label>
                    <select 
                      className="w-full bg-black/50 border border-gray-800 rounded-2xl p-4 text-white text-xs outline-none focus:border-blue-500 font-bold" 
                      value={newAsset.category} 
                      onChange={e => setNewAsset({...newAsset, category: e.target.value})}
                    >
                       <optgroup label="💻 CÓMPUTO" className="bg-gray-900 text-blue-400 font-black">
                        <option value="PC Escritorio">PC Escritorio</option>
                        <option value="Laptop">Laptop</option>
                        <option value="Servidor">Servidor</option>
                        <option value="Workstation">Workstation</option>
                      </optgroup>
                      <optgroup label="🌐 REDES" className="bg-gray-900 text-green-400 font-black">
                        <option value="Switch">Switch</option>
                        <option value="Router">Router</option>
                        <option value="Router WiFi">Router WiFi</option>
                        <option value="Access Point">Access Point</option>
                      </optgroup>
                      <optgroup label="🛡️ SEGURIDAD" className="bg-gray-900 text-purple-400 font-black">
                        <option value="CCTV">CCTV (Cámaras/DVR)</option>
                        <option value="UPS">UPS / Energía</option>
                        <option value="Impresora">Impresora</option>
                      </optgroup>
                    </select>
                  </div>
                </div>

                {/* SELECTOR DE DEPARTAMENTO CON BOTÓN "+" */}
                <div className="space-y-3 pt-2">
                  <label className="text-[9px] font-black text-gray-500 uppercase px-2">Departamento / Área de Trabajo</label>
                  <div className="flex gap-2">
                    {isAddingDept ? (
                      <div className="flex-1 flex gap-2 animate-in slide-in-from-right-5">
                        <input 
                          autoFocus
                          className="flex-1 bg-blue-600/10 border border-blue-500/30 rounded-2xl p-4 text-white text-xs outline-none font-bold" 
                          placeholder="Nombre del Dpto..." 
                          value={newDeptName}
                          onChange={e => setNewDeptName(e.target.value)}
                        />
                        <button type="button" onClick={handleAddDepartment} className="bg-green-600 px-5 rounded-2xl text-white"><CheckCircle2 size={18}/></button>
                        <button type="button" onClick={() => setIsAddingDept(false)} className="bg-gray-800 px-5 rounded-2xl text-gray-400"><X size={18}/></button>
                      </div>
                    ) : (
                      <>
                        <select 
                          className="flex-1 bg-black/50 border border-gray-800 rounded-2xl p-4 text-white text-xs outline-none focus:border-blue-500 font-bold"
                          value={newAsset.department_id || ''}
                          onChange={e => setNewAsset({...newAsset, department_id: e.target.value})}
                        >
                          <option value="">Sin Asignar</option>
                          {departments.map(dept => (
                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                          ))}
                        </select>
                        <button 
                          type="button"
                          onClick={() => setIsAddingDept(true)}
                          className="bg-gray-800 border border-gray-700 px-5 rounded-2xl text-blue-500 hover:bg-blue-600 hover:text-white transition-all shadow-lg active:scale-95"
                        >
                          <Plus size={20} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Bloque 2: Red & Hardware (Simplificado para el ejemplo, pero tú mantén los tuyos) */}
              <div className="space-y-5 pt-6 border-t border-white/5">
                <div className="flex items-center gap-2 text-green-500 px-2"><Network size={16} /> <span className="text-[10px] font-black uppercase tracking-[0.2em]">Conectividad</span></div>
                <div className="grid grid-cols-2 gap-5">
                  <input className="bg-black/50 border border-gray-800 rounded-2xl p-4 text-white text-xs outline-none font-mono" placeholder="IP Address" value={newAsset.ip_address} onChange={e => setNewAsset({...newAsset, ip_address: e.target.value})} />
                  <input className="bg-black/50 border border-gray-800 rounded-2xl p-4 text-white text-xs outline-none font-bold" placeholder="Usuario Actual" value={newAsset.last_user} onChange={e => setNewAsset({...newAsset, last_user: e.target.value})} />
                </div>
              </div>

              {/* BITÁCORA */}
              {editingAssetId && (
                <div className="pt-10 border-t border-white/5 mt-10">
                  <div className="flex items-center gap-2 px-2 text-blue-500 mb-4"><Clock size={16} /> <span className="text-[10px] font-black uppercase tracking-[0.2em]">Bitácora</span></div>
                  <AssetTimeline assetId={editingAssetId} userEmail={session?.user?.email} />
                </div>
              )}
            </div>

            {/* Footer */}
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