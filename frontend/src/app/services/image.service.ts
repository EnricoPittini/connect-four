import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';
import { SuccessResponseBody } from '../models/httpTypes/responses.model';


@Injectable({
  providedIn: 'root'
})
export class ImageService {

  private static readonly BASE_URL = 'http://localhost:8080/v0.0.1';

  /**
   * Http headers.
   */
  private createHttpOptions(params: any = {}) {
    return {
      headers: new HttpHeaders({
        'Authorization': `Bearer ${this.auth.getToken()}`,
        'Cache-Control': 'no-cache',
      }),
      params: new HttpParams({ fromObject: params }),
    };
  };

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) { }

  public uploadImage(image: File): Observable<SuccessResponseBody> {
    const formData = new FormData();

    formData.append('file', image);

    return this.http.post<SuccessResponseBody>(
      `${ImageService.BASE_URL}/players/${this.auth.getUsername()}/avatar`,
      formData,
      this.createHttpOptions()
    );
  }
}
