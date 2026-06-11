import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const runtime = 'nodejs'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // Fail fast during build so server routes that rely on the service role don't compile without vars
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

type WebhookPayload = {
  email?: string
  product_slug?: string
}

function randomPassword() {
  return crypto.randomBytes(16).toString('base64') + 'A1!'
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as WebhookPayload
    const email = (body.email || '').toLowerCase().trim()
    const productSlug = (body.product_slug || '').trim()

    if (!email || !productSlug) {
      return NextResponse.json({ error: 'Invalid payload: email and product_slug are required' }, { status: 400 })
    }

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

    // 2) Find user in auth.users (service role allows querying auth.users)
    const { data: existingUser, error: userQueryErr } = await supabaseAdmin
      .from('auth.users')
      .select('id,email')
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
      const password = randomPassword()
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      } as any)

      if (createErr) {
        console.error('Error creating user:', createErr)
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }

      // created may contain different shapes depending on supabase version
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
