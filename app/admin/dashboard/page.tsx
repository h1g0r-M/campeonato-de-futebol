'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'

export default function Dashboard() {
  const [name, setName] = useState('')
  const [file, setFile] = useState<any>(null)
  const [teams, setTeams] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // =========================
  // LOAD
  // =========================
  async function loadTeams() {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .order('name')

    setTeams(data || [])
  }

  async function loadMatches() {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .order('position')

    setMatches(data || [])
  }

  // =========================
  // ADD TEAM
  // =========================
  async function addTeam() {
    if (!name || !file) return alert('Preencha tudo')
    if (teams.length >= 8) return alert('Máx 8 times')

    setLoading(true)

    const fileName = `${Date.now()}-${file.name}`

    const upload = await supabase.storage
      .from('logo')
      .upload(fileName, file)

    if (upload.error) {
      setLoading(false)
      return alert(upload.error.message)
    }

    const { data } = supabase.storage
      .from('logo')
      .getPublicUrl(fileName)

    const { error } = await supabase
      .from('teams')
      .insert([{ name, logo: data.publicUrl }])

    if (error) {
      setLoading(false)
      return alert(error.message)
    }

    setName('')
    setFile(null)
    setLoading(false)

    await loadTeams()
  }

  // =========================
  // DELETE TEAM
  // =========================
  async function deleteTeam(id: string) {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id)

    if (error) return alert(error.message)

    await loadTeams()
  }

  // =========================
  // RESET
  // =========================
  async function resetTournament() {
    if (!confirm('Resetar campeonato?')) return

    const { error } = await supabase
      .from('matches')
      .delete()
      .not('id', 'is', null)

    if (error) return alert(error.message)

    await loadMatches()
  }

  // =========================
  // GERAR CAMPEONATO
  // =========================
  async function drawTournament() {
    if (teams.length !== 8)
      return alert('Precisa de 8 times')

    const { count } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })

    if (count && count > 0)
      return alert('Já existe campeonato')

    const shuffled = [...teams].sort(() => Math.random() - 0.5)

    const jogos = [
      {
        round: 'quarter',
        position: 1,
        team1_id: shuffled[0].id,
        team2_id: shuffled[1].id
      },
      {
        round: 'quarter',
        position: 2,
        team1_id: shuffled[2].id,
        team2_id: shuffled[3].id
      },
      {
        round: 'quarter',
        position: 3,
        team1_id: shuffled[4].id,
        team2_id: shuffled[5].id
      },
      {
        round: 'quarter',
        position: 4,
        team1_id: shuffled[6].id,
        team2_id: shuffled[7].id
      }
    ]

    const { error } = await supabase
      .from('matches')
      .insert(jogos)

    if (error) return alert(error.message)

    await loadMatches()
  }

  // =========================
  // SALVAR PLACAR
  // =========================
  async function saveScore(match: any, s1: number, s2: number) {
    if (s1 === s2) return alert('Sem empate')

    const winner =
      s1 > s2 ? match.team1_id : match.team2_id

    const { error } = await supabase
      .from('matches')
      .update({
        score1: s1,
        score2: s2,
        winner_id: winner
      })
      .eq('id', match.id)

    if (error) return alert(error.message)

    await advanceTournament()
    await loadMatches()
  }

  // =========================
  // AVANÇAR FASES
  // =========================
  async function advanceTournament() {
    const { data } = await supabase
      .from('matches')
      .select('*')
      .order('position')

    if (!data) return

    const quarters = data.filter(m => m.round === 'quarter')
    const semis = data.filter(m => m.round === 'semi')
    const final = data.find(m => m.round === 'final')

    // GERAR SEMI
    if (
      quarters.length === 4 &&
      quarters.every(m => m.winner_id) &&
      semis.length === 0
    ) {
      await supabase.from('matches').insert([
        {
          round: 'semi',
          position: 5,
          team1_id: quarters[0].winner_id,
          team2_id: quarters[1].winner_id
        },
        {
          round: 'semi',
          position: 6,
          team1_id: quarters[2].winner_id,
          team2_id: quarters[3].winner_id
        }
      ])
    }

    // GERAR FINAL
    if (
      semis.length === 2 &&
      semis.every(m => m.winner_id) &&
      !final
    ) {
      await supabase.from('matches').insert([
        {
          round: 'final',
          position: 7,
          team1_id: semis[0].winner_id,
          team2_id: semis[1].winner_id
        }
      ])
    }
  }

  // =========================
  // INIT + REALTIME
  // =========================
  useEffect(() => {
    loadTeams()
    loadMatches()

    const channel = supabase
      .channel('realtime-dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches'
        },
        () => loadMatches()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <main className="p-10 text-white bg-zinc-950 min-h-screen">
      <h1 className="text-3xl mb-6">Painel Admin</h1>

      {/* CADASTRO */}
      <div className="bg-zinc-900 p-6 rounded-xl mb-6">
        <h2 className="text-xl mb-4">
          Cadastrar Time ({teams.length}/8)
        </h2>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do time"
          className="w-full p-3 rounded bg-zinc-800 mb-4"
        />

        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0])}
          className="mb-4 block"
        />

        <button
          onClick={addTeam}
          disabled={loading}
          className="bg-green-500 px-6 py-3 rounded font-bold"
        >
          {loading ? 'Salvando...' : 'Salvar Time'}
        </button>
      </div>

      {/* BOTÕES */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={drawTournament}
          className="bg-blue-500 px-4 py-2 rounded"
        >
          Gerar
        </button>

        <button
          onClick={resetTournament}
          className="bg-red-500 px-4 py-2 rounded"
        >
          Resetar
        </button>
      </div>

      {/* TIMES */}
      <div className="bg-zinc-900 p-6 rounded-xl mb-6">
        <h2 className="text-xl mb-4">Times</h2>

        <div className="grid md:grid-cols-2 gap-4">
          {teams.map(team => (
            <div
              key={team.id}
              className="bg-zinc-800 p-4 rounded flex justify-between items-center"
            >
              <div className="flex items-center gap-3">
                <img
                  src={team.logo}
                  className="w-10 h-10 object-contain"
                />
                <span>{team.name}</span>
              </div>

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

      {/* EDITAR JOGOS */}
      <div className="bg-zinc-900 p-6 rounded-xl">
        <h2 className="text-xl mb-6">Editar Jogos</h2>

        {matches.map(match => {
          const t1 = teams.find(t => t.id === match.team1_id)
          const t2 = teams.find(t => t.id === match.team2_id)

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
                <span className="w-32">{t1?.name}</span>

                <input
                  id={`s1-${match.id}`}
                  type="number"
                  defaultValue={match.score1 ?? 0}
                  className="w-16 p-2 rounded bg-zinc-700"
                />

                <span>x</span>

                <input
                  id={`s2-${match.id}`}
                  type="number"
                  defaultValue={match.score2 ?? 0}
                  className="w-16 p-2 rounded bg-zinc-700"
                />

                <span className="w-32">{t2?.name}</span>

                <button
                  onClick={() => {
                    const s1 = Number(
                      (
                        document.querySelector(
                          `#s1-${match.id}`
                        ) as HTMLInputElement
                      )?.value
                    )

                    const s2 = Number(
                      (
                        document.querySelector(
                          `#s2-${match.id}`
                        ) as HTMLInputElement
                      )?.value
                    )

                    saveScore(match, s1, s2)
                  }}
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