import { Component, Input, OnInit } from '@angular/core';
import { ClientMatchMessage } from 'src/app/services/match-chat.service';

@Component({
  selector: 'app-match-chat-message',
  templateUrl: './match-chat-message.component.html',
  styleUrls: ['./match-chat-message.component.css']
})
export class MatchChatMessageComponent implements OnInit {

  @Input() message!: ClientMatchMessage;

  constructor() { }

  ngOnInit(): void {
  }

}
