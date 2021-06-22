import { Component, Input, OnInit } from '@angular/core';
import { ClientMessage } from 'src/app/services/friend-chat.service';

@Component({
  selector: 'app-friend-chat-message',
  templateUrl: './friend-chat-message.component.html',
  styleUrls: ['./friend-chat-message.component.css']
})
export class FriendChatMessageComponent implements OnInit {

  @Input() message!: ClientMessage;

  constructor() { }

  ngOnInit(): void {
  }



}
