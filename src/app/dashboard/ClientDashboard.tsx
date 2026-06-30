"use client"

import { useEffect, useRef, useState } from 'react'
import { useSupabase } from '../../components/SupabaseProvider'
import { useRouter } from 'next/navigation'
import NextStepWidget from '../../components/dashboard/NextStepWidget'

type Product = {
  id: string
  slug: string
  title: string
  description?: string
  thumbnail_url?: string
  vimeo_url?: string
  upsell_unlock_seconds?: number | null
  price_anchor_text?: string
  price_offer_text?: string
  checkout_url: string
  product_route: string
  funnel_id: string
}

const DEFAULT_UNLOCK_TIME_SECONDS = 45
const UPSELL_PROGRESS_KEY_PREFIX = 'memberkit:upsell-progress:'

function getUpsellProgressKey(productId: string) {
  return `${UPSELL_PROGRESS_KEY_PREFIX}${productId}`
}

function extractVimeoId(url: string): string | null {
  const value = (url || '').trim()
  if (!value) return null

  const directMatch = value.match(/vimeo\.com\/(?:video\/)?(\d+)/i)
  if (directMatch?.[1]) return directMatch[1]

  const idOnlyMatch = value.match(/^(\d{6,})$/)
  return idOnlyMatch?.[1] || null
}

function getUpsellEmbedUrl(product: Product | null) {
  if (!product) return null
  const rawUrl = (product.vimeo_url || '').trim()
  const videoId = extractVimeoId(rawUrl)
  if (!videoId) return null

  const params = new URLSearchParams({
    autoplay: '1',
    muted: '1',
    dnt: '1',
    title: '0',
    byline: '0',
    portrait: '0',
    playsinline: '1'
  })

  return `https://player.vimeo.com/video/${videoId}?${params.toString()}`
}

function getUnlockTimeSeconds(product: Product | null) {
  const raw = Number(product?.upsell_unlock_seconds)
  if (!Number.isFinite(raw)) return DEFAULT_UNLOCK_TIME_SECONDS
  const normalized = Math.floor(raw)
  return normalized > 0 ? normalized : DEFAULT_UNLOCK_TIME_SECONDS
}

export default function ClientDashboard() {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const [loading, setLoading] = useState(true)
  const [owned, setOwned] = useState<Product[]>([])
  const [recommended, setRecommended] = useState<Product[]>([])
  const [modalProduct, setModalProduct] = useState<Product | null>(null)
  const [userProductIds, setUserProductIds] = useState<string[]>([])
  const [user, setUser] = useState<any | null>(null)
  const [watchedSeconds, setWatchedSeconds] = useState(0)
  const [conversionUnlocked, setConversionUnlocked] = useState(false)
  const [showSoundOverlay, setShowSoundOverlay] = useState(true)

  const iframeRef = useRef<HTMLIFrameElement | null>(null)
  const vimeoPlayerRef = useRef<any>(null)

  const supabase = useSupabase()
  const upsellEmbedUrl = getUpsellEmbedUrl(modalProduct)
  const unlockTimeSeconds = getUnlockTimeSeconds(modalProduct)

  function saveUpsellProgress(productId: string, seconds: number) {
    if (typeof window === 'undefined') return
    const safeSeconds = Math.max(0, Math.floor(seconds))
    try {
      const key = getUpsellProgressKey(productId)
      const existing = Number(localStorage.getItem(key) || '0')
      if (safeSeconds > existing) {
        localStorage.setItem(key, String(safeSeconds))
      }
    } catch (e) {
      console.warn('saveUpsellProgress failed', e)
    }
  }

  async function closeUpsellModal() {
    if (modalProduct && vimeoPlayerRef.current) {
      try {
        const currentTime = await vimeoPlayerRef.current.getCurrentTime()
        saveUpsellProgress(modalProduct.id, Number(currentTime || 0))
      } catch (e) {
        console.warn('closeUpsellModal: failed to read current time', e)
      }
    }

    setModalProduct(null)
    setShowSoundOverlay(true)
  }

  async function handleEnableSound() {
    if (!vimeoPlayerRef.current) return
    try {
      await vimeoPlayerRef.current.setMuted(false)
      await vimeoPlayerRef.current.setVolume(1)
      await vimeoPlayerRef.current.play()
      setShowSoundOverlay(false)
    } catch (e) {
      console.warn('handleEnableSound failed', e)
    }
  }

  async function openProductModalById(id: string) {
    try {
      const { data: productData, error: prodErr } = await supabase.from('products').select('*').eq('id', id).maybeSingle()
      if (prodErr) {
        console.warn('openProductModalById: product lookup failed', prodErr)
        return
      }
      if (productData) {
        setModalProduct(productData as Product)
      }
    } catch (e) {
      console.warn('openProductModalById failed', e)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function setupVimeoPlayer() {
      if (!modalProduct || !upsellEmbedUrl || !iframeRef.current) return

      let initialProgress = 0
      try {
        const saved = Number(localStorage.getItem(getUpsellProgressKey(modalProduct.id)) || '0')
        initialProgress = Number.isFinite(saved) ? Math.max(0, saved) : 0
      } catch (e) {
        console.warn('Failed to load upsell progress', e)
      }

      setWatchedSeconds(initialProgress)
      setConversionUnlocked(initialProgress >= unlockTimeSeconds)
      setShowSoundOverlay(true)

      const playerModule = await import('@vimeo/player')
      if (cancelled || !iframeRef.current) return

      const Player = playerModule.default
      const player = new Player(iframeRef.current)
      vimeoPlayerRef.current = player

      const onTimeUpdate = (data: { seconds: number }) => {
        const current = Math.max(0, Math.floor(data.seconds || 0))
        setWatchedSeconds((prev) => (current > prev ? current : prev))
        saveUpsellProgress(modalProduct.id, current)

        if (current >= unlockTimeSeconds) {
          setConversionUnlocked(true)
        }
      }

      const onVolumeChange = (data: { muted?: boolean; volume?: number }) => {
        const isMuted = typeof data.muted === 'boolean' ? data.muted : (data.volume || 0) === 0
        setShowSoundOverlay(isMuted)
      }

      player.on('timeupdate', onTimeUpdate)
      player.on('volumechange', onVolumeChange)

      try {
        if (initialProgress > 0) {
          await player.setCurrentTime(initialProgress)
        }
      } catch (e) {
        console.warn('Failed to seek upsell video', e)
      }
    }

    setupVimeoPlayer()

    return () => {
      cancelled = true
      const existingPlayer = vimeoPlayerRef.current
      if (existingPlayer) {
        void existingPlayer.destroy().catch((e: unknown) => {
          console.warn('Failed to destroy Vimeo player', e)
        })
      }
      vimeoPlayerRef.current = null
      setShowSoundOverlay(true)
    }
  }, [modalProduct, upsellEmbedUrl, unlockTimeSeconds])

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

      if (mounted) setUser(user)

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
      if (mounted) setUserProductIds((productIds || []).map(String))

      if ((ownedProducts || []).length === 0 && productIds.length > 0) {
        // Fallback: query products directly by id to debug why nested relation is empty
        const { data: directProducts, error: directErr } = await supabase
          .from('products')
          .select('*')
          .in('id', productIds)

        console.log('directProducts lookup', { directProducts, directErr })
      }

      let recommendedProducts: Product[] = []
      if ((ownedProducts || []).length === 0) {
        // User has no owned products — show general recommendations (all products)
        const { data: productsData, error: prodErr } = await supabase.from('products').select('*')
        console.log('no owned products, fetching all products for recommendations', { productsData, prodErr })
        if (!prodErr && productsData) {
          recommendedProducts = productsData as Product[]
        }
      } else {
        // escolhe o funnel do primeiro produto comprado
        const funnelId = ownedProducts[0]?.funnel_id
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
      }

      if (!mounted) return
      setOwned(ownedProducts)
      setRecommended(recommendedProducts)
      setUserProductIds((productIds || []).map(String))
      setLoading(false)
    }

    load()
    return () => {
      mounted = false
    }
  }, [supabase])

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
        {/* Next Step Widget */}
        <div className="mb-8">
          <NextStepWidget user_id={user?.id || ''} userProducts={userProductIds} onRequestOpen={(id) => openProductModalById(id)} />
        </div>
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
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => void closeUpsellModal()} />
          <div className={`relative z-10 w-full mx-4 transition-all duration-500 ${conversionUnlocked ? 'max-w-6xl' : 'max-w-4xl'}`}>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 md:p-6 lg:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl md:text-3xl font-semibold leading-tight">{modalProduct.title}</h3>
                  {!conversionUnlocked && (
                    <p className="text-zinc-400 mt-2 text-sm">
                      Assista {unlockTimeSeconds}s para liberar a oferta.
                      {' '}
                      Progresso: {Math.min(watchedSeconds, unlockTimeSeconds)}s/{unlockTimeSeconds}s
                    </p>
                  )}
                </div>
                <button onClick={() => void closeUpsellModal()} className="text-zinc-300 text-sm px-3 py-1 rounded border border-zinc-700 hover:bg-zinc-800 transition">Fechar</button>
              </div>

              <div className={`mt-6 grid gap-6 transition-all duration-500 ${conversionUnlocked ? 'lg:grid-cols-2 items-start' : 'grid-cols-1'}`}>
                <div className="relative rounded-xl overflow-hidden border border-zinc-700 bg-black">
                  <div className="aspect-video">
                    {upsellEmbedUrl ? (
                      <iframe
                        ref={iframeRef}
                        src={upsellEmbedUrl}
                        title={`Upsell ${modalProduct.title}`}
                        className="w-full h-full"
                        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                        allowFullScreen
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400 text-sm px-4 text-center">
                        Este produto ainda não possui URL de vídeo Vimeo configurada.
                      </div>
                    )}
                  </div>

                  {upsellEmbedUrl && showSoundOverlay && (
                    <button
                      onClick={handleEnableSound}
                      className="absolute inset-x-0 bottom-0 md:bottom-3 mx-0 md:mx-3 rounded-none md:rounded-lg bg-black/70 text-white text-sm py-2.5 px-4 hover:bg-black/80 transition"
                    >
                      Clique para ativar o som
                    </button>
                  )}
                </div>

                <div className={`transition-all duration-500 overflow-hidden ${conversionUnlocked ? 'opacity-100 translate-y-0 max-h-[1000px]' : 'opacity-0 translate-y-4 max-h-0 pointer-events-none'}`}>
                  <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-5">
                    <p className="text-zinc-300 leading-relaxed">{modalProduct.description || 'Oferta especial liberada para você.'}</p>

                    <div className="mt-5 rounded-lg border border-emerald-800/60 bg-emerald-950/30 p-4">
                      <div className="text-xs uppercase tracking-wide text-emerald-300/80">Preço Especial de Aluno</div>
                      <div className="mt-2 text-zinc-300 line-through">{modalProduct.price_anchor_text || 'De R$ 497,00'}</div>
                      <div className="text-3xl font-bold text-emerald-400">{modalProduct.price_offer_text || 'Por R$ 297,00'}</div>
                    </div>

                    <div className="mt-6">
                      <a
                        href={modalProduct.checkout_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex w-full items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-md font-semibold transition"
                      >
                        Comprar Agora
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
