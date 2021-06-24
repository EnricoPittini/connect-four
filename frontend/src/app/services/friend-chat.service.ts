import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

import { io, Socket } from 'socket.io-client';
import ClientEvents from 'src/app/models/eventTypes/client-events.model';
import ServerEvents, { ToClientFriendMessage } from 'src/app/models/eventTypes/server-events.model';
import getSocket from 'src/app/utils/initialize-socket-io';

import { AuthService } from '../auth/services/auth.service';
import { Chat, SenderPlayer } from '../models/chat.model';
import {
  GetChatsResponseBody,
  ChatInfo,
  GetChatResponseBody,
} from '../models/httpTypes/responses.model';


/**
 * Represents the messages as seen by the Client (i.e. as seen by the user)
 */
export interface ClientMessage{
  sended: boolean,
  text: string,
  datetime: Date,
}

/**
 * Represents the chats as seen by the Client (i.e. as seen by the user)
 */
export interface ClientChat{
  otherPlayerUsername: string,
  messages: ClientMessage[],
  newMessages: boolean,
}


/**
 * Friend Chat Service
 */
@Injectable({
  providedIn: 'root'
})
export class FriendChatService {

  /**
   * Base REST api server url.
   */
  private static readonly BASE_URL = 'http://localhost:8080/v1.0.0';

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
   * The list of chats of that user
   */
  chats: ClientChat[];

  /**
   * The username of the other player of the current chat (if any)
   */
  currentChatOtherPlayerUsername: string | null = null;

  /**
   * Constructs the FriendChatService.
   *
   * @param http - The HttpClient
   * @param auth - The AuthService
   */
  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {
    console.info('FriendChat service instantiated');

    // Connect to the server
    this.socket = getSocket();

    // Friend chats managment
    this.chats = [];
    // this.populateChats();
    // this.listenForChatsUpdate();

    this.auth.authEvents.subscribe(
      authenticated => {
        authenticated ? this.start() : this.stop();
      }
    );
  }

  start(): void {
    // Connect to the server
    this.socket = getSocket();

    // Friend chats managment
    this.chats = [];
    this.populateChats();
    this.listenForChatsUpdate();
  }

  stop(): void {
    this.socket.off('chat');
  }

  /**
   * Checks if there is a chat with the givem player.
   *
   * @param otherPlayerUsername - The username of the other player
   * @returns true if there is a chat with the given player, false otherwise.
   */
  hasChatWith(otherPlayerUsername: string): boolean {
    return !!this.chats.find(chat => chat.otherPlayerUsername === otherPlayerUsername);
  }

  /**
   * Creates a new empty chat with that player.
   *
   * @param otherPlayerUsername - The username of the player with whom to chat.
   */
  createChat(otherPlayerUsername: string): void {
    if (this.hasChatWith(otherPlayerUsername)) {
      return;
    }
    const clientChat : ClientChat = {
      otherPlayerUsername: otherPlayerUsername,
      messages: [],
      newMessages: false,
    };

    this.chats.push(clientChat);
  }

  /**
   *  Enters in the chat relate to the specified username.
   *  Returns true if a chat with that player exists, false otherwise (i.e. it does not exist the specified chat)
   */
  enterChat(selectedChatOtherPlayerUsername: string): boolean{
    console.info('Entering the chat relate to the username: ' + selectedChatOtherPlayerUsername);
    const chat = this.chats.find(chat => chat.otherPlayerUsername === selectedChatOtherPlayerUsername);
    if(!chat){
      console.error('It does not exist a chat with the specified username');
      return false;
    }
    this.currentChatOtherPlayerUsername = selectedChatOtherPlayerUsername;
    chat.newMessages = false;

    return true;
  }

  /**
   * Exits from the current chat (if any)
   */
  exitChat(): void{
    this.currentChatOtherPlayerUsername = null;
  }

  /**
   * Sends a message to the current chat.
   * Returns true if there is a current chat, false otherwise (i.e. the message isn't correctly sent)
   */
  sendMessage(text: string): boolean{
    console.info(`Sending a message to: ${this.currentChatOtherPlayerUsername} with text: ${text}`);

    if(!this.currentChatOtherPlayerUsername){
      console.error('There isn\'t a a valid current chat');
      return false;
    }

    this.socket.emit('friendChat', {
      to: this.currentChatOtherPlayerUsername,
      text: text,
    });
    return true;
  }

  /**
   * Gets the messages of the chat with the player with username `currentChatOtherPlayerUsername`.
   * Before calling this method, you must call `enterChat(username)` method.
   *
   * @returns The messages of the chat with the player with username `currentChatOtherPlayerUsername`.
   */
  getMessages(): ClientMessage[] {
    if (!this.currentChatOtherPlayerUsername) {
      console.error('You must enter a chat before getting its messages');
      return [];
    }
    const currentChat = this.chats.find(el => el.otherPlayerUsername === this.currentChatOtherPlayerUsername);
    return currentChat?.messages || [];
  }


  /**
   * Populates the `chats` field, by retrieving from the backend information
   * about each of the chats of the authenticated user.
   */
  private populateChats(): void {
    // Get the chats info (i.e. the chats without the messages) of the player
    this.http.get<GetChatsResponseBody>(`${FriendChatService.BASE_URL}/chats`, this.createHttpOptions())
      .pipe(
        mergeMap(response => from(response.chats)),       // flatten the object into an array of chats info
        mergeMap(this.getChat)  // For each chat info, retreive the fully chat entity (i.e. with the messages)
      )
      .subscribe(
        chatResponseBody => {
          // Create the client chat and push it into the list of chats
          const clientChat : ClientChat | undefined = this.transformChat(chatResponseBody.chat);
          if(clientChat){
            this.chats.push(clientChat);
          }
        },
        error => console.error(error)
      );
  }


  /**
   * Gets the fully chat entity of the given chat info
   *
   * @param chatInfo - The chat info
   * @returns An Observable that yields the fully chat entity
   */
  // private getChat(chatInfo: ChatInfo): Observable<GetChatResponseBody> {
  private getChat = (chatInfo: ChatInfo): Observable<GetChatResponseBody> => {
    const otherPlayerUsername = chatInfo.playerA===this.auth.getUsername() ?  chatInfo.playerB : chatInfo.playerA;
    return this.http.get<GetChatResponseBody>(`${FriendChatService.BASE_URL}/chats/${otherPlayerUsername}`, this.createHttpOptions());
  }

  /**
   * Given a fully chat entity, returns the correspondent client chat for the user.
   * If the user isn't one of the players of that chat, it returns undefined.
   * @param chat
   * @returns
   */
  private transformChat(chat: Chat): ClientChat | undefined{
    // Username of the user
    const myUsername = this.auth.getUsername();

    // Indicates if the user is the player A or the player B of the chat
    let whichPlayer: SenderPlayer;
    // The username of the other player of the chat
    let otherPlayerUsername : string;
    // Indicates if the user has new messages in that chat
    let newMessages : boolean;

    if (myUsername === chat.playerA) {
      whichPlayer = SenderPlayer.PLAYER_A;
      otherPlayerUsername = chat.playerB;
      newMessages = chat.playerAHasNewMessages;
    }
    else if (myUsername === chat.playerB) {
      whichPlayer = SenderPlayer.PLAYER_B;
      otherPlayerUsername = chat.playerA;
      newMessages = chat.playerBHasNewMessages;
    }
    else{
      console.error('The user is not one of the players of that chat, chat: ' + JSON.stringify(chat,null,2));
      return;
    }

    // Transform the messages into client messages
    const messages : ClientMessage[] = chat.messages.map( message => ({
      sended: message.sender === whichPlayer ? true : false,
      text: message.text,
      datetime: message.datetime,
    }));

    // Creates the client chat
    const clientChat : ClientChat = {
      otherPlayerUsername: otherPlayerUsername,
      messages: messages,
      newMessages: newMessages,
    }
    return clientChat;
  }


  /**
   * Sets the handler for the socket events related to the friends chats.
   * It takes care of mantaining the friends chats (`chats`) updated.
   */
   private listenForChatsUpdate(): void {
    // chat: a new message has arrived
    this.socket.on('chat', (newMessage) => {
      console.info(`New friend chat message: ` + JSON.stringify(newMessage,null,2));

      // Username of the user
      const myUsername = this.auth.getUsername();

      // Username of the other player of the new message
      let otherPlayerUsername : string;
      // Indicates if was the user that sent the message
      let sended: boolean;

      if(newMessage.from===myUsername){
        otherPlayerUsername = newMessage.to;
        sended = true;
      }
      else if(newMessage.to===myUsername){
        otherPlayerUsername = newMessage.from;
        sended = false;
      }
      else{
        console.error('The new message it\'s not relate to the user, newMessage ' + JSON.stringify(newMessage,null,2));
        return;
      }

      // The chat between the two players
      let chat = this.chats.find( el => el.otherPlayerUsername===otherPlayerUsername);

      if(!chat){ // A chat between the two friends doesn't exists : create a new one
        chat = {
          otherPlayerUsername: otherPlayerUsername,
          messages: [],
          newMessages: false,
        };
        this.chats.push(chat);
      }

      // Push the new message into the chat
      chat.messages.push({
        sended: sended,
        text: newMessage.text,
        datetime: newMessage.datetime,
      });

      // If the user is the receiver of the message and if the other player is the player of the current chat, the flag
      // 'newMessages' of the chat is put as true
      if(!sended && !(this.currentChatOtherPlayerUsername===otherPlayerUsername)){
        chat.newMessages = true;
      }

    });
   }

}
