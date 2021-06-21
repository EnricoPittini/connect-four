import { Component, OnInit } from '@angular/core';
import { WhichPlayer } from 'src/app/models/match.model';

@Component({
  selector: 'app-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.css']
})
export class BoardComponent implements OnInit {
  readonly PLAYER_1: WhichPlayer.PLAYER_1 = WhichPlayer.PLAYER_1;
  readonly PLAYER_2: WhichPlayer.PLAYER_2 = WhichPlayer.PLAYER_2;
  readonly EMPTY: WhichPlayer.EMPTY = WhichPlayer.EMPTY;


  matrix = Array(6).fill(Array(7).fill(null));


  constructor() { }

  ngOnInit(): void {
  }

  getTransposedMatrix(): any[][] {
    return this.matrix[0].map((_: any, colIndex: number) => this.matrix.map(row => row[colIndex]));
  }

}
