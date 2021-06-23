import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { SafeUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ClientPlayer, Player, PlayerType } from 'src/app/models/player.model';
import { Stats } from 'src/app/models/stats.model';
import { AvatarLinkGeneratorService } from 'src/app/services/avatar-link-generator.service';
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
    online: false,
    ingame: false,
  };

  /**
   * Indicates if the player is the user
   */
  isUser: boolean = false;

  /**
   * Wrapps several flags that change dynamically.
   *      - areUserPlayerFriends : indicates if the user and the player are friends;
   *      - hasUserSentFriendRequestToPlayer: indicates if the user has sent friend request to the player
   *      - hasPlayerSentFriendRequestToUser: indicates if the user has sent friend request to the player
   * This object is used in order to help angular to detect the template changes dynamically
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
   * Indicates if the user is a moderator
   */
  isUserModerator: boolean = false;

  /**
   * Interval used to refresh the player's data
   */
  refreshInterval: number = 30000;


  constructor(
    private activatedRoute: ActivatedRoute,
    private playerService: PlayerService,
    private friendService: FriendService,
    private authService: AuthService,
    private location: Location,
    public router: Router,
    public gameService: GameService,
    private avatarLinkGenerator: AvatarLinkGeneratorService
  ) { }

  ngOnInit(): void {
    // Username of the player
    this.activatedRoute.paramMap.subscribe(
      params => {
        let playerUsername = params.get('username');
        if(!playerUsername){
          playerUsername = "";
        }

        this.isUser = playerUsername===this.authService.getUsername();
        this.isUserModerator = this.authService.getPlayerType()===PlayerType.MODERATOR;

        // First loading of the data
        this.refresh(playerUsername);

        // Start listening for friend-related updates about the player
        this.listenForFriendUpdates(playerUsername);

        // Periodically refresh the player's data
        setInterval( () => this.refresh(this.player.username), this.refreshInterval);
      }
    );
  }



  /**
   *
   * @returns The player type, in a pretty format
   */
  getPrettyPlayerType(): string{
    return this.player.type.toString().replace(/_/g, " ").toLowerCase();
  }

  /**
   * Returns the player's rating in a pretty format
   */
  getPrettyRating(): number | undefined{
    if(!this.playerStats){
      return;
    }
    return Math.round(this.playerStats.rating*1000)/1000;
  }

  /**
   * Returns the player's wins rateo in a pretty format
   */
  getPrettyWinsRateo(): number | undefined{
    if(!this.playerStats){
      return;
    }
    if(this.playerStats.matchCount<=0){
      return;
    }
    return Math.round((this.playerStats.winCount/this.playerStats.matchCount)*1000)/1000;
  }

  /**
   * Returns the player's minutes played in a pretty format
   */
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

  /**
   * Starts observing the match in which the player is playing
   */
  observe(): void{
    this.gameService.getMatchIdFromUsername(this.player.username)
        .subscribe( matchId => {
          this.gameService.startObservingMatch(matchId)
        });
  }

  /**
   * Refresh the player's data
   */
  private refresh(playerUsername: string): void{
    this.getPlayerFriendData(playerUsername);
    this.getPlayer(playerUsername);
    this.getPlayerStats(playerUsername);
  }

  avatarLink(username: string): SafeUrl {
    return this.avatarLinkGenerator.avatarLink(username);
  }

  /**
   * Gets the player's data about the friendship with the user
   * @param playerUsername
   */
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
        switch(eventString){
          case 'newFriend':
            this.dynamicFlags.areUserPlayerFriends=true;
            this.dynamicFlags.hasPlayerSentFriendRequestToUser=false;
            this.dynamicFlags.hasUserSentFriendRequestToPlayer=false;
            console.log('StatsComponent newFriend');
            break;
          case 'lostFriend':
            this.dynamicFlags.areUserPlayerFriends=false;
            this.dynamicFlags.hasPlayerSentFriendRequestToUser=false;
            this.dynamicFlags.hasUserSentFriendRequestToPlayer=false;
            console.log('StatsComponent lostFriend');
            break;
          case 'newFriendRequest':
            this.dynamicFlags.hasPlayerSentFriendRequestToUser=true;
            console.log('StatsComponent newFriendRequest');
            break;
          case 'cancelFriendRequest':
            this.dynamicFlags.hasPlayerSentFriendRequestToUser=false;
            this.dynamicFlags.hasUserSentFriendRequestToPlayer=false;
            console.log('StatsComponent cancelFriendRequest');
            break;
          case 'friendOnline':
            this.player.online=true;
            console.log('StatsComponent friendOnline');
            break;
          case 'friendOffline':
            this.player.online=false;
            this.player.ingame=false;
            console.log('StatsComponent friendOffline');
            break;
           case 'friendIngame':
            this.player.ingame=true;
            console.log('StatsComponent friendIngame');
            break;
          case 'friendOffgame':
            this.player.ingame=false;
            console.log('StatsComponent friendOffgame');
            break;
        }
      });
    }
  }

  /**
   *  Retreives the player general data
   */
   private getPlayer(playerUsername: string): void{
    this.playerService.getPlayer(playerUsername).subscribe( player => {
      this.player=player
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
