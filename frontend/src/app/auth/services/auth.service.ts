import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, mapTo, retry, tap } from 'rxjs/operators';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';

import jwt_decode from "jwt-decode";

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

    // load the JWT token from localStorage
    this.token = localStorage.getItem(AuthService.JWT_TOKEN_STORAGE_KEY);
    if (!this.token) {
      console.info('No token found in local storage');
    } else {
      console.info('JWT token loaded from local storage')
    }
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
   * Stores the JWT token in memory and in the local storage if `remember` is true.
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
