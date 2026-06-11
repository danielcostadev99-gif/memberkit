import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Protege rotas que começam com /dashboard
export const config = {
  matcher: ['/dashboard/:path*']
}

export function middleware(req: NextRequest) {
  // Nomes comuns de cookies usados por Supabase/SSO
  const possibleCookies = [
    'sb-access-token',
    'supabase-auth-token',
    'sb:token',
    'sb_session'
  ]

  const hasSession = possibleCookies.some((name) => !!req.cookies.get(name)?.value)

  if (hasSession) return NextResponse.next()

  // Não autenticado -> redireciona para /login e guarda a rota original em `redirect`
  const loginUrl = new URL('/login', req.url)
  const original = req.nextUrl.pathname + req.nextUrl.search
  loginUrl.searchParams.set('redirect', original)

  return NextResponse.redirect(loginUrl)
}
