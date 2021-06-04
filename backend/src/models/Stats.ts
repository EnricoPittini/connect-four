import mongoose = require('mongoose');

import { MatchDocument, WhichPlayer, MatchStatus } from './Match';


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

export interface StatsDocument extends Stats, mongoose.Document {
  refresh: (match: MatchDocument) => void,
}

export interface StatsModel extends mongoose.Model<StatsDocument> {
}

const statsSchema = new mongoose.Schema<StatsDocument, StatsModel>({
  rating: {
    type: mongoose.SchemaTypes.Number,
    required: true,
  },
  matchCount: {
    type: mongoose.SchemaTypes.Number,
    required: true,
  },
  winCount: {
    type: mongoose.SchemaTypes.Number,
    required: true,
  },
  forfaitWinCount: {
    type: mongoose.SchemaTypes.Number,
    required: true,
  },
  forfaitLossCount: {
    type: mongoose.SchemaTypes.Number,
    required: true,
  },
  secondsPlayed: {
    type: mongoose.SchemaTypes.Number,
    required: true,
  },
  moveCount: {
    type: mongoose.SchemaTypes.Number,
    required: true,
  },
  player: {
    type: mongoose.SchemaTypes.String,
    required: true,
    unique: true,
  },
});

statsSchema.methods.refresh = function (match: MatchDocument): Promise<void> {
  // TODO controllare che la partita non sia già stata analizzata

  if (match.status === MatchStatus.IN_PROGRESS) {
    return Promise.reject('The match is not terminated yet');
  }

  let whichPlayer: WhichPlayer;
  let otherPlayerUsername: string;
  if (this.player === match.player1) {
    whichPlayer = WhichPlayer.PLAYER_1;
    otherPlayerUsername = match.player2;
  }
  else if (this.player === match.player2) {
    whichPlayer = WhichPlayer.PLAYER_2;
    otherPlayerUsername = match.player1;
  }
  else {
    return Promise.reject('The match is not about this player');
  }

  return getModel().findOne({ player: otherPlayerUsername }).exec().then(otherStatsDocument => {
    // https://en.wikipedia.org/wiki/Elo_rating_system#Mathematical_details

    if (!otherStatsDocument) {
      console.error('The other player stats could not be found');
      return;
    }

    const otherPlayerRating = otherStatsDocument.rating;
    const expectedScore = 1 / (1 + Math.pow(10, (otherPlayerRating - this.rating) / 400));
    const actualScore = (match.winner === this.player) ? 1 : (match.winner === WhichPlayer.EMPTY) ? 0.5 : 0;
    const K = 50;
    this.rating += K * (actualScore - expectedScore);

    this.matchCount++;

    if (match.winner === whichPlayer) {
      this.winCount++;
      this.forfaitWinCount += (match.status === MatchStatus.FORFAIT) ? 1 : 0;
    }
    else if (match.winner !== WhichPlayer.EMPTY) {
      this.forfaitLossCount += (match.status === MatchStatus.FORFAIT) ? 1 : 0;
    }

    this.secondsPlayed = Math.floor(
      ((match.datetimeEnd || new Date()).valueOf() - match.datetimeBegin.valueOf()) / 1000
    );

    this.moveCount += match.countMoves(this.player);
  });
}

export function getSchema() {
  return statsSchema;
}

// Mongoose Model
let statsModel: StatsModel;  // This is not exposed outside the model
export function getModel(): StatsModel { // Return Model as singleton
  if (!statsModel) {
    statsModel = mongoose.model<StatsDocument, StatsModel>('Stats', getSchema())
  }
  return statsModel;
}

interface NewStatsParams extends Pick<Stats, 'player'> {
}

export function newStats(data: NewStatsParams): StatsDocument {
  const _statsModel = getModel();

  const stats: Stats = {
    rating: 0,
    matchCount: 0,
    winCount: 0,
    forfaitWinCount: 0,
    forfaitLossCount: 0,
    secondsPlayed: 0,
    moveCount: 0,
    player: data.player,
  };

  return new _statsModel(stats);
}
