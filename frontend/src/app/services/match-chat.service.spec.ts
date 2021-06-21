import { TestBed } from '@angular/core/testing';

import { MatchChatService } from './match-chat.service';

describe('MatchChatService', () => {
  let service: MatchChatService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MatchChatService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
