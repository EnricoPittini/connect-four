import { TestBed } from '@angular/core/testing';

import { FriendChatService } from './friend-chat.service';

describe('FriendChatService', () => {
  let service: FriendChatService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FriendChatService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
