"use client"

import React, { useState } from 'react'
import { useSupabase } from '../../components/SupabaseProvider'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ClientLogin() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = (searchParams?.get('redirect') as string) || '/dashboard'

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const supabase = useSupabase()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (!email) {
      setError('Preencha o e-mail.')
      setLoading(false)
      return
    }

    const password = '1234'

    try {
        const { data, error: signErr } = await supabase.auth.signInWithPassword({ email, password })

        // debug
        console.log('supabase.signInWithPassword ->', { data, signErr })

        if (signErr) {
          const msg = (signErr.message || '').toLowerCase()
          if (
            msg.includes('invalid login') ||
            msg.includes('invalid credentials') ||
            msg.includes('invalid') ||
            msg.includes('not found') ||
            msg.includes('no user')
          ) {
            setError('E-mail não localizado ou sem acesso ativo ao produto. Verifique o e-mail utilizado na compra')
          } else {
            setError('Erro ao entrar. Tente novamente.')
          }
          setLoading(false)
          return
        }

        if (!data || !data.session) {
          setError('Falha ao autenticar — verifique suas credenciais ou confirme seu e-mail.')
          setLoading(false)
          return
        }

        try {
          await fetch('/api/auth/set-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_at: data.session.expires_at
            })
          })
        } catch (e) {
          console.warn('Failed to call set-session API', e)
        }

        setLoading(false)
        setSuccess('Autenticado — redirecionando...')
        try {
          router.replace(redirectTo)
        } catch (e) {
          console.warn('router.replace failed, trying push', e)
          try {
            router.push(redirectTo)
          } catch (e2) {
            console.error('router.push failed', e2)
          }
        }
    } catch (err: any) {
      setError('Erro inesperado. Tente novamente mais tarde.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-md">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-emerald-400 mb-2">Entrar</h1>
          <p className="text-neutral-400 mb-6">Acesse sua área de membros</p>

          {error && (
            <div className="mb-4 text-sm text-red-400 bg-red-950/20 p-3 rounded">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="text-sm text-neutral-300">E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md bg-zinc-800 border border-zinc-700 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="seu@exemplo.com"
                required
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className={`w-full mt-2 inline-flex items-center justify-center px-4 py-2 rounded-md text-white ${
                loading ? 'bg-emerald-700/70' : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 text-sm text-neutral-400">
            Ao entrar, você será redirecionado para o painel.
          </div>
        </div>

        <div className="text-center mt-4 text-neutral-500 text-sm">Não tem conta? Contate o suporte.</div>
      </div>
    </div>
  )
}
