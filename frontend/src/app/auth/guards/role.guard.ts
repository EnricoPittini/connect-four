import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { PlayerType } from 'src/app/models/player.model';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(
    private auth: AuthService,
    private router: Router
  ) { }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {

    // This will be passed from the route config on the data property
    const expectedRoles = route.data.expectedRoles as PlayerType[];
    let role: PlayerType | null;
    try {
      role = this.auth.getPlayerType();
    } catch (error) {
      role = null;
    }

    if (!role) {
      console.warn('You are not authorized to enter this route');
      this.router.navigate(['/login']);
      return false;
    }
    else if (!expectedRoles.find(expectedRole => expectedRole === role)) {
      if (role === PlayerType.MODERATOR_FIRST_ACCESS) {
        this.router.navigate(['/confirm_moderator']);
      }
      else {
        this.router.navigate(['/']);
      }
      return false;
    }
    else {
      return true;
    }
  }

}
