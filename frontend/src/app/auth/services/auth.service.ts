import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, mapTo, retry, tap } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';

import jwt_decode from "jwt-decode";

import { io, Socket } from 'socket.io-client';
import ClientEvents from 'src/app/models/eventTypes/client-events.model';
import ServerEvents from 'src/app/models/eventTypes/server-events.model';
import getSocket from 'src/app/utils/initialize-socket-io';

import { ErrorResponseBody, LoginResponseBody, RegistrationResponseBody } from 'src/app/models/httpTypes/responses.model';
import { PlayerType } from 'src/app/models/player.model';
import { StandardPlayerRegistrationRequestBody } from 'src/app/models/httpTypes/requests.model';


// TODO va bene definita qui internamente ?
interface TokenData {
  username: string,
  name: string,
  surname: string,
  type: PlayerType,
}

export interface PlayerSignUpParams extends Omit<StandardPlayerRegistrationRequestBody, 'isModerator'> {
}


/**
 * Authentication service.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {

  /**
   * Base REST api server url.
   */
  // TODO .env per host, porta e versione ?
  private static readonly BASE_URL = 'http://localhost:8080/v0.0.1';

  /**
   * The local storage key where to store the JWT token.
   */
  private static readonly JWT_TOKEN_STORAGE_KEY = 'JWT_TOKEN';

  /**
   * The socket to interact with the backend.
   */
  private socket: Socket<ServerEvents, ClientEvents>;

  /**
   * The JWT token.
   */
  private token: string | null;


  /**
   * Constructs the AuthService service.
   *
   * @param http - The HttpClient
   */
  constructor(
    private http: HttpClient
  ) {
    console.info('Auth service instantiated');

    // Connect to the server
    this.socket = getSocket();
    this.socket.on('disconnect', () => {
      // Auto reconnect
      this.socket.connect();
    });

    // Load the JWT token
    this.token = null;
    this.loadToken();
  }

  /**
   * Logs the user in with the given username and password, eventually remembering him.
   *
   * @param username - The username of the user
   * @param password - The password of the user
   * @param remember - Whether to keep the user logged in or not
   * @returns An Observable that resolves to true if the login is successful, false otherwise.
   *          Throws an Error in case a client-side or network error occurred.
   */
  login(username: string, password: string, remember: boolean = false): Observable<boolean> {
    console.info(`Logging in as: ${username}`);

    // create HTTP Basic Authentication options
    const options = {
      headers: new HttpHeaders({
        'authorization': `Basic ${btoa(username + ':' + password)}`,
        'cache-control': 'no-cache',
        'Content-Type': 'application/x-www-form-urlencoded',
      })
    };
    // send the login request
    return this.http.get<LoginResponseBody>(`${AuthService.BASE_URL}/login`, options)
      .pipe(
        tap(response => this.doLoginUser(response.token, remember)),    // actually login
        mapTo(true),                                                    // succesful login, return true
        catchError(this.handleError('login', false))                    // handle the login error
      );
  }

  /**
   * Logs the user out.
   */
  logout() {
    console.log('Logging out');
    // delete the token
    this.token = null;
    localStorage.removeItem(AuthService.JWT_TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(AuthService.JWT_TOKEN_STORAGE_KEY);
    // Notify the backend that the user is offline
    this.notifyOffline();
  }

  /**
   * Signs the user up using the given PlayerSignUpParams, and logs him in, eventually remembering him.
   *
   * @param player - The player data to use in the sign up process
   * @param remember - Whether to keep the user logged in or not
   * @returns An Observable that resolves to a RegistrationResponseBody if the registration
   *          was successful, ErrorResponseBody otherwise.
   *          Throws an Error in case a client-side or network error occurred.
   */
  signup(player: PlayerSignUpParams, remember: boolean = false): Observable<RegistrationResponseBody | ErrorResponseBody> {
    console.info(`Signing up as: ${player.username}`);

    const options = {
      headers: new HttpHeaders({
        'cache-control': 'no-cache',
        'Content-Type': 'application/json',
      })
    };

    const body: StandardPlayerRegistrationRequestBody = { ...player, isModerator: false };

    return this.http.post<RegistrationResponseBody>(`${AuthService.BASE_URL}/players`, body, options)
      .pipe(
        tap(response => this.doLoginUser(response.token, remember)),
        catchError(this.handleError<ErrorResponseBody>('signup'))
      );
  }

  /**
   * Checks if the user is authenticated.
   *
   * @returns true if the user is authenticated, false otherwise.
   */
  isAuthenticated(): boolean {
    return !!this.token;
  }

  /**
   * Returns the JWT token.
   * @returns The JWT token of the authenticated user, or the empty string
   *          if the user is not authenticated.
   */
  getToken(): string {
    return this.token || '';
  }

  /**
   * Gets the user username.
   *
   * @returns The username of the authenticated user, or the empty string
   *          if the user is not authenticated.
   */
  getUsername(): string {
    if (!this.token) {
      // The user is not authenticated, return empty string
      return '';
    }
    // Decode the token and return the username field
    const tokenData = jwt_decode<TokenData>(this.token);
    return tokenData.username;
  }

  /**
   * Gets the user player type
   * 
   * @returns The player type of the authenticated user. It the user
   *          it's not authenticated, an error is raised
   */
  getPlayerType(): PlayerType{
    if (!this.token) {
      // The user is not authenticated, return empty string
      throw new Error('The user is not authenticated yet');
    }
    // Decode the token and return the username field
    const tokenData = jwt_decode<TokenData>(this.token);
    return tokenData.type;
  }

  /**
   * Tries to load the JWT token from the local storage into the `token` field.
   * If the token is not found, `token` field === null.
   * If the token is found, the backend is notified, so it knows
   * the user is online.
   */
  private loadToken(): void {
    // load the JWT token from localStorage
    this.token = localStorage.getItem(AuthService.JWT_TOKEN_STORAGE_KEY)
                 || sessionStorage.getItem(AuthService.JWT_TOKEN_STORAGE_KEY);
    if (!this.token) {
      // Token not found, the user is not authenticated
      console.info('No token found in storage');
    }
    else {
      // Token found, the user is authenticated
      console.info('JWT token loaded from storage');
      // Notify the backend that the user is online
      this.notifyOnline();
    }
  }

  /**
   * Stores the JWT token in memory and in the local storage if `remember` is true.
   * Then notify the backend that the user is online.
   *
   * @param token - The JWT token
   * @param remember - Whether to keep the user logged in or not
   */
  private doLoginUser(token: string, remember: boolean): void {
    // store the user token
    this.token = token;
    if (remember) {
      // the user asked to remember him, store token in localStorage
      localStorage.setItem(AuthService.JWT_TOKEN_STORAGE_KEY, token);
    }
    else {
      // save the token only for this session
      sessionStorage.setItem(AuthService.JWT_TOKEN_STORAGE_KEY, token);
    }
    // Notify the backend that the user is online
    this.notifyOnline();
  }

  /**
   * Notifies the backend that the user is online.
   */
  private notifyOnline(): void {
    if (!this.token) {
      console.error('notifyOnline called, but token is not present');
      return;
    }
    this.socket.emit('online', this.token);
  }

  /**
   * Notifies the backend that the user is offline.
   */
  private notifyOffline(): void {
    this.socket.disconnect();
  }

  /**
   * Handles an Http operation that failed.
   *
   * @param operation - Name of the operation that failed
   * @param result - Optional value to return as the Observable result
   * @returns The callback to handle the error. It returns an Observable that resolves
   *          to the given result if any, the HTTP response body otherwise.
   */
  private handleError<T>(operation='operation', result?: T) {
    return (error: HttpErrorResponse): Observable<T> => {
      if (error.status === 0) {
        // A client-side or network error occurred. Handle it accordingly.
        console.error(`Operation ${operation} - an error occurred: ${error.error}`);
        // Forward the error
        return throwError(new Error('Something bad happened; please try again later.'));
      }
      else {
        // The backend returned an unsuccessful response code.
        // The response body may contain clues as to what went wrong.
        console.warn(`Operation ${operation} - backend returned code ${error.status}, body was: ${error.error}`);
        if (result !== undefined) {
          // `result` was passed, so return an Observable with it.
          return of(result);
        }
        else {
          // `result` was not passed, so return an Observable that yields the HTTP response body
          return of(error.error);   // TODO verificare che sia realmente il response body
        }
      }
    }
  }

}
