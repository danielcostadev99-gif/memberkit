import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { access_token, refresh_token, expires_at } = body || {}

    if (!access_token) {
      return NextResponse.json({ error: 'missing access_token' }, { status: 400 })
    }

    const now = Math.floor(Date.now() / 1000)
    const maxAge = typeof expires_at === 'number' ? Math.max(0, expires_at - now) : 60 * 60 * 24 * 7

    const headers = new Headers()
    // Set cookies the middleware checks for. Keep them HttpOnly so client JS can't tamper.
    headers.append(
      'Set-Cookie',
      `sb-access-token=${access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`
    )
    if (refresh_token) {
      headers.append(
        'Set-Cookie',
        `sb-refresh-token=${refresh_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`
      )
    }

    // Also set a simple sentinel cookie so middleware can detect authentication.
    headers.append('Set-Cookie', `supabase-auth-token=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`)

    return NextResponse.json({ ok: true }, { headers })
  } catch (err) {
    return NextResponse.json({ error: 'invalid request' }, { status: 400 })
  }
}
