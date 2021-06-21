import { Component, Input, OnInit } from '@angular/core';

import { WhichPlayer } from 'src/app/models/match.model';


/**
 * A cell of the game board.
 */
@Component({
  selector: 'app-cell',
  templateUrl: './cell.component.html',
  styleUrls: ['./cell.component.css']
})
export class CellComponent implements OnInit {

  /**
   * The player that owns the cell.
   */
  @Input() value!: WhichPlayer;

  constructor() { }

  ngOnInit() {
    // Make sure that `value` has been provided
    this.assertInputsProvided();
  }

  /**
   * Make sure all the required inputs has been provided.
   */
  private assertInputsProvided(): void {
    if (!this.value) {
      const errorMessage = 'The required input [WhichPlayer] was not provided';
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  }

}
