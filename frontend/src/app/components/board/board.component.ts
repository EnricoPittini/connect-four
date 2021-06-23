import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Match, WhichPlayer } from 'src/app/models/match.model';

@Component({
  selector: 'app-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.css']
})
export class BoardComponent implements OnInit {

  /**
   * Pass to the html the valid values for the WhichPlayer enum.
   */
  readonly PLAYER_1: WhichPlayer.PLAYER_1 = WhichPlayer.PLAYER_1;
  readonly PLAYER_2: WhichPlayer.PLAYER_2 = WhichPlayer.PLAYER_2;
  readonly EMPTY: WhichPlayer.EMPTY = WhichPlayer.EMPTY;

  @Input() boardMatrix!: Match['board'];

  @Output() columnSelected: EventEmitter<number> = new EventEmitter<number>();

  constructor() { }

  ngOnInit() {
    // Make sure that `value` has been provided
    this.assertInputsProvided();

    // this.boardMatrix = Array(6).fill(Array(7).fill(this.EMPTY));
  }

  getTransposedMatrix(): any[][] {
    return this.boardMatrix[0].map((_, colIndex) => this.boardMatrix.map(row => row[colIndex]));
  }

  onColumnClicked(columnIndex: number): void {
    console.info(`Column clicked ${columnIndex}`);
    this.columnSelected.emit(columnIndex);
  }

  /**
   * Make sure all the required inputs has been provided.
   */
  private assertInputsProvided(): void {
    if (!this.boardMatrix) {
      const errorMessage = 'The required input [boardMatrix] was not provided';
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  }



}
