import { Component, OnInit } from '@angular/core';
import { FriendRequest } from 'src/app/models/friend-request.model';
import { FriendService } from 'src/app/services/friend.service';

@Component({
  selector: 'app-friend-request',
  templateUrl: './friend-request.component.html',
  styleUrls: ['./friend-request.component.css']
})
export class FriendRequestComponent implements OnInit {


  constructor(
    private friendService: FriendService
  ) { }

  ngOnInit(): void {
  }


  getFriendRequests(): FriendRequest[] {
    return this.friendService.friendRequests;
  }
}
