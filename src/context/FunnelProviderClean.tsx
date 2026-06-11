"use client"

import React, { createContext, useContext } from 'react'

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
