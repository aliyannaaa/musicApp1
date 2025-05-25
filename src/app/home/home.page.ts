import { Component } from '@angular/core';
import { DeezerService } from '../services/deezer.services';
import { FileChooser } from '@awesome-cordova-plugins/file-chooser/ngx';
import { HttpClient } from '@angular/common/http';
import { Platform } from '@ionic/angular';
import { PermissionService } from '../services/permission.service';
import { AudioPlayerService } from '../services/audio-player.service';

interface LocalTrack {
  title: string;
  artist: string;
  albumArt?: string;
  path: string;
}

interface DeezerTrack {
  id: number;
  title: string;
  artist: { name: string };
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
  currentTrack: LocalTrack | DeezerTrack | null = null;
  isPlaying = false;
  isCurrentTrackLocal = true;
  errorMessage = '';
  deezerPlaylistId = '908622995';

  constructor(
    private http: HttpClient,
    private deezerService: DeezerService,
    private fileChooser: FileChooser,
    private platform: Platform,
    private permissionService: PermissionService,
    private audioPlayer: AudioPlayerService
  ) {}

  async ionViewWillEnter() {
    // Request permissions before loading any content
    await this.permissionService.requestStoragePermission();
    this.loadLocalTracks();
    this.loadDeezerPlaylist(this.deezerPlaylistId);
  }

  async pickAndPlayLocalFile() {
    try {
      // Make sure we have permission first - request it again to be sure
      const hasPermission = await this.permissionService.requestStoragePermission();
      if (!hasPermission) {
        this.errorMessage = 'Storage permission denied. Please enable storage permission in app settings.';
        return;
      }
      
      const uri = await this.fileChooser.open();
      console.log('Selected file URI:', uri);
      
      // Set current track info with placeholder data
      this.currentTrack = { title: 'Loading...', artist: 'Please wait', path: uri };
      this.isCurrentTrackLocal = true;
      
      // Clear any previous error
      this.errorMessage = '';
      
      // Play the audio file
      try {
        await this.audioPlayer.playAudio(uri);
        this.isPlaying = true;
        this.currentTrack = { title: 'Picked File', artist: 'Unknown', path: uri };
      } catch (error) {
        console.error('Error playing audio:', error);
        
        let message = 'Unknown error';
        if (typeof error === 'object' && error !== null && 'message' in error) {
          message = (error as any).message;
        } else if (typeof error === 'string') {
          message = error;
        }
        
        this.errorMessage = `Failed to play audio: ${message}`;
        this.isPlaying = false;
        this.currentTrack = null;
      }
    } catch (error: any) {
      console.error('File picking error:', error);
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null && 'message' in error) {
        message = (error as any).message;
      } else if (typeof error === 'string') {
        message = error;
      }
      this.errorMessage = 'File picking failed: ' + message;
      this.isPlaying = false;
      this.currentTrack = null;
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
    this.stopTrack();
    this.currentTrack = track;
    this.isCurrentTrackLocal = true;
    
    try {
      await this.audioPlayer.playAudio(track.path);
      this.isPlaying = true;
    } catch (error) {
      console.error('Error playing local track:', error);
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null && 'message' in error) {
        message = (error as any).message;
      } else if (typeof error === 'string') {
        message = error;
      }
      this.errorMessage = `Failed to play: ${message}`;
      this.isPlaying = false;
      this.currentTrack = null;
    }
  }

  async playDeezerTrack(track: DeezerTrack) {
    if (!track.preview) {
      alert('Preview not available for this track.');
      return;
    }
    
    this.stopTrack();
    this.currentTrack = track;
    this.isCurrentTrackLocal = false;
    
    try {
      await this.audioPlayer.playAudio(track.preview);
      this.isPlaying = true;
    } catch (error) {
      console.error('Error playing Deezer track:', error);
      let message = 'Unknown error';
      if (typeof error === 'object' && error !== null && 'message' in error) {
        message = (error as any).message;
      } else if (typeof error === 'string') {
        message = error;
      }
      this.errorMessage = `Failed to play: ${message}`;
      this.isPlaying = false;
      this.currentTrack = null;
    }
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

  pauseTrack() {
    this.audioPlayer.pause();
    this.isPlaying = false;
  }

  resumeTrack() {
    this.audioPlayer.resume();
    this.isPlaying = true;
  }

  stopTrack() {
    this.audioPlayer.stop();
    this.audioPlayer.release();
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
