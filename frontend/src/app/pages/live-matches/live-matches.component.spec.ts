import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiveMatchesComponent } from './live-matches.component';

describe('LiveMatchesComponent', () => {
  let component: LiveMatchesComponent;
  let fixture: ComponentFixture<LiveMatchesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LiveMatchesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(LiveMatchesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
