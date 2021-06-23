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

  /**
   * Returns the user username
   * @returns 
   */
  getUsername(): string {
    return this.auth.getUsername();
  }

  /**
   * Checks if the user is waiting for a random match
   * @returns 
   */
  waitingMatch(): boolean {
    return this.randomMatchService.waitingMatch;
  }

  /**
   * The user asks to play a random match
   */
  playRandomMatch(): void {
    this.randomMatchService.sendRandomMatchRequest();
  }

  /**
   * The user cancels his random match request
   */
  cancelRandomMatch(): void {
    this.randomMatchService.cancelRandomMatchRequest();
  }

  avatarLink(): SafeUrl {
    return this.avatarLinkGenerator.avatarLink(this.getUsername());
  }

}
