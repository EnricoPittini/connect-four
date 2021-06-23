export interface Stats {
  rating: number,
  matchCount: number,
  winCount: number,
  forfaitWinCount: number,
  forfaitLossCount: number,
  secondsPlayed: number,
  moveCount: number,
  player: string,
}

interface NewStatsParams extends Pick<Stats, 'player'> {
}
