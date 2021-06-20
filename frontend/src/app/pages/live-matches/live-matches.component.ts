import { Component, OnInit } from '@angular/core';


// TODO da capire se va bene e forse metterla in un file a parte
interface LiveMatchInfo {
  playerA: string,
  playerB: string,
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

  /**
   * List of global live matches.
   */
  globalLiveMatches: LiveMatchInfo[] = [];

  constructor() { }

  ngOnInit(): void {
  }

}
