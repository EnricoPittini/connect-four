import { TestBed } from '@angular/core/testing';

import { AvatarLinkGeneratorService } from './avatar-link-generator.service';

describe('AvatarLinkGeneratorService', () => {
  let service: AvatarLinkGeneratorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AvatarLinkGeneratorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
