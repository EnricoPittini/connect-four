import { Component, OnInit } from '@angular/core';

// TODO da capire se va bene e forse metterla in un file a parte
interface ChatInfo {
  player: string,
  hasNewMessages: boolean,
}


/**
 * The list of chat page.
 */
@Component({
  selector: 'app-chat-list',
  templateUrl: './chat-list.component.html',
  styleUrls: ['./chat-list.component.css']
})
export class ChatListComponent implements OnInit {

  /**
   * List of chats.
   */
  chats: ChatInfo[] = [];

  constructor() { }

  ngOnInit(): void {
  }

}
