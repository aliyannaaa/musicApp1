import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { environment } from '@env/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';


@Injectable({
  providedIn: 'root',
})
export class SpotifyService {
  private apiUrl = 'https://api.spotify.com/v1';
  errorMessage: string = '';

  constructor(private http: HttpClient) {}

  // Get access token
  private getAccessToken(): string {
    return environment.spotifyToken;
  }

  // Helper for setting headers
  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.getAccessToken()}`,
      'Content-Type': 'application/json',
    });
  }

  // Error handling
  private handleError(error: HttpErrorResponse) {
    if (error.status === 401) {
      this.errorMessage = 'Unauthorized: Please check your Spotify token.';
    } else {
      this.errorMessage = `Error: ${error.message}`;
    }
    console.error(this.errorMessage);
    return throwError(this.errorMessage);
  }

  // 🎵 Search for tracks
  searchTracks(query: string): Observable<any> {
    console.log('Searching for tracks:', query); // Debugging
    return this.http
      .get(`${this.apiUrl}/search?q=${query}&type=track`, {
        headers: this.getHeaders(),
      })
      .pipe(
        catchError(this.handleError),
        tap((response) => console.log('Spotify API response:', response)) // Debugging
      );
  }

  // 🎼 Get details of a specific track
  getTrack(trackId: string): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/tracks/${trackId}`, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  // 🔊 Get user's top tracks
  getTopTracks(): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/me/top/tracks?time_range=long_term&limit=5`, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }
  // 🎵 Get details of a specific playlist
  getPlaylist(playlistId: string): Observable<any> {
    return this.http
      .get(`${this.apiUrl}/playlists/${playlistId}`, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }
}
