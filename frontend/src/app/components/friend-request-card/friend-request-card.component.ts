import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { FriendRequest } from 'src/app/models/friend-request.model';
import { AvatarLinkGeneratorService } from 'src/app/services/avatar-link-generator.service';

export interface ProcessedFriendRequest {
  otherUsername: string,
  accepted: boolean,
}

@Component({
  selector: 'app-friend-request-card',
  templateUrl: './friend-request-card.component.html',
  styleUrls: ['./friend-request-card.component.css']
})
export class FriendRequestCardComponent implements OnInit {

  @Input() friendRequest!: FriendRequest;
  @Output() friendRequestProcessed: EventEmitter<ProcessedFriendRequest> = new EventEmitter<ProcessedFriendRequest>();

  constructor(
    private avatarLinkGenerator: AvatarLinkGeneratorService
  ) { }

  ngOnInit(): void {
  }

  accept(): void {
    this.friendRequestProcessed.emit({
      otherUsername: this.friendRequest.from,
      accepted: true,
    });
  }

  reject(): void {
    this.friendRequestProcessed.emit({
      otherUsername: this.friendRequest.from,
      accepted: false,
    });
  }

  getFromUsername(): string {
    return this.friendRequest.from;
  }

  avatarLink(): SafeUrl {
    return this.avatarLinkGenerator.avatarLink(this.getFromUsername());
  }

}
