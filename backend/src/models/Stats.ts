import mongoose = require('mongoose');

import { MatchDocument, WhichPlayer, MatchStatus } from './Match';

/**
 * Represents a stats (i.e. a statistics object)
 */
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

/**
 * Represents a stats document(i.e. a stats memorized in the database)
 */
export interface StatsDocument extends Stats, mongoose.Document {
  refresh: (match: MatchDocument) => Promise<void>,
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

/**
 * Udates the stats, according to the given match document
 * @param match 
 * @returns 
 */
statsSchema.methods.refresh = function (match: MatchDocument): Promise<void> {

  if (match.status === MatchStatus.IN_PROGRESS) {
    return Promise.reject('The match is not terminated yet');
  }

  // Find if the player of the stats is the player1 or the player2 of the match
  // Find the other player username
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

  // Find the other player stats document, in order to retreive the rating of the other player
  return getModel().findOne({ player: otherPlayerUsername }).exec().then(otherStatsDocument => {
    // The update of the player rating after a match is done using the ELO rating system formula.
    // (Formula used in the chess tournaments)
    // This formula takes into account not only if the player has won/lost, but also the rating of the opponent.
    // The logic is that the points that you win/lose after the match depends on the strenght of your opponent : 
    // the more your opponent is strong, the more points you get if you win and the less points you lose if you lose.
    // https://en.wikipedia.org/wiki/Elo_rating_system#Mathematical_details

    if (!otherStatsDocument) {
      console.error('The other player stats could not be found');
      return;
    }

    // Update the rating, according to the ELO formula
    const otherPlayerRating = otherStatsDocument.rating;
    const expectedScore = 1 / (1 + Math.pow(10, (otherPlayerRating - this.rating) / 400));
    const actualScore = (match.winner === whichPlayer) ? 1 : (match.winner === WhichPlayer.EMPTY) ? 0.5 : 0;
    const K = 50;
    this.rating += K * (actualScore - expectedScore);

    // Update the other informations

    this.matchCount++;

    if (match.winner === whichPlayer) {
      this.winCount++;
      this.forfaitWinCount += (match.status === MatchStatus.FORFAIT) ? 1 : 0;
    }
    else if (match.winner !== WhichPlayer.EMPTY) {
      this.forfaitLossCount += (match.status === MatchStatus.FORFAIT) ? 1 : 0;
    }

    this.secondsPlayed += Math.floor(
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

/**
 * Represents the type of the input data needed to create a new stats document
 */
interface NewStatsParams extends Pick<Stats, 'player'> {
}

/**
 * Creates a new stats document
 * @param data 
 * @returns 
 */
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
