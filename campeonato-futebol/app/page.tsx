'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'

export default function Home() {
  const [teams, setTeams] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])

  async function loadData() {
    const { data: t } = await supabase.from('teams').select('*')
    const { data: m } = await supabase
      .from('matches')
      .select('*')
      .order('position')

    setTeams(t || [])
    setMatches(m || [])
  }

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel('public-live')
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

  function getTeam(id: string) {
    return teams.find(t => t.id === id)
  }

  function getChampion() {
    const final = matches.find(m => m.round === 'final' && m.winner_id)
    if (!final) return null
    return getTeam(final.winner_id)
  }

  const champion = getChampion()

  const status = champion
    ? '🏆 Campeão definido'
    : matches.some(m => m.score1 !== null)
    ? '🔴 Campeonato em andamento'
    : '⚽ Aguardando início'

  function Card({ match, color }: any) {
    const t1 = getTeam(match.team1_id)
    const t2 = getTeam(match.team2_id)

    return (
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.04 }}
        className={`${color} p-4 rounded-2xl w-56 shadow-xl mb-8 border border-white/10`}
      >
        <div className="flex items-center gap-2 mb-2">
          <img src={t1?.logo} className="w-8 h-8 object-contain" />
          <span className="font-semibold">{t1?.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <img src={t2?.logo} className="w-8 h-8 object-contain" />
          <span className="font-semibold">{t2?.name}</span>
        </div>

        <div className="text-center text-xl font-bold mt-4">
          {match.score1 ?? 0} x {match.score2 ?? 0}
        </div>
      </motion.div>
    )
  }

  return (
<main className="min-h-screen relative overflow-hidden text-white bg-gradient-to-br from-zinc-950 via-emerald-950 to-zinc-950">
{/* LUZ VERDE ESQUERDA */}
<div className="absolute top-20 left-10 w-72 h-72 bg-green-500/10 blur-[130px] rounded-full"></div>

{/* LUZ DOURADA DIREITA */}
<div className="absolute bottom-20 right-10 w-72 h-72 bg-yellow-500/10 blur-[130px] rounded-full"></div>

{/* LUZ CENTRAL */}
<div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-white/5 blur-[160px] rounded-full"></div>

{/* CAMADA CONTEÚDO */}
<div className="relative z-10">
      {/* TOPO */}
      <section className="relative text-center py-14 px-4 border-b border-white/10 overflow-hidden">

  {/* IMAGEM FUNDO */}
  <div
    className="absolute inset-0 bg-cover bg-center"
    style={{
      backgroundImage:
        "url('https://static.vecteezy.com/ti/fotos-gratis/t2/20622404-futebol-cena-as-noite-combine-com-fechar-acima-do-uma-futebol-sapato-batendo-a-bola-com-poder-foto.jpg')"
    }}
  />

  {/* CAMADA ESCURA */}
  <div className="absolute inset-0 bg-black/70" />

  {/* CONTEÚDO */}
  <div className="relative z-10">
    <motion.h1
      initial={{ opacity: 0, y: -25 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-5xl md:text-6xl font-black tracking-wide"
    >
      🏆 Amistoso
    </motion.h1>

    <p className="mt-4 text-zinc-300 text-lg">
      Com times inimagináveis
    </p>

    <div className="mt-6 inline-block bg-red-600 px-5 py-2 rounded-full font-bold animate-pulse">
      {status}
    </div>
  </div>

</section>

      {/* CHAVEAMENTO */}
      <section className="p-8 overflow-x-auto">
        <div className="flex gap-20 min-w-[1100px]">

          {/* QUARTAS */}
          <div>
            <h2 className="text-center text-xl font-bold mb-6 text-zinc-300">
              Quartas
            </h2>

            {matches
              .filter(m => m.round === 'quarter')
              .map(m => (
                <Card key={m.id} match={m} color="bg-gradient-to-br from-zinc-900 to-zinc-800" />
              ))}
          </div>

          {/* SEMI */}
          <div>
            <h2 className="text-center text-xl font-bold mb-6 text-zinc-300">
              Semi Final
            </h2>

            {matches
              .filter(m => m.round === 'semi')
              .map(m => (
                <Card key={m.id} match={m} color="bg-blue-900/50" />
              ))}
          </div>

          {/* FINAL */}
          <div>
            <h2 className="text-center text-xl font-bold mb-6 text-yellow-400">
              Final
            </h2>

            {matches
              .filter(m => m.round === 'final')
              .map(m => (
                <Card key={m.id} match={m} color="bg-yellow-700/80" />
              ))}
          </div>

        </div>
      </section>

      {/* CAMPEÃO */}
      {champion && (
        <section className="text-center py-12 border-t border-white/10">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 120 }}
            className="inline-block bg-yellow-500 text-black px-8 py-5 rounded-2xl shadow-2xl"
          >
            <div className="text-3xl font-black mb-2">
              🏆 CAMPEÃO
            </div>

            <div className="flex items-center gap-3 justify-center">
              <img
                src={champion.logo}
                className="w-10 h-10 object-contain"
              />
              <span className="text-2xl font-bold">
                {champion.name}
              </span>
            </div>
          </motion.div>
        </section>
      )}

      {/* RODAPÉ */}
      <footer className="text-center py-8 text-zinc-500 text-sm">
        Atualização automática em tempo real ⚽
      </footer>
    </div>
    </main>

  )
}