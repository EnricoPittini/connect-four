import { Player } from "./models/Player";
import { MatchRequest } from "./models/MatchRequest";

export class TransientDataHandler{
  private onlinePlayers : string[] = [];
  private inGamePlayers : string[] = [];
  private matchRequests : MatchRequest[] = []; 

  private static instance : TransientDataHandler;

  private constructor(){ }

  public static getInstance(){
    if(!TransientDataHandler.instance){
      TransientDataHandler.instance = new TransientDataHandler();
    }
    return TransientDataHandler.instance;
  }

  public markOnline(username: string) : void{
    if(this.isOnline(username)){
      return;
    }
    this.onlinePlayers.push(username);
  }

  public markOffline(username: string) : void{
    this.onlinePlayers = this.onlinePlayers.filter(el => el!==username);
  }

  public isOnline(username: string) : boolean{
    return !!this.onlinePlayers.find(el => el===username);
  }

  public markInGame(username: string) : void{
    if(this.isInGame(username)){
      return;
    }
    this.inGamePlayers.push(username);
  }

  public markOffGame(username: string) : void{
    this.inGamePlayers = this.inGamePlayers.filter(el => el!==username);
  }

  public isInGame(username: string) : boolean{
    return !!this.inGamePlayers.find(el => el===username);
  }

  public addMatchRequest(fromUsername: string, toUsername: string) : void{
    if(!this.isOnline(fromUsername) || !this.isOnline(toUsername)){
      throw new Error("At least one of the specified players isn't online");
    }

    if(this.isInGame(fromUsername) || this.isInGame(toUsername)){
      throw new Error("At least one of the specified players is alredy in game");
    }

    if(this.hasMatchRequest(fromUsername,toUsername) || this.hasMatchRequest(toUsername,fromUsername)){
      throw new Error("There is alredy a match request between these two players");
    }

    this.matchRequests.push({
      from: fromUsername,
      to: toUsername,
      datetime: new Date(),
    });
  }

  // To call both for accept match requests and cancel match requests
  public deleteMatchRequest(fromUsername: string, toUsername: string) : void{
    const previousLength = this.matchRequests.length;
    this.matchRequests = this.matchRequests.filter( matchRequest => matchRequest.from!==fromUsername || matchRequest.to!==toUsername);
    const currentLength = this.matchRequests.length;
    if(previousLength===currentLength){
      throw new Error("There isn't a match request from that fromUsername to that toUsername");
    }
  }

  public hasMatchRequest(fromUsername: string, toUsername: string) : boolean{
    return !!this.matchRequests.find( matchRequest => matchRequest.from===fromUsername && matchRequest.to===toUsername) ;
  }
}
