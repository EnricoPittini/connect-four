import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PlayerService } from 'src/app/services/player.service';

@Component({
  selector: 'app-search-player',
  templateUrl: './search-player.component.html',
  styleUrls: ['./search-player.component.css']
})
export class SearchPlayerComponent implements OnInit {

  playersUsernames: string[] = [];

  constructor(
    private playerService: PlayerService,
    public router: Router,
  ) { }

  ngOnInit(): void {
    console.info('Entering SearchPlayer component');
    this.playerService.getPlayers().subscribe( players => this.playersUsernames=players );
  }

  getPlayers(partial_username: string): void{
    console.info('Searching players');
    console.info(partial_username);
    this.playerService.getPlayers(partial_username,0,10).subscribe( players => {
      this.playersUsernames=players;
      console.log(players);
    });
  }

}
