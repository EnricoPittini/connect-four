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
  GetPlayersResponseBody,
  GetPlayerStatsResponseBody,
  SuccessResponseBody,
} from '../models/httpTypes/responses.model';



/**
 * The PlayerService is responsible for retrieving information on the players.
 */
@Injectable({
  providedIn: 'root'
})
export class PlayerService {
   
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
   * Constructs the FriendChatService.
   *
   * @param http - The HttpClient
   * @param auth - The AuthService
   */
   constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {
    console.info('Friend service instantiated');
  }

  // TODO forse altri metodi
  // TODO parametri potrebbero non essere giusti o mancanti

  /**
   * Returns the general informations about the specified player (e.g. non stats data)
   * @param username 
   * @returns 
   */
  getPlayer(username: string): Observable<GetPlayerResponseBody['player']> {
    return this.http.get<GetPlayerResponseBody>(`${PlayerService.BASE_URL}/players/${username}`, this.createHttpOptions())
      .pipe( 
        map(getPlayerResponseBody => getPlayerResponseBody.player)
      );
  }

  /**
   * Returns all the players usernames, possibly filtrated.
   * @param partialUsername 
   * @param skip 
   * @param limit 
   * @returns 
   */
  getPlayers(usernameFilter: string | null = null, skip: number | null = null, limit: number | null = null )
            : Observable<GetPlayersResponseBody['playersUsernames']> {
    const params : any= {};
    if(usernameFilter){
      params.username_filter = usernameFilter;
    }
    if(skip){
      params.skip = skip;
    }
    if(limit){
      params.limit = limit;
    }
    return this.http.get<GetPlayersResponseBody>(`${PlayerService.BASE_URL}/players`, this.createHttpOptions(params))
      .pipe( 
        map(getPlayersResponseBody => getPlayersResponseBody.playersUsernames)
      );
  }

  /**
   * Returns the stats data related to the specified player
   * @param username 
   * @returns 
   */
  getPlayerStats(username: string): Observable<GetPlayerStatsResponseBody['stats']> {
    return this.http.get<GetPlayerStatsResponseBody>(`${PlayerService.BASE_URL}/players/${username}/stats`, this.createHttpOptions())
      .pipe( 
        map(getPlayerStatsResponseBody => getPlayerStatsResponseBody.stats)
      );
  }

  /**
   * Delets the specified player
   * @param username 
   * @returns 
   */
  deletePlayer(username: string): Observable<void>{
    console.info("Deleting player " + username);
    return this.http.delete<SuccessResponseBody>(`${PlayerService.BASE_URL}/players/${username}`, this.createHttpOptions())
    .pipe( 
      map(_ => console.info("Player deleted correctly"))
    );
  }
}
