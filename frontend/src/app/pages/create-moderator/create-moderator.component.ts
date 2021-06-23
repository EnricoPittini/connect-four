import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PlayerService } from 'src/app/services/player.service';

@Component({
  selector: 'app-create-moderator',
  templateUrl: './create-moderator.component.html',
  styleUrls: ['./create-moderator.component.css']
})
export class CreateModeratorComponent implements OnInit {

  /**
   * The form for the login data.
   */
   newModeratorForm: FormGroup = this.formBuilder.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  /**
   * The error message.
   */
  errorMessage: string = '';


  constructor(
    private formBuilder: FormBuilder,
    private playerService: PlayerService
  ) { }

  ngOnInit(): void {
  }

  /**
   * Callback called when the form submit button is pressed.
   */
  public onSubmit(): void {
    console.info('Your login information has been submitted', this.newModeratorForm.value);
    // Get the required params from the form
    const { username, password } = this.newModeratorForm.value;
    this.playerService.createModerator(username, password).subscribe(
      success => {
        // The backend server was contacted successfully

        if (success) {
          console.info('Moderator created successfully');
          // Reset error message
          this.errorMessage = ''
          this.newModeratorForm.reset();
        }
        else {
          console.info('Failed to create new moderator');
          // Set error message
          this.errorMessage = 'Failed to create new moderator, retry.'
        }
      },
      error => {
        // A client error occurred

        // Set error message
        this.errorMessage = error.message;
      });
  }

}
