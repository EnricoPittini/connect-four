import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/auth/services/auth.service';


/**
 * The login page.
 */
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  /**
   * The form for the login data.
   */
  loginForm: FormGroup = this.formBuilder.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
    remember: [false],
  });

  /**
   * The error message.
   */
  errorMessage: string = '';


  /**
   * Constructs the SignUpComponent.
   *
   * @param router - The Router
   * @param formBuilder - The FormBuilder
   * @param authService - The AuthService
   */
  constructor(
    private router: Router,
    private formBuilder: FormBuilder,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
  }

  /**
   * Callback called when the form submit button is pressed.
   */
  public onSubmit(): void {
    console.info('Your login information has been submitted', this.loginForm.value);
    // Get the required params from the form
    const { username, password, remember } = this.loginForm.value;
    this.authService.login(username, password, remember).subscribe(
      success => {
        // The backend server was contacted successfully

        if (success) {
          console.info('Successful login');
          // Reset error message
          this.errorMessage = ''
          // Go to the home page
          this.router.navigate(['/']);
        }
        else {
          console.info('Login failed');
          // Set error message
          this.errorMessage = 'Login failed, retry.'
        }
      },
      error => {
        // A client error occurred

        // Set error message
        this.errorMessage = error.message;
      });
  }

}
