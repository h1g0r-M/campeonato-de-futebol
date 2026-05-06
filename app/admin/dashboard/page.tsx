'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import type { Match, Team } from '@/lib/types'

type ScoreDrafts = Record<string, { score1: string; score2: string }>

export default function Dashboard() {
  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([])
  const [scores, setScores] = useState<ScoreDrafts>({})
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const router = useRouter()

  async function loadTeams() {
    const { data, error } = await supabase.from('teams').select('*').order('name')

    if (error) {
      toast.error(error.message)
      return
    }

    const nextTeams = data || []
    setTeams(nextTeams)
    setSelectedTeamIds((current) => {
      const existingIds = new Set(nextTeams.map((team) => team.id))
      const validSelection = current.filter((id) => existingIds.has(id))

      if (validSelection.length > 0) {
        return validSelection
      }

      return nextTeams.slice(0, 8).map((team) => team.id)
    })
  }

  async function loadMatches() {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('position')

    if (error) {
      toast.error(error.message)
      return
    }

    const nextMatches = data || []
    setMatches(nextMatches)
    setScores(
      nextMatches.reduce<ScoreDrafts>((drafts, match) => {
        drafts[match.id] = {
          score1: String(match.score1 ?? 0),
          score2: String(match.score2 ?? 0),
        }
        return drafts
      }, {})
    )
  }

  async function addTeam() {
    if (!name || !file) {
      toast.error('Preencha nome e logo')
      return
    }

    setLoading(true)

    const fileName = `${Date.now()}-${file.name}`
    const upload = await supabase.storage.from('logo').upload(fileName, file)

    if (upload.error) {
      setLoading(false)
      toast.error(upload.error.message)
      return
    }

    const { data } = supabase.storage.from('logo').getPublicUrl(fileName)

    const { error } = await supabase
      .from('teams')
      .insert([{ name, logo: data.publicUrl }])

    setLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }

    setName('')
    setFile(null)
    toast.success('Time cadastrado')
    await loadTeams()
  }

  async function deleteTeam(id: string) {
    const { error } = await supabase.from('teams').delete().eq('id', id)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Time excluído')
    await loadTeams()
  }

  async function resetTournament() {
    if (!confirm('Resetar campeonato?')) return

    const { error } = await supabase.from('matches').delete().not('id', 'is', null)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Campeonato resetado')
    await loadMatches()
  }

  async function drawTournament() {
    if (selectedTeamIds.length !== 8) {
      toast.error('Selecione exatamente 8 times')
      return
    }

    const { count, error: countError } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      toast.error(countError.message)
      return
    }

    if (count && count > 0) {
      toast.error('Já existe campeonato')
      return
    }

    const selectedTeams = selectedTeamIds
      .map((id) => teams.find((team) => team.id === id))
      .filter((team): team is Team => Boolean(team))

    if (selectedTeams.length !== 8) {
      toast.error('Algum time selecionado não foi encontrado')
      return
    }

    const shuffled = [...selectedTeams].sort(() => Math.random() - 0.5)
    const games = [
      {
        round: 'quarter',
        position: 1,
        team1_id: shuffled[0].id,
        team2_id: shuffled[1].id,
      },
      {
        round: 'quarter',
        position: 2,
        team1_id: shuffled[2].id,
        team2_id: shuffled[3].id,
      },
      {
        round: 'quarter',
        position: 3,
        team1_id: shuffled[4].id,
        team2_id: shuffled[5].id,
      },
      {
        round: 'quarter',
        position: 4,
        team1_id: shuffled[6].id,
        team2_id: shuffled[7].id,
      },
    ]

    const { error } = await supabase.from('matches').insert(games)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Campeonato gerado')
    await loadMatches()
  }

  async function saveScore(match: Match) {
    const draft = scores[match.id]
    const score1 = Number(draft?.score1)
    const score2 = Number(draft?.score2)

    if (!Number.isInteger(score1) || !Number.isInteger(score2) || score1 < 0 || score2 < 0) {
      toast.error('Informe placares válidos')
      return
    }

    if (score1 === score2) {
      toast.error('Sem empate')
      return
    }

    const winner = score1 > score2 ? match.team1_id : match.team2_id

    const { error } = await supabase
      .from('matches')
      .update({
        score1,
        score2,
        winner_id: winner,
      })
      .eq('id', match.id)

    if (error) {
      toast.error(error.message)
      return
    }

    await advanceTournament()
    await loadMatches()
    toast.success('Placar salvo')
  }

  async function advanceTournament() {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('position')

    if (error) {
      toast.error(error.message)
      return
    }

    const currentMatches = (data || []) as Match[]
    const quarters = currentMatches.filter((match) => match.round === 'quarter')
    const semis = currentMatches.filter((match) => match.round === 'semi')
    const final = currentMatches.find((match) => match.round === 'final')

    if (
      quarters.length === 4 &&
      quarters.every((match) => match.winner_id) &&
      semis.length === 0
    ) {
      const { error: semiError } = await supabase.from('matches').insert([
        {
          round: 'semi',
          position: 5,
          team1_id: quarters[0].winner_id,
          team2_id: quarters[1].winner_id,
        },
        {
          round: 'semi',
          position: 6,
          team1_id: quarters[2].winner_id,
          team2_id: quarters[3].winner_id,
        },
      ])

      if (semiError) toast.error(semiError.message)
    }

    if (
      semis.length === 2 &&
      semis.every((match) => match.winner_id) &&
      !final
    ) {
      const { error: finalError } = await supabase.from('matches').insert([
        {
          round: 'final',
          position: 7,
          team1_id: semis[0].winner_id,
          team2_id: semis[1].winner_id,
        },
      ])

      if (finalError) toast.error(finalError.message)
    }
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/admin')
  }

  function toggleTournamentTeam(id: string) {
    setSelectedTeamIds((current) => {
      if (current.includes(id)) {
        return current.filter((teamId) => teamId !== id)
      }

      if (current.length >= 8) {
        toast.error('O torneio precisa ter exatamente 8 times')
        return current
      }

      return [...current, id]
    })
  }

  useEffect(() => {
    async function init() {
      const { data, error } = await supabase.auth.getSession()

      if (error || !data.session) {
        router.replace('/admin')
        return
      }

      setCheckingSession(false)
      await Promise.all([loadTeams(), loadMatches()])
    }

    init()

    const channel = supabase
      .channel('realtime-dashboard')
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
      supabase.removeChannel(channel)
    }
  }, [router])

  if (checkingSession) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white grid place-items-center">
        Verificando sessão...
      </main>
    )
  }

  return (
    <main className="p-10 text-white bg-zinc-950 min-h-screen">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl">Painel Admin</h1>
        <button onClick={logout} className="bg-zinc-800 px-4 py-2 rounded">
          Sair
        </button>
      </div>

      <div className="bg-zinc-900 p-6 rounded-xl mb-6">
        <h2 className="text-xl mb-4">Cadastrar Time ({teams.length} cadastrados)</h2>

        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nome do time"
          className="w-full p-3 rounded bg-zinc-800 mb-4"
        />

        <input
          type="file"
          accept="image/*"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          className="mb-4 block"
        />

        <button
          onClick={addTeam}
          disabled={loading}
          className="bg-green-500 px-6 py-3 rounded font-bold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Salvando...' : 'Salvar Time'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <button
          onClick={drawTournament}
          disabled={selectedTeamIds.length !== 8}
          className="bg-blue-500 px-4 py-2 rounded disabled:cursor-not-allowed disabled:opacity-60"
        >
          Gerar torneio
        </button>

        <button onClick={resetTournament} className="bg-red-500 px-4 py-2 rounded">
          Resetar
        </button>

        <span className="text-sm text-zinc-400">
          {selectedTeamIds.length}/8 times selecionados
        </span>
      </div>

      <div className="bg-zinc-900 p-6 rounded-xl mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-xl">Times</h2>
          <button
            onClick={() => setSelectedTeamIds(teams.slice(0, 8).map((team) => team.id))}
            className="bg-zinc-800 px-3 py-2 rounded text-sm"
          >
            Selecionar primeiros 8
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {teams.map((team) => (
            <div
              key={team.id}
              className="bg-zinc-800 p-4 rounded flex justify-between items-center"
            >
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedTeamIds.includes(team.id)}
                  onChange={() => toggleTournamentTeam(team.id)}
                  className="h-4 w-4 accent-green-500"
                />
                <img src={team.logo} alt="" className="w-10 h-10 object-contain" />
                <span>{team.name}</span>
              </label>

              <button
                onClick={() => deleteTeam(team.id)}
                className="bg-red-500 px-3 py-1 rounded"
              >
                Excluir
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 p-6 rounded-xl">
        <h2 className="text-xl mb-6">Editar Jogos</h2>

        {matches.map((match) => {
          const team1 = teams.find((team) => team.id === match.team1_id)
          const team2 = teams.find((team) => team.id === match.team2_id)
          const draft = scores[match.id] || { score1: '0', score2: '0' }

          return (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-800 p-4 rounded mb-4"
            >
              <div className="mb-2 text-sm text-zinc-400 uppercase">
                {match.round}
              </div>

              <div className="flex gap-3 items-center flex-wrap">
                <span className="w-32">{team1?.name || 'A definir'}</span>

                <input
                  type="number"
                  min={0}
                  value={draft.score1}
                  onChange={(event) =>
                    setScores((current) => ({
                      ...current,
                      [match.id]: {
                        ...draft,
                        score1: event.target.value,
                      },
                    }))
                  }
                  className="w-16 p-2 rounded bg-zinc-700"
                />

                <span>x</span>

                <input
                  type="number"
                  min={0}
                  value={draft.score2}
                  onChange={(event) =>
                    setScores((current) => ({
                      ...current,
                      [match.id]: {
                        ...draft,
                        score2: event.target.value,
                      },
                    }))
                  }
                  className="w-16 p-2 rounded bg-zinc-700"
                />

                <span className="w-32">{team2?.name || 'A definir'}</span>

                <button
                  onClick={() => saveScore(match)}
                  className="bg-green-500 px-3 py-1 rounded"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </main>
  )
}
