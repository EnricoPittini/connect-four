import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatchChatMessageComponent } from './match-chat-message.component';

describe('MatchChatMessageComponent', () => {
  let component: MatchChatMessageComponent;
  let fixture: ComponentFixture<MatchChatMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ MatchChatMessageComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(MatchChatMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
