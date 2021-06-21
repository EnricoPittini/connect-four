import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/auth/services/auth.service';
import { WhichPlayer } from 'src/app/models/match.model';
import { GameService } from 'src/app/services/game.service';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit {



  constructor(
    public auth: AuthService,
    public gameService: GameService
  ) { }

  ngOnInit(): void {
  }

  getMyUsername(): string {
    return this.auth.getUsername();
  }

  getOtherUsername(): string {
    // TODO da controllare
    if (this.getMyUsername() === this.gameService.match?.player1) {
      return this.gameService.match?.player2;
    }
    else {
      return this.gameService.match?.player1 || 'No name found';
    }
  }


  getPlayer1Username(): string {
    return this.gameService.match?.player1 || 'No name found';
  }

  getPlayer2Username(): string {
    return this.gameService.match?.player2 || 'No name found';
  }
}
