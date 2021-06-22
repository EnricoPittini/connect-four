import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FriendChatMessageComponent } from './friend-chat-message.component';

describe('FriendChatMessageComponent', () => {
  let component: FriendChatMessageComponent;
  let fixture: ComponentFixture<FriendChatMessageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FriendChatMessageComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FriendChatMessageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
