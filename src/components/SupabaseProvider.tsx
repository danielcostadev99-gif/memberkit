"use client"

import React, { createContext, useContext, useMemo } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'

const SupabaseContext = createContext<SupabaseClient | null>(null)

export function useSupabase() {
  const ctx = useContext(SupabaseContext)
  if (!ctx) throw new Error('useSupabase must be used within SupabaseProvider')
  return ctx
}

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  const client = useMemo(() => createClient(supabaseUrl, supabaseAnonKey), [supabaseUrl, supabaseAnonKey])

  return <SupabaseContext.Provider value={client}>{children}</SupabaseContext.Provider>
}
