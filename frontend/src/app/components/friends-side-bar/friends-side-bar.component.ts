import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FriendInfo, FriendService } from 'src/app/services/friend.service';
import { GameService } from 'src/app/services/game.service';
import { FriendAction, FriendActionType } from '../friend-card/friend-card.component';




/**
 * A side bar that shows information about the player's friends.
 */
@Component({
  selector: 'app-friends-side-bar',
  templateUrl: './friends-side-bar.component.html',
  styleUrls: ['./friends-side-bar.component.css']
})
export class FriendsSideBarComponent implements OnInit {

  constructor(
    private router: Router,
    public friendService: FriendService,
    private gameService: GameService
  ) { }

  ngOnInit(): void {
  }

  sortedFriendInfoList(): FriendInfo[] {
    // Clone the friend list
    const friends = [...this.friendService.friends];
    friends.sort((a, b) => {
      return Number(b.matchRequestReceived) - Number(a.matchRequestReceived)
             || Number(b.online) - Number(a.online)
             || a.username.toLowerCase().localeCompare(b.username.toLowerCase());
    });

    return friends;
  }

  onFriendAction(friendAction: FriendAction): void {
    switch (friendAction.actionType) {
      case FriendActionType.WATCH:
        this.gameService.getMatchIdFromUsername(friendAction.targetFriend).subscribe(
          matchId => {
            this.router.navigate(['/game']);
            this.gameService.startObservingMatch(matchId);
          },
          error => {
            console.error('An error occurred while finding the id of the match to observe');
          }
        );
        break;

      case FriendActionType.ACCEPT_MATCH_REQUEST:
        this.friendService.sendMatchRequest(friendAction.targetFriend);
        break;

      case FriendActionType.REJECT_MATCH_REQUEST:
        this.friendService.cancelMatchRequest(friendAction.targetFriend);
        break;

      case FriendActionType.SEND_MATCH_REQUEST:
        this.friendService.sendMatchRequest(friendAction.targetFriend);
        break;

      case FriendActionType.CANCEL_MATCH_REQUEST:
        this.friendService.cancelMatchRequest(friendAction.targetFriend);
        break;

      default:
        // Make sure all the FriendActionType cases are covered
        const _exhaustiveCheck: never = friendAction.actionType;
        return _exhaustiveCheck;
    }
  }

}
