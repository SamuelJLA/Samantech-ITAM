import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { 
  Wrench, MapPin, PlusCircle, RefreshCw, 
  Send, Clock, User, MessageSquare 
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const EVENT_ICONS = {
  mantenimiento: Wrench,
  reubicacion: MapPin,
  creacion: PlusCircle,
  actualizacion: RefreshCw,
  nota: MessageSquare
}

export default function AssetTimeline({ assetId, userEmail }) {
  const [history, setHistory] = useState([])
  const [newNote, setNewNote] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (assetId) fetchHistory()
  }, [assetId])

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from('asset_history')
      .select('*')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false })
    
    if (!error) setHistory(data)
  }

  const handleAddNote = async (e) => {
    e.preventDefault()
    if (!newNote.trim()) return
    setLoading(true)

    const { error } = await supabase.from('asset_history').insert([{
      asset_id: assetId,
      event_type: 'nota',
      description: newNote,
      technician_email: userEmail
    }])

    if (!error) {
      setNewNote('')
      fetchHistory()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
        {/* INPUT PARA NUEVA NOTA (Cambiamos form por div) */}
        <div className="relative">
        <textarea 
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Escribe una nota de mantenimiento..."
            className="w-full bg-black/40 border border-gray-800 rounded-2xl p-4 pr-12 text-xs text-white outline-none focus:border-blue-500 transition-all h-20 resize-none"
        />
        <button 
            disabled={loading}
            type="button" // <--- IMPORTANTE: Cambiar a 'button'
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation(); // <--- ESTO EVITA QUE EL MODAL SE CIERRE
                handleAddNote(e);
             }}
             className="absolute right-3 bottom-3 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 transition-all active:scale-95"
            >
                <Send size={16} />
            </button>
        </div>

      {/* LÍNEA DE TIEMPO */}
      <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-500/50 before:via-gray-800 before:to-transparent">
        {history.length > 0 ? history.map((event) => {
          const Icon = EVENT_ICONS[event.event_type] || MessageSquare
          return (
            <div key={event.id} className="relative flex items-start gap-6 group">
              {/* Icono del evento */}
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 z-10 group-hover:border-blue-500/50 transition-colors">
                <Icon size={16} className={event.event_type === 'mantenimiento' ? 'text-yellow-500' : 'text-blue-400'} />
              </div>

              {/* Contenido del evento */}
              <div className="flex-1 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-black text-white uppercase italic tracking-widest">
                    {event.event_type}
                  </span>
                  <span className="text-[9px] text-gray-500 flex items-center gap-1 font-mono">
                    <Clock size={10} /> {format(new Date(event.created_at), 'dd MMM, HH:mm', { locale: es })}
                  </span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{event.description}</p>
                <div className="mt-2 flex items-center gap-1 text-[9px] text-gray-600 font-bold uppercase">
                  <User size={10} /> {event.technician_email?.split('@')[0] || 'Sistema'}
                </div>
              </div>
            </div>
          )
        }) : (
          <p className="text-center text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em] py-10">Sin historial registrado</p>
        )}
      </div>
    </div>
  )
}