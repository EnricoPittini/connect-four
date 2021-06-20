import { Component, OnInit } from '@angular/core';
import { AuthService } from 'src/app/auth/services/auth.service';


/**
 * The nav bar that shows the links to navigate to the app pages.
 */
@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.css']
})
export class NavComponent implements OnInit {

  constructor(
    public auth: AuthService
  ) { }

  ngOnInit(): void {
  }

}
