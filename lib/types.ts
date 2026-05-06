export type Team = {
  id: string
  name: string
  logo: string
}

export type MatchRound = 'quarter' | 'semi' | 'final'

export type Match = {
  id: string
  round: MatchRound
  position: number
  team1_id: string
  team2_id: string
  score1: number | null
  score2: number | null
  winner_id: string | null
}
