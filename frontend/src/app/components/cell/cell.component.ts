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

  @Input() value!: WhichPlayer;

  constructor() { }

  ngOnInit() {
    this.assertInputsProvided();
  }

  private assertInputsProvided(): void {
    if (!this.value) {
      const errorMessage = 'The required input [WhichPlayer] was not provided';
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  }


}
