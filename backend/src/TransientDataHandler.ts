import { Socket } from 'socket.io';
import ClientEvents from './socketsHandlers/eventTypes/ClientEvents';
import ServerEvents from './socketsHandlers/eventTypes/ServerEvents';

import { Player, PlayerDocument, PlayerType } from "./models/Player";
import stats = require('./models/Stats');
import { StatsDocument } from "./models/Stats";

type PlayerSocketsMap = {
  [key: string]: Socket<ClientEvents,ServerEvents>[];
};
type SocketIdPlayerMap = {
  [key: string]: string;
};

// Interface for the random match requests
interface RandomMatchRequest extends Pick<FriendMatchRequest, 'from' | 'datetime'>{
  playerRating: number, 
}

// Interface that represents a random match arranged by the Server
export interface RandomMatchArrangement{
  player1: string,
  player2: string,
}

export class TransientDataHandler {
  private onlinePlayerSocketsMap: PlayerSocketsMap = {};
  private socketIdOnlinePlayerMap: SocketIdPlayerMap = {};
  private inGamePlayers: string[] = [];
  private friendsMatchRequests: FriendMatchRequest[] = [];

  // Is kept ordered by datetime
  private randomMatchRequests: RandomMatchRequest[] = [];

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

  public addFriendMatchRequest(fromUsername: string, toUsername: string): void {
    if (!this.isOnline(fromUsername) || !this.isOnline(toUsername)) {
      throw new Error("At least one of the specified players isn't online");
    }

    if (this.isInGame(fromUsername) || this.isInGame(toUsername)) {
      throw new Error("At least one of the specified players is alredy in game");
    }

    if (this.hasFriendMatchRequest(fromUsername, toUsername) || this.hasFriendMatchRequest(toUsername, fromUsername)) {
      throw new Error("There is alredy a match request between these two players");
    }

    this.friendsMatchRequests.push({
      from: fromUsername,
      to: toUsername,
      datetime: new Date(),
    });
  }

  // To call both for accept match requests and cancel match requests
  // Returns true if something is deleted, false otherwise
  public deleteFriendMatchRequest(fromUsername: string, toUsername: string): boolean {
    const previousLength = this.friendsMatchRequests.length;
    this.friendsMatchRequests = this.friendsMatchRequests.filter(matchRequest => matchRequest.from !== fromUsername || matchRequest.to !== toUsername);
    const currentLength = this.friendsMatchRequests.length;
    return previousLength !== currentLength;
  }

  // Delete all the match requests of a player (both from and to)
  public deletePlayerFriendMatchRequests(username: string): void{
    this.friendsMatchRequests = this.friendsMatchRequests.filter(matchRequest => matchRequest.from !== username && matchRequest.to !== username);
  }

  // Given a player, returns the list of players in a match request (either from or to) with the specified player 
  public getPlayerFriendMatchRequestsOpponents(username: string): string[]{
    return this.friendsMatchRequests.filter(matchRequest => matchRequest.from === username || matchRequest.to === username)
                             .map( matchRequest => matchRequest.to===username ? matchRequest.from : matchRequest.to );
  }

  public hasFriendMatchRequest(fromUsername: string, toUsername: string): boolean {
    return !!this.friendsMatchRequests.find(matchRequest => matchRequest.from === fromUsername && matchRequest.to === toUsername);
  }

  public getFriendMatchRequest(fromUsername: string, toUsername: string): FriendMatchRequest{
    const friendMatchRequests = this.friendsMatchRequests.filter(matchRequest => matchRequest.from === fromUsername 
                                                                && matchRequest.to === toUsername);
    if(friendMatchRequests.length<=0){
      throw new Error("There isn't a match request between these two players");
    }

    return friendMatchRequests[0];
  }

  /**
   * Decides if a random match request by that player alredy exists
   * @param username 
   * @returns 
   */
  public hasRandomMatchReuqest(username: string): boolean{
    return !!this.randomMatchRequests.find(matchRequest => matchRequest.from === username);
  }

  /**
   * Adds a random match request
   * @param username 
   * @returns 
   */
  public addRandomMatchRequest(username: string): void{
    if (!this.isOnline(username)) {
      throw new Error('The player is not online');
    }

    if (this.isInGame(username)) {
      throw new Error('The player is alredy in game');
    }
    if(this.hasRandomMatchReuqest(username)){
      throw new Error('There is alredy a random match request made by this player');
    }

    stats.getModel().findOne({player:username}).then( statsDocument=> {
      if(!statsDocument){
        throw new Error('The stats document wasn\'t found for that player');
      }

      this.randomMatchRequests.push({
        from: username,
        datetime: new Date(),
        playerRating: statsDocument.rating,
      });  
    })
    .catch( err=> {
      throw err;
    })
  }

  public deleteRandomFriendMatchRequests(username: string): void{
    this.randomMatchRequests = this.randomMatchRequests.filter(matchRequest => matchRequest.from !== username);
  }

  /**
   * Returns the matches arrangements for the random match requests till now made
   */
  public getRandomMatchRequestsArrangements(): RandomMatchArrangement[]{
    // Compute the arrangements
    const randomMatchesArrangements =  computeRandomMatchRequestsArrangements(this.randomMatchRequests);

    // Delete the match requests that have been arranged
    const playersArranged : string[] = [];
    for(let matchArrangment of randomMatchesArrangements){
      playersArranged.push(matchArrangment.player1);
      playersArranged.push(matchArrangment.player2);
    }
    this.randomMatchRequests = this.randomMatchRequests.filter( (randomMatchRequest) => playersArranged.indexOf(randomMatchRequest.from)<0);

    return randomMatchesArrangements;
  }
}

// The max rating difference of two players in order to be arranged by the Server 
const RATING_TOLERANCE = 100;
// The max time that a player has to wait in order to be arranged by the Server
const MAX_WAITING_MILLISECONDS = 1500;

/**
 * Compute tha arrangements for the random matches. The input parameter randomMatchRequests is exptected to be sorted by datetime.
 * 
 * The logic of the arrangment alghoritm is the following.
 * The random match requests are iterated, sorted by datetime (from the oldest to the latest).
 * For each match request is computed the waiting time.
 * In addition, for each match request is found the nearest match request, according to the player rating(e.g. is found the match
 * request that has the player with nearest rating).
 * So, for each match request is computed the rating difference with the nearest rating. 
 * Now, the match request is arranged to the nearest match request if and only if: 
 *      - The rating difference is less than RATING_TOLERANCE
 *      - Or if the match request waiting time is bigger than MAX_WAITING_MILLISECONDS
 * The second condition is used to prevent the match requests starvation.
 * 
 * Implementation detail.
 * Given a match request of the list, to found the nearest match request (according to the rating) it's not necessary to search also
 * the previous requests of the list, but it's sufficient to iterate only through the next requests of the list.
 * This is because if the previous match requests haven't been arranged with any other request, I'm sure that the next requests won't 
 * be arranged with that previous requests. (e.g. These previous requests dcan't be arranged)
 *  
 * @param randomMatchRequests 
 */
 function computeRandomMatchRequestsArrangements(randomMatchRequests : RandomMatchRequest[]): RandomMatchArrangement[]{

  const currentDatetime = new Date();

  // List of matches arranged : it's the list to return
  const randomMatchesArrangements : RandomMatchArrangement[] = [];

  // List of the indexes of the arranged match requests 
  // (It's the list of indexes to skip while I iterate the list)
  const matchRequestsArrangedIndexes : number[] = [];

  // Iterate through all the random match requests
  for(let i=0; i<randomMatchRequests.length-1; i++){
    if(matchRequestsArrangedIndexes.indexOf(i)>=0){ // The match request is alredy arranged
      continue;
    }
    // Rating of the player of the ith match request (current match request)
    const ithRating = randomMatchRequests[i].playerRating;
    // Waiting time of the ith match request (current match request)
    const ithWaitingTime = currentDatetime.getTime() -  randomMatchRequests[i].datetime.getTime();

    // Now I search the nearest rating with respect to the player of the ith match request
    let minRatingDifference = Number.MAX_SAFE_INTEGER;
    // The nearestRatingPlayerIndex will contain the index of the match request whose player has the nearest rating
    let nearestRatingPlayerIndex = -1;
    for(let j=i+1; j<randomMatchRequests.length; j++){ // Iterate through all the subsequent match requests
      if(matchRequestsArrangedIndexes.indexOf(j)>=0){ // The jth match request is alredy arranged
        continue;
      }
      const currentRatingDifference = Math.abs(randomMatchRequests[j].playerRating - ithRating); // Rating difference
      if(currentRatingDifference<minRatingDifference){
        minRatingDifference = currentRatingDifference;
        nearestRatingPlayerIndex = j;
      }
    }
    if(nearestRatingPlayerIndex<0){ // No nearest rating has been found
      continue;
    }
    // Contains the nearest rating with respect to the player of the ith match request
    const nearestRating = randomMatchRequests[nearestRatingPlayerIndex].playerRating;

    // Rating difference
    const ratingDifference = Math.abs( nearestRating - ithRating);

    // If the rating difference is sufficient little or the waiting time is sufficient big, arrange the match between the ith
    // player and the nearest rating player
    if(ratingDifference<=RATING_TOLERANCE || ithWaitingTime>MAX_WAITING_MILLISECONDS){
      // Randomly decide who is player1
      const whichPlayer1 = Math.floor(Math.random());
      const player1Index = whichPlayer1===0 ? i : nearestRatingPlayerIndex;
      const player2Index = whichPlayer1===0 ? nearestRatingPlayerIndex : i;
      randomMatchesArrangements.push({ // Create the arrangement
        player1: randomMatchRequests[player1Index].from,
        player2: randomMatchRequests[player2Index].from,
      });
      // Mark these match requests as alredy arranged
      matchRequestsArrangedIndexes.push(i);
      matchRequestsArrangedIndexes.push(nearestRatingPlayerIndex);
    }
  }

  return randomMatchesArrangements;
}