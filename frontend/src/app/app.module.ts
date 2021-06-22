import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './pages/login/login.component';
import { SignUpComponent } from './pages/sign-up/sign-up.component';
import { AuthModule } from './auth/auth.module';
import { HomeComponent } from './pages/home/home.component';
import { NavComponent } from './components/nav/nav.component';
import { FriendsSideBarComponent } from './components/friends-side-bar/friends-side-bar.component';
import { StatsComponent } from './pages/stats/stats.component';
import { LiveMatchesComponent } from './pages/live-matches/live-matches.component';
import { ChatListComponent } from './pages/chat-list/chat-list.component';
import { GameComponent } from './pages/game/game.component';
import { CellComponent } from './components/cell/cell.component';
import { BoardComponent } from './components/board/board.component';
import { SearchPlayerComponent } from './pages/search-player/search-player.component';
import { FriendCardComponent } from './components/friend-card/friend-card.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    SignUpComponent,
    HomeComponent,
    NavComponent,
    FriendsSideBarComponent,
    StatsComponent,
    LiveMatchesComponent,
    ChatListComponent,
    GameComponent,
    CellComponent,
    BoardComponent,
    SearchPlayerComponent,
    FriendCardComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    HttpClientModule,
    AuthModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
