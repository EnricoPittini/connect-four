import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';


/**
 * The stats page.
 */
@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.css']
})
export class StatsComponent implements OnInit {

  // TODO playerStats field (and type ?)

  constructor(
    private activatedRoute: ActivatedRoute,
  ) { }

  ngOnInit(): void {
  }

  /**
   * Retrieves the player stats from the PlayerService.
   */
  private getPlayerStats(): void {
    const username = this.activatedRoute.snapshot.paramMap.get('username');
    // TODO
    // this.playerService.getPlayerStats(username).subscribe(playerStats => this.playerStats = playerStats);
  }
}
