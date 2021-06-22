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
import { mergeMap, take } from 'rxjs/operators';
import { FriendService } from './friend.service';


/**
 * Game service.
 */
@Injectable({
  providedIn: 'root'
})
export class GameService {

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
    private friendService: FriendService
  ) {
    console.info('Friend service instantiated');

    // Connect to the server
    this.socket = getSocket();

    // TODO chiedere a backend se sono in game
    this.matchId = null;
    this.match = null;
    this.initializeMatch();

    this.observing = false;

    this.listenForMatchUpdate();
  }

  isInGame(): boolean {
    return !!this.match;
  }

  makeMove(column: number): void {
    // Check that there is a match in progress
    if (this.match?.status !== MatchStatus.IN_PROGRESS) {
      return;
    }

    // Check that the column is valid
    if (column < 0 || column >= this.match.board[0].length) {
      return;
    }

    // TODO valutare se fare anche il controllo sul turno

    const body: AddMoveRequestBody = {
      column: column,
    };
    this.http.post<SuccessResponseBody>(`${GameService.BASE_URL}/matches/${this.matchId}`, body, this.createHttpOptions())
      .subscribe(
        response => console.info('Move done succesfully'),
        error => console.error('An error occurred while making the move')
      );
  }

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

  private updateGame(): void {
    if (!this.matchId) {
      return;
    }

    this.http.get<GetMatchResponseBody>(`${GameService.BASE_URL}/matches/${this.matchId}`, this.createHttpOptions())
      .subscribe(
        response => {
          console.info('Match updated succesfully'),
          this.match = response.match;
          console.log(this.match);
          // ! Trick to update friend list
          if (this.isGameEnded()) {
            this.friendService.populateFriendList();
          }
        },
        error => console.error('An error occurred while updating the match')
      );

  }

  getPlayer1Username(): string | null {
    return this.match?.player1 || null;
  }

  getPlayer2Username(): string | null {
    return this.match?.player2 || null;
  }

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

  isGameEnded(): boolean {
    return this.match?.status !== MatchStatus.IN_PROGRESS;
  }

  private initializeMatch(): void {
    // this.playerService.getPlayer(this.auth.getUsername())
    // TODO come inizializzo i campi match e matchId ???
    // TODO forse per semplicità aspetto il primo evento 'match'
  }

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
    });
  }

  // TODO come gestire invece gli osservatori ???


  ///////////////////////////////////////////////
  // TODO capire se funziona

  // TODO eventualmente impedire agli osservatori di inviare mosse

  startObservingMatch(matchId: string): void {
    if (this.isObserving()) {
      return;
    }

    this.observing = true;

    this.http.post<SuccessResponseBody>(`${GameService.BASE_URL}/${matchId}/observers`, {}, this.createHttpOptions())
      .subscribe(
        response => {
          this.router.navigate(['/game']);
          this.matchId = matchId;
          this.updateGame();
        },
        error => {
          console.error('An error occurred while starting to observe a match')
          this.observing = false;
        }
      )
  }

  stopObservingMatch(): void {
    if (!this.isObserving()) {
      return;
    }

    this.http.delete<SuccessResponseBody>(`${GameService.BASE_URL}/${this.matchId}/observers`, this.createHttpOptions())
    .subscribe(
      response => {
        this.matchId = null;
        this.match = null;
        this.observing = false;
      },
      error => {
        console.error('An error occurred while starting to observe a match');
      }
    )
  }

  isObserving(): boolean {
    return this.observing;
  }


  getMatchIdFromUsername(username: string): Observable<string> {
    return this.http.get<GetMatchesResponseBody>(GameService.BASE_URL, this.createHttpOptions({
      live: 'true',
      username: username,
    }))
    .pipe(
      mergeMap(response => from(response.matches)),
      mergeMap(match => match._id),
      take(1)
    );
  }



  // TODO forse metodo exitMatch / resetMatch per togliere matchId / match

}
