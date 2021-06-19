import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css']
})
export class SignUpComponent implements OnInit {

  signUpForm: FormGroup = this.formBuilder.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
    name: ['', Validators.required],
    surname: ['', Validators.required],
    avatar: ['', Validators.required],   // TODO capire come fare
  });

  constructor(
    private formBuilder: FormBuilder
  ) { }

  ngOnInit(): void {
  }

  public onSubmit(): void {
    console.info('Your information has been submitted', this.signUpForm.value);
    // TODO auth service
  }

}
