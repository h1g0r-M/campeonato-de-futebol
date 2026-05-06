'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import type { Match, Team } from '@/lib/types'

export default function Home() {
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loadError, setLoadError] = useState('')

  const loadTeams = useCallback(async () => {
    const { data, error } = await supabase.from('teams').select('*')

    if (error) {
      setLoadError(error.message)
      toast.error(error.message)
      return
    }

    setLoadError('')
    setTeams(data || [])
  }, [])

  const loadMatches = useCallback(async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('position')

    if (error) {
      setLoadError(error.message)
      toast.error(error.message)
      return
    }

    setLoadError('')
    setMatches(data || [])
  }, [])

  const loadData = useCallback(async () => {
    await Promise.all([loadTeams(), loadMatches()])
  }, [loadMatches, loadTeams])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => {
      loadData()
    }, 0)

    const channel = supabase
      .channel('public-live-scoreboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
        },
        () => loadMatches()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
        },
        () => loadTeams()
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          toast.error('Tempo real desconectado. Recarregue a página.')
        }
      })

    return () => {
      window.clearTimeout(initialLoad)
      supabase.removeChannel(channel)
    }
  }, [loadData, loadMatches, loadTeams])

  function getTeam(id: string | null) {
    return teams.find((team) => team.id === id)
  }

  function getChampion() {
    const final = matches.find((match) => match.round === 'final' && match.winner_id)
    if (!final) return null
    return getTeam(final.winner_id)
  }

  const champion = getChampion()

  const status = champion
    ? 'Campeão definido'
    : matches.some((match) => match.score1 !== null)
      ? 'Campeonato em andamento'
      : 'Aguardando início'

  function Card({ match, color }: { match: Match; color: string }) {
    const team1 = getTeam(match.team1_id)
    const team2 = getTeam(match.team2_id)
    const hasScore = match.score1 !== null && match.score2 !== null
    const team1Won = hasScore && match.winner_id === match.team1_id
    const team2Won = hasScore && match.winner_id === match.team2_id

    function TeamRow({
      team,
      score,
      winner,
    }: {
      team?: Team
      score: number | null
      winner: boolean
    }) {
      return (
        <div
          className={`grid grid-cols-[2rem_1fr_2.75rem] items-center gap-3 rounded-xl px-3 py-2 ${
            winner ? 'bg-emerald-500/15 text-white' : 'bg-white/5 text-zinc-200'
          }`}
        >
          {team?.logo ? (
            <img src={team.logo} alt="" className="w-8 h-8 object-contain" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/10" />
          )}

          <span className="min-w-0 truncate font-semibold">
            {team?.name || 'A definir'}
          </span>

          <span
            className={`rounded-lg py-1 text-center text-xl font-black ${
              winner ? 'bg-emerald-400 text-zinc-950' : 'bg-zinc-950/60 text-white'
            }`}
          >
            {score ?? '-'}
          </span>
        </div>
      )
    }

    return (
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.04 }}
        className={`${color} p-3 rounded-2xl w-72 shadow-xl mb-8 border border-white/10`}
      >
        <div className="mb-3 flex items-center justify-between px-1 text-xs font-bold uppercase tracking-wide text-zinc-400">
          <span>Jogo {match.position}</span>
          <span>{hasScore ? 'Encerrado' : 'Aguardando'}</span>
        </div>

        <div className="space-y-2">
          <TeamRow team={team1} score={match.score1} winner={team1Won} />
          <TeamRow team={team2} score={match.score2} winner={team2Won} />
        </div>

        {hasScore && (
          <div className="mt-3 rounded-lg bg-black/25 px-3 py-2 text-center text-xs font-bold text-zinc-300">
            Vencedor: {team1Won ? team1?.name : team2?.name}
          </div>
        )}
      </motion.div>
    )
  }

  return (
    <main className="min-h-screen relative overflow-hidden text-white bg-gradient-to-br from-zinc-950 via-emerald-950 to-zinc-950">
      <div className="absolute top-20 left-10 w-72 h-72 bg-green-500/10 blur-[130px] rounded-full" />
      <div className="absolute bottom-20 right-10 w-72 h-72 bg-yellow-500/10 blur-[130px] rounded-full" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-white/5 blur-[160px] rounded-full" />

      <div className="relative z-10">
        <section className="relative text-center py-14 px-4 border-b border-white/10 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://static.vecteezy.com/ti/fotos-gratis/t2/20622404-futebol-cena-as-noite-combine-com-fechar-acima-do-uma-futebol-sapato-batendo-a-bola-com-poder-foto.jpg')",
            }}
          />
          <div className="absolute inset-0 bg-black/70" />

          <div className="relative z-10">
            <motion.h1
              initial={{ opacity: 0, y: -25 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-6xl font-black tracking-wide"
            >
              Amistoso
            </motion.h1>

            <p className="mt-4 text-zinc-300 text-lg">Com times inimagináveis</p>

            <div className="mt-6 inline-block bg-red-600 px-5 py-2 rounded-full font-bold animate-pulse">
              {status}
            </div>

            <div className="mt-5">
              <Link
                href="/admin"
                className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
              >
                Área do administrador
              </Link>
            </div>

            {loadError && (
              <p className="mt-4 text-sm text-red-200">
                Não foi possível carregar os dados agora.
              </p>
            )}
          </div>
        </section>

        <section className="p-8 overflow-x-auto">
          <div className="flex gap-20 min-w-[1100px]">
            <div>
              <h2 className="text-center text-xl font-bold mb-6 text-zinc-300">
                Quartas
              </h2>

              {matches
                .filter((match) => match.round === 'quarter')
                .map((match) => (
                  <Card
                    key={match.id}
                    match={match}
                    color="bg-gradient-to-br from-zinc-900 to-zinc-800"
                  />
                ))}
            </div>

            <div>
              <h2 className="text-center text-xl font-bold mb-6 text-zinc-300">
                Semifinal
              </h2>

              {matches
                .filter((match) => match.round === 'semi')
                .map((match) => (
                  <Card key={match.id} match={match} color="bg-blue-900/50" />
                ))}
            </div>

            <div>
              <h2 className="text-center text-xl font-bold mb-6 text-yellow-400">
                Final
              </h2>

              {matches
                .filter((match) => match.round === 'final')
                .map((match) => (
                  <Card key={match.id} match={match} color="bg-yellow-700/80" />
                ))}
            </div>
          </div>
        </section>

        {champion && (
          <section className="text-center py-12 border-t border-white/10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 120 }}
              className="inline-block bg-yellow-500 text-black px-8 py-5 rounded-2xl shadow-2xl"
            >
              <div className="text-3xl font-black mb-2">CAMPEÃO</div>

              <div className="flex items-center gap-3 justify-center">
                <img src={champion.logo} alt="" className="w-10 h-10 object-contain" />
                <span className="text-2xl font-bold">{champion.name}</span>
              </div>
            </motion.div>
          </section>
        )}

        <footer className="text-center py-8 text-zinc-500 text-sm">
          Atualização automática em tempo real
        </footer>
      </div>
    </main>
  )
}
