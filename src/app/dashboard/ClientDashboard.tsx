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

      console.log('user_access query', { accessData, accessErr })
      try {
        console.log('user_access full rows:', JSON.stringify(accessData, null, 2))
      } catch (e) {
        console.log('user_access inspect failed', e)
      }
      if (accessErr) {
        console.error(accessErr)
        setLoading(false)
        return
      }

      const ownedProducts: Product[] = (accessData || [])
        .map((r: any) => r.products)
        .filter(Boolean)

      console.log('ownedProducts from access rows', ownedProducts)

      const productIds = (accessData || []).map((r: any) => r.product_id)
      console.log('productIds from user_access rows', productIds)

      if ((ownedProducts || []).length === 0 && productIds.length > 0) {
        // Fallback: query products directly by id to debug why nested relation is empty
        const { data: directProducts, error: directErr } = await supabase
          .from('products')
          .select('*')
          .in('id', productIds)

        console.log('directProducts lookup', { directProducts, directErr })
      }

      // escolhe o funnel do primeiro produto comprado
      const funnelId = ownedProducts[0]?.funnel_id

      let recommendedProducts: Product[] = []
      if (funnelId) {
        const { data: productsData, error: prodErr } = await supabase
          .from('products')
          .select('*')
          .eq('funnel_id', funnelId)

        console.log('products query for funnel', { funnelId, productsData, prodErr })
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
    <div className="min-h-screen text-white">
      {/* Header / Navbar */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-zinc-900/50 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-emerald-500 font-bold tracking-wider">MEMBERKIT</span>
          </div>
          <div>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="text-zinc-100 text-sm px-3 py-1 rounded-md border border-zinc-700 hover:bg-zinc-800/60 transition"
            >
              {loggingOut ? 'Saindo...' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      <main className="pt-20 max-w-7xl mx-auto px-6 pb-12">
        {/* Active Programs Section */}
        <section className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-1 h-6 bg-emerald-500 rounded" />
            <h1 className="text-2xl tracking-wide font-semibold">Seus Programas</h1>
          </div>

          {owned.length === 0 ? (
            <div className="text-zinc-400">Você ainda não possui nenhum programa.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {owned.map((p) => (
                <button
                  key={p.id}
                  onClick={() => router.push(p.product_route)}
                  className="group bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden text-left transform transition duration-200 hover:scale-[1.02]"
                >
                  <div className="relative aspect-video bg-black">
                    {p.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-500">No image</div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="text-lg font-semibold group-hover:text-emerald-500 transition">{p.title}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Recommended Section */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <span className="w-1 h-6 bg-emerald-500 rounded" />
            <h2 className="text-2xl tracking-wide font-semibold">Recomendados para Você</h2>
          </div>

          {recommended.length === 0 ? (
            <div className="text-zinc-400">Sem recomendações por enquanto.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {recommended.map((p) => (
                <div key={p.id} className="relative">
                  <button
                    onClick={() => setModalProduct(p)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden text-left opacity-40 hover:opacity-80 transition transform duration-200"
                  >
                    <div className="relative aspect-video bg-black">
                      {p.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500">No image</div>
                      )}
                      <div className="absolute top-3 right-3 bg-black/60 p-2 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-zinc-200" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2a4 4 0 00-4 4v2H7a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2v-7a2 2 0 00-2-2h-1V6a4 4 0 00-4-4zM9 8a3 3 0 116 0v2H9V8z" />
                        </svg>
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <div className="text-lg font-semibold">{p.title}</div>
                      <div className="text-zinc-300">🔒</div>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Modal Upsell */}
      {modalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalProduct(null)} />
          <div className="relative z-10 w-full max-w-2xl mx-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold">{modalProduct.title}</h3>
                  <p className="text-zinc-400 mt-2">{modalProduct.description}</p>
                </div>
                <button onClick={() => setModalProduct(null)} className="text-zinc-300 text-sm px-3 py-1 rounded border border-zinc-700">Fechar</button>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <a
                  href={modalProduct.checkout_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-md font-medium"
                >
                  Comprar
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
