import { reactive } from 'vue'
import { supabase } from '../lib/supabase'

export const auth = reactive({ user: null, role: null, name: null, ready: false })

async function loadProfile(user) {
  if (!user) {
    auth.user = null; auth.role = null; auth.name = null
    return
  }
  auth.user = user
  const { data } = await supabase
    .from('profiles').select('role, full_name').eq('id', user.id).single()
  // Jika gagal membaca profil, anggap role paling rendah (karyawan)
  auth.role = data?.role ?? 'karyawan'
  auth.name = data?.full_name ?? user.email
}

export async function initAuth() {
  const { data } = await supabase.auth.getSession()
  await loadProfile(data.session?.user ?? null)
  auth.ready = true
  supabase.auth.onAuthStateChange((_event, session) => {
    setTimeout(() => loadProfile(session?.user ?? null), 0)
  })
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  await loadProfile(data.user)
}

export async function logout() {
  await supabase.auth.signOut()
  await loadProfile(null)
}

export const isOwner = () => auth.role === 'owner'