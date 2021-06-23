import mongoose = require('mongoose');

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

/**
 * Represents the matches
 */
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

/**
 * Represents the matches documents (e.g. the matches stored in the database)
 */
export interface MatchDocument extends Match, mongoose.Document {
  addMove: (playerUsername: string, column: number) => void,
  forfait: (playerUsername: string) => void,
  countMoves: (playerUsername: string) => number,
}

export interface MatchModel extends mongoose.Model<MatchDocument> {
}

const matchSchema = new mongoose.Schema<MatchDocument, MatchModel>({
  player1: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
  player2: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
  datetimeBegin: {
    type: mongoose.SchemaTypes.Date,
    required: true,
  },
  datetimeEnd: {
    type: mongoose.SchemaTypes.Date,
    required: false, 
  },
  board: {
    type: [[mongoose.SchemaTypes.String]],
    required: true,
  },
  status: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
  winner: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
  playerTurn: {
    type: mongoose.SchemaTypes.String,
    required: true,
  },
});

/**
 * Given a match and a username, returns the role of that player in that match
 * @param match
 * @param playerUsername
 * @returns
 */
function getPlayerRole(match: Match, playerUsername: string): WhichPlayer {
  if (playerUsername === match.player1) {
    return WhichPlayer.PLAYER_1;
  }
  else if (playerUsername === match.player2) {
    return WhichPlayer.PLAYER_2;
  }
  else {
    return WhichPlayer.EMPTY; // The specified player is not a player of the match
  }
}

/**
 * Updates the match object after the termination (win / draw / forfait).
 *
 * @param match
 * @param status
 * @param winner
 * @returns
 */
function updateAfterTermination(match: Match, status: MatchStatus, winner: WhichPlayer): boolean {
  if (match.status !== MatchStatus.IN_PROGRESS) {
    return false;
  }

  if (status === MatchStatus.IN_PROGRESS) {
    return false;
  }

  // Update match object
  match.datetimeEnd = new Date();
  match.status = status;
  match.winner = winner;
  match.playerTurn = WhichPlayer.EMPTY;
  return true;
}

//////////////////// FUNCTIONS THAT WORK WITH THE BOARD
const TOP_ROW = 5;
const BOTTOM_ROW = 0;
const LEFT_COLUMN = 0;
const RIGHT_COLUMN = 6;

/**
 * Interacts with the board to retrieve the value of a cell.
 * Returns null if the given cell is out of the board.
 *
 * @param board
 * @param row
 * @param col
 * @returns
 */
function getCellValue(board: WhichPlayer[][], row: number, col: number): WhichPlayer | null {
  if (row < BOTTOM_ROW || row > TOP_ROW || col < LEFT_COLUMN || row > RIGHT_COLUMN) {
    return null;
  }
  return board[TOP_ROW-row][col];
}

/**
 * Interacts with the board to fill the value of an empty cell.
 *
 * @param board
 * @param row
 * @param col
 * @param value
 * @returns
 */
function setCellValue(board: WhichPlayer[][], row: number, col: number, value: WhichPlayer): boolean {
  const currentCellValue = getCellValue(board, row, col);

  if (value === WhichPlayer.EMPTY || currentCellValue === null || currentCellValue !== WhichPlayer.EMPTY) {
    return false;
  }
  board[TOP_ROW-row][col] = value;
  return true;
}

enum Direction {
  HORIZONTAL,       // from left to right
  VERTICAL,         // from bottom to top
  OBLIQUE_UP,       // from bottom left to top right
  OBLIQUE_DOWN,     // from top left to bottom right
}

/**
 * Checks if the given line of 4 contiguous cells contains the same player.
 * This line can be horizontal, vertical, oblique_up or ublique_down.
 *
 * @param board
 * @param startRow
 * @param startCol
 * @param direction
 * @returns
 */
function checkLine(board: WhichPlayer[][], startRow: number, startCol: number, direction: Direction): boolean {
  const firstCellValue = getCellValue(board, startRow, startCol);
  if (firstCellValue === WhichPlayer.EMPTY || firstCellValue === null) { // The first cell is empty or out of the board bounds
    return false;
  }

  // The step for each of the 4 iterations
  let rowStep = 0;
  let colStep = 0;
  switch (direction) {
    case Direction.HORIZONTAL:
      colStep = 1;
      break;
    case Direction.VERTICAL:
      rowStep = 1;
      break;
    case Direction.OBLIQUE_UP:
      rowStep = 1;
      colStep = 1;
      break;
    case Direction.OBLIQUE_DOWN:
      rowStep = -1;
      colStep = 1;
      break;
  }

  // Four iterations to check if all the 4 cells of the line have the same player
  let row = startRow;
  let col = startCol;
  let stillEqual = true;
  let count = 0;
  while (count < 4 && stillEqual) {
    stillEqual = firstCellValue === getCellValue(board, row, col);
    row += rowStep;
    col += colStep;
    count++;
  }

  return stillEqual;
}

/**
 * Checks if the board has a winner.
 * @param board
 * @returns
 */
function checkWinner(board: WhichPlayer[][]): boolean {

  // Iterates through all the cells. For each of them, checks if there is a line of 4 contigous cells
  // that has the same player: this line of 4 contigous cells can be horizontal, vertical, oblique_down
  // or oblique_up
  for (let row = BOTTOM_ROW; row <= TOP_ROW; row++) {
    for (let col = LEFT_COLUMN; col <= RIGHT_COLUMN; col++) {
      let winFound = false;
      winFound ||= checkLine(board, row, col, Direction.HORIZONTAL);
      winFound ||= checkLine(board, row, col, Direction.VERTICAL);
      winFound ||= checkLine(board, row, col, Direction.OBLIQUE_DOWN);
      winFound ||= checkLine(board, row, col, Direction.OBLIQUE_UP);

      if (winFound) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks if there is a draw. Specifically, checks if the board is full.
 *
 * @param board
 * @returns true if there is a draw, false otherwise.
 */
function checkDraw(board: WhichPlayer[][]): boolean {
  for (let col = LEFT_COLUMN; col <= RIGHT_COLUMN; col++) {
    if (getCellValue(board, TOP_ROW, col) === WhichPlayer.EMPTY) {
      return false;     // not draw
    }
  }
  return true;          // draw
}

///////////////////////////////////////////////


/**
 * Adds a move in the match
 * @param playerUsername
 * @param column
 */
matchSchema.methods.addMove = function (playerUsername: string, column: number): void {
  // check that the match is not terminated yet
  if (this.status !== MatchStatus.IN_PROGRESS || this.playerTurn === WhichPlayer.EMPTY) {
    //return false;
    throw new Error("The match is alredy terminated");
  }

  const role = getPlayerRole(this, playerUsername);

  if (role !== this.playerTurn) { // The player username is not valid or the player does not have the current turn
    throw new Error("The player is not valid or the player does not have the current turn");
  }

  // questo controllo è compreso in quello successivo
  // if(column<LEFT_COLUMN || column>RIGHT_COLUMN){
  //   return false;
  // }

  if (getCellValue(this.board, TOP_ROW, column) !== WhichPlayer.EMPTY) { // The selected column is full or invalid (null)
    throw new Error("The selected column is invalid or full");
  }

  // Find the first empty row of the column
  let firstEmptyRow: number = BOTTOM_ROW;
  let found = false;
  while (!found) {
    if (getCellValue(this.board, firstEmptyRow, column) === WhichPlayer.EMPTY) {
      found = true;
    }
    else {
      firstEmptyRow++;
    }
  }

  // Put the move in the board
  setCellValue(this.board, firstEmptyRow, column, role);
  // Mark board as modified: mandatory!
  this.markModified('board');

  // Check if there is a winner
  if (checkWinner(this.board)) {
    // Update match object
    updateAfterTermination(this, MatchStatus.NORMALLY_TERMINATED, role);
  }
  else if (checkDraw(this.board)) {
    // Update match object
    updateAfterTermination(this, MatchStatus.NORMALLY_TERMINATED, WhichPlayer.EMPTY);
  }
  else {
    // switch turn
    this.playerTurn = (this.playerTurn === WhichPlayer.PLAYER_1 ? WhichPlayer.PLAYER_2 : WhichPlayer.PLAYER_1);
  }

  //return true;
}

/**
 * Terminates the match for forfait of the specified player
 * @param playerUsername
 */
matchSchema.methods.forfait = function (playerUsername: string): void {
  const role = getPlayerRole(this, playerUsername);

  if (role === WhichPlayer.EMPTY) {   // The player username is not one of the match players
    //return false;
    throw new Error("The player username is not one of the match players");
  }

  const winner = (role === WhichPlayer.PLAYER_1 ? WhichPlayer.PLAYER_2 : WhichPlayer.PLAYER_1);
  const success = updateAfterTermination(this, MatchStatus.FORFAIT, winner);
  if (!success) {
    throw new Error("The match is alredy terminated");
  }
}

/**
 * Counts the moves made in the match by the specified player
 * @param playerUsername
 * @returns
 */
matchSchema.methods.countMoves = function (playerUsername: string): number {
  const role = getPlayerRole(this, playerUsername);

  if (role === WhichPlayer.EMPTY) {   // The player username is not one of the match players
    return -1;        
  }

  let count = 0;
  for (let row = BOTTOM_ROW; row <= TOP_ROW; row++) {
    for (let col = LEFT_COLUMN; col <= RIGHT_COLUMN; col++) {
      if (getCellValue(this.board, row, col) === role) {
        count++;
      }
    }
  }

  return count;
}


export function getSchema() {
  return matchSchema;
}

// Mongoose Model
let matchModel: MatchModel;  // This is not exposed outside the model
export function getModel(): MatchModel { // Return Model as singleton
  if (!matchModel) {
    matchModel = mongoose.model<MatchDocument, MatchModel>('Match', getSchema())
  }
  return matchModel;
}

/**
 * Represents the type of the input data needed to create a new match document
 */
export interface NewMatchParams extends Pick<Match, 'player1' | 'player2'> {
}

/**
 * Creates a new match document
 * @param data
 * @returns
 */
export function newMatch(data: NewMatchParams): MatchDocument {
  const _matchModel = getModel();

  const match: Match = {
    player1: data.player1,
    player2: data.player2,
    datetimeBegin: new Date(),
    datetimeEnd: null,
    board: Array(TOP_ROW-BOTTOM_ROW+1).fill(Array(RIGHT_COLUMN-LEFT_COLUMN+1).fill(WhichPlayer.EMPTY)),
    status: MatchStatus.IN_PROGRESS,
    winner: WhichPlayer.EMPTY,
    playerTurn: WhichPlayer.PLAYER_1,
  };

  return new _matchModel(match);
}
