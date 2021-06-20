import { Component, OnInit } from '@angular/core';
import {FriendService} from 'src/app/services/friend.service';




/**
 * A side bar that shows information about the player's friends.
 */
@Component({
  selector: 'app-friends-side-bar',
  templateUrl: './friends-side-bar.component.html',
  styleUrls: ['./friends-side-bar.component.css']
})
export class FriendsSideBarComponent implements OnInit {



  // TODO probabile FriendService
  constructor(
    public friendService: FriendService,
  ) { }

  ngOnInit(): void {
  }

}
