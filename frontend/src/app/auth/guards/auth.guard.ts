import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';


/**
 * Only let the user get through if it is authenticated, and if not redirect
 * him to the login page.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  /**
   * Constructs the AuthGuard.
   *
   * @param router - The Router
   * @param auth - The AuthService
   */
  constructor(
    public router: Router,
    public auth: AuthService
  ) { }

  /**
   * Only let the user get through if it is authenticated, and if not redirect
   * him to the login page.
   *
   * @returns true if the user is authenticated, false otherwise.
   */
  canActivate(_: ActivatedRouteSnapshot, __: RouterStateSnapshot): boolean {
    if (!this.auth.isAuthenticated()) {
      // User is not authenticated, redirect him to the login page
      this.router.navigate(['/login']);
      return false;
    }
    // User is authenticated
    return true;
  }

}
