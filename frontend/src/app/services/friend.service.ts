import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

import { io, Socket } from 'socket.io-client';
// import { ClientEvents, ServerEvents } from '';

import { AuthService } from '../auth/services/auth.service';
import { GetFriendsResponseBody, GetPlayerResponseBody } from '../models/httpTypes/responses.model';


// TODO da capire se va bene e forse metterla in un file a parte
interface FriendInfo {
  username: string,
  online: boolean,
  playing: boolean,
  matchRequestSent: boolean,
  matchRequestReceived: boolean,
  // TODO forse unreadMessages: boolean,    // non serve in sidebar, ma in chat
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
  // TODO .env per host, porta e versione ?
  private static readonly BASE_URL = 'http://localhost:8080/v0.0.1';
  private static readonly BASE_SOCKET_URL = 'http://localhost:8080';

  /**
   * Http headers.
   */
  private static HttpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    })
  };

  /**
   * List of FriendInfo.
   */
  friends: FriendInfo[] = [];


  constructor(
    private http: HttpClient,
  ) {
    console.info('Friend service instantiated');

    this.populateFriendList();
    this.listenForFriendListUpdate();
  }

  // TODO da capire se fare gestione errori

  /**
   * Populate the `friends` field, by retrieving from the backend information
   * about each of the friends of the authenticated user.
   */
  private populateFriendList(): void {
    // Get information about the friends
    this.http.get<GetFriendsResponseBody>(`${FriendService.BASE_URL}/friends`, FriendService.HttpOptions)
      .pipe(
        mergeMap(response => from(response.friends)),       // flatten the object into an array of usernames
        mergeMap(friendUsername => {
          return this.http.get<GetPlayerResponseBody>(`${FriendService.BASE_URL}/players/${friendUsername}`);
        })
      )
      .subscribe(
        friendInfoResponseBody => {
          // Create the FriendInfo object and push it into the `friends` field.
          const friendInfo: FriendInfo = {
            username: friendInfoResponseBody.player.username,
            online: friendInfoResponseBody.player.online,
            playing: friendInfoResponseBody.player.playing,
            // TODO matchRequestSent e matchRequestReceived andrebbero ricavate da un endpoint (non ancora esistente)
            matchRequestSent: false,
            matchRequestReceived: false,
          };
          this.friends.push(friendInfo);
        },
        error => console.error(error)
      )
  }

  listenForFriendListUpdate(): void {
    // const socket: Socket<ServerEvents, ClientEvents> = io(FriendService.BASE_SOCKET_URL);
    // TODO
    // socket.on()
  }

  // sendFriendRequest(): {

  // }

}
