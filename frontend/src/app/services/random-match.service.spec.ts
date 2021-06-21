import { TestBed } from '@angular/core/testing';

import { RandomMatchService } from './random-match.service';

describe('RandomMatchService', () => {
  let service: RandomMatchService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RandomMatchService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
