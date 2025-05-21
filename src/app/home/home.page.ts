import { Component } from '@angular/core';
import { SpotifyService } from '../services/spotify.services';
import { Media, MediaObject } from '@awesome-cordova-plugins/media/ngx';
import { FileChooser } from '@awesome-cordova-plugins/file-chooser/ngx';

interface LocalTrack {
  title: string;
  artist: string;
  albumArt?: string;
  path: string;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { images: { url: string }[] };
  preview_url: string | null;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage {
  searchQuery: string = '';
  localTracks: LocalTrack[] = [];
  spotifyTracks: SpotifyTrack[] = [];
  audioPlayer: HTMLAudioElement | null = null;
  currentTrack: LocalTrack | SpotifyTrack | null = null;
  isPlaying: boolean = false;
  isCurrentTrackLocal: boolean = true;
  errorMessage: string = '';
  private audioFile: MediaObject | undefined;

  constructor(
    private spotifyService: SpotifyService,
    private media: Media,
    private fileChooser: FileChooser
  ) {}

  async ionViewWillEnter() {
    await this.loadLocalTracks();
    this.spotifyService.getPlaylist('1ueRsSYVmLBfxLaO5lGmI1').subscribe({
      next: (data) => {
        this.spotifyTracks = data.tracks.items.map((item: any) => item.track);
      },
      error: (error) => {
        this.errorMessage = 'Failed to fetch playlist.';
      }
    });
  }

  async pickAndPlayLocalFile() {
  try {
    const uri = await this.fileChooser.open();
    // The Media plugin can play the URI directly on Android
    this.isCurrentTrackLocal = true;
    await this.playAudio(uri, { title: 'Picked File', artist: 'Unknown', path: uri }, true);
  } catch (err) {
    this.errorMessage = 'File picking failed.';
  }
}

  async loadLocalTracks() {
    // For real device files, update the path to the actual file location
    this.localTracks = [
      {
        title: 'HANDS UP',
        artist: 'MEOVV',
        albumArt: 'assets/icon/meovv.png',
        path: '/assets/music/MEOVV - HANDS UP.mp3', // Example for Android
      },
      {
        title: 'poppop',
        artist: 'NCT WISH',
        albumArt: 'assets/icon/poppop1.png',
        path: '/assets/music/NCT WISH - poppop.mp3', // Example for Android
      },  
    ];
  }

  async playLocalTrack(track: LocalTrack) {
    this.isCurrentTrackLocal = true;
    await this.playAudio(track.path, track, true);
  }

  async playSpotifyTrack(track: SpotifyTrack) {
    if (!track.preview_url) {
      alert('Preview not available for this track.');
      return;
    }
    this.isCurrentTrackLocal = false;
    await this.playAudio(track.preview_url, track, false);
  }

  async searchSpotifyTracks() {
    if (!this.searchQuery.trim()) {
      this.spotifyTracks = [];
      return;
    }
    try {
      const response = await this.spotifyService.searchTracks(this.searchQuery).toPromise();
      this.spotifyTracks = response.tracks.items;
    } catch (error) {
      this.errorMessage = 'Failed to fetch Spotify tracks. Please try again.';
    }
  }

  private async playAudio(
    source: string,
    track: LocalTrack | SpotifyTrack,
    isLocal: boolean
  ) {
    // Stop previous playback
    this.stopTrack();

    this.currentTrack = track;

    if (isLocal) {
      // Use Media plugin for local files
      this.audioFile = this.media.create(source);
      this.audioFile.onStatusUpdate.subscribe(status => {
        if (status === 4) { // 4 = Stopped
          this.isPlaying = false;
          this.currentTrack = null;
        }
      });
      this.audioFile.play();
      this.isPlaying = true;
    } else {
      // Use HTMLAudioElement for streaming
      this.audioPlayer = new Audio(source);
      try {
        await this.audioPlayer.play();
        this.isPlaying = true;
      } catch (err) {
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
    if (this.isCurrentTrackLocal && this.audioFile && this.isPlaying) {
      this.audioFile.pause();
      this.isPlaying = false;
    } else if (!this.isCurrentTrackLocal && this.audioPlayer && this.isPlaying) {
      this.audioPlayer.pause();
      this.isPlaying = false;
    }
  }

  resumeTrack() {
    if (this.isCurrentTrackLocal && this.audioFile && !this.isPlaying) {
      this.audioFile.play();
      this.isPlaying = true;
    } else if (!this.isCurrentTrackLocal && this.audioPlayer && !this.isPlaying) {
      this.audioPlayer.play();
      this.isPlaying = true;
    }
  }

  stopTrack() {
    if (this.isCurrentTrackLocal && this.audioFile) {
      this.audioFile.stop();
      this.audioFile.release();
      this.audioFile = undefined;
      this.isPlaying = false;
      this.currentTrack = null;
    } else if (!this.isCurrentTrackLocal && this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer.currentTime = 0;
      this.isPlaying = false;
      this.currentTrack = null;
    }
  }

  onSearch() {
    this.errorMessage = '';
    if (!this.searchQuery.trim()) {
      alert('Search query is empty!');
      return;
    }
    this.spotifyService.searchTracks(this.searchQuery).subscribe({
      next: (res: any) => {
        this.spotifyTracks = res.tracks.items;
      },
      error: (err: any) => {
        this.errorMessage = err;
        this.spotifyTracks = [];
      },
    });
  }

  getCurrentTrackTitle(): string {
    if (!this.currentTrack) return '';
    if ('title' in this.currentTrack) {
      return this.currentTrack.title;
    } else if ('name' in this.currentTrack) {
      return this.currentTrack.name;
    }
    return '';
  }

  getCurrentTrackArtist(): string {
    if (!this.currentTrack) return '';
    if ('artist' in this.currentTrack) {
      return this.currentTrack.artist;
    } else if ('artists' in this.currentTrack && this.currentTrack.artists.length) {
      return this.currentTrack.artists.map(a => a.name).join(', ');
    }
    return 'Unknown Artist';
  }

  getSpotifyArtists(track: SpotifyTrack): string {
    if (!track.artists || track.artists.length === 0) {
      return 'Unknown Artist';
    }
    return track.artists.map(a => a.name).join(', ');
  }

  get nowPlayingTitle(): string {
    if (!this.currentTrack) return '';
    if ('title' in this.currentTrack) return this.currentTrack.title;
    if ('name' in this.currentTrack) return this.currentTrack.name;
    return '';
  }

  get nowPlayingArtist(): string {
    if (!this.currentTrack) return '';
    if ('artist' in this.currentTrack) return this.currentTrack.artist;
    if ('artists' in this.currentTrack && Array.isArray(this.currentTrack.artists)) {
      return this.currentTrack.artists.map((a: any) => a.name).join(', ');
    }
    return '';
  }
}