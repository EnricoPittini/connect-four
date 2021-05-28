import mongoose = require('mongoose');

enum WhichPlayer{
  PLAYER_1 = "PLAYER_1",
  PLAYER_2 = "PLAYER_2",
  EMPTY = "EMPTY",
}

enum MatchStatus{
  IN_PROGRESS = "IN_PROGRESS",
  NORMALLY_TERMINATED = "NORMALLY_TERMINATED",
  FORFAIT = "FORFAIT",
}

export interface Match{
  player1 : string,
  player2 : string,
  datetimeBegin : Date,
  datetimeEnd : Date | null,
  board : WhichPlayer[][],
  status : MatchStatus,
  winner : WhichPlayer,
  playerTurn : WhichPlayer,
}

export interface MatchDocument extends Match, mongoose.Document {
  addMove: (playerUsername: string, column: number) => boolean,
  forfait: (playerUsername: string) => boolean,
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
    required: true, // TODO bisogna mettere a false essendo che può essere null?
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

function getPlayerRole(match: Match, playerUsername: string) : WhichPlayer{
  if(playerUsername===match.player1){
    return WhichPlayer.PLAYER_1;
  } 
  else if(playerUsername===match.player2){
    return WhichPlayer.PLAYER_2;
  }
  else{
    return WhichPlayer.EMPTY;
  }
}

///////////// FUNZIONI CHE TOCCANO LA BOARD
// TODO rivedere semantica e funzionamento delle funzioni
const TOP_ROW = 5;
const BOTTOM_ROW = 0;
const LEFT_COLUMN = 0;
const RIGHT_COLUMN = 6;

function getCellValue(board: WhichPlayer[][], row: number, col: number){
  if(row<BOTTOM_ROW || row>TOP_ROW || col<LEFT_COLUMN || row>RIGHT_COLUMN){
    return WhichPlayer.EMPTY;
  }
  return board[TOP_ROW-row][col];
  
}

function setCellValue(board: WhichPlayer[][], row: number, col: number, value: WhichPlayer): boolean{
  if(value===WhichPlayer.EMPTY || row<BOTTOM_ROW || row>TOP_ROW || col<LEFT_COLUMN || row>RIGHT_COLUMN || 
                getCellValue(board, row, col)!==WhichPlayer.EMPTY){
    return false;
  }
  board[TOP_ROW-row][col] = value;
  return true;
}

enum Direction{
  HORIZONTAL,
  VERTICAL,
  OBLIQUE_UP,
  OBLIQUE_DOWN,
}

function checkLine(board: WhichPlayer[][] , startRow: number, startCol: number, direction: Direction) : boolean{
  const firstCellValue = getCellValue(board, startRow, startCol);
  if(firstCellValue===WhichPlayer.EMPTY){ // The first cell is empty or out of the board bounds
    return false;
  }

  // The step for each of the 4 iterations
  let rowStep = 0;
  let colStep = 0;
  switch(direction){
    case Direction.HORIZONTAL : 
      colStep = 1;
      break;
    case Direction.VERTICAL :
      rowStep = 1;
      break;
    case Direction.OBLIQUE_UP :
      rowStep = 1;
      colStep = 1;
      break;
    case Direction.OBLIQUE_DOWN :
      rowStep = -1;
      colStep = 1;
      break;
  }

  let row = startRow;
  let col = startCol;
  let stillEqual = true;
  let count = 0;
  while(count<4 && stillEqual){
    stillEqual = firstCellValue===getCellValue(board, row, col);
    row += rowStep;
    col += colStep;
    count++;
  }

  return stillEqual;
}

function checkWinner(match: Match): boolean{

  for(let row = BOTTOM_ROW; row<=TOP_ROW; row++){
    for(let col = LEFT_COLUMN; col<=RIGHT_COLUMN; col++){
      let winFound = false;
      winFound ||= checkLine(match.board, row, col, Direction.HORIZONTAL);
      winFound ||= checkLine(match.board, row, col, Direction.VERTICAL);
      winFound ||= checkLine(match.board, row, col, Direction.OBLIQUE_DOWN);
      winFound ||= checkLine(match.board, row, col, Direction.OBLIQUE_UP);

      if(winFound){
        return true;
      }
    }
  }

  return false;
}
/////////////////////////

matchSchema.methods.addMove = function(playerUsername: string, column: number): boolean {

  if(this.status!==MatchStatus.IN_PROGRESS){
    return false;
  }

  const role = getPlayerRole(this, playerUsername);

  if(role!==this.playerTurn){ // The player username is not valid or the player does not have the current turn
    return false;
  }

  if(column<LEFT_COLUMN || column>RIGHT_COLUMN){
    return false;
  }

  if(getCellValue(this.board, TOP_ROW, column)!==WhichPlayer.EMPTY){ // The selected column is full
    return false;
  }

  // Find the first empty row of the column
  let firstEmptyRow : number = BOTTOM_ROW;
  let found = false;
  while(!found){
    if(this.board[firstEmptyRow][column]===WhichPlayer.EMPTY){
      found = true;
    }
    else{
      firstEmptyRow++;
    }
  }

  // Put the move in the board
  setCellValue(this.board, firstEmptyRow, column, role);

  //TODO controllo checkWin
  //TODO cambiare turno
  //TODO verificare se c'è altro da fare

}

//TODO continuare implementazione Match

//TODO sistemare Stats.ts
