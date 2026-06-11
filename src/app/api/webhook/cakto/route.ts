import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const runtime = 'nodejs'

type WebhookPayload = {
  email?: string
  product_slug?: string
  productSlug?: string
  slug?: string
}

function randomPassword() {
  return crypto.randomBytes(16).toString('base64') + 'A1!'
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as WebhookPayload
    const email = (body.email || '').toLowerCase().trim()
    const productSlug = (body.product_slug || body.productSlug || body.slug || '').trim()

    if (!email || !productSlug) {
      return NextResponse.json({ error: 'Invalid payload: email and product slug are required' }, { status: 400 })
    }

    // Read env vars inside handler to avoid build-time failures
    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase env vars at runtime')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })

    // 1) Verify product exists
    const { data: product, error: productErr } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('slug', productSlug)
      .maybeSingle()

    if (productErr) {
      console.error('Error querying product:', productErr)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // 2) Find user by email using admin API with a safe fallback
    let userId: string | undefined
    try {
      // Prefer admin.listUsers if available
      const listFn: any = supabaseAdmin.auth?.admin?.listUsers
      if (typeof listFn === 'function') {
        const res = await listFn.call(supabaseAdmin.auth.admin, {})
        const users = (res && res.data && res.data.users) || res.data || []
        const found = users.find((u: any) => (u.email || '').toLowerCase() === email)
        if (found) userId = found.id || found.user?.id
      }
    } catch (e) {
      console.warn('admin.listUsers failed, falling back to direct auth.users query', e)
    }

    if (!userId) {
      try {
        // Fallback: try reading auth.users table directly (service role should have access)
        const { data: existingUser, error: userQueryErr } = await supabaseAdmin
          .from('auth.users')
          .select('id,email')
          .eq('email', email)
          .maybeSingle()

        if (userQueryErr) {
          console.warn('auth.users query failed', userQueryErr)
        } else if (existingUser && existingUser.id) {
          userId = existingUser.id
        }
      } catch (e) {
        console.warn('Fallback auth.users query threw', e)
      }
    }

    // 3) Create user if not found
    if (!userId) {
      const password = randomPassword()
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      } as any)

      if (createErr) {
        console.error('Error creating user via admin API:', createErr)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }

      const createdAny = created as any
      userId = createdAny?.user?.id || createdAny?.id
      if (!userId) {
        console.error('Unexpected createUser response:', createdAny)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }
    }

    // 4) Upsert user_access for 90 days
    const validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

    const upsertPayload = {
      user_id: userId,
      product_id: product.id,
      status: 'active',
      valid_until: validUntil,
    }

    const { error: accessErr } = await supabaseAdmin
      .from('user_access')
      .upsert(upsertPayload, { onConflict: 'user_id,product_id' as any })

    if (accessErr) {
      console.error('Error upserting user_access:', accessErr)
      return NextResponse.json({ error: 'Failed to update access' }, { status: 500 })
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err: any) {
    console.error('Webhook handler error:', err)
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
