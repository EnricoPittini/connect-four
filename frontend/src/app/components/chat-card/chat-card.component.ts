import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ClientChat } from 'src/app/services/friend-chat.service';

@Component({
  selector: 'app-chat-card',
  templateUrl: './chat-card.component.html',
  styleUrls: ['./chat-card.component.css']
})
export class ChatCardComponent implements OnInit {

  @Input() chat!: ClientChat;
  @Output() chatOpened: EventEmitter<string> = new EventEmitter<string>();

  constructor() { }

  ngOnInit(): void {
  }

  getOtherPlayerUsername(): string {
    return this.chat.otherPlayerUsername;
  }

  hasNewMessages(): boolean {
    return this.chat.newMessages;
  }

  onClick(): void {
    this.chatOpened.emit(this.getOtherPlayerUsername());
  }

}
