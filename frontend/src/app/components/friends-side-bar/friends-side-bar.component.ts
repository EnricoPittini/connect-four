import { Component, OnInit } from '@angular/core';

// TODO da capire se va bene e forse metterla in un file a parte
interface FriendInfo {
  username: string,
  online: boolean,
  playing: boolean,
  matchRequestSent: boolean,
  matchRequestReceived: boolean,
  // TODO forse unreadMessages: boolean,    // non serve in sidebar, ma in chat
}

@Component({
  selector: 'app-friends-side-bar',
  templateUrl: './friends-side-bar.component.html',
  styleUrls: ['./friends-side-bar.component.css']
})
export class FriendsSideBarComponent implements OnInit {

  /**
   * List of FriendInfo.
   */
  friends: FriendInfo[] = [];

  // TODO probabile FriendService
  constructor() { }

  ngOnInit(): void {
  }

}
