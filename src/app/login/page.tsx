import React, { Suspense } from 'react'
import ClientLogin from './ClientLogin'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
      <ClientLogin />
    </Suspense>
  )
}
