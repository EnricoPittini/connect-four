import { Component, OnInit } from '@angular/core';
import { GameService } from 'src/app/services/game.service';


// TODO da capire se va bene e forse metterla in un file a parte
interface LiveMatchInfo {
  player1: string,
  player2: string,
  matchId: string,
}

/**
 * The live matches page.
 */
@Component({
  selector: 'app-live-matches',
  templateUrl: './live-matches.component.html',
  styleUrls: ['./live-matches.component.css']
})
export class LiveMatchesComponent implements OnInit {

  currentSearchUsername: string | null = null; 

  refreshInterval: number = 30000;

  /**
   * List of global live matches.
   */
  globalLiveMatches: LiveMatchInfo[] = [];

  constructor(
    private gameService: GameService,
  ) { }

  ngOnInit(): void {
    this.gameService.getMatches(true)
        .subscribe( matches => { 
          this.globalLiveMatches = matches.map( match => ({
                                player1: match.player1,
                                player2: match.player2,
                                matchId: match._id,
          }));
          console.log('Global matches ' + this.globalLiveMatches);
        });

    setInterval( () => this.searchLiveMatchesByUsername(this.currentSearchUsername), this.refreshInterval);
  }

  searchLiveMatchesByUsername(username: string | null): void{
    this.currentSearchUsername = username;
    this.gameService.getMatches(true, username)
        .subscribe( matches => { 
          this.globalLiveMatches = matches.map( match => ({
                                player1: match.player1,
                                player2: match.player2,
                                matchId: match._id,
          }));
        });
  }

  observeMatch(match: LiveMatchInfo): void{
    this.gameService.getMatchIdFromUsername(match.player1)
        .subscribe( matchId => {
          console.log('MatchId ' + matchId);
          this.gameService.startObservingMatch(matchId)
        });
  }

}
