import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AuthService } from 'src/app/auth/services/auth.service';
import { FriendInfo } from 'src/app/services/friend.service';


export enum CardType {
  OFFLINE = 'OFFLINE',
  ONLINE = 'ONLINE',
  IN_GAME = 'IN_GAME',
  MATCH_REQUEST_RECEIVED = 'MATCH_REQUEST_RECEIVED',
  MATCH_REQUEST_SENT = 'MATCH_REQUEST_SENT',
}

export interface FriendAction {
  targetFriend: string,
  actionType: FriendActionType,
}


export enum FriendActionType {
  WATCH = 'WATCH',
  SEND_MATCH_REQUEST = 'SEND_MATCH_REQUEST',
  CANCEL_MATCH_REQUEST = 'CANCEL_MATCH_REQUEST',
  ACCEPT_MATCH_REQUEST = 'ACCEPT_MATCH_REQUEST',
  REJECT_MATCH_REQUEST = 'REJECT_MATCH_REQUEST',
}


@Component({
  selector: 'app-friend-card',
  templateUrl: './friend-card.component.html',
  styleUrls: ['./friend-card.component.css']
})
export class FriendCardComponent implements OnInit {


  @Input() friendInfo!: FriendInfo;
  @Output() friendAction: EventEmitter<FriendAction> = new EventEmitter<FriendAction>();


  constructor() { }

  ngOnInit(): void {
  }

  getFriendUsername(): string {
    return this.friendInfo.username;
  }

  cardType(): CardType {
    if (!this.friendInfo.online) { return CardType.OFFLINE; }
    if (this.friendInfo.ingame) { return CardType.IN_GAME; }
    if (this.friendInfo.matchRequestSent) { return CardType.MATCH_REQUEST_SENT; }
    if (this.friendInfo.matchRequestReceived) { return CardType.MATCH_REQUEST_RECEIVED; }
    return CardType.ONLINE;
  }

  watch(): void {
    this.emitFriendAction(FriendActionType.WATCH);
  }

  sendMatchRequest(): void {
    this.emitFriendAction(FriendActionType.SEND_MATCH_REQUEST);
  }

  cancelMatchRequest(): void {
    this.emitFriendAction(FriendActionType.CANCEL_MATCH_REQUEST);
  }

  acceptMatchRequest(): void {
    this.emitFriendAction(FriendActionType.ACCEPT_MATCH_REQUEST);
  }

  rejectMatchRequest(): void {
    this.emitFriendAction(FriendActionType.REJECT_MATCH_REQUEST);
  }

  private emitFriendAction(friendActionType: FriendActionType): void {
    this.friendAction.emit({
      targetFriend: this.friendInfo.username,
      actionType: friendActionType,
    });
  }

}
