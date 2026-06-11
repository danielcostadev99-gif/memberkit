"use client"
"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Exercise = {
  id: string
  name: string
  sets: string
  reps: string
  vimeoUrl: string
  group?: string
}

type MonthData = {
  A: Exercise[]
  B: Exercise[]
  C: Exercise[]
}

const MONTHS: Record<string, MonthData> = {
  'Mês 1': {
    A: [
      { id: 'm1a1', name: 'Supino', sets: '3', reps: '8', vimeoUrl: 'https://player.vimeo.com/video/987654321', group: 'peito' },
    ],
    B: [
      { id: 'm1b1', name: 'Agachamento', sets: '3', reps: '10', vimeoUrl: 'https://player.vimeo.com/video/123456789', group: 'pernas' },
    ],
    C: [
      { id: 'm1c1', name: 'Prancha (Core)', sets: '3', reps: '60s', vimeoUrl: 'https://player.vimeo.com/video/111111111', group: 'core' },
    ],
  },
  'Mês 2': {
    A: [
      { id: 'm2a1', name: 'Remada Curvada', sets: '4', reps: '10', vimeoUrl: 'https://player.vimeo.com/video/876543210', group: 'costas' },
    ],
    B: [
      { id: 'm2b1', name: 'Avanço', sets: '4', reps: '8', vimeoUrl: 'https://player.vimeo.com/video/234567890', group: 'pernas' },
      { id: 'm2b2', name: 'Levantamento Terra', sets: '4', reps: '6', vimeoUrl: 'https://player.vimeo.com/video/765432109', group: 'posterior' },
    ],
    C: [
      { id: 'm2c1', name: 'Corrida Leve (Cardio)', sets: '1', reps: '20min', vimeoUrl: 'https://player.vimeo.com/video/222222222', group: 'cardio' },
    ],
  },
  'Mês 3': {
    A: [
      { id: 'm3a1', name: 'Supino Inclinado', sets: '3', reps: '8', vimeoUrl: 'https://player.vimeo.com/video/333333333', group: 'peito' },
    ],
    B: [
      { id: 'm3b1', name: 'Agachamento Frontal', sets: '4', reps: '8', vimeoUrl: 'https://player.vimeo.com/video/444444444', group: 'pernas' },
    ],
    C: [
      { id: 'm3c1', name: 'Pliometria', sets: '5', reps: '6', vimeoUrl: 'https://player.vimeo.com/video/345678901', group: 'cardio' },
    ],
  },
}

const TREINOS = [
  { key: 'A', label: 'TREINO A (Membros Superiores)' },
  { key: 'B', label: 'TREINO B (Membros Inferiores)' },
  { key: 'C', label: 'TREINO C (Cardio e Core)' },
]

export default function TreinoGLP1Page() {
  const router = useRouter()
  const tabs = Object.keys(MONTHS)
  const [activeMonth, setActiveMonth] = useState(tabs[0])
  const [activeTreino, setActiveTreino] = useState<'A' | 'B' | 'C'>('A')
  const exercises = MONTHS[activeMonth][activeTreino]
  const [currentVideo, setCurrentVideo] = useState<string>(exercises[0]?.vimeoUrl || '')

  function handlePlay(ex: Exercise) {
    setCurrentVideo(ex.vimeoUrl)
    // On mobile, scroll to player could be added here
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Treino GLP-1 — 3 Meses</h1>
            <p className="text-neutral-400">Programa principal de atividade física (3 meses)</p>
          </div>

          <div>
            <button onClick={() => router.push('/dashboard')} className="bg-neutral-800 hover:bg-neutral-700 px-4 py-2 rounded">
              Voltar para Painel
            </button>
          </div>
        </header>

        <nav className="mb-4">
          <div className="flex gap-3 flex-wrap">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => { setActiveMonth(t); setActiveTreino('A'); setCurrentVideo(MONTHS[t].A[0]?.vimeoUrl || '') }}
                className={`px-4 py-2 rounded-full text-sm font-medium ${t === activeMonth ? 'bg-emerald-500 text-black' : 'bg-neutral-800 text-neutral-300'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              {TREINOS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => { setActiveTreino(t.key as 'A' | 'B' | 'C'); setCurrentVideo(MONTHS[activeMonth][t.key as 'A' | 'B' | 'C'][0]?.vimeoUrl || '') }}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold ${activeTreino === t.key ? 'bg-emerald-600 text-black' : 'bg-neutral-800 text-neutral-300'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Exercises list */}
            <div>
              {exercises.length === 0 ? (
                <div className="text-neutral-400">Nenhum exercício cadastrado para este treino.</div>
              ) : (
                <div className="space-y-3">
                  {exercises.map((ex) => (
                    <div
                      key={ex.id}
                      className="flex flex-col md:flex-row items-start md:items-center justify-between bg-zinc-900/50 rounded-md p-4"
                    >
                      <div className="flex-1">
                        <div className="text-white font-semibold text-lg">{ex.name}</div>
                        <div className="text-neutral-300 text-sm mt-1">Séries: <span className="text-neutral-200">{ex.sets}</span> • Repetições: <span className="text-neutral-200">{ex.reps}</span></div>
                      </div>

                      <div className="mt-3 md:mt-0 md:ml-4 flex items-center gap-3">
                        <button
                          onClick={() => handlePlay(ex)}
                          className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 rounded-md text-sm"
                        >
                          Ver Execução
                        </button>
                        <a
                          href={ex.vimeoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-neutral-400 hover:text-neutral-200"
                        >
                          Abrir no Vimeo
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Player column */}
          <aside className="md:col-span-1">
            <div className="bg-neutral-800 rounded-md p-3">
              <div className="text-sm text-neutral-300 mb-2">Vídeo de execução</div>
              {currentVideo ? (
                <div className="w-full aspect-video bg-black rounded overflow-hidden">
                  <iframe src={currentVideo} width="100%" height="100%" allow="autoplay; fullscreen; picture-in-picture" className="w-full h-full" title="Execução" />
                </div>
              ) : (
                <div className="w-full aspect-video bg-neutral-900 rounded flex items-center justify-center text-neutral-500">Selecione um exercício</div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
