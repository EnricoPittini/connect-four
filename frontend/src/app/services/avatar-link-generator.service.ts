import { Injectable } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class AvatarLinkGeneratorService {

  private static readonly BASE_URL = 'http://localhost:8080/v1.0.0';

  constructor(
    private domSanitizer: DomSanitizer
  ) { }

  avatarLink(username: string): SafeUrl {
    return this.domSanitizer.bypassSecurityTrustUrl(
      `${AvatarLinkGeneratorService.BASE_URL}/players/${username}/avatar`
    );
  }
}
