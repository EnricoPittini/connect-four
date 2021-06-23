import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth/guards/auth.guard';
import { RoleGuard } from './auth/guards/role.guard';
import { PlayerType } from './models/player.model';
import { ChatListComponent } from './pages/chat-list/chat-list.component';
import { ConfirmModeratorComponent } from './pages/confirm-moderator/confirm-moderator.component';
import { CreateModeratorComponent } from './pages/create-moderator/create-moderator.component';
import { FriendChatComponent } from './pages/friend-chat/friend-chat.component';
import { FriendRequestComponent } from './pages/friend-request/friend-request.component';
import { GameComponent } from './pages/game/game.component';
import { HomeComponent } from './pages/home/home.component';
import { LiveMatchesComponent } from './pages/live-matches/live-matches.component';
import { LoginComponent } from './pages/login/login.component';
import { SearchPlayerComponent } from './pages/search-player/search-player.component';
import { SignUpComponent } from './pages/sign-up/sign-up.component';
import { StatsComponent } from './pages/stats/stats.component';
import { UploadAvatarComponent } from './pages/upload-avatar/upload-avatar.component';


const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'signup',
    component: SignUpComponent,
  },
  {
    path: '',
    component: HomeComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: {
      expectedRoles: [PlayerType.STANDARD_PLAYER, PlayerType.MODERATOR],
    },
  },
  {
    path: 'player/:username',
    component: StatsComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: {
      expectedRoles: [PlayerType.STANDARD_PLAYER, PlayerType.MODERATOR],
    },
  },
  {
    path: 'matches',
    component: LiveMatchesComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: {
      expectedRoles: [PlayerType.STANDARD_PLAYER, PlayerType.MODERATOR],
    },
  },
  {
    path: 'chat',
    component: ChatListComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: {
      expectedRoles: [PlayerType.STANDARD_PLAYER, PlayerType.MODERATOR],
    },
  },
  {
    path: 'chat/:username',
    component: FriendChatComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: {
      expectedRoles: [PlayerType.STANDARD_PLAYER, PlayerType.MODERATOR],
    },
  },
  {
    path: 'game',
    component: GameComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: {
      expectedRoles: [PlayerType.STANDARD_PLAYER, PlayerType.MODERATOR],
    },
  },
  {
    path: 'searchPlayer',
    component: SearchPlayerComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: {
      expectedRoles: [PlayerType.STANDARD_PLAYER, PlayerType.MODERATOR],
    },
  },
  {
    path: 'friend_requests',
    component: FriendRequestComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: {
      expectedRoles: [PlayerType.STANDARD_PLAYER, PlayerType.MODERATOR],
    },
  },
  {
    path: 'create_moderator',
    component: CreateModeratorComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: {
      expectedRoles: [PlayerType.MODERATOR],
    },
  },
  {
    path: 'confirm_moderator',
    component: ConfirmModeratorComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: {
      expectedRoles: [PlayerType.MODERATOR_FIRST_ACCESS],
    },
  },
  {
    path: 'upload_avatar',
    component: UploadAvatarComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: {
      expectedRoles: [PlayerType.STANDARD_PLAYER, PlayerType.MODERATOR],
    },
  },

  // TODO eventualmente gestire path errati con 404 not found
  // {path: '404', component: NotFoundComponent},
  // {path: '**', redirectTo: '/404'}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
