import { Component, OnInit } from '@angular/core';




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
  constructor() { }

  ngOnInit(): void {
  }

}
