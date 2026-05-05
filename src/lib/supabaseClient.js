import { createClient } from '@supabase/supabase-js'

// Validamos que Vite esté leyendo las variables correctamente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ SAMANDTECH ERROR: Las variables de entorno de Supabase no fueron detectadas durante el Build.");
} else {
  console.log("🚀 SAMANDTECH: Conexión con Supabase inicializada.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
window.supabase = supabase;