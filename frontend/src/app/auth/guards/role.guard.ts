import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
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
    const expectedRole = route.data.expectedRole;
    let role;
    try {
      role = this.auth.getPlayerType();
    } catch (error) {
      role = null;
    }

    if (!role || role != expectedRole) {
      console.warn('You are not authorized to enter this route');
      this.router.navigate(['/']);
      return false;
    }
    else {
      return true;
    }
  }

}
