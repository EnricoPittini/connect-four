import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GetPlayerResponseBody, GetPlayersResponseBody } from '../models/httpTypes/responses.model';



/**
 * The PlayerService is responsible for retrieving information on the players.
 */
@Injectable({
  providedIn: 'root'
})
export class PlayerService {

  constructor() { }

  // TODO forse altri metodi
  // TODO parametri potrebbero non essere giusti o mancanti

  getPlayer(username: string): Observable<GetPlayerResponseBody['player']> {
    throw new Error('Not implemented yet');
  }

  getPlayers(): Observable<GetPlayersResponseBody['players']> {
    throw new Error('Not implemented yet');
  }


}
