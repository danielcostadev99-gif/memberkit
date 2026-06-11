import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const runtime = 'nodejs'

type WebhookBody = {
  email?: string
  slug?: string
  product_slug?: string
}

function randomPassword() {
  return crypto.randomBytes(16).toString('base64') + 'A1!'
}

export async function POST(request: Request) {
  try {
    const body: WebhookBody = await request.json()
    const email = body.email
    const slug = body.slug || body.product_slug

    if (!email || !slug) {
      return NextResponse.json({ error: 'email and slug are required' }, { status: 400 })
    }

    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Supabase env vars not configured' }, { status: 500 })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false }
    })

    // 1) Encontra o produto pelo slug
    const { data: product, error: prodErr } = await supabase
      .from('products')
      .select('id')
      .eq('slug', slug)
      .limit(1)
      .maybeSingle()

    if (prodErr) throw prodErr
    if (!product) {
      return NextResponse.json({ error: 'product not found' }, { status: 404 })
    }

    // 2) Tenta encontrar o usuário no schema auth. Com service role key podemos consultar auth.users
    const { data: existingUser, error: userQueryErr } = await supabase
      .from('auth.users')
      .select('id,email')
      .eq('email', email)
      .limit(1)
      .maybeSingle()

    if (userQueryErr) throw userQueryErr

    let userId: string

    if (existingUser && existingUser.id) {
      userId = existingUser.id
    } else {
      // 3) Cria usuário via admin
      const password = randomPassword()
      const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      } as any)

      if (createErr) throw createErr

      // resposta pode variar com versões; tentar extrair id de lugares comuns
      userId = (createData && (createData.user?.id || createData.id)) as string
      if (!userId) {
        return NextResponse.json({ error: 'failed to create user' }, { status: 500 })
      }
    }

    // 4) Concede acesso por 90 dias (upsert para evitar violação de unique)
    const validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

    const upsertPayload = {
      user_id: userId,
      product_id: product.id,
      status: 'active',
      valid_until: validUntil
    }

    const { error: accessErr } = await supabase
      .from('user_access')
      .upsert(upsertPayload, { onConflict: ['user_id', 'product_id'] })

    if (accessErr) throw accessErr

    return NextResponse.json({ status: 'ok', user_id: userId, product_id: product.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 })
  }
}
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

type WebhookPayload = {
  email?: string
  product_slug?: string
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as WebhookPayload
    const email = (payload.email || '').toLowerCase().trim()
    const productSlug = (payload.product_slug || payload.productSlug || '').trim()

    if (!email || !productSlug) {
      return NextResponse.json({ error: 'Invalid payload: email and product_slug are required' }, { status: 400 })
    }

    // 1) Verify product exists
    const { data: product, error: productErr } = await supabaseAdmin
      .from('products')
      .select('id, slug, title, is_recurring')
      .eq('slug', productSlug)
      .maybeSingle()

    if (productErr) {
      console.error('Error querying product:', productErr)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // 2) Find user in auth.users
    const { data: existingUser, error: userQueryErr } = await supabaseAdmin
      .from('auth.users')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()

    if (userQueryErr) {
      console.error('Error querying auth.users:', userQueryErr)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    let userId: string

    if (existingUser && existingUser.id) {
      userId = existingUser.id
    } else {
      // 3) Create user via Supabase Admin
      const password = crypto.randomBytes(24).toString('base64')
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      } as any)

      if (createErr) {
        console.error('Error creating user:', createErr)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }

      if (!created || !created.user || !created.user.id) {
        console.error('Unexpected createUser response:', created)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }

      userId = created.user.id
    }

    // 4) Insert or update user_access
    // Calculate expiration: 90 days from now
    const now = new Date()
    const expire = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

    const upsertPayload = {
      user_id: userId,
      product_id: product.id,
      status: 'active',
      valid_until: expire.toISOString(),
    }

    const { error: upsertErr } = await supabaseAdmin.from('user_access').upsert(upsertPayload, {
      onConflict: ['user_id', 'product_id'],
    })

    if (upsertErr) {
      console.error('Error upserting user_access:', upsertErr)
      return NextResponse.json({ error: 'Failed to update access' }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const runtime = 'nodejs'
