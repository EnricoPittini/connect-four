import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ProcessedFriendRequest } from 'src/app/components/friend-request-card/friend-request-card.component';
import { FriendRequest } from 'src/app/models/friend-request.model';
import { FriendService } from 'src/app/services/friend.service';

@Component({
  selector: 'app-friend-request',
  templateUrl: './friend-request.component.html',
  styleUrls: ['./friend-request.component.css']
})
export class FriendRequestComponent implements OnInit {


  constructor(
    private friendService: FriendService,
    private auth: AuthService
  ) { }

  ngOnInit(): void {
  }

  getReceivedFriendRequests(): FriendRequest[] {
    return this.friendService.friendRequests.filter(friendRequest => friendRequest.to === this.auth.getUsername())
  }

  onFriendRequestProcessed(processedFriendRequest: ProcessedFriendRequest): void {
    if (processedFriendRequest.accepted) {
      this.friendService.sendFriendRequest(processedFriendRequest.otherUsername);
    }
    else {
      this.friendService.cancelFriendRequest(processedFriendRequest.otherUsername);
    }
  }
}
