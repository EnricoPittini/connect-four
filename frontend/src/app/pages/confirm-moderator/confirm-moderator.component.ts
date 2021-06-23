import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/auth/services/auth.service';
import { PlayerService } from 'src/app/services/player.service';

@Component({
  selector: 'app-confirm-moderator',
  templateUrl: './confirm-moderator.component.html',
  styleUrls: ['./confirm-moderator.component.css']
})
export class ConfirmModeratorComponent implements OnInit {

  /**
   * The form for the sign up data.
   */
  confirmModeratorForm: FormGroup = this.formBuilder.group({
    password: ['', [Validators.required, Validators.minLength(2)]],
    confirmPassword: ['', Validators.required],
    name: ['', Validators.required],
    surname: ['', Validators.required],
    avatar: ['', Validators.required],   // TODO capire come fare
  }, { validators: ConfirmModeratorComponent.passwordConfirming });

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
    private authService: AuthService,
    private playerService: PlayerService
  ) { }

  ngOnInit(): void {
  }

  /**
   * Callback called when the form submit button is pressed.
   */
  public onSubmit(): void {
    console.info('Your information has been submitted', this.confirmModeratorForm.value);

    const { password, name, surname, avatar } = this.confirmModeratorForm.value;

    this.playerService.confirmModerator(password, name, surname, avatar).subscribe(
      success => {
        // The backend server was contacted successfully

        if (success) {
          console.info('Successful confirmed moderator');
          // Reset error message
          this.errorMessage = '';

          // Redo login to update token
          this.authService.login(this.authService.getUsername(), password)
            .subscribe(
              response => this.router.navigate(['/'])
            );

          // Go to the home page

        }
        else {
          console.info('Sign up failed');
          // Set error message
          this.errorMessage = 'Failed to confirm moderator, retry.';
        }
      },
      error => {
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
