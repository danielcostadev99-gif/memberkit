"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Exercise = {
  id: string
  name: string
  sets: string
  reps: string
  vimeoUrl: string
}

const MONTHS: Record<string, Exercise[]> = {
  'Mês 1': [
    { id: 'm1e1', name: 'Agachamento', sets: '3', reps: '10', vimeoUrl: 'https://player.vimeo.com/video/123456789' },
    { id: 'm1e2', name: 'Supino', sets: '3', reps: '8', vimeoUrl: 'https://player.vimeo.com/video/987654321' }
  ],
  'Mês 2': [
    { id: 'm2e1', name: 'Avanço', sets: '4', reps: '8', vimeoUrl: 'https://player.vimeo.com/video/234567890' },
    { id: 'm2e2', name: 'Remada', sets: '4', reps: '10', vimeoUrl: 'https://player.vimeo.com/video/876543210' }
  ],
  'Mês 3': [
    { id: 'm3e1', name: 'Pliometria', sets: '5', reps: '6', vimeoUrl: 'https://player.vimeo.com/video/345678901' },
    { id: 'm3e2', name: 'Levantamento Terra', sets: '4', reps: '6', vimeoUrl: 'https://player.vimeo.com/video/765432109' }
  ]
}

export default function TreinoGLP1Page() {
  const router = useRouter()
  const tabs = Object.keys(MONTHS)
  const [active, setActive] = useState(tabs[0])

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold">Treino GLP-1 — 3 Meses</h1>
            <p className="text-neutral-400">Programa principal de atividade física (3 meses)</p>
          </div>

          <div>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded"
            >
              Voltar para Painel
            </button>
          </div>
        </header>

        <nav className="mb-6">
          <div className="flex gap-3">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setActive(t)}
                className={`px-4 py-2 rounded ${t === active ? 'bg-red-600' : 'bg-neutral-800 text-neutral-300'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </nav>

        <section>
          <h2 className="text-2xl font-semibold mb-4">{active}</h2>

          <div className="overflow-x-auto bg-neutral-800 rounded">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="text-left">
                  <th className="px-4 py-3">Nome do Exercício</th>
                  <th className="px-4 py-3">Séries</th>
                  <th className="px-4 py-3">Repetições</th>
                  <th className="px-4 py-3">Vídeo</th>
                </tr>
              </thead>
              <tbody>
                {MONTHS[active].map((ex) => (
                  <tr key={ex.id} className="border-t border-neutral-700 align-top">
                    <td className="px-4 py-4 align-top">{ex.name}</td>
                    <td className="px-4 py-4 align-top">{ex.sets}</td>
                    <td className="px-4 py-4 align-top">{ex.reps}</td>
                    <td className="px-4 py-4 align-top">
                      <div className="w-80 h-44 bg-black rounded overflow-hidden">
                        <iframe
                          src={ex.vimeoUrl}
                          width="100%"
                          height="100%"
                          allow="autoplay; fullscreen; picture-in-picture"
                          className="w-full h-full"
                          title={ex.name}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
