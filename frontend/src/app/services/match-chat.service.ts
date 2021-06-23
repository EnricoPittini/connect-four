import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

import { io, Socket } from 'socket.io-client';
import ClientEvents from 'src/app/models/eventTypes/client-events.model';
import ServerEvents, { ToClientFriendMessage } from 'src/app/models/eventTypes/server-events.model';
import getSocket from 'src/app/utils/initialize-socket-io';

import { AuthService } from '../auth/services/auth.service';
import { Chat, SenderPlayer, Message } from '../models/chat.model';
import { NotifyAvailabilityFriendRequestRequestBody, NotifyUnavailabilityFriendRequestRequestBody } from '../models/httpTypes/requests.model';
import {
  GetFriendRequestsResponseBody,
  GetFriendsResponseBody,
  GetPlayerResponseBody,
  NotifyAvailabilityFriendRequestResponseBody,
  GetChatsResponseBody,
  ChatInfo,
  GetChatResponseBody,
} from '../models/httpTypes/responses.model';
import { Match } from '../models/match.model';


/**
 * Represents the match messages as seen by the Client (e.g. as seen by the user)
 */
export interface ClientMatchMessage {
  from: string,
  text: string,
  datetime: Date,
}

/**
 * Match Chat Service
 */
@Injectable({
  providedIn: 'root'
})
export class MatchChatService {

  // TODO .env per host, porta e versione ?
  /**
   * Base REST api server url.
   */
   private static readonly BASE_URL = 'http://localhost:8080/v0.0.1';

   /**
    * Base WebSocket server url.
    */
   private static readonly BASE_SOCKET_URL = 'http://localhost:8080';

   /**
   * Http headers.
   */
   private createHttpOptions(params: any = {}) {
     return {
       headers: new HttpHeaders({
         'Authorization': `Bearer ${this.auth.getToken()}`,
         'Content-Type': 'application/json',
       }),
       params: new HttpParams({ fromObject: params }),
     };
   };

   /**
   * The socket to interact with the backend.
   */
   socket: Socket<ServerEvents, ClientEvents>;

   /**
    *
    */
   matchId: string | null;

   messages: ClientMatchMessage[];

   /**
    * Constructs the FriendChatService.
    *
    * @param http - The HttpClient
    * @param auth - The AuthService
    */
   constructor(
     private http: HttpClient,
     private auth: AuthService,
   ) {
     console.info('MatchChat  service instantiated');

    // Connect to the server
    this.socket = getSocket();

    // Match chat management
    this.messages = [];
    this.matchId = null;
     //this.listenForMessagesUpdate();
   }

  /**
   * Initiate the match chat to the specified match
   * @param matchId
   * @returns true if the match chat is correctly initiated, false otherwise (e.g. the last match chat wasn't stopped )
   */
  initiate(matchId: string): boolean{
    console.log(`initiate:${matchId}` )
    console.log(`initiate:${this.messages.length>0}` )

    if(this.matchId || this.messages.length>0){
      return false;
    }
    console.info("Initiate match chat, matchId: " + matchId)
    this.matchId = matchId;
    this.listenForMessagesUpdate();
    return true;
  }

   /**
    * Sends a message to the match
    * @param text
    * @returns true if the message is correctly sent, false otherwise (e.g. the match it's not initiated yet)
    */
   sendMessage(text: string): boolean{
    console.info(`Sending a message to the match ${this.matchId}  with text: ${text}`);

    if(!this.matchId){
      console.error('The match it\'s not initiated yet');
      return false;
    }

    this.socket.emit('matchChat', {
      matchId: this.matchId,
      text: text,
    });
    return true;
   }

   /**
   * Sets the handler for the socket events related to the match chats.
   * It takes care of mantaining the messages ('messages') updated.
   */
   private listenForMessagesUpdate(): void{
     // matchChat: a new message has arrived
    this.socket.on('matchChat', (newMessage) => {
      console.info(`New match chat message: ` + JSON.stringify(newMessage,null,2));

      if(newMessage.matchId!==this.matchId){
        console.warn('It\'s arrived a message of a another match; the match that the user is following is: ' + this.matchId);
        return;
      }

      this.messages.push({
        from: newMessage.from,
        text: newMessage.text,
        datetime: newMessage.datetime,
      });
   });
  }

  /**
   * Stop the match chat of the previously specified match
   */
  stop(): void{
    console.log("stopping !!!!!!!")
    this.matchId = null;
    this.messages = [];
    this.socket.off('matchChat');
  }
}
