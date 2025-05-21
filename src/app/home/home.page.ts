import { Component } from '@angular/core';
import { DeezerService } from '../services/deezer.services';
import { Media, MediaObject } from '@awesome-cordova-plugins/media/ngx';
import { FileChooser } from '@awesome-cordova-plugins/file-chooser/ngx';
import { HttpClient } from '@angular/common/http';
import { HttpClientJsonpModule } from '@angular/common/http';


interface LocalTrack {
  title: string;
  artist: string;
  albumArt?: string;
  path: string;
}

interface DeezerTrack {
  id: number;
  title: string;
  artist: { name: string }; // fixed: using artist object for correct name
  album: { cover_medium: string };
  preview: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage {
  searchQuery = '';
  localTracks: LocalTrack[] = [];
  deezerTracks: DeezerTrack[] = [];
  audioPlayer: HTMLAudioElement | null = null;
  currentTrack: LocalTrack | DeezerTrack | null = null;
  isPlaying = false;
  isCurrentTrackLocal = true;
  errorMessage = '';
  private audioFile?: MediaObject;
  deezerPlaylistId = '908622995';

  constructor(
    private http: HttpClient,
    private deezerService: DeezerService,
    private media: Media,
    private fileChooser: FileChooser
  ) {}

  async ionViewWillEnter() {
    this.loadLocalTracks();
    this.loadDeezerPlaylist(this.deezerPlaylistId);
  }

  async pickAndPlayLocalFile() {
    try {
      const uri = await this.fileChooser.open();
      this.isCurrentTrackLocal = true;
      await this.playAudio(uri, { title: 'Picked File', artist: 'Unknown', path: uri }, true);
    } catch (err) {
      this.errorMessage = 'File picking failed.';
    }
  }

  loadLocalTracks() {
    this.localTracks = [
      {
        title: 'HANDS UP',
        artist: 'MEOVV',
        albumArt: 'assets/icon/meovv.png',
        path: '/assets/music/MEOVV - HANDS UP.mp3',
      },
      {
        title: 'poppop',
        artist: 'NCT WISH',
        albumArt: 'assets/icon/poppop1.png',
        path: '/assets/music/NCT WISH - poppop.mp3',
      },
    ];
  }

  async playLocalTrack(track: LocalTrack) {
    this.isCurrentTrackLocal = true;
    await this.playAudio(track.path, track, true);
  }

  async playDeezerTrack(track: DeezerTrack) {
    if (!track.preview) {
      alert('Preview not available for this track.');
      return;
    }
    this.isCurrentTrackLocal = false;
    await this.playAudio(track.preview, track, false);
  }

  searchDeezerTracks() {
    // Check if the search query is empty or only whitespace
    if (!this.searchQuery.trim()) {
      this.deezerTracks = [];
      return;
    }
  
    // Encode the search query to make it URL-safe
    const query = encodeURIComponent(this.searchQuery);
    const url = `https://api.deezer.com/search?q=${query}&output=jsonp`;
  
    // Make the JSONP request
    this.http.jsonp(url, 'callback').subscribe({
      next: (res: any) => {
        // Map the response data to the desired format
        if (res && res.data) {
          this.deezerTracks = res.data.map((track: any) => ({
            id: track.id,
            title: track.title,
            artist: { name: track.artist.name },
            album: { cover_medium: track.album.cover_medium },
            preview: track.preview,
          }));
        } else {
          this.deezerTracks = [];
          this.errorMessage = 'No tracks found.';
        }
      },
      error: (err) => {
        // Handle errors gracefully
        console.error('Error fetching Deezer tracks:', err);
        this.errorMessage = 'Failed to fetch Deezer tracks. Please try again later.';
        this.deezerTracks = [];
      },
    });
  }

  loadDeezerPlaylist(playlistId: string) {
    const url = `https://api.deezer.com/playlist/${playlistId}?output=jsonp`;

    this.http.jsonp(url, 'callback').subscribe({
      next: (res: any) => {
        this.deezerTracks = res.tracks.data.map((track: any) => ({
          id: track.id,
          title: track.title,
          artist: { name: track.artist.name },
          album: { cover_medium: track.album.cover_medium },
          preview: track.preview,
        }));
      },
      error: () => {
        this.errorMessage = 'Failed to load Deezer playlist.';
      }
    });
  }

  private async playAudio(source: string, track: LocalTrack | DeezerTrack, isLocal: boolean) {
    this.stopTrack();
    this.currentTrack = track;

    if (isLocal) {
      this.audioFile = this.media.create(source);
      this.audioFile.onStatusUpdate.subscribe(status => {
        if (status === 4) {
          this.isPlaying = false;
          this.currentTrack = null;
        }
      });
      this.audioFile.play();
      this.isPlaying = true;
    } else {
      this.audioPlayer = new Audio(source);
      try {
        await this.audioPlayer.play();
        this.isPlaying = true;
      } catch {
        this.isPlaying = false;
        this.currentTrack = null;
      }

      this.audioPlayer.onended = () => {
        this.isPlaying = false;
        this.currentTrack = null;
      };

      this.audioPlayer.onerror = () => {
        this.isPlaying = false;
        this.currentTrack = null;
      };
    }
  }

  pauseTrack() {
    if (this.isCurrentTrackLocal && this.audioFile) {
      this.audioFile.pause();
    } else if (!this.isCurrentTrackLocal && this.audioPlayer) {
      this.audioPlayer.pause();
    }
    this.isPlaying = false;
  }

  resumeTrack() {
    if (this.isCurrentTrackLocal && this.audioFile) {
      this.audioFile.play();
    } else if (!this.isCurrentTrackLocal && this.audioPlayer) {
      this.audioPlayer.play();
    }
    this.isPlaying = true;
  }

  stopTrack() {
    if (this.isCurrentTrackLocal && this.audioFile) {
      this.audioFile.stop();
      this.audioFile.release();
      this.audioFile = undefined;
    } else if (!this.isCurrentTrackLocal && this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer.currentTime = 0;
    }
    this.isPlaying = false;
    this.currentTrack = null;
  }

  onSearch() {
    this.errorMessage = '';
    this.searchDeezerTracks();
  }

  get nowPlayingTitle(): string {
    return this.currentTrack?.title || '';
  }

  get nowPlayingArtist(): string {
    if (!this.currentTrack) return '';
    if (this.isCurrentTrackLocal) {
      return (this.currentTrack as LocalTrack).artist;
    }
    return (this.currentTrack as DeezerTrack).artist?.name || 'Unknown Artist';
  }
}
