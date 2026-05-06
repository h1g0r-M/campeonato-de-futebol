'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function login(event) {
    event.preventDefault()

    if (!email || !password) {
      toast.error('Informe email e senha')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Login realizado')
    router.push('/admin/dashboard')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black px-4">
      <form onSubmit={login} className="bg-zinc-900 p-8 rounded-xl w-full max-w-sm">
        <h1 className="text-white text-2xl font-bold mb-6">Painel Admin</h1>

        <input
          value={email}
          placeholder="Email"
          type="email"
          className="w-full mb-3 p-3 rounded bg-zinc-800 text-white"
          onChange={(event) => setEmail(event.target.value)}
        />

        <input
          value={password}
          type="password"
          placeholder="Senha"
          className="w-full mb-4 p-3 rounded bg-zinc-800 text-white"
          onChange={(event) => setPassword(event.target.value)}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-500 p-3 rounded font-bold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
