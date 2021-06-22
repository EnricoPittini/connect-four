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

  playerStats: Stats | null = null;

  player: ClientPlayer & { online: boolean; ingame: boolean; } = {
    username: "",
    name: "",
    surname: "",
    type: PlayerType.STANDARD_PLAYER,
    avatar: "",
    online: false,
    ingame: false,
  }; 

  // playerUsername: string = "";

  isUser: boolean = false;

  isUserFriend: boolean = false;

  hasUserSentFriendRequest: boolean = false;

 // userPlayerType: PlayerType = PlayerType.STANDARD_PLAYER;

  constructor(
    private activatedRoute: ActivatedRoute,
    private playerService: PlayerService,
    public friendService: FriendService,
    private authService: AuthService,
    private location: Location,
    private router: Router,
  ) { }

  ngOnInit(): void {
    console.log('Entering StatsComponent');
    let playerUsername = this.activatedRoute.snapshot.paramMap.get('username');
    console.log(playerUsername);
    if(!playerUsername){
      playerUsername = "";
    }
   //this.playerUsername = playerUsername;
    this.isUser = playerUsername===this.authService.getUsername();
    this.isUserFriend = this.friendService.hasFriend(playerUsername);
    this.hasUserSentFriendRequest = this.friendService.hasSentFriendRequest(playerUsername);
   // this.userPlayerType = this.authService.getPlayerType();
    this.getPlayer(playerUsername);
    this.getPlayerStats(playerUsername);
  }

  /**
   *  
   */
  private getPlayer(playerUsername: string): void{
    this.playerService.getPlayer(playerUsername).subscribe( player => {
      this.player=player
      console.log(player);
    });
  }

  /**
   * Retrieves the player stats from the PlayerService.
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

  isUserModerator(): boolean{
    return this.authService.getPlayerType()===PlayerType.MODERATOR;
  }

  getPrettyPlayerType(): string{
    return this.player.type.toString().replace(/_/g, " ");
  }

  /*sendFriendRequest(): void{
    this.friendService.sendFriendRequest(this.player.username);
  }*/

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

  sendFriendRequest(): void{
    this.friendService.sendFriendRequest(this.player.username);
    this.hasUserSentFriendRequest=true;
  }

  cancelFriendRequest(): void{
    this.friendService.cancelFriendRequest(this.player.username);
    this.hasUserSentFriendRequest=false;
  }
}
