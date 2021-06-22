import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormControl } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ClientMessage, FriendChatService } from 'src/app/services/friend-chat.service';

@Component({
  selector: 'app-friend-chat',
  templateUrl: './friend-chat.component.html',
  styleUrls: ['./friend-chat.component.css']
})
export class FriendChatComponent implements OnInit {

  otherPlayerUsername: string | null = null;

  /**
   *
   */
  messageComposer: FormControl = new FormControl('');

  constructor(
    private activatedRoute: ActivatedRoute,
    private friendChatService: FriendChatService
  ) { }

  ngOnInit(): void {
    // Get the other player username from the current route
    const routeParams = this.activatedRoute.snapshot.paramMap;
    const otherPlayerUsername = routeParams.get('username') as string;
    this.otherPlayerUsername = otherPlayerUsername;

    if (!this.friendChatService.hasChatWith(otherPlayerUsername)) {
      this.friendChatService.createChat(otherPlayerUsername);
    }

    this.friendChatService.enterChat(otherPlayerUsername);
  }

  getMessages(): ClientMessage[] {
    return this.friendChatService.getMessages();
  }

  sendMessage(): void {
    this.friendChatService.sendMessage(this.messageComposer.value);
    this.messageComposer.setValue('');
  }
}
