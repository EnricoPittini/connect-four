import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { map, mergeMap, tap } from 'rxjs/operators';

import { io, Socket } from 'socket.io-client';
import ClientEvents from 'src/app/models/eventTypes/client-events.model';
import ServerEvents from 'src/app/models/eventTypes/server-events.model';
import getSocket from 'src/app/utils/initialize-socket-io';

import { AuthService } from '../auth/services/auth.service';
import { FriendRequest } from '../models/friend-request.model';
import { NotifyAvailabilityFriendRequestRequestBody, NotifyUnavailabilityFriendRequestRequestBody } from '../models/httpTypes/requests.model';
import {
  GetFriendRequestsResponseBody,
  GetFriendsResponseBody,
  GetPlayerResponseBody,
  NotifyAvailabilityFriendRequestResponseBody,
  SuccessResponseBody,
} from '../models/httpTypes/responses.model';


export interface FriendInfo {
  username: string,
  online: boolean,
  ingame: boolean,
  matchRequestSent: boolean,
  matchRequestReceived: boolean,
}


/**
 * Friend service.
 */
@Injectable({
  providedIn: 'root'
})
export class FriendService {

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
   * List of FriendInfo.
   */
  friends: FriendInfo[];

  /**
   * List of FriendRequest.
   */
  friendRequests: FriendRequest[];

  isListening: boolean = false;

  /**
   * Constructs the FriendService.
   *
   * @param http - The HttpClient
   * @param auth - The AuthService
   */
  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {
    console.info('Friend service instantiated');

    // // Connect to the server
    this.socket = getSocket();

    // // Friend list management
    this.friends = [];
    // this.populateFriendList();
    // this.listenForFriendListUpdate();

    // // Friend request management
    this.friendRequests = [];
    // this.populateFriendRequestList();
    // this.listenForFriendRequestListUpdate();

    this.auth.authEvents.subscribe(
      authenticated => {
        authenticated ? this.start() : this.stop();
      }
    );
  }

  start(): void {
    // Connect to the server
    this.socket = getSocket();

    // Friend list management
    this.friends = [];
    this.populateFriendList();
    this.listenForFriendListUpdate();

    // Friend request management
    this.friendRequests = [];
    this.populateFriendRequestList();
    this.listenForFriendRequestListUpdate();
  }

  stop(): void {
    this.socket.off('friendOnline');
    this.socket.off('friendOffline');
    this.socket.off('friendMatchRequest');
    this.socket.off('deleteFriendMatchRequest');
    this.socket.off('newFriend');
    this.socket.off('lostFriend');

    this.socket.off('newFriendRequest');
    this.socket.off('cancelFriendRequest');
  }

  /**
   * Notifies the availability of the authenticated user to play a match with
   * the user with the given username.
   *
   * @param username - The username of the player to whom send a match request
   */
  sendMatchRequest(username: string): void {
    console.info(`Sending a match request to: ${username}`);

    this.socket.emit('friendMatchRequest', username);
  }

  /**
   * Notifies the unavailability of the authenticated user to play a match with
   * the user with the given username.
   *
   * @param username - The username of the player to whom cancel the match request
   */
  cancelMatchRequest(username: string): void {
    console.info(`Cancelling the match request to: ${username}`);

    this.socket.emit('deleteFriendMatchRequest', username);
  }

  /**
   * Checks if the user and the specified player are friends
   * @param username
   * @returns
   */
  hasFriend(username: string): boolean{
    return !!this.friends.find( friend => friend.username===username);
  }

  /**
   * Checks if the user has sent a match request to the specified player
   * @param username
   * @returns
   */
  hasSentMatchRequest(username: string): boolean{
    return !!this.friends.find( friend => friend.username===username && friend.matchRequestSent);
  }

  /**
   * Checks if the user has sent a friend request to the specified player
   * @param username
   * @returns
   */
  hasSentFriendRequest(username: string): boolean{
    return !!this.friendRequests.find( friendRequest => friendRequest.from===this.auth.getUsername() && friendRequest.to===username);
  }

  /**
   * Checks if the spacified player has sent a friend request to the user
   * @param username
   * @returns
   */
  hasReceivedFriendRequest(username: string): boolean{
    return !!this.friendRequests.find( friendRequest => friendRequest.from===username && friendRequest.to===this.auth.getUsername());
  }

  /**
   * Checks, in an async way, if the user and the specified player are friends
   * @param username
   * @returns
   */
  hasFriendAsync(username: string): Observable<boolean>{
    return this.http.get<GetFriendsResponseBody>(`${FriendService.BASE_URL}/friends`, this.createHttpOptions())
      .pipe(
        map(response =>  !!response.friends.find(friend => friend===username))
      );
  }

  /**
   * Checks, in an async way, if the user has sent a friend request to the specified player
   * @param username
   * @returns
   */
   hasSentFriendRequestAsync(username: string): Observable<boolean>{
    return this.http.get<GetFriendRequestsResponseBody>(`${FriendService.BASE_URL}/friend_requests`, this.createHttpOptions())
    .pipe(
      map(response => !!response.friendRequests.find( request => request.from===this.auth.getUsername() && request.to===username))
    );
  }

  /**
   * Checks, in an async way, if the specified player and the user are friends
   * @param username
   * @returns
   */
  hasReceivedFriendRequestAsync(username: string): Observable<boolean>{
    return this.http.get<GetFriendRequestsResponseBody>(`${FriendService.BASE_URL}/friend_requests`, this.createHttpOptions())
    .pipe(
      map(response => !!response.friendRequests.find( request => request.from===username && request.to===this.auth.getUsername()))
    );
  }


  /**
   * Returns an observable that generates friend-related updates abouts the given username
   * @param username
   * @returns
   */
  listenForFriendUpdates(username: string): Observable<string> | undefined{
    this.isListening = true;
    return new Observable<string>( (observer) => {
      this.socket.on('newFriend', otherUsername => {
        if(otherUsername===username){
          observer.next('newFriend');
        }
      });
      this.socket.on('lostFriend', otherUsername => {
        if(otherUsername===username){
          observer.next('lostFriend');
        }
      });
      this.socket.on('newFriendRequest', otherUsername => {
        if(otherUsername===username){
          observer.next('newFriendRequest');
        }
      });
      this.socket.on('cancelFriendRequest', otherUsername => {
        if(otherUsername===username){
          observer.next('cancelFriendRequest');
        }
      });
      this.socket.on('friendOnline', otherUsername =>{
        if(otherUsername===username){
          observer.next('friendOnline');
        }
      });
      this.socket.on('friendOffline', otherUsername =>{
        if(otherUsername===username){
          observer.next('friendOffline');
        }
      });
      this.socket.on('friendIngame', otherUsername =>{
        if(otherUsername===username){
          observer.next('friendIngame');
        }
      });
      this.socket.on('friendOffgame', otherUsername =>{
        if(otherUsername===username){
          observer.next('friendOffgame');
        }
      });
    });
  }

  /**
   * Delets the friend with the specified username, if any
   * @param username
   */
  deleteFriend(friendUsername: string): void{
    console.info('Deleting the friend ' + friendUsername);
    this.http.delete<SuccessResponseBody>(
      `${FriendService.BASE_URL}/friends/${friendUsername}`,
      this.createHttpOptions()
    )
    .subscribe(
      response => console.info('Friend deleted correctly'),
      error => console.error('An error occurred while deleting the friend')
    );
    this.friends = this.friends.filter( friend => !(friend.username===friendUsername));
  }

  /**
   * Notifies the availability of the authenticated user to be friend with
   * the user with the given username.
   *
   * @param username - The username of the player to whom send the friend request
   */
  sendFriendRequest(username: string): void {
    console.info(`Sending a friend request to: ${username}`);

    const body: NotifyAvailabilityFriendRequestRequestBody = {
      username: username,
    };

    this.http.post<NotifyAvailabilityFriendRequestResponseBody>(
      `${FriendService.BASE_URL}/friend_requests`,
      body,
      this.createHttpOptions()
    )
    .subscribe(
      response => {
        console.info('Friend request sent correctly')
        this.friendRequests = [];
        this.populateFriendRequestList();
      },
      error => console.error('An error occurred while sending the friend request')
    );
  }

  /**
   * Notifies the unavailability of the authenticated user to be friend with
   * the user with the given username.
   *
   * @param username - The username of the player to whom cancel the friend request
   */
  cancelFriendRequest(username: string): void {
    console.info(`Cancelling the friend request to: ${username}`);

    const body: NotifyUnavailabilityFriendRequestRequestBody = {
      username: username,
    };

    this.http.request(
      'delete',
      `${FriendService.BASE_URL}/friend_requests`,
      { ...this.createHttpOptions(), body: body }
    )
    .subscribe(
      response => {
        console.info('Friend request cancelled correctly')
        this.friendRequests = [];
        this.populateFriendRequestList();
      },
      error => console.error('An error occurred while cancelling the friend request')
    );
  }


  /**
   * Populate the `friends` field, by retrieving from the backend information
   * about each of the friends of the authenticated user.
   */
  populateFriendList(): void {
    // Get information about the friends
    this.http.get<GetFriendsResponseBody>(`${FriendService.BASE_URL}/friends`, this.createHttpOptions())
      .pipe(
        mergeMap(response => from(response.friends)),       // flatten the object into an array of usernames
        mergeMap(this.getFriendInfo)
      )
      .subscribe(
        friendInfoResponseBody => {
          // Create the FriendInfo object and push it into the `friends` field.
          const friendInfo: FriendInfo = {
            username: friendInfoResponseBody.player.username,
            online: friendInfoResponseBody.player.online,
            ingame: friendInfoResponseBody.player.ingame,
            matchRequestSent: false,
            matchRequestReceived: false,
          };
          // Remove and push (fast trick)
          this.friends = this.friends.filter(el => el.username !== friendInfo.username);
          this.friends.push(friendInfo);
        },
        error => console.error(error)
      );
  }

  /**
   * Gets information about the player with the given username.
   *
   * @param friendUsername - The username of the friend player
   * @returns An Observable that yields the information about the given friend.
   */
  // private getFriendInfo(friendUsername: string): Observable<GetPlayerResponseBody>
  //   return this.http.get<GetPlayerResponseBody>(`${FriendService.BASE_URL}/players/${friendUsername}`, this.createHttpOptions());
  // }

  private getFriendInfo = (friendUsername: string): Observable<GetPlayerResponseBody> => {
    return this.http.get<GetPlayerResponseBody>(`${FriendService.BASE_URL}/players/${friendUsername}`, this.createHttpOptions());
  }

  /**
   * Sets the handler for the socket events related to the friend list.
   * It takes care of mantaining the friend list (`friends`) updated.
   */
  private listenForFriendListUpdate(): void {
    // friendOnline: a friend went online
    this.socket.on('friendOnline', (friendUsername) => {
      console.info(`Friend online: ${friendUsername}`);

      // Set the friend as online
      for (let friendInfo of this.friends) {
        if (friendInfo.username === friendUsername) {
          friendInfo.online = true;
        }
      }
    });

    // friendOffline: a friend went offline
    this.socket.on('friendOffline', (friendUsername) => {
      console.info(`Friend offline: ${friendUsername}`);

      for (let friendInfo of this.friends) {
        if (friendInfo.username === friendUsername) {
          // Set friend as offline
          friendInfo.online = false;
          // When a player goes offline, also the following fields are affected.
          // We set them to their correct value, even though it wouldn't
          // be necessary, cause they would be setted by the other socket
          // event handlers.
          friendInfo.ingame = false;
          friendInfo.matchRequestSent = false;
          friendInfo.matchRequestReceived = false;
        }
      }
    });

    // friendIngame: a friend entered a match
    this.socket.on('friendIngame', (friendUsername) => {
      console.info(`Friend in game: ${friendUsername}`);

      // Set the friend as in game
      for (let friendInfo of this.friends) {
        if (friendInfo.username === friendUsername) {
          friendInfo.ingame = true;
          // When a player goes in game, also the following fields are affected.
          friendInfo.matchRequestSent = false;
          friendInfo.matchRequestReceived = false;
        }
      }
    });

    // friendOutgame: a friend exited a match
    this.socket.on('friendOffgame', (friendUsername) => {
      console.info(`Friend out of game: ${friendUsername}`);

      for (let friendInfo of this.friends) {
        if (friendInfo.username === friendUsername) {
          // Set friend as out of game
          friendInfo.ingame = false;
        }
      }
    });

    // friendMatchRequest: the user or a friend sent a match request
    this.socket.on('friendMatchRequest', ({ sender, receiver }) => {
      // sender: the player that notified his availabilty to play the match
      // receiver: the player that is being notified about the availabilty to play the match
      //           from the other player

      const myUsername = this.auth.getUsername();
      let otherUsername;
      if (myUsername === sender) {
        // I'm the player that notified his availabilty to play the match
        otherUsername = receiver;
      }
      else {
        // myUsername === receiver
        // The other player has notified me his availability to play the match
        otherUsername = sender;
      }

      // Search for the friend to/from whom the match request was sent/received
      for (let friendInfo of this.friends) {
        if (friendInfo.username === otherUsername) {
          // Set both to false, instead of setting the only one that is true
          if (myUsername === sender) {
            // I'm the sender
            friendInfo.matchRequestSent = true;
          }
          else {
            // I'm the receiver
            friendInfo.matchRequestReceived = true;
          }
        }
      }

      console.info(`Friend match request sent: ${otherUsername}`);
    });

    // deleteFriendMatchRequest: the user or a friend deleted a match request
    this.socket.on('deleteFriendMatchRequest', ({ sender, receiver }) => {
      // sender: the player that notified his unavailabilty to play the match
      // receiver: the player that is being notified about the unavailabilty to play the match
      //           from the other player


      const myUsername = this.auth.getUsername();
      let otherUsername;
      if (myUsername === sender) {
        // I'm the player that notified his unavailabilty to play the match
        otherUsername = receiver;
      }
      else {
        // myUsername === receiver
        // The other player has notified me his unavailability to play the match
        otherUsername = sender;
      }

      // Search for the friend with whom the match request was deleted
      for (let friendInfo of this.friends) {
        if (friendInfo.username === otherUsername) {
          // Set both to false, instead of setting the only one that is true
          friendInfo.matchRequestSent = false;
          friendInfo.matchRequestReceived = false;
        }
      }

      console.info(`Friend match request deleted: ${otherUsername}`);
    });

    // newFriend: the user has a new friend
    this.socket.on('newFriend', (friendUsername) => {
      console.info(`New friend: ${friendUsername}`);

      this.getFriendInfo(friendUsername).subscribe(friendInfoResponseBody => {
        // Create the FriendInfo object and push it into the `friends` field.
        const friendInfo: FriendInfo = {
          username: friendInfoResponseBody.player.username,
          online: friendInfoResponseBody.player.online,
          ingame: friendInfoResponseBody.player.ingame,
          matchRequestSent: false,
          matchRequestReceived: false,
        };
        this.friends.push(friendInfo);
      });
    });

    // lostFriend: the user lost a friend
    this.socket.on('lostFriend', (friendUsername) => {
      console.info(`Lost friend: ${friendUsername}`);

      // Remove the friend from the friend list
      this.friends = this.friends.filter(el => el.username !== friendUsername);
    });
  }

  /**
   * Populate the `friendRequests` field, by retrieving from the backend
   * the friend request (sent and received) of the authenticated user.
   */
   private populateFriendRequestList(): void {
    // Get the pending friend request from the backend
    this.http.get<GetFriendRequestsResponseBody>(`${FriendService.BASE_URL}/friend_requests`, this.createHttpOptions())
      .pipe(
        mergeMap(response => from(response.friendRequests)),        // flatten the object into an array of FriendRequest
      )
      .subscribe(
        friendRequest => this.friendRequests.push(friendRequest),
        error => console.error(error)
      );
  }

  /**
   * Sets the handler for the socket events related to the friend request list.
   * It takes care of mantaining the friend request list (`friendRequests`) updated.
   */
  private listenForFriendRequestListUpdate(): void {
    // newFriendRequest: the user or a player sent a friend request
    this.socket.on('newFriendRequest', (fromUsername) => {
      console.info(`New friend request received from: ${fromUsername}`);

      // Re-populate the friend request list (by requesting it to the server)
      this.friendRequests = [];
      this.populateFriendRequestList();
    });

    this.socket.on('cancelFriendRequest', (username) => {
      this.friendRequests = [];
      this.populateFriendRequestList();
    });
  }

}
