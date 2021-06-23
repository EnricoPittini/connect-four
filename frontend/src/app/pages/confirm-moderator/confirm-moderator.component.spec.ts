import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmModeratorComponent } from './confirm-moderator.component';

describe('ConfirmModeratorComponent', () => {
  let component: ConfirmModeratorComponent;
  let fixture: ComponentFixture<ConfirmModeratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConfirmModeratorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfirmModeratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
