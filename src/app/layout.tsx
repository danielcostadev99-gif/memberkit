import '../styles/globals.css'
import { FunnelProvider } from '../context/FunnelProviderClean'
import SupabaseProvider from '../components/SupabaseProvider'

export const metadata = {
  title: 'MemberKit',
  description: 'Plataforma de membros',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-zinc-950 text-white min-h-screen" suppressHydrationWarning>
        <SupabaseProvider>
          <FunnelProvider>{children}</FunnelProvider>
        </SupabaseProvider>
      </body>
    </html>
  )
}

