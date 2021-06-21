import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from 'src/app/services/game.service';
import { RandomMatchService } from 'src/app/services/random-match.service';


/**
 * The home page.
 */
@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  constructor(
    private randomMatchService: RandomMatchService,
    private gameService: GameService
  ) { }

  ngOnInit(): void {
  }

  waitingMatch(): boolean {
    return this.randomMatchService.waitingMatch;
  }

  playRandomMatch(): void {
    this.randomMatchService.sendRandomMatchRequest();
  }

  cancelRandomMatch(): void {
    this.randomMatchService.cancelRandomMatchRequest();
  }

}
