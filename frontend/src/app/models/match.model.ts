export enum WhichPlayer {
  PLAYER_1 = 'PLAYER_1',
  PLAYER_2 = 'PLAYER_2',
  EMPTY = 'EMPTY',
}

export enum MatchStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  NORMALLY_TERMINATED = 'NORMALLY_TERMINATED',
  FORFAIT = 'FORFAIT',
}

export interface Match {
  player1: string,
  player2: string,
  datetimeBegin: Date,
  datetimeEnd: Date | null,
  board: WhichPlayer[][],
  status: MatchStatus,
  winner: WhichPlayer,
  playerTurn: WhichPlayer,
}

interface NewMatchParams extends Pick<Match, 'player1' | 'player2'> {
}
