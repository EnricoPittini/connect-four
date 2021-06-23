import { Component } from '@angular/core';
import { Router, Event, NavigationStart, NavigationEnd, NavigationError } from '@angular/router';
import { FriendChatService } from './services/friend-chat.service';
import { GameService } from './services/game.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'connect-four';

  constructor(
    private router: Router,
    private gameService: GameService,
    private friendChatService: FriendChatService
  ) {

    this.router.events.subscribe((event: Event) => {

      if (event instanceof NavigationEnd) {
        if (event.url.substr(0,6) !== '/chat/') {
          this.friendChatService.exitChat();
          console.info('Exiting chat');
        }
        if (event.url.substr(0,5) !== '/game') {
          if (this.gameService.isObserving()) {
            this.gameService.stopObservingMatch();
          }
          else {
            this.gameService.forfait();
          }

        }
      }

    });

  }

}
