"use client"

import React, { useEffect, useState } from 'react'
import { useSupabase } from '../SupabaseProvider'

type Props = {
  user_id: string
  userProducts: string[]
}

type Product = {
  id: string
  title: string
  checkout_url?: string
  widget_badge_text?: string
  widget_alert_text?: string
}

export default function NextStepWidget({ user_id, userProducts }: Props) {
  const supabase = useSupabase()
  const [product, setProduct] = useState<Product | null>(null)
  const [totalProducts, setTotalProducts] = useState<number | null>(null)
  const [closed, setClosed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)

      // 1) fetch one upsell product not owned by user
      try {
        const { data: prodData, error: prodErr } = await supabase
          .from('products')
          .select('id, title, checkout_url, widget_badge_text, widget_alert_text, upsell_priority')
          .order('upsell_priority', { ascending: true })
          .limit(10)

        if (prodErr) {
          console.warn('NextStepWidget: product query error', prodErr)
        }

        // pick first product not owned by user
        let picked: any = null
        if (Array.isArray(prodData)) {
          const notOwned = prodData.filter((p: any) => !userProducts.includes(String(p.id)))
          // Prefer products that include a widget message/badge so the user sees the alert
          picked = notOwned.find((p: any) => p.widget_alert_text || p.widget_badge_text) || notOwned[0] || null
        }
        if (mounted) setProduct(picked)
      } catch (e) {
        console.warn('NextStepWidget product fetch failed', e)
      }

      // 2) count total products
      try {
        const { data: countData, count, error: countErr } = await supabase.from('products').select('id', { count: 'exact', head: false })
        if (countErr) {
          console.warn('NextStepWidget: count query error', countErr)
        }
        if (mounted) {
          const cd: any = countData
          const total = typeof count === 'number' ? count : Array.isArray(cd) ? cd.length : 0
          setTotalProducts(total)
        }

      // debug
      try {
        console.debug('NextStepWidget debug', {
          userProducts,
          picked: product,
          totalProducts
        })
      } catch (e) {
        /* ignore */
      }
      } catch (e) {
        console.warn('NextStepWidget count fetch failed', e)
        if (mounted) setTotalProducts(0)
      }

      if (mounted) setLoading(false)
    }

    load()
    return () => {
      mounted = false
    }
  }, [supabase, userProducts])

  if (closed) return null
  if (loading) return null
  if (totalProducts === null) return null


  const ownedCount = userProducts ? userProducts.length : 0
  const pct = totalProducts > 0 ? Math.round((ownedCount / totalProducts) * 100) : 100

  if (pct >= 100) return null
  if (!product) return null

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm text-zinc-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
          <div className="text-sm text-zinc-700">Análise de Perfil:</div>
          {product.widget_badge_text && (
            <div className="ml-2 bg-zinc-100 text-zinc-700 text-xs px-2 py-0.5 rounded">{product.widget_badge_text}</div>
          )}
        </div>
        <button onClick={() => setClosed(true)} className="text-zinc-400 text-sm">Fechar</button>
      </div>


      <div className="w-full bg-zinc-100 h-2 rounded-full mt-3 overflow-hidden">
        <div className="bg-zinc-900 h-2 rounded-full" style={{ width: `${pct}%` }} />
      </div>

      {product.widget_alert_text && <div className="text-sm text-zinc-600 mt-4">{product.widget_alert_text}</div>}

      <button
        onClick={() => product.checkout_url && window.open(product.checkout_url, '_blank')}
        className="w-full mt-4 bg-zinc-900 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-zinc-800 transition-colors"
      >
        Ver Próximo Passo
      </button>

      
    </div>
  )
}
