import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth/guards/auth.guard';
import { ChatListComponent } from './components/chat-list/chat-list.component';
import { HomeComponent } from './pages/home/home.component';
import { LiveMatchesComponent } from './pages/live-matches/live-matches.component';
import { LoginComponent } from './pages/login/login.component';
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

  // TODO eventualmente gestire path errati con 404 not found
  // {path: '404', component: NotFoundComponent},
  // {path: '**', redirectTo: '/404'}
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
