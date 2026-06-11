import { NextResponse } from 'next/server'

export async function POST() {
  const headers = new Headers()

  // Clear the cookies by setting Max-Age=0
  headers.append('Set-Cookie', 'sb-access-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0')
  headers.append('Set-Cookie', 'sb-refresh-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0')
  headers.append('Set-Cookie', 'supabase-auth-token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0')

  return NextResponse.json({ ok: true }, { headers })
}
