import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth/guards/auth.guard';
import { ChatListComponent } from './pages/chat-list/chat-list.component';
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


const routes: Routes = [
  // { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignUpComponent },
  { path: '', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'player/:username', component: StatsComponent, canActivate: [AuthGuard] },
  { path: 'matches', component: LiveMatchesComponent, canActivate: [AuthGuard] },
  { path: 'chat', component: ChatListComponent, canActivate: [AuthGuard] },
  { path: 'chat/:username', component: FriendChatComponent, canActivate: [AuthGuard] },
  { path: 'game', component: GameComponent, canActivate: [AuthGuard] },
  { path: 'searchPlayer', component: SearchPlayerComponent, canActivate: [AuthGuard]},
  { path: 'friend_requests', component: FriendRequestComponent, canActivate: [AuthGuard]},
  { path: 'create_moderator', component: CreateModeratorComponent, canActivate: [AuthGuard]},

  // TODO eventualmente gestire path errati con 404 not found
  // {path: '404', component: NotFoundComponent},
  // {path: '**', redirectTo: '/404'}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
