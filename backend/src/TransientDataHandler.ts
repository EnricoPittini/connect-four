import { Socket } from 'socket.io';
import ClientEvents from './socketsHandlers/eventTypes/ClientEvents';
import ServerEvents from './socketsHandlers/eventTypes/ServerEvents';

import { Player } from "./models/Player";
import { MatchRequest } from "./models/MatchRequest";


type PlayerSocketsMap = {
  [key: string]: Socket<ClientEvents,ServerEvents>[];
};
type SocketIdPlayerMap = {
  [key: string]: string;
};

export class TransientDataHandler {
  private onlinePlayerSocketsMap: PlayerSocketsMap = {};
  private socketIdOnlinePlayerMap: SocketIdPlayerMap = {};
  private inGamePlayers: string[] = [];
  private matchRequests: MatchRequest[] = [];

  private static instance: TransientDataHandler;

  private constructor() { }

  public static getInstance() {
    if (!TransientDataHandler.instance) {
      TransientDataHandler.instance = new TransientDataHandler();
    }
    return TransientDataHandler.instance;
  }

  public addPlayerSocket(username: string, socket: Socket<ClientEvents,ServerEvents>): void {
    if (this.containsSocket(socket)) {
      return;
    }

    if (this.isOnline(username)) {
      this.onlinePlayerSocketsMap[username].push(socket);
    }
    else {
      this.onlinePlayerSocketsMap[username] = [socket];
    }

    this.socketIdOnlinePlayerMap[socket.id] = username;
  }

  public removePlayerSocket(socket: Socket<ClientEvents,ServerEvents>): void {
    const username = this.getSocketPlayer(socket);
    if (!username) {
      return;
    }
    this.onlinePlayerSocketsMap[username] = this.onlinePlayerSocketsMap[username].filter(el => el.id !== socket.id);
    if (this.onlinePlayerSocketsMap[username].length === 0) {
      delete this.onlinePlayerSocketsMap[username];
    }
    delete this.socketIdOnlinePlayerMap[socket.id];
  }

  public getPlayerSockets(username: string): Socket<ClientEvents,ServerEvents>[] {
    return this.onlinePlayerSocketsMap[username] || [];
  }

  public getSocketPlayer(socket: Socket<ClientEvents,ServerEvents>): string | undefined {
    return this.socketIdOnlinePlayerMap[socket.id];
  }

  public containsSocket(socket: Socket<ClientEvents,ServerEvents>): boolean {
    return socket.id in this.socketIdOnlinePlayerMap;
  }

  public isOnline(username: string): boolean {
    return username in this.onlinePlayerSocketsMap
           && this.onlinePlayerSocketsMap[username].length > 0;
  }

  public markInGame(username: string): void {
    if (this.isInGame(username)) {
      return;
    }
    this.inGamePlayers.push(username);
  }

  public markOffGame(username: string): void {
    this.inGamePlayers = this.inGamePlayers.filter(el => el !== username);
  }

  public isInGame(username: string): boolean {
    return !!this.inGamePlayers.find(el => el === username);
  }

  public addMatchRequest(fromUsername: string, toUsername: string): void {
    if (!this.isOnline(fromUsername) || !this.isOnline(toUsername)) {
      throw new Error("At least one of the specified players isn't online");
    }

    if (this.isInGame(fromUsername) || this.isInGame(toUsername)) {
      throw new Error("At least one of the specified players is alredy in game");
    }

    if (this.hasMatchRequest(fromUsername, toUsername) || this.hasMatchRequest(toUsername, fromUsername)) {
      throw new Error("There is alredy a match request between these two players");
    }

    this.matchRequests.push({
      from: fromUsername,
      to: toUsername,
      datetime: new Date(),
    });
  }

  // To call both for accept match requests and cancel match requests
  // Returns true if something is deleted, false otherwise
  public deleteMatchRequest(fromUsername: string, toUsername: string): boolean {
    const previousLength = this.matchRequests.length;
    this.matchRequests = this.matchRequests.filter(matchRequest => matchRequest.from !== fromUsername || matchRequest.to !== toUsername);
    const currentLength = this.matchRequests.length;
    return previousLength !== currentLength;
  }

  // Delete all the match requests of a player (both from and to)
  public deletePlayerMatchRequests(username: string): void{
    this.matchRequests = this.matchRequests.filter(matchRequest => matchRequest.from !== username && matchRequest.to !== username);
  }

  // Given a player, returns the list of players in a match request (either from or to) with the specified player 
  public getPlayerMatchRequestsOpponents(username: string): string[]{
    return this.matchRequests.filter(matchRequest => matchRequest.from === username || matchRequest.to === username)
                             .map( matchRequest => matchRequest.to===username ? matchRequest.from : matchRequest.to );
  }

  public hasMatchRequest(fromUsername: string, toUsername: string): boolean {
    return !!this.matchRequests.find(matchRequest => matchRequest.from === fromUsername && matchRequest.to === toUsername);
  }
}
