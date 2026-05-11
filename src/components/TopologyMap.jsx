import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { 
  ReactFlow, Background, Controls, MiniMap, 
  applyEdgeChanges, applyNodeChanges, addEdge,
  Handle, Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { supabase } from '../lib/supabaseClient';
import { 
  Monitor, Laptop, Server, Cpu, Network, Router, Wifi, Radio, 
  ShieldCheck, Camera, BatteryCharging, Printer, Fingerprint, 
  Phone, Box, X, Terminal, Zap, ZapOff, Trash2, Cpu as HardwareIcon
} from 'lucide-react';

const ICON_CONFIG = {
  "PC Escritorio": { icon: Monitor, color: "text-blue-500", bg: "bg-blue-500/10" },
  "Laptop": { icon: Laptop, color: "text-blue-400", bg: "bg-blue-400/10" },
  "Servidor": { icon: Server, color: "text-blue-600", bg: "bg-blue-600/10" },
  "Workstation": { icon: Cpu, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  "Switch": { icon: Network, color: "text-green-500", bg: "bg-green-500/10" },
  "Router": { icon: Router, color: "text-green-600", bg: "bg-green-600/10" },
  "Router WiFi": { icon: Wifi, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  "Access Point": { icon: Radio, color: "text-green-400", bg: "bg-green-400/10" },
  "Firewall": { icon: ShieldCheck, color: "text-lime-500", bg: "bg-lime-500/10" },
  "CCTV": { icon: Camera, color: "text-purple-500", bg: "bg-purple-500/10" },
  "UPS": { icon: BatteryCharging, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  "Impresora": { icon: Printer, color: "text-purple-400", bg: "bg-purple-400/10" },
  "Biométrico": { icon: Fingerprint, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  "Telefonía IP": { icon: Phone, color: "text-purple-300", bg: "bg-purple-300/10" },
};

const DeviceNode = ({ data }) => {
  const config = ICON_CONFIG[data.category] || { icon: Box, color: "text-gray-400", bg: "bg-white/5" };
  const Icon = config.icon;
  const isOffline = data.isSimulating && data.category.toLowerCase().includes('router');

  return (
    <div className={`p-4 rounded-[2rem] border backdrop-blur-xl shadow-2xl min-w-[170px] transition-all duration-500 ${isOffline ? 'border-red-500 bg-red-500/10 shadow-[0_0_25px_rgba(239,68,68,0.4)] animate-pulse' : `border-white/10 ${config.bg} hover:border-white/20`}`}>
      <Handle type="target" position={Position.Top} className={`w-3 h-3 border-2 border-white ${isOffline ? 'bg-red-500' : 'bg-blue-500'}`} />
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-2xl border border-white/5 shadow-inner ${isOffline ? 'bg-red-500/20' : config.bg}`}><Icon className={isOffline ? 'text-red-500' : config.color} size={22} /></div>
        <div className="flex flex-col">
          <p className={`text-[10px] font-black uppercase tracking-tighter truncate w-28 ${isOffline ? 'text-red-200' : 'text-white'}`}>{data.label}</p>
          <p className={`text-[7px] font-black uppercase tracking-widest ${isOffline ? 'text-red-400' : config.color} opacity-80`}>{isOffline ? '⚠ CONNECTION LOST' : data.category}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <div className={`h-1 w-1 rounded-full ${isOffline ? 'bg-red-500 animate-ping' : 'bg-green-500'}`}></div>
            <p className={`text-[8px] font-mono font-bold tracking-tight ${isOffline ? 'text-red-300' : 'text-gray-400'}`}>{data.ip_address || '---'}</p>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className={`w-3 h-3 border-2 border-white ${isOffline ? 'bg-red-500' : 'bg-blue-500'}`} />
    </div>
  );
};

export default function TopologyMap({ companyId, session }) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [isSimulatingFault, setIsSimulatingFault] = useState(false);
  const [activeAsset, setActiveAsset] = useState(null); // Restaurado
  const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, edge: null }); // Restaurado

  const nodeTypes = useMemo(() => ({ deviceNode: DeviceNode }), []);

  useEffect(() => { if (companyId) loadTopology(); }, [companyId, isSimulatingFault]);

  const loadTopology = async () => {
    const { data: assets, error } = await supabase.from('assets').select('*').eq('company_id', companyId);
    if (!error && assets) {
      setNodes(assets.map((asset, index) => ({
        id: asset.id,
        type: 'deviceNode',
        position: { x: asset.topo_x || (index * 200) % 800, y: asset.topo_y || Math.floor(index / 4) * 150 },
        data: { ...asset, label: asset.name, isSimulating: isSimulatingFault },
      })));
      setEdges(assets.filter(a => a.parent_id).map(a => ({
        id: `e-${a.parent_id}-${a.id}`,
        source: a.parent_id,
        target: a.id,
        animated: !isSimulatingFault,
        style: { stroke: isSimulatingFault && a.category.toLowerCase().includes('router') ? '#ef4444' : '#3b82f6', strokeWidth: 2 },
      })));
    }
  };

  const onEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault();
    setConfirmDelete({ isOpen: true, edge: edge });
  }, []);

  const handleDisconnect = async () => {
    const { edge } = confirmDelete;
    if (edge) {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
      await supabase.from('assets').update({ parent_id: null }).eq('id', edge.target);
      setConfirmDelete({ isOpen: false, edge: null });
    }
  };

  const onNodeClick = useCallback((event, node) => {
    setActiveAsset(node.data);
  }, []);

  const onConnect = useCallback(async (params) => {
    if (params.source === params.target) return;
    setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } }, eds));
    await supabase.from('assets').update({ parent_id: params.source }).eq('id', params.target);
  }, []);

  const onNodeDragStop = useCallback(async (event, node) => {
    await supabase.from('assets').update({ topo_x: node.position.x, topo_y: node.position.y }).eq('id', node.id);
  }, []);

  return (
    <div className="h-full w-full bg-[#0a0c10] relative">
      <div className="absolute top-8 left-8 z-50 flex items-start justify-between w-[calc(100%-64px)] pointer-events-none">
        <div>
          <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Topología SAMANDTECH</h2>
          <p className="text-blue-500 text-[10px] font-black uppercase tracking-[0.3em]">SAMANDTECH ITAM</p>
        </div>
        <button onClick={() => setIsSimulatingFault(!isSimulatingFault)} className={`pointer-events-auto flex items-center gap-3 px-6 py-3 rounded-2xl border font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${isSimulatingFault ? 'bg-red-600 border-red-400 text-white animate-pulse' : 'bg-gray-900/50 border-white/5 text-gray-400 hover:text-white'}`}>
          {isSimulatingFault ? <ZapOff size={16}/> : <Zap size={16}/>} {isSimulatingFault ? 'DETENER FALLA' : 'SIMULAR CAÍDA'}
        </button>
      </div>

      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={(c) => setNodes((nds) => applyNodeChanges(c, nds))}
        onEdgesChange={(c) => setEdges((eds) => applyEdgeChanges(c, eds))}
        onConnect={onConnect} onNodeDragStop={onNodeDragStop}
        onNodeClick={onNodeClick} onEdgeContextMenu={onEdgeContextMenu}
        nodeTypes={nodeTypes} fitView
      >
        <Background color="#1f2937" gap={20} />
        <div className="absolute bottom-6 left-6 p-1 rounded-2xl bg-gray-900 border border-gray-800 shadow-xl z-[100] backdrop-blur-md">
          <Controls position="bottom-left" className="!m-0 [&_button]:!bg-transparent [&_button]:!border-none [&_button]:!rounded-xl [&_button]:!m-1 hover:[&_button]:!bg-gray-700 [&_svg]:!fill-blue-500 hover:[&_svg]:!fill-white transition-all" showInteractive={false} />
        </div>
      </ReactFlow>

      {/* --- MODAL DE CONFIRMACIÓN --- */}
      {confirmDelete.isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setConfirmDelete({ isOpen: false, edge: null })}></div>
          <div className="relative bg-gray-900 border border-red-500/20 w-full max-w-sm rounded-[3rem] shadow-2xl p-10 text-center animate-in zoom-in-95 duration-200">
            <div className="bg-red-500/10 w-20 h-20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-inner">
              <Trash2 className="text-red-500" size={40} />
            </div>
            <h3 className="text-white text-xl font-black italic uppercase tracking-tighter mb-2">¿Cortar Conexión?</h3>
            <p className="text-gray-500 text-[10px] font-bold leading-relaxed mb-10 uppercase tracking-widest">Vas a desconectar este enlace de forma permanente.</p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setConfirmDelete({ isOpen: false, edge: null })} className="bg-gray-800 text-gray-400 font-black py-4 rounded-2xl text-[9px] uppercase tracking-widest">Volver</button>
              <button onClick={handleDisconnect} className="bg-red-600 text-white font-black py-4 rounded-2xl text-[9px] uppercase tracking-widest">Sí, Cortar</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL FICHA TÉCNICA --- */}
      {activeAsset && (
        <div className="absolute inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setActiveAsset(null)}></div>
          <div className="relative bg-gray-900 border border-gray-800 w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl border ${ICON_CONFIG[activeAsset.category]?.bg || 'bg-white/5'}`}>
                  {React.createElement(ICON_CONFIG[activeAsset.category]?.icon || Box, { size: 24, className: ICON_CONFIG[activeAsset.category]?.color })}
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tighter italic uppercase">{activeAsset.name}</h3>
                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{activeAsset.category} • {activeAsset.status}</p>
                </div>
              </div>
              <button onClick={() => setActiveAsset(null)} className="text-gray-500 hover:text-white p-2 bg-white/5 rounded-full"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5"><p className="text-[8px] font-bold text-gray-500 uppercase mb-1">IP Address</p><p className="text-sm font-mono text-blue-400 font-bold">{activeAsset.ip_address || '---'}</p></div>
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5"><p className="text-[8px] font-bold text-gray-500 uppercase mb-1">MAC Address</p><p className="text-sm font-mono text-gray-300">{activeAsset.mac_address || '---'}</p></div>
                <div className="bg-white/5 p-4 rounded-3xl border border-white/5"><p className="text-[8px] font-bold text-gray-500 uppercase mb-1">Usuario</p><p className="text-sm text-white font-bold">{activeAsset.last_user || 'N/A'}</p></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}