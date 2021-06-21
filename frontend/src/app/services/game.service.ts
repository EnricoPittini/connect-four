import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { io, Socket } from 'socket.io-client';
import ClientEvents from 'src/app/models/eventTypes/client-events.model';
import ServerEvents from 'src/app/models/eventTypes/server-events.model';

import { AuthService } from '../auth/services/auth.service';
import { GetMatchResponseBody, SuccessResponseBody } from '../models/httpTypes/responses.model';
import { AddMoveRequestBody } from '../models/httpTypes/requests.model';
import { Match } from '../models/match.model';


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
         'Content-Type': 'application/json',
       }),
       params: new HttpParams({ fromObject: params }),
     };
   };

  /**
   * The socket to interact with the backend.
   */
  socket: Socket<ServerEvents, ClientEvents>;

  matchId: string | null;
  match: Match | null;


  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {
    console.info('Friend service instantiated');

    // Connect to the server
    this.socket = io(GameService.BASE_SOCKET_URL);

    // TODO chiedere a backend se sono in game
    this.matchId = null;
    this.match = null;

    this.listenForMatchUpdate();
  }

  isInGame(): boolean {
    return !!this.match;
  }

  makeMove(column: number): void {
    if (!this.matchId) {
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

  forfait(): void {
    if (!this.matchId) {
      return;
    }

    this.http.put<SuccessResponseBody>(`${GameService.BASE_URL}/matches/${this.matchId}`, this.createHttpOptions())
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
        },
        error => console.error('An error occurred while updating the match')
      );

  }

  private listenForMatchUpdate(): void {
    // attende mossa
    this.socket.on('match', (matchId) => {
      this.updateGame();
    });

    // TODO mi serve il match id
    // this.socket.on('newMatch', (matchId) => {
    //   this.matchId = matchId;
    // });
  }

  // TODO come gestire invece gli osservatori ???

}
