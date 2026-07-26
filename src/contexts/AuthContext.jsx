import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.id)
  }

  async function signUp(email, password) {
    const { error } = await supabase.auth.signUp({ email, password })
    return error
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return error

    // Check account status
    const { data: prof } = await supabase
      .from('profiles').select('account_status, suspended_until').eq('id', data.user.id).single()

    if (prof?.account_status === 'suspended') {
      const until = prof.suspended_until ? new Date(prof.suspended_until) : null
      if (until && until > new Date()) {
        // Still suspended — sign out and block
        await supabase.auth.signOut()
        const untilStr = until.toLocaleDateString('bg-BG')
        return { message: `Акаунтът ви е временно спрян до ${untilStr}. Свържете се с нас за съдействие.` }
      } else if (until && until <= new Date()) {
        // Period expired without login → needs admin reactivation
        await supabase.from('profiles')
          .update({ account_status: 'pending_reactivation' }).eq('id', data.user.id)
        await supabase.auth.signOut()
        return { message: 'Периодът на спиране изтече. Акаунтът ви очаква потвърждение от администратора.' }
      }
    }

    if (prof?.account_status === 'pending_reactivation') {
      await supabase.auth.signOut()
      return { message: 'Акаунтът ви очаква потвърждение от администратора за реактивиране.' }
    }

    if (prof?.account_status === 'pending_delete') {
      await supabase.auth.signOut()
      return { message: 'Заявката ви за изтриване на акаунта е под разглеждане.' }
    }

    return null
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
