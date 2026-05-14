import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { 
  Plus, Package, Network, Cpu, FileText, X, 
  Save, Pencil, Trash2, Search, CheckCircle2,
  Clock, Building2, Share2, HardDrive, ShieldCheck, AlertCircle
} from 'lucide-react'
import AssetTimeline from './AssetTimeline'

export default function Inventory({ companyId, session }) {
  const [assets, setAssets] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editingAssetId, setEditingAssetId] = useState(null)
  const [originalAsset, setOriginalAsset] = useState(null)

  const [departments, setDepartments] = useState([])
  const [isAddingDept, setIsAddingDept] = useState(false)
  const [newDeptName, setNewDeptName] = useState('')

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, name: '' })
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' })

  const [newAsset, setNewAsset] = useState({
    name: '', category: 'Workstation', serial_number: '',
    last_user: '', ip_address: '', mac_address: '', notes: '',
    cpu: '', ram: '', storage: '', os: '',
    department_id: '', parent_id: '',
    is_critical: false // <--- NUEVO CAMPO DE CRITICIDAD
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
      .select('*, departments(name)')
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

  const networkProviders = assets.filter(a => 
    ['Router', 'Switch', 'Router WiFi', 'Access Point', 'Firewall'].includes(a.category) && a.id !== editingAssetId
  )

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
      department_id: asset.department_id || '',
      parent_id: asset.parent_id || '',
      is_critical: asset.is_critical || false // <--- CARGAMOS VALOR REAL
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
      department_id: newAsset.department_id || null,
      parent_id: newAsset.parent_id || null,
      is_critical: newAsset.is_critical, // <--- GUARDAMOS EN DB
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
        showToast("Sin cambios", "info");
        closeModal();
        return;
      }

      const { error: updateError } = await supabase.from('assets').update(assetData).eq('id', editingAssetId)
      if (!updateError) {
        await supabase.from('asset_history').insert([{
          asset_id: editingAssetId,
          event_type: 'actualizacion',
          description: `Actualización técnica integral: ${assetData.name} ${assetData.is_critical ? '(Marcado como Crítico)' : ''}`,
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
      cpu: '', ram: '', storage: '', os: '', department_id: '', parent_id: '',
      is_critical: false
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
            notification.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
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
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center gap-2">
          <Plus size={18} /> Nuevo Registro IT
        </button>
      </div>

      {/* BUSCADOR */}
      <div className="relative group max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={18} />
        <input type="text" placeholder="Buscar por equipo, dpto, IP o serial..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-gray-900/50 border border-gray-800 rounded-2xl py-4 pl-12 pr-4 text-white text-xs outline-none focus:border-blue-500 transition-all placeholder:text-gray-600 font-bold" />
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
                  <div className="flex items-center gap-2">
                    <p className="text-white font-black uppercase tracking-tight">{asset.name}</p>
                    {asset.is_critical && <ShieldCheck size={12} className="text-rose-500" />}
                  </div>
                  <p className="text-[9px] text-blue-500 font-bold uppercase italic">{asset.departments?.name || 'SIN ASIGNAR'}</p>
                </td>
                <td className="p-6 text-gray-400 font-bold uppercase">{asset.category}</td>
                <td className="p-6 font-mono text-gray-300 font-bold">{asset.ip_address || '---'}</td>
                <td className="p-6 text-gray-300 font-bold">{asset.last_user || '---'}</td>
                <td className="p-6 text-center">
                   <span className={`px-3 py-1 rounded-full font-black text-[9px] uppercase border transition-all ${asset.status === 'en_stock' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' : 'bg-green-500/10 text-green-500 border-green-500/10'}`}>
                    {asset.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-6 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => handleEdit(asset)} className="p-2.5 bg-gray-800 text-gray-400 hover:text-white hover:bg-blue-600 rounded-xl transition-all"><Pencil size={14} /></button>
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
          <form onSubmit={handleSaveAsset} className="relative bg-gray-900 border border-gray-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/20 text-white italic uppercase tracking-tighter font-black">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 p-3 rounded-2xl"><Package size={24} /></div>
                <h2 className="text-2xl">{editingAssetId ? 'Actualizar Ficha' : 'Nuevo Registro IT'}</h2>
              </div>
              <button type="button" onClick={closeModal}><X size={24} /></button>
            </div>

            <div className="p-10 max-h-[70vh] overflow-y-auto space-y-10 custom-scrollbar">
              
              {/* BLOQUE DE CRITICIDAD (FLAG MANUAL) */}
              <div className="flex items-center justify-between p-6 bg-rose-500/5 rounded-[2rem] border border-rose-500/20 transition-all hover:bg-rose-500/10">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl transition-all ${newAsset.is_critical ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' : 'bg-gray-800 text-gray-500 shadow-inner'}`}>
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-tighter italic">Infraestructura Crítica</p>
                    <p className="text-[9px] text-gray-500 font-bold uppercase">Si falla, marcará el NOC en ROJO.</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={newAsset.is_critical} onChange={e => setNewAsset({...newAsset, is_critical: e.target.checked})} />
                  <div className="w-12 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                </label>
              </div>

              {/* 1. GENERAL */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-blue-500 px-2"><FileText size={16} /> <span className="text-[10px] font-black uppercase tracking-[0.2em]">General</span></div>
                <div className="grid grid-cols-2 gap-5">
                  <input required className="bg-black/50 border border-gray-800 rounded-2xl p-4 text-white text-xs font-bold" placeholder="Nombre / Asset Tag" value={newAsset.name} onChange={e => setNewAsset({...newAsset, name: e.target.value})} />
                  <select className="bg-black/50 border border-gray-800 rounded-2xl p-4 text-white text-xs font-bold" value={newAsset.category} onChange={e => setNewAsset({...newAsset, category: e.target.value})}>
                    <optgroup label="CÓMPUTO"><option value="PC Escritorio">PC Escritorio</option><option value="Laptop">Laptop</option><option value="Servidor">Servidor</option></optgroup>
                    <optgroup label="REDES"><option value="Switch">Switch</option><option value="Router">Router</option><option value="Access Point">Access Point</option></optgroup>
                    <optgroup label="OTROS"><option value="CCTV">CCTV</option><option value="UPS">UPS</option><option value="Impresora">Impresora</option></optgroup>
                  </select>
                </div>
                <div className="flex gap-2">
                  <select className="flex-1 bg-black/50 border border-gray-800 rounded-2xl p-4 text-white text-xs font-bold" value={newAsset.department_id || ''} onChange={e => setNewAsset({...newAsset, department_id: e.target.value})}>
                    <option value="">Sin Departamento</option>
                    {departments.map(d => (<option key={d.id} value={d.id}>{d.name}</option>))}
                  </select>
                  <button type="button" onClick={() => setIsAddingDept(true)} className="bg-gray-800 p-4 rounded-2xl text-blue-500 hover:bg-blue-600 transition-all"><Plus size={20}/></button>
                </div>
              </div>

              {/* 2. CONECTIVIDAD */}
              <div className="space-y-6 pt-6 border-t border-white/5">
                <div className="flex items-center gap-2 text-green-500 px-2"><Network size={16} /> <span className="text-[10px] font-black uppercase tracking-[0.2em]">Conectividad</span></div>
                <select className="w-full bg-black/50 border border-gray-800 rounded-2xl p-4 text-white text-xs font-bold" value={newAsset.parent_id || ''} onChange={e => setNewAsset({...newAsset, parent_id: e.target.value})}>
                  <option value="">Sin Conexión (Uplink)</option>
                  {networkProviders.map(p => (<option key={p.id} value={p.id}>{p.name} ({p.category})</option>))}
                </select>
                <div className="grid grid-cols-2 gap-5">
                  <input className="bg-black/50 border border-gray-800 rounded-2xl p-4 text-white text-xs font-mono" placeholder="IP Address" value={newAsset.ip_address} onChange={e => setNewAsset({...newAsset, ip_address: e.target.value})} />
                  <input className="bg-black/50 border border-gray-800 rounded-2xl p-4 text-white text-xs font-mono" placeholder="MAC Address" value={newAsset.mac_address} onChange={e => setNewAsset({...newAsset, mac_address: e.target.value})} />
                </div>
              </div>

              {/* 3. HARDWARE */}
              <div className="space-y-6 pt-6 border-t border-white/5">
                <div className="flex items-center gap-2 text-purple-500 px-2"><HardDrive size={16} /> <span className="text-[10px] font-black uppercase tracking-[0.2em]">Hardware</span></div>
                <div className="grid grid-cols-2 gap-5">
                  <input className="bg-black/50 border border-gray-800 rounded-2xl p-4 text-white text-xs font-bold" placeholder="CPU" value={newAsset.cpu} onChange={e => setNewAsset({...newAsset, cpu: e.target.value})} />
                  <input className="bg-black/50 border border-gray-800 rounded-2xl p-4 text-white text-xs font-bold" placeholder="RAM" value={newAsset.ram} onChange={e => setNewAsset({...newAsset, ram: e.target.value})} />
                </div>
              </div>

              {editingAssetId && (
                <div className="pt-10 border-t border-white/5"><AssetTimeline assetId={editingAssetId} userEmail={session?.user?.email} /></div>
              )}
            </div>

            <div className="p-8 bg-black/40 border-t border-white/5">
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-[2rem] shadow-xl transition-all active:scale-95 uppercase text-[11px] tracking-widest flex items-center justify-center gap-3">
                <Save size={20} /> {editingAssetId ? 'Actualizar Ficha Técnica' : 'Sincronizar en Inventario'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}