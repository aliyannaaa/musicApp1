import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';


@Injectable({
  providedIn: 'root',
})
export class DeezerService {
  private apiUrl = 'https://api.deezer.com';  
  errorMessage: string = '';

  constructor(private http: HttpClient) {}

    // 🔍 Search for tracks
    searchTracks(query: string): Observable<any> {
      const url = `${this.apiUrl}/search?q=${encodeURIComponent(query)}&output=jsonp`;
      return this.http.jsonp(url, 'callback').pipe(
        tap(response => console.log('Deezer search response:', response)),
        catchError(this.handleError)
      );
    }
  
    // 🎵 Get playlist tracks
    getPlaylist(playlistId: string): Observable<any> {
      const url = `${this.apiUrl}/playlist/${playlistId}?output=jsonp`;
      return this.http.jsonp(url, 'callback').pipe(
        tap(response => console.log('Deezer playlist response:', response)),
        catchError(this.handleError)
      );
    }
  
    // Get track details (optional)
    getTrack(trackId: number): Observable<any> {
      const url = `${this.apiUrl}/track/${trackId}?output=jsonp`;
      return this.http.jsonp(url, 'callback').pipe(
        tap(response => console.log('Deezer track detail:', response)),
        catchError(this.handleError)
      );
    }
  
    // Error handler
    private handleError(error: HttpErrorResponse) {
      this.errorMessage = error.message || 'An unknown error occurred';
      console.error('Deezer API error:', this.errorMessage);
      return throwError(() => this.errorMessage);
    }
}
