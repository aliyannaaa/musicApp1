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

interface LocalPlaylist {
  name: string;
  tracks: LocalTrack[];
  open?: boolean; // for UI toggle
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
  localPlaylists: LocalPlaylist[] = [];
  newPlaylistName = '';

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
      const hasPermission = await this.permissionService.requestStoragePermission();
      if (!hasPermission) {
        this.errorMessage = 'Permission denied.';
        return;
      }

      const uri = await this.fileChooser.open();
      const fileName = uri.split('/').pop() || 'Unknown';
      const title = fileName.replace(/\.[^/.]+$/, '');
      const newTrack: LocalTrack = {
        title,
        artist: 'Unknown Artist',
        path: uri,
        albumArt: 'assets/icon/splash.png'
      };

      // Add to localTracks if not already present
      if (!this.localTracks.some(t => t.path === uri)) {
        this.localTracks.push(newTrack);
      }

      this.currentTrack = newTrack;
      this.isCurrentTrackLocal = true;
      this.errorMessage = '';

      await this.audioPlayer.playAudio(uri);
      this.isPlaying = true;
    } catch (error: any) {
      this.errorMessage = 'File picking failed.';
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

  addLocalPlaylist() {
    const name = this.newPlaylistName.trim();
    if (name && !this.localPlaylists.some(p => p.name === name)) {
      this.localPlaylists.push({ name, tracks: [], open: false });
      this.newPlaylistName = '';
    }
  }

  deleteLocalPlaylist(index: number) {
    this.localPlaylists.splice(index, 1);
  }

  addTrackToPlaylist(track: LocalTrack, playlist: LocalPlaylist) {
    if (!playlist.tracks.some(t => t.path === track.path)) {
      playlist.tracks.push(track);
    }
  }

  removeTrackFromPlaylist(track: LocalTrack, playlist: LocalPlaylist) {
    playlist.tracks = playlist.tracks.filter(t => t.path !== track.path);
  }

  togglePlaylistOpen(index: number) {
    this.localPlaylists[index].open = !this.localPlaylists[index].open;
  }

  playLocalPlaylist(playlist: LocalPlaylist) {
    if (playlist.tracks.length > 0) {
      this.playLocalTrack(playlist.tracks[0]);
      // Optionally, implement queue logic for next/prev
    }
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
