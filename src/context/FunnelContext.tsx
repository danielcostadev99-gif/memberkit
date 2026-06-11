"use client"

import React, { createContext, useContext } from 'react'

// Minimal, safe funnel provider stub to avoid duplicate-definition build errors.
type Funnel = { id?: string; slug?: string; name?: string }

const FunnelContext = createContext<any | undefined>(undefined)

export function FunnelProvider({ children }: { children: React.ReactNode }) {
  return <FunnelContext.Provider value={{}}>{children}</FunnelContext.Provider>
}

export function useFunnel() {
  const ctx = useContext(FunnelContext)
  if (!ctx) return { funnels: [], currentFunnel: null, setCurrentFunnelById: () => {}, setFunnels: () => {} }
  return ctx
}

export default FunnelProvider
"use client"

import React, { createContext, useContext, useState } from 'react'

type Funnel = { id?: string; name?: string; slug?: string }

const FunnelContext = createContext<{
  funnel?: Funnel
  setFunnel: (f: Funnel | undefined) => void
}>({
  funnel: undefined,
  setFunnel: () => {}
})
"use client"

import React, { createContext, useContext, useState, useEffect, PropsWithChildren } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

export type Funnel = {
  id: string
  slug: string
  name: string
  logo_url?: string | null
  accent_color?: string | null
  bg_color?: string | null
}

type FunnelContextValue = {
  funnels: Funnel[]
  currentFunnel: Funnel | null
  setCurrentFunnelById: (id: string) => void
  setFunnels: (f: Funnel[]) => void
  loadUserFunnels?: (supabase: SupabaseClient, userId: string) => Promise<Funnel[]>
}

const FunnelContext = createContext<FunnelContextValue | undefined>(undefined)

export function FunnelProvider({ children, initialFunnels }: PropsWithChildren<{ initialFunnels?: Funnel[] }>) {
  const [funnels, setFunnelsState] = useState<Funnel[]>(initialFunnels ?? [])
  const [currentFunnel, setCurrentFunnel] = useState<Funnel | null>(funnels[0] ?? null)

  useEffect(() => {
    if (funnels.length === 0) {
      setCurrentFunnel(null)
      return
    }

    if (!currentFunnel || !funnels.find((f) => f.id === currentFunnel.id)) {
      setCurrentFunnel(funnels[0])
    }
  }, [funnels])

  const setCurrentFunnelById = (id: string) => {
    const found = funnels.find((f) => f.id === id) ?? null
    setCurrentFunnel(found)
  }

  const setFunnels = (f: Funnel[]) => setFunnelsState(f)

  const loadUserFunnels = async (supabase: SupabaseClient, userId: string): Promise<Funnel[]> => {
    const { data: accesses, error: accessErr } = await supabase
      .from('user_access')
      .select('product_id')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (accessErr || !accesses) return []

    const productIds = Array.from(new Set(accesses.map((r: any) => r.product_id)))
    if (productIds.length === 0) return []

    const { data: products } = await supabase.from('products').select('id, funnel_id').in('id', productIds)
    if (!products) return []

    const funnelIds = Array.from(new Set(products.map((p: any) => p.funnel_id))).filter(Boolean)
    if (funnelIds.length === 0) return []

    const { data: funnelsData } = await supabase.from('funnels').select('id, slug, name, logo_url, accent_color, bg_color').in('id', funnelIds)
    const result: Funnel[] = (funnelsData ?? []) as Funnel[]
"use client"

import React, { createContext, useContext, useState, useEffect, PropsWithChildren } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

export type Funnel = {
  id: string
  slug: string
  name: string
  logo_url?: string | null
  accent_color?: string | null
  bg_color?: string | null
}

type FunnelContextValue = {
  funnels: Funnel[]
  currentFunnel: Funnel | null
  setCurrentFunnelById: (id: string) => void
  setFunnels: (f: Funnel[]) => void
  loadUserFunnels?: (supabase: SupabaseClient, userId: string) => Promise<Funnel[]>
}

const FunnelContext = createContext<FunnelContextValue | undefined>(undefined)

export function FunnelProvider({ children, initialFunnels }: PropsWithChildren<{ initialFunnels?: Funnel[] }>) {
  const [funnels, setFunnelsState] = useState<Funnel[]>(initialFunnels ?? [])
  const [currentFunnel, setCurrentFunnel] = useState<Funnel | null>(funnels[0] ?? null)

  useEffect(() => {
    if (funnels.length === 0) {
      setCurrentFunnel(null)
      return
    }

    if (!currentFunnel || !funnels.find((f) => f.id === currentFunnel.id)) {
      setCurrentFunnel(funnels[0])
    }
  }, [funnels])

  const setCurrentFunnelById = (id: string) => {
    const found = funnels.find((f) => f.id === id) ?? null
    setCurrentFunnel(found)
  }

  const setFunnels = (f: Funnel[]) => setFunnelsState(f)

  const loadUserFunnels = async (supabase: SupabaseClient, userId: string): Promise<Funnel[]> => {
    const { data: accesses, error: accessErr } = await supabase
      .from('user_access')
      .select('product_id')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (accessErr || !accesses) return []

    const productIds = Array.from(new Set(accesses.map((r: any) => r.product_id)))
    if (productIds.length === 0) return []

    const { data: products } = await supabase.from('products').select('id, funnel_id').in('id', productIds)
    if (!products) return []

    const funnelIds = Array.from(new Set(products.map((p: any) => p.funnel_id))).filter(Boolean)
    if (funnelIds.length === 0) return []

    const { data: funnelsData } = await supabase.from('funnels').select('id, slug, name, logo_url, accent_color, bg_color').in('id', funnelIds)
    const result: Funnel[] = (funnelsData ?? []) as Funnel[]

    setFunnelsState(result)
    return result
  }

  const value: FunnelContextValue = {
    funnels,
    currentFunnel,
    setCurrentFunnelById,
    setFunnels,
    loadUserFunnels,
  }

  return <FunnelContext.Provider value={value}>{children}</FunnelContext.Provider>
}

export function useFunnel() {
  const ctx = useContext(FunnelContext)
  if (!ctx) throw new Error('useFunnel must be used within a FunnelProvider')
  return ctx
}

export default FunnelProvider
