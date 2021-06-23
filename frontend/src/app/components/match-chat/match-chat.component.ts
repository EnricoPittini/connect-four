import { Component, Input, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ClientMatchMessage, MatchChatService } from 'src/app/services/match-chat.service';

@Component({
  selector: 'app-match-chat',
  templateUrl: './match-chat.component.html',
  styleUrls: ['./match-chat.component.css']
})
export class MatchChatComponent implements OnInit {

  @Input() matchId: string | null = null;

  messageComposer: FormControl = new FormControl('');

  constructor(
    private matchChatService: MatchChatService
  ) { }

  ngOnInit(): void {
    // console.log('onInit')
    // if (this.matchId) {
    //   console.log('initiating')

    //   // this.matchChatService.stop();
    //   this.matchChatService.initiate(this.matchId);
    // }
  }

  getMessages(): ClientMatchMessage[] {
    return this.matchChatService.messages;
  }

  sendMessage(): void {
    this.matchChatService.sendMessage(this.messageComposer.value);
    this.messageComposer.setValue('');
  }

}
