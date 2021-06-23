import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClientChat, FriendChatService } from 'src/app/services/friend-chat.service';


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

  constructor(
    private router: Router,
    private friendChatService: FriendChatService
  ) { }

  ngOnInit(): void {
  }

  getChats(): ClientChat[] {
    return this.friendChatService.chats;
  }

  openChat(otherPlayerUsername: string): void {
    this.router.navigate([`/chat/${otherPlayerUsername}`])
  }
}
