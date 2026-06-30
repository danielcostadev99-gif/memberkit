"use client"

import React, { createContext, useContext } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@supabase/supabase-js'

const SupabaseContext = createContext<SupabaseClient | null>(null)

const _supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const _supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase: SupabaseClient = createClient(_supabaseUrl, _supabaseAnonKey)

export function useSupabase() {
  const ctx = useContext(SupabaseContext)
  if (!ctx) throw new Error('useSupabase must be used within SupabaseProvider')
  return ctx
}

export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  return <SupabaseContext.Provider value={supabase}>{children}</SupabaseContext.Provider>
}
