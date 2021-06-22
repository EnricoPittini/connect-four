import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FriendRequest } from 'src/app/models/friend-request.model';

@Component({
  selector: 'app-friend-request-card',
  templateUrl: './friend-request-card.component.html',
  styleUrls: ['./friend-request-card.component.css']
})
export class FriendRequestCardComponent implements OnInit {

  @Input() friendRequest!: FriendRequest;
  @Output() friendRequestProcessed: EventEmitter<boolean> = new EventEmitter<boolean>();

  constructor() { }

  ngOnInit(): void {
  }

  accept(): void {
    this.friendRequestProcessed.emit(true);
  }

  reject(): void {
    this.friendRequestProcessed.emit(false);
  }

  getFromUsername(): string {
    return this.friendRequest.from;
  }
}
