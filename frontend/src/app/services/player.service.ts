import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { from, Observable, of } from 'rxjs';
import { catchError, map, mapTo, mergeMap, tap } from 'rxjs/operators';

import { AuthService } from '../auth/services/auth.service';
import { ConfirmModeratorRequestBody, ModeratorRegistrationRequestBody, NotifyAvailabilityFriendRequestRequestBody, NotifyUnavailabilityFriendRequestRequestBody } from '../models/httpTypes/requests.model';
import {
  GetPlayerResponseBody,
  GetPlayersResponseBody,
  GetPlayerStatsResponseBody,
  SuccessResponseBody,
  ConfirmModeratorResponseBody,
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

  /**
   * Creates a new moderator, using the specified data
   * @param username
   * @param password
   * @returns
   */
  createModerator(username: string, password: string): Observable<boolean> {
    const body: ModeratorRegistrationRequestBody = {
      username: username,
      password: password,
      isModerator: true,
    };
    return this.http.post<SuccessResponseBody>(`${PlayerService.BASE_URL}/players`, body, this.createHttpOptions())
      .pipe(
        mapTo(true),
        catchError(error => of(false))
      );
  }

  /**
   * Confirms the user first access moderator profile, using the specified data
   * @param password
   * @param name
   * @param surname
   * @returns
   */
  confirmModerator(password: string, name: string, surname: string): Observable<boolean> {
    const body: ConfirmModeratorRequestBody = {
      password: password,
      name: name,
      surname: surname,
    };
    return this.http.put<ConfirmModeratorResponseBody>(`${PlayerService.BASE_URL}/players/${this.auth.getUsername()}`, body, this.createHttpOptions())
      .pipe(
        mapTo(true),
        catchError(error => of(false))
      );
  }
}
