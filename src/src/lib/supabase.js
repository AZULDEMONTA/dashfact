import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)

/* ─── Storage helpers (reemplaza window.storage del artifact) ──────────────── */
export async function dbGet(key) {
  const { data, error } = await supabase
    .from('dashfact_data')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  if (error) throw error
  return data ? data.value : null
}

export async function dbSet(key, value) {
  const { error } = await supabase
    .from('dashfact_data')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw error
}

export async function dbDelete(key) {
  const { error } = await supabase
    .from('dashfact_data')
    .delete()
    .eq('key', key)
  if (error) throw error
}
