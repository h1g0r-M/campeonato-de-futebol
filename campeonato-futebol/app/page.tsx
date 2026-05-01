'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'

export default function Home() {
  const [teams, setTeams] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])

  // =========================
  // LOAD DATA
  // =========================
  async function loadData() {
    const { data: t } = await supabase
      .from('teams')
      .select('*')

    const { data: m } = await supabase
      .from('matches')
      .select('*')
      .order('position')

    setTeams(t || [])
    setMatches(m || [])
  }

  // =========================
  // REALTIME
  // =========================
  useEffect(() => {
    loadData()

    const channel = supabase
      .channel('realtime-public')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches'
        },
        () => loadData()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // =========================
  // GET TEAM
  // =========================
  function getTeam(id: string) {
    return teams.find(t => t.id === id)
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-10">
      <h1 className="text-4xl text-center mb-10 font-bold">
        🏆 Campeonato
      </h1>

      <div className="overflow-x-auto relative">

        {/* LINHAS */}
        <div className="absolute left-[240px] top-[140px] h-[260px] w-[2px] bg-zinc-600"></div>
        <div className="absolute left-[480px] top-[200px] h-[140px] w-[2px] bg-zinc-600"></div>

        <div className="flex gap-20 min-w-[900px]">

          {/* ================= QUARTAS ================= */}
          <div className="flex flex-col justify-between">
            <h2 className="text-center mb-4 font-bold">
              Quartas
            </h2>

            {matches
              .filter(m => m.round === 'quarter')
              .map(m => {
                const t1 = getTeam(m.team1_id)
                const t2 = getTeam(m.team2_id)

                return (
                  <div
                    key={m.id}
                    className="bg-zinc-800 p-3 rounded mb-10 w-48"
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={t1?.logo}
                        className="w-6 h-6"
                      />
                      <span>{t1?.name}</span>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <img
                        src={t2?.logo}
                        className="w-6 h-6"
                      />
                      <span>{t2?.name}</span>
                    </div>

                    <div className="text-sm mt-3 text-zinc-400">
                      {m.score1 ?? 0} x {m.score2 ?? 0}
                    </div>
                  </div>
                )
              })}
          </div>

          {/* ================= SEMI ================= */}
          <div className="flex flex-col justify-around">
            <h2 className="text-center mb-4 font-bold">
              Semi
            </h2>

            {matches
              .filter(m => m.round === 'semi')
              .map(m => {
                const t1 = getTeam(m.team1_id)
                const t2 = getTeam(m.team2_id)

                return (
                  <div
                    key={m.id}
                    className="bg-zinc-700 p-3 rounded mb-20 w-48"
                  >
                    <p>{t1?.name || '---'}</p>
                    <p>{t2?.name || '---'}</p>

                    <div className="text-sm mt-2">
                      {m.score1 ?? 0} x {m.score2 ?? 0}
                    </div>
                  </div>
                )
              })}
          </div>

          {/* ================= FINAL ================= */}
          <div className="flex flex-col justify-center">
            <h2 className="text-center mb-4 font-bold">
              Final
            </h2>

            {matches
              .filter(m => m.round === 'final')
              .map(m => {
                const t1 = getTeam(m.team1_id)
                const t2 = getTeam(m.team2_id)
                const winner = getTeam(m.winner_id)

                return (
                  <div
                    key={m.id}
                    className="bg-yellow-600 p-4 rounded w-56 text-center"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <img
                        src={t1?.logo}
                        className="w-6 h-6"
                      />
                      <span>{t1?.name}</span>
                    </div>

                    <div className="flex items-center justify-center gap-2 mt-2">
                      <img
                        src={t2?.logo}
                        className="w-6 h-6"
                      />
                      <span>{t2?.name}</span>
                    </div>

                    <div className="text-xl font-bold mt-3">
                      {m.score1 ?? 0} x {m.score2 ?? 0}
                    </div>

                    {winner && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: 'spring',
                          stiffness: 120
                        }}
                        className="mt-4 flex justify-center items-center gap-2"
                      >
                        🏆
                        <img
                          src={winner.logo}
                          className="w-6 h-6"
                        />
                        <span className="font-bold">
                          {winner.name}
                        </span>
                      </motion.div>
                    )}
                  </div>
                )
              })}
          </div>

        </div>
      </div>
    </main>
  )
}