import { Component } from '@angular/core';
import { Router, Event, NavigationStart, NavigationEnd, NavigationError } from '@angular/router';
import { FriendChatService } from './services/friend-chat.service';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'connect-four';

  constructor(
    private router: Router,
    private friendChatService: FriendChatService
  ) {

    this.router.events.subscribe((event: Event) => {

      if (event instanceof NavigationEnd) {
        if (event.url.substr(0,6) !== '/chat/') {
          this.friendChatService.exitChat();
          console.info('Exiting chat');
        }
      }

    });

  }

}
