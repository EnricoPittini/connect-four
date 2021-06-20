import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, PlayerSignUpParams } from 'src/app/auth/services/auth.service';


/**
 * The sign up page.
 */
@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css']
})
export class SignUpComponent implements OnInit {

  /**
   * The form for the sign up data.
   */
  signUpForm: FormGroup = this.formBuilder.group({
    username: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(2)]],
    confirmPassword: ['', Validators.required],
    name: ['', Validators.required],
    surname: ['', Validators.required],
    avatar: ['', Validators.required],   // TODO capire come fare
    remember: [false],
  }, { validators: SignUpComponent.passwordConfirming });

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
    console.info('Your information has been submitted', this.signUpForm.value);
    // Build the object to pass to the backend
    const newPlayer: PlayerSignUpParams = {
      username: this.signUpForm.value.username,
      password: this.signUpForm.value.password,
      name: this.signUpForm.value.name,
      surname: this.signUpForm.value.surname,
      avatar: this.signUpForm.value.avatar,
    };
    // Sign up and handle success / failure
    this.authService.signup(newPlayer, this.signUpForm.value.remember).subscribe(
      response => {
        // The backend server was contacted successfully

        if (!response.error) {
          console.info('Successful sign up');
          // Reset error message
          this.errorMessage = '';
          // Go to the home page
          this.router.navigate(['/']);
        }
        else {
          console.info('Sign up failed');
          // Set error message
          this.errorMessage = response.errorMessage;
        }
      },
      error => {
        // A client error occurred

        // Set error message
        this.errorMessage = error.message;
      });
  }

  /**
   * Confirm password field (`confirmPassword`) validator for the form.
   *
   * @param formControl - The form
   * @returns A ValidationErrors if an error in the form data is encountered, null otherwise
   */
  private static passwordConfirming(formControl: AbstractControl): ValidationErrors | null {
    // Get `password` and `confirmPassword` fields
    const password = formControl.get('password');
    const confirmPassword = formControl.get('confirmPassword');

    // The `confirmPassword` field is invalid if both `password` and `confirmPassword` fields are
    // non-empty and their value doesn't match
    return password && confirmPassword && password.value !== confirmPassword.value ? { notMatch: true } : null;
  }

}
