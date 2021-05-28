import mongoose = require('mongoose');

export interface Stats{
  score : number,
  matchCount : number,
  winCount : number,
  forfaitWinCount : number,
  forfaitLossCount : number,
  secondsPlayed : number,
  moveCount : number,
}

export interface StatsDocument extends Stats, mongoose.Document {
  refresh: (match: any /*TODO sistemare tipo Match */) => void ,
}

export interface StatsModel extends mongoose.Model<StatsDocument> {
}

const statsSchema = new mongoose.Schema<StatsDocument, StatsModel>({
  score: {
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
});

statsSchema.methods.refresh = function(match: any /*TODO sistemare tipo Match */): void {
  //TODO da implementare
}


export function getSchema() {
  return statsSchema;
}

// Mongoose Model
let statsModel: StatsModel;  // This is not exposed outside the model
export function getModel(): StatsModel { // Return Model as singleton
  if(!statsModel) {
    statsModel = mongoose.model<StatsDocument, StatsModel>('Stats', getSchema())
  }
  return statsModel;
}

export function newStats(): StatsDocument {
  const _statsModel = getModel();

  const stats: Stats = {
    score : 0,
    matchCount : 0,
    winCount : 0,
    forfaitWinCount : 0,
    forfaitLossCount : 0,
    secondsPlayed : 0,
    moveCount : 0,
  };

  return new _statsModel(stats);
}
