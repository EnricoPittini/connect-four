import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { io, Socket } from 'socket.io-client';
import ClientEvents from 'src/app/models/eventTypes/client-events.model';
import ServerEvents from 'src/app/models/eventTypes/server-events.model';
import getSocket from 'src/app/utils/initialize-socket-io';

import { AuthService } from '../auth/services/auth.service';
import { GetMatchesResponseBody, GetMatchResponseBody, SuccessResponseBody } from '../models/httpTypes/responses.model';
import { AddMoveRequestBody } from '../models/httpTypes/requests.model';
import { Match, MatchStatus, WhichPlayer } from '../models/match.model';
import { PlayerService } from './player.service';
import { Router } from '@angular/router';
import { from, Observable } from 'rxjs';
import { mergeMap, take, map } from 'rxjs/operators';
import { FriendService } from './friend.service';
import { MatchChatService } from './match-chat.service';


/**
 * Game service.
 */
@Injectable({
  providedIn: 'root'
})
export class GameService {

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
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/json',
      }),
      params: new HttpParams({ fromObject: params }),
    };
  };

  /**
   * The socket to interact with the backend.
   */
  private socket: Socket<ServerEvents, ClientEvents>;

  matchId: string | null;
  match: Match | null;
  observing: boolean;


  constructor(
    private http: HttpClient,
    private router: Router,
    private auth: AuthService,
    private playerService: PlayerService,
    private friendService: FriendService,
    private matchChatService: MatchChatService
  ) {
    console.info('Friend service instantiated');

    // Connect to the server
    this.socket = getSocket();

    this.matchId = null;
    this.match = null;
    this.initializeMatch();

    this.observing = false;

    this.listenForMatchUpdate();
  }

  /**
   * Checks if the user is in a game
   * @returns
   */
  isInGame(): boolean {
    return !!this.match;
  }

  /**
   * Makes a move, in the specified column
   * @param column
   * @returns
   */
  makeMove(column: number): void {
    // Check that there is a match in progress
    if (this.match?.status !== MatchStatus.IN_PROGRESS) {
      return;
    }

    // Check that the column is valid
    if (column < 0 || column >= this.match.board[0].length) {
      return;
    }

    const body: AddMoveRequestBody = {
      column: column,
    };
    this.http.post<SuccessResponseBody>(`${GameService.BASE_URL}/matches/${this.matchId}`, body, this.createHttpOptions())
      .subscribe(
        response => console.info('Move done succesfully'),
        error => console.error('An error occurred while making the move')
      );
  }

  /**
   * Does forfait
   * @returns
   */
  forfait(): void {
    if (!this.matchId) {
      return;
    }

    this.http.put<SuccessResponseBody>(`${GameService.BASE_URL}/matches/${this.matchId}`, {}, this.createHttpOptions())
      .subscribe(
        response => console.info('Forfait given succesfully'),
        error => console.error('An error occurred while giving forfait')
      );
  }

  /**
   * Updates the match
   * @returns
   */
  private updateGame(): void {
    if (!this.matchId) {
      return;
    }

    this.http.get<GetMatchResponseBody>(`${GameService.BASE_URL}/matches/${this.matchId}`, this.createHttpOptions())
      .subscribe(
        response => {
          console.info('Match updated succesfully'),
          this.match = response.match;
          // ! Trick to update friend list
          if (this.isGameEnded()) {
            this.friendService.populateFriendList();
          }
        },
        error => console.error('An error occurred while updating the match')
      );

  }

  /**
   *
   * @returns The player 1 username
   */
  getPlayer1Username(): string | null {
    return this.match?.player1 || null;
  }

  /**
   *
   * @returns The player 2 username
   */
  getPlayer2Username(): string | null {
    return this.match?.player2 || null;
  }

  /**
   *
   * @returns The WhichPlayer enum value correpsonding to who of the 2 player the
   *          authenticated player is, if he is playing
   */
  whichPlayer(): WhichPlayer {
    return this.getPlayer1Username() === this.auth.getUsername()
           ? WhichPlayer.PLAYER_1
           : WhichPlayer.PLAYER_2;
  }

  whichPlayerOpponent(): WhichPlayer {
    return this.getPlayer1Username() === this.auth.getUsername()
           ? WhichPlayer.PLAYER_2
           : WhichPlayer.PLAYER_1;
  }

  /**
   * Checks if the game is ended
   * @returns
   */
  isGameEnded(): boolean {
    return this.match?.status !== MatchStatus.IN_PROGRESS;
  }

  /**
   *
   * @returns The WhichPlayer enum value correpsonding to who of the 2 player the
   *          authenticated player is, if he is playing
   */
  getTurn(): WhichPlayer | null {
    return this.match?.playerTurn || null;
  }

  private initializeMatch(): void {
    // this.playerService.getPlayer(this.auth.getUsername())
  }

  /**
   * Listen to the socketIO events in order to update the match
   */
  private listenForMatchUpdate(): void {
    console.info('From now on I\'m listening for match updates')
    // attende mossa
    this.socket.on('match', (matchId) => {
      // Navigate to the game route
      this.router.navigate(['/game']);
      this.matchId = matchId;
      this.updateGame();


    });

    this.socket.on('newMatch', (matchId) => {
      // Navigate to the game route
      this.router.navigate(['/game']);
      this.matchId = matchId;
      this.updateGame();


      this.matchChatService.stop();
      this.matchChatService.initiate(matchId);
    });
  }


  /**
   * Starts observing the specified match
   * @param matchId
   * @returns
   */
  startObservingMatch(matchId: string): void {
    if (this.isObserving()) {
      return;
    }

    this.observing = true;
    console.log('startObserving');
    this.http.post<SuccessResponseBody>(`${GameService.BASE_URL}/matches/${matchId}/observers`, {}, this.createHttpOptions())
      .subscribe(
        response => {
          this.router.navigate(['/game']);
          this.matchId = matchId;
          this.updateGame();

          this.matchChatService.stop();
          this.matchChatService.initiate(matchId);
        },
        error => {
          console.error('An error occurred while starting to observe a match')
          this.observing = false;
        }
      )
  }

  /**
   * Stops observing the match
   * @returns
   */
  stopObservingMatch(): void {
    if (!this.isObserving()) {
      return;
    }

    this.http.delete<SuccessResponseBody>(`${GameService.BASE_URL}/matches/${this.matchId}/observers`, this.createHttpOptions())
    .subscribe(
      response => {
        this.matchId = null;
        this.match = null;
        this.observing = false;

        this.matchChatService.stop();

      },
      error => {
        console.error('An error occurred while starting to observe a match');
      }
    )
  }

  /**
   * Checks if the user is observing a match
   * @returns
   */
  isObserving(): boolean {
    return this.observing;
  }


  /**
   * Returns the matchId of the match in which is playing the specified player
   * @param username
   * @returns
   */
  getMatchIdFromUsername(username: string): Observable<string> {
    return this.http.get<GetMatchesResponseBody>(`${GameService.BASE_URL}/matches`, this.createHttpOptions({
      live: 'true',
      username: username,
    }))
    .pipe(
      map(response => response.matches[0]._id)
    );
  }



  /**
   * Returns all the matches, possibly filtered.
   * @param live
   * @param username
   * @param skip
   * @param limit
   * @returns
   */
  getMatches(live: boolean = true, username: string | null = null, skip: number | null = null,
             limit: number | null = null)
            : Observable<GetMatchesResponseBody['matches']> {
    const params : any= {};
    if(live){
      params.live = 'true';
    }
    if(username){
      params.username = username;
    }
    if(skip){
      params.skip = skip;
    }
    if(limit){
      params.limit = limit;
    }
    return this.http.get<GetMatchesResponseBody>(`${GameService.BASE_URL}/matches`, this.createHttpOptions(params))
      .pipe(
        map(getMatchesResponseBody => getMatchesResponseBody.matches)
      );
  }
}
