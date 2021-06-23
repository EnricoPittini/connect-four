import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ClientPlayer, Player, PlayerType } from 'src/app/models/player.model';
import { Stats } from 'src/app/models/stats.model';
import { FriendService } from 'src/app/services/friend.service';
import { GameService } from 'src/app/services/game.service';
import { PlayerService } from 'src/app/services/player.service';


/**
 * The stats page.
 */
@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.css']
})
export class StatsComponent implements OnInit {

  /**
   * The stats data of the player
   */
  playerStats: Stats | null = null;

  /**
   * The general data of the player
   */
  player: ClientPlayer & { online: boolean; ingame: boolean; } = {
    username: "",
    name: "",
    surname: "",
    type: PlayerType.STANDARD_PLAYER,
    avatar: "",
    online: false,
    ingame: false,
  }; 

  /**
   * Indicates if the player is the user
   */
  isUser: boolean = false;

  /**
   * Wrapps several flags that have to be changed dynamically. 
   * This object is used in order to detect the changes dynamically
   * 
   * TODO provare a togliere
   */
  dynamicFlags: {
    areUserPlayerFriends: boolean,
    hasUserSentFriendRequestToPlayer: boolean,
    hasPlayerSentFriendRequestToUser: boolean,
  } = {
    areUserPlayerFriends: false,
    hasUserSentFriendRequestToPlayer: false,
    hasPlayerSentFriendRequestToUser: false,
  }

  /**
   * Indicates if the user and the player are friends
   */
  //areUserPlayerFriends: boolean = false;

  /**
   * Indicates if the user has sent friend request to the player
   */
  //hasUserSentFriendRequestToPlayer: boolean = false;

  /**
   * Indicates if the user has sent friend request to the player
   */
   //hasPlayerSentFriendRequestToUser: boolean = false;

  /**
   * Indicates if the user is a moderator
   */
  isUserModerator: boolean = false;


  constructor(
    private activatedRoute: ActivatedRoute,
    private playerService: PlayerService,
    private friendService: FriendService,
    private authService: AuthService,
    private location: Location,
    public router: Router,
    public gameService: GameService,
  ) { }

  ngOnInit(): void {
    console.log('Entering StatsComponent');

    // Username of the player
    let playerUsername = this.activatedRoute.snapshot.paramMap.get('username');
    if(!playerUsername){
      playerUsername = "";
    }

    this.isUser = playerUsername===this.authService.getUsername();
    /*this.dynamicFlags.areUserPlayerFriends = this.friendService.hasFriend(playerUsername);
    this.dynamicFlags.hasUserSentFriendRequestToPlayer = this.friendService.hasSentFriendRequest(playerUsername);
    this.dynamicFlags.hasPlayerSentFriendRequestToUser = this.friendService.hasReceivedFriendRequest(playerUsername);*/
    this.isUserModerator = this.authService.getPlayerType()===PlayerType.MODERATOR;

    this.getPlayerFriendData(playerUsername);
   
    // Gets the player general data and stats
    this.getPlayer(playerUsername);
    this.getPlayerStats(playerUsername);

    // Start listening for friend-related updates
    this.listenForFriendUpdates(playerUsername);
  }

  /**
   * 
   * @returns The player type, in a pretty format 
   */
  getPrettyPlayerType(): string{
    return this.player.type.toString().replace(/_/g, " ");
  }

  getPrettyRating(): number | undefined{
    if(!this.playerStats){
      return;
    }
    return Math.round(this.playerStats.rating*1000)/1000;
  }

  getPrettyWinsRateo(): number | undefined{
    if(!this.playerStats){
      return;
    }
    if(this.playerStats.matchCount<=0){
      return;
    }
    return Math.round((this.playerStats.winCount/this.playerStats.matchCount)*1000)/1000;
  }

  getPrettyMinutesPlayed(): number | undefined{
    if(!this.playerStats){
      return;
    }
    return Math.round(this.playerStats.secondsPlayed/60);
  }

  /**
   * Deletes the player
   */
  deletePlayer(): void{
    this.playerService.deletePlayer(this.player.username).subscribe(
      _ => {
        alert('Player deleted correctly!');
        if(this.isUser){
          this.router.navigate(['\login']);
        }
        else{
          this.location.back();
        }
      },
      err => alert('An error occoured during the player deletion')
    );
  }

  /**
   * Sends a friend request from the user to the player.
   * If alredy exists a friend request from the player to the user, that request is accepted 
   * (e.g. the players become friends)
   */
  sendFriendRequest(): void{
    this.friendService.sendFriendRequest(this.player.username);
    this.dynamicFlags.hasUserSentFriendRequestToPlayer=true;
  }

  /**
   * Cancels the friend request or made by the user to the player or made by the player to the user.
   * (In general: cancels the friend requests between the players, if any)
   */
  cancelFriendRequest(): void{
    this.friendService.cancelFriendRequest(this.player.username);
    this.dynamicFlags.hasUserSentFriendRequestToPlayer=false;
    this.dynamicFlags.hasPlayerSentFriendRequestToUser=false;
  }

  /**
   * Deletes the player from the list of friends of the user
   */
   deleteFriend(): void{
    this.friendService.deleteFriend(this.player.username);
    this.dynamicFlags.areUserPlayerFriends=false;
  }

  observe(): void{
    this.gameService.getMatchIdFromUsername(this.player.username)
        .subscribe( matchId => {
          console.log('MatchId ' + matchId);
          this.gameService.startObservingMatch(matchId)
        });
  }


  private getPlayerFriendData(playerUsername: string): void{
    this.friendService.hasFriendAsync(playerUsername).subscribe( flag => this.dynamicFlags.areUserPlayerFriends=flag);
    this.friendService.hasReceivedFriendRequestAsync(playerUsername)
          .subscribe( flag => this.dynamicFlags.hasPlayerSentFriendRequestToUser=flag);
    this.friendService.hasSentFriendRequestAsync(playerUsername)
          .subscribe( flag => this.dynamicFlags.hasUserSentFriendRequestToPlayer=flag);
  }

  /**
   * Starts listen for friend-related updates about the given player
   * @param playerUsername 
   */
  private listenForFriendUpdates(playerUsername: string): void{
    const observable = this.friendService.listenForFriendUpdates(playerUsername);
    if(observable){
      observable.subscribe( eventString => {
        console.log('StatsComponent socketIO event ' + eventString)
        switch(eventString){
          case 'newFriend': this.dynamicFlags.areUserPlayerFriends=true;
                            this.dynamicFlags.hasPlayerSentFriendRequestToUser=false;
                            this.dynamicFlags.hasUserSentFriendRequestToPlayer=false;
                            console.log('StatsComponent newFriend');
                            break;
          case 'lostFriend': this.dynamicFlags.areUserPlayerFriends=false;
                             this.dynamicFlags.hasPlayerSentFriendRequestToUser=false;
                             this.dynamicFlags.hasUserSentFriendRequestToPlayer=false;
                             console.log('StatsComponent lostFriend');
                             break;
          case 'newFriendRequest': this.dynamicFlags.hasPlayerSentFriendRequestToUser=true;
                                   console.log('StatsComponent newFriendRequest');
                                   break;
          case 'cancelFriendRequest': this.dynamicFlags.hasPlayerSentFriendRequestToUser=false;
                                      this.dynamicFlags.hasUserSentFriendRequestToPlayer=false;
                                      console.log('StatsComponent cancelFriendRequest');
                                      break;
          case 'friendOnline': this.player.online=true;
                               console.log('StatsComponent friendOnline');
                               break;
          case 'friendOffline': this.player.online=false;
                               console.log('StatsComponent friendOffline');
                               break;
                            
        }
        console.log('areUserPlayerFriends ' + this.dynamicFlags.areUserPlayerFriends);
        console.log('hasUserSentFriendRequestToPlayer ' + this.dynamicFlags.hasUserSentFriendRequestToPlayer);
        console.log('hasPlayerSentFriendRequestToUser ' + this.dynamicFlags.hasPlayerSentFriendRequestToUser);
      });
    }
  }

  /**
   *  Retreives the player general data
   */
   private getPlayer(playerUsername: string): void{
    this.playerService.getPlayer(playerUsername).subscribe( player => {
      this.player=player
      //console.log(player);
    });
  }

  /**
   * Retreives the player stats from the PlayerService.
   */
  private getPlayerStats(playerUsername: string): void {
    this.playerService.getPlayerStats(playerUsername).subscribe(
        playerStats => {
          this.playerStats = playerStats;
          this.playerStats.rating = Math.round(this.playerStats.rating*1000)/1000; // Limit the decimal digits to 3
        },
        err => console.info('The selected player stats are not accessible by user ')
    );
  }
}
