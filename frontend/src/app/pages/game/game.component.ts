import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/auth/services/auth.service';
import { Match, MatchStatus, WhichPlayer } from 'src/app/models/match.model';
import { GameService } from 'src/app/services/game.service';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit {

  private static readonly ROWS = 6;
  private static readonly COLS = 7;


  constructor(
    public auth: AuthService,
    public gameService: GameService,
    private router: Router,
  ) { }

  ngOnInit(): void {
  }

  /**
   *
   * @returns true if the player on the left side is red, false if it is yellow
   */
  isLeftPlayerRed(): boolean{
    return (!this.isUserAMatchPlayer() ||  this.getMyUsername()===this.gameService.getPlayer1Username());
  }

  /**
   * Returns the user username
   * @returns 
   */
  getMyUsername(): string {
    return this.auth.getUsername();
  }

  getOtherUsername(): string {
    if (this.getMyUsername() === this.gameService.match?.player1) {
      return this.gameService.match.player2;
    }
    else {
      return this.gameService.match?.player1 || 'No name found';
    }
  }

  /**
   * Returns the board of the match
   * @returns 
   */
  getBoard(): Match['board'] {
    return this.gameService.match?.board
           || Array(GameComponent.ROWS).fill(Array(GameComponent.COLS).fill(WhichPlayer.EMPTY));
  }

  /**
   * Does forfait
   */
  forfait(): void {
    console.info('Forfait button clicked');
    this.gameService.forfait();
  }

  /**
   * Checks if the game is ended
   * @returns 
   */
  isGameEnded(): boolean {
    return this.gameService.isGameEnded();
  }

  /**
   * Returns the username of the winner, if any
   * @returns 
   */
  getWinner(): string | null {
    if (!this.gameService.match || !this.gameService.isGameEnded) {
      return null;
    }

    if (this.gameService.match.winner === WhichPlayer.PLAYER_1) {
      return this.gameService.getPlayer1Username();
    }
    else if (this.gameService.match.winner === WhichPlayer.PLAYER_2) {
      return this.gameService.getPlayer2Username();
    }
    else {
      return 'Draw';
    }
  }

  /**
   * Makes a move in the match
   * @param column 
   */
  makeMove(column: number): void {
    this.gameService.makeMove(column);
  }

  /**
   * Returns the match id of the current match
   * @returns 
   */
  getMatchId(): string | null {
    return this.gameService.matchId;
  }

  /**
   * Returns the username of the player that has the turn
   * @returns 
   */
  getTurnUsername(): string {
    const turn = this.gameService.getTurn();
    if (!turn || turn === WhichPlayer.EMPTY) {
      return '';
    }

    return this.gameService.whichPlayer() === turn ? this.getMyUsername() : this.getOtherUsername();
  }

  /**
   * Checks if the user is one of the two players of the match (e.g. is not an observer of the match)
   * @returns 
   */
  isUserAMatchPlayer(): boolean{
    return this.auth.getUsername()===this.gameService.getPlayer1Username()
           || this.auth.getUsername()===this.gameService.getPlayer2Username();
  }

  /**
   * Exits from the match
   */
  exitGame(): void{
    if(!this.isUserAMatchPlayer()){
      this.gameService.stopObservingMatch();
    }
    this.router.navigate(['']);
  }
}
