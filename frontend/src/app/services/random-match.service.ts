import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';

import { io, Socket } from 'socket.io-client';
import ClientEvents from 'src/app/models/eventTypes/client-events.model';
import ServerEvents from 'src/app/models/eventTypes/server-events.model';
import getSocket from 'src/app/utils/initialize-socket-io';

import { AuthService } from '../auth/services/auth.service';


/**
 * Random match service.
 */
@Injectable({
  providedIn: 'root'
})
export class RandomMatchService {

  /**
   * Base REST api server url.
   */
  private static readonly BASE_URL = 'http://localhost:8080/v1.0.0';

  /**
   * Base WebSocket server url.
   */
  private static readonly BASE_SOCKET_URL = 'http://localhost:8080';

  /**
   * The socket to interact with the backend.
   */
  private socket: Socket<ServerEvents, ClientEvents>;

  /**
   * Whether the user is waiting for an opponent to be matched.
   * In other words it is true if the user sent a random match request.
   */
  waitingMatch: boolean;

  /**
   * Constructs the RandomMatchService.
   */
  constructor() {
    console.info('Random match service instantiated');

    // Connect to the server
    this.socket = getSocket();

    // Handle random match request
    this.waitingMatch = false;
    this.initializeWaitingMatch();
    this.listenForRandomMatchRequestUpdates();
  }

  /**
   * Notifies the availability of the authenticated user to play a random match.
   */
  sendRandomMatchRequest(): void {
    if (this.waitingMatch) {
      console.warn('You have already sent a random match request');
      return;
    }
    console.info('Sending a random match request.');
    this.waitingMatch = true;
    this.socket.emit('randomMatchRequest');
  }

  /**
   * Notifies the unavailability of the authenticated user to play a random match.
   */
  cancelRandomMatchRequest(): void {
    if (!this.waitingMatch) {
      console.warn('You haven\'t sent a random match request yet');
      return;
    }
    console.info('Cancelling the random match request');
    this.waitingMatch = false;
    this.socket.emit('cancelRandomMatchRequest');
  }

  /**
   * Initializes the `waitingMatch` field asking to the server its value.
   */
  private initializeWaitingMatch(): void {
    // Ask to the server if there is a random match request pending
    this.socket.emit('hasRandomMatchRequest');

    // 'Wait' for the server response
    // hasMatchRequest: the user has a random match request
    this.socket.once('hasRandomMatchRequest', (hasMatchRequest) => {
      console.info('hasRandomMatchRequest repsonse:', hasMatchRequest)
      this.waitingMatch = hasMatchRequest;
    });
  }

  /**
   * Sets the handler for the socket events related to the random match requests.
   * It takes care of mantaining `waitingMatch` field updated.
   */
  private listenForRandomMatchRequestUpdates(): void {
    // randomMatchRequest: the user sent a random match request
    this.socket.on('randomMatchRequest', () => {
      this.waitingMatch = true;
    });

    // cancelRandomMatchRequest: the user cancelled the random match request
    this.socket.on('cancelRandomMatchRequest', () => {
      this.waitingMatch = false;
    });

    this.socket.on('newMatch', (_) => {
      this.waitingMatch = false;
    });
  }

}
