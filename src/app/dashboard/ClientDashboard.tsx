"use client"

import { useEffect, useState } from 'react'
import { useSupabase } from '../../components/SupabaseProvider'
import { useRouter } from 'next/navigation'

type Product = {
  id: string
  slug: string
  title: string
  description?: string
  thumbnail_url?: string
  checkout_url: string
  product_route: string
  funnel_id: string
}

export default function ClientDashboard() {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [loading, setLoading] = useState(true)
  const [owned, setOwned] = useState<Product[]>([])
  const [recommended, setRecommended] = useState<Product[]>([])
  const [modalProduct, setModalProduct] = useState<Product | null>(null)

  const supabase = useSupabase()

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.warn('supabase signOut failed', e)
    }

    try {
      await fetch('/api/auth/clear-session', { method: 'POST' })
    } catch (e) {
      console.warn('clear-session API failed', e)
    }

    setLoggingOut(false)
    router.replace('/login')
  }

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)

      const {
        data: { user }
      } = await supabase.auth.getUser()

      if (!user || !user.id) {
        setLoading(false)
        return
      }

      // Produtos que o usuário possui
      const { data: accessData, error: accessErr } = await supabase
        .from('user_access')
        .select('*, products(*)')
        .eq('user_id', user.id)
        .eq('status', 'active')

      if (accessErr) {
        console.error(accessErr)
        setLoading(false)
        return
      }

      const ownedProducts: Product[] = (accessData || [])
        .map((r: any) => r.products)
        .filter(Boolean)

      // escolhe o funnel do primeiro produto comprado
      const funnelId = ownedProducts[0]?.funnel_id

      let recommendedProducts: Product[] = []
      if (funnelId) {
        const { data: productsData, error: prodErr } = await supabase
          .from('products')
          .select('*')
          .eq('funnel_id', funnelId)

        if (!prodErr && productsData) {
          const ownedIds = new Set(ownedProducts.map((p) => p.id))
          recommendedProducts = productsData.filter((p: Product) => !ownedIds.has(p.id))
        }
      }

      if (!mounted) return
      setOwned(ownedProducts)
      setRecommended(recommendedProducts)
      setLoading(false)
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  if (loading) {
    return <div className="p-8 text-white">Carregando...</div>
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white px-8 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Seus Programas</h1>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="ml-4 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded"
        >
          {loggingOut ? 'Saindo...' : 'Logout'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
        {owned.length === 0 && (
          <div className="text-neutral-400">Você ainda não possui nenhum programa.</div>
        )}

        {owned.map((p) => (
          <button
            key={p.id}
            onClick={() => router.push(p.product_route)}
            className="group bg-neutral-800 rounded overflow-hidden text-left hover:scale-105 transition-transform"
          >
            <div className="aspect-video bg-black flex items-center justify-center">
              {p.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover" />
              ) : (
                <div className="text-neutral-500">No image</div>
              )}
            </div>
            <div className="p-3">
              <div className="font-semibold">{p.title}</div>
            </div>
          </button>
        ))}
      </div>

      <h2 className="text-2xl font-bold mb-6">Recomendados para Você</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {recommended.length === 0 && (
          <div className="text-neutral-400">Sem recomendações por enquanto.</div>
        )}

        {recommended.map((p) => (
          <div key={p.id} className="relative group">
            <button
              onClick={() => setModalProduct(p)}
              className="bg-neutral-800 rounded overflow-hidden text-left w-full opacity-60 hover:opacity-80 transition"
            >
              <div className="aspect-video bg-black flex items-center justify-center">
                {p.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-neutral-500">No image</div>
                )}
              </div>
              <div className="p-3 flex items-center justify-between">
                <div className="font-semibold">{p.title}</div>
                <div className="ml-2">🔒</div>
              </div>
            </button>
          </div>
        ))}
      </div>

      {modalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-neutral-900 rounded p-6 w-full max-w-lg">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold">{modalProduct.title}</h3>
                <p className="text-neutral-400 text-sm">{modalProduct.description}</p>
              </div>
              <button onClick={() => setModalProduct(null)} className="text-neutral-400">Fechar</button>
            </div>

            <div className="mt-4">
              <a
                href={modalProduct.checkout_url}
                target="_blank"
                rel="noreferrer"
                className="inline-block bg-red-600 text-white px-4 py-2 rounded"
              >
                Comprar
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
