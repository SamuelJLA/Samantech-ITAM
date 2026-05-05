import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
    setLoading(false)
  }

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#0f1115]">
      <form onSubmit={handleLogin} className="bg-black/40 p-8 rounded-2xl border border-gray-800 w-full max-w-sm">
        <h2 className="text-2xl font-bold text-blue-500 mb-6 text-center">SAMANDTECH</h2>
        <div className="space-y-4">
          <input 
            type="email" placeholder="Email" 
            className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white outline-none focus:border-blue-500"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" placeholder="Contraseña" 
            className="w-full p-3 bg-gray-900 border border-gray-700 rounded-lg text-white outline-none focus:border-blue-500"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors"
          >
            {loading ? 'Cargando...' : 'Iniciar Sesión'}
          </button>
        </div>
      </form>
    </div>
  )
}