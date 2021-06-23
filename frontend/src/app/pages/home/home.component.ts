import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/auth/services/auth.service';
import { AvatarLinkGeneratorService } from 'src/app/services/avatar-link-generator.service';
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
    private auth: AuthService,
    private randomMatchService: RandomMatchService,
    private gameService: GameService,                 // mandatory to listen for match related events
    private avatarLinkGenerator: AvatarLinkGeneratorService
  ) { }

  ngOnInit(): void {
  }

  getUsername(): string {
    return this.auth.getUsername();
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

  avatarLink(): SafeUrl {
    return this.avatarLinkGenerator.avatarLink(this.getUsername());
  }

}
