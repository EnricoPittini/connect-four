export interface Stats {
  rating: number,
  matchCount: number,
  winCount: number,
  forfaitWinCount: number,
  forfaitLossCount: number,
  secondsPlayed: number,
  moveCount: number,
  player: string,
  // TODO campo matches che è la lista di id di partite che sono state già analizzate in queste statistiche
}

interface NewStatsParams extends Pick<Stats, 'player'> {
}
