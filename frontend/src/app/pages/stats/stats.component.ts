import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'src/app/auth/services/auth.service';
import { ClientPlayer, Player, PlayerType } from 'src/app/models/player.model';
import { Stats } from 'src/app/models/stats.model';
import { FriendService } from 'src/app/services/friend.service';
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
   * Indicates if the user and the player are friends
   */
  isUserFriend: boolean = false;

  /**
   * Indicates if the user has sent friend request to the player
   */
  hasUserSentFriendRequest: boolean = false;

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
    private router: Router,
  ) { }

  ngOnInit(): void {
    console.log('Entering StatsComponent');

    // Username of the player
    let playerUsername = this.activatedRoute.snapshot.paramMap.get('username');
    if(!playerUsername){
      playerUsername = "";
    }

    this.isUser = playerUsername===this.authService.getUsername();
    this.isUserFriend = this.friendService.hasFriend(playerUsername);
    this.hasUserSentFriendRequest = this.friendService.hasSentFriendRequest(playerUsername);
    this.isUserModerator = this.authService.getPlayerType()===PlayerType.MODERATOR;
   
    // Gets the player general data and stats
    this.getPlayer(playerUsername);
    this.getPlayerStats(playerUsername);
  }

  /**
   * 
   * @returns The player type, in a pretty format 
   */
  getPrettyPlayerType(): string{
    return this.player.type.toString().replace(/_/g, " ");
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
   * Sends a friend request to the player
   */
  sendFriendRequest(): void{
    this.friendService.sendFriendRequest(this.player.username);
    this.hasUserSentFriendRequest=true;
  }

  /**
   * Cancels the friend request
   */
  cancelFriendRequest(): void{
    this.friendService.cancelFriendRequest(this.player.username);
    this.hasUserSentFriendRequest=false;
  }

  /**
   *  Retreives the player general data
   */
   private getPlayer(playerUsername: string): void{
    this.playerService.getPlayer(playerUsername).subscribe( player => {
      this.player=player
      console.log(player);
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
