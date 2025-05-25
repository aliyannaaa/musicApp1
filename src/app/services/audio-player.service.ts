import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Media, MediaObject } from '@awesome-cordova-plugins/media/ngx';
import { FilePath } from '@ionic-native/file-path/ngx';
import { File } from '@awesome-cordova-plugins/file/ngx';
import { FileOpener } from '@awesome-cordova-plugins/file-opener/ngx';
import { FileHandlerService } from './file-handler.service';
import { Capacitor } from '@capacitor/core';

@Injectable({
  providedIn: 'root'
})
export class AudioPlayerService {
  private audioPlayer: HTMLAudioElement | null = null;
  private mediaObject: MediaObject | null = null;
  private mediaStatus: number = 0;
  private usingExternalPlayer: boolean = false;
  private currentAudioUri: string | null = null;

  constructor(
    private platform: Platform,
    private media: Media,
    private filePath: FilePath,
    private file: File,
    private fileOpener: FileOpener,
    private fileHandler: FileHandlerService
  ) {}

  /**
   * Play audio from a URI
   * This will automatically determine the best method to play based on the URI type
   */
  async playAudio(uri: string): Promise<void> {
    console.log('PlayAudio called with URI:', uri);
    this.release(); // Clean up any existing players
    this.usingExternalPlayer = false;
    this.currentAudioUri = uri;

    try {
      // For content:// URIs on Android, we need special handling
      if (this.platform.is('android') && uri.startsWith('content://')) {
        console.log('Detected content URI on Android');
        return await this.handleContentUri(uri);
      } 
      // For http/https URLs (like Deezer previews)
      else if (uri.startsWith('http') || uri.startsWith('https')) {
        return await this.playWithHtml5Audio(uri);
      } 
      // For local file paths
      else {
        return await this.playWithMedia(uri);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      throw error;
    }
  }

  /**
   * Handle a content:// URI specifically for Android
   */
  private async handleContentUri(uri: string): Promise<void> {
    try {
      console.log('Handling content URI:', uri);
        // First, try to resolve the content URI to a file path
      const result = await this.fileHandler.resolveContentUri(uri);
      console.log('Content URI resolution result:', result);
      
      // If there was an error in resolution, we might want to try playing anyway
      if (result.error) {
        console.warn('Content URI resolution warning:', result.error);
      }
      
      // If the file handler opened it with an external player
      if (result.isExternalPlayer) {
        console.log('File opened with external player');
        this.usingExternalPlayer = true;
        return;
      }
      
      // If it's still a content URI, try direct HTML5 audio first
      if (result.uri.startsWith('content://')) {
        try {
          // Try direct HTML5 Audio playback first - this may work on newer Android
          console.log('Attempting direct HTML5 Audio playback with content URI');          await this.playWithHtml5Audio(result.uri);
          return;
        } catch (htmlError) {
          console.warn('HTML5 Audio playback failed with content URI:', htmlError);
          // Fall through to system player as a last resort
        }
        
        // If HTML5 playback fails, try the system player
        try {
          console.log('Attempting to open with system player');
          const mimeType = this.fileHandler.getMimeType(result.uri);
          await this.fileOpener.open(result.uri, mimeType);
          console.log('Opened with system audio player');
          this.usingExternalPlayer = true;
          return;
        } catch (fileOpenerError) {          console.error('System player failed:', fileOpenerError);
          // Handle the error with proper typing
          const errorMessage = fileOpenerError instanceof Error 
            ? fileOpenerError.message 
            : typeof fileOpenerError === 'string' 
              ? fileOpenerError 
              : 'Unknown error playing content URI';
          throw new Error('Unable to play content URI: ' + errorMessage);
        }
      }
        // If we got a resolved file path, try to play it with the Media plugin
      try {
        console.log('Attempting to play resolved path with Media plugin');
        await this.playWithMedia(result.uri);
        return;
      } catch (mediaError) {
        console.warn('Media plugin failed with resolved path:', mediaError);
        
        // Fall back to HTML5 Audio
        await this.playWithHtml5Audio(result.uri);
      }
    } catch (error) {
      console.error('All content URI handling methods failed:', error);
      throw error;
    }
  }
  /**
   * Play audio with HTML5 Audio
   */
  private async playWithHtml5Audio(uri: string): Promise<void> {
    try {
      this.audioPlayer = new Audio();
      
      // Set up event listeners for better debugging
      this.audioPlayer.onloadstart = () => console.log('HTML5 Audio: loadstart event');
      this.audioPlayer.oncanplay = () => console.log('HTML5 Audio: canplay event');
      this.audioPlayer.onplay = () => console.log('HTML5 Audio: play event');
      this.audioPlayer.onerror = (e) => {
        const error = this.audioPlayer?.error;
        let errorMessage = 'Unknown error';
        
        if (error) {
          // Map the error code to a more descriptive message
          switch (error.code) {
            case MediaError.MEDIA_ERR_ABORTED: 
              errorMessage = 'Playback aborted by the user';
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              errorMessage = 'Network error occurred during playback';
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorMessage = 'Error decoding the audio file';
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage = 'Audio format or MIME type not supported';
              break;
            default:
              errorMessage = `Error code: ${error.code}`;
          }
        }
        
        console.error(`HTML5 Audio error: ${errorMessage}`);
      };
      
      // For content URIs, try to use native URL
      if (this.platform.is('android') && uri.startsWith('content://')) {
        if (Capacitor.isNativePlatform()) {
          console.log('Using native URL for content URI in HTML5 Audio');
          // On Android, we can use content:// URIs directly with HTML5 Audio in newer versions
          this.audioPlayer.src = uri;
        } else {
          throw new Error('Content URIs can only be played natively on Android');
        }
      } else {
        this.audioPlayer.src = uri;
      }
      
      await this.audioPlayer.play();
      console.log('HTML5 Audio playback started successfully');
    } catch (error) {
      console.error('Failed to play with HTML5 Audio:', error);
      throw error;
    }
  }
  /**
   * Play audio with Media plugin
   */
  private async playWithMedia(uri: string): Promise<void> {
    try {
      console.log('Creating Media object with URI:', uri);
      
      // Special handling for content:// URIs
      if (uri.startsWith('content://') && this.platform.is('android')) {
        console.log('Media plugin may not support content:// URIs directly');
        
        // For content URIs, try HTML5 Audio first as it has better support
        try {
          await this.playWithHtml5Audio(uri);
          return;
        } catch (htmlError) {
          console.warn('HTML5 Audio failed for content URI:', htmlError);
          // Fall through to try Media plugin
        }
      }
      
      this.mediaObject = this.media.create(uri);
      
      // Set up media status callback with better error handling
      this.mediaObject.onStatusUpdate.subscribe(status => {
        console.log('Media status update:', status);
        this.mediaStatus = status;
        
        // Media.MEDIA_NONE = 0
        // Media.MEDIA_STARTING = 1 
        // Media.MEDIA_RUNNING = 2
        // Media.MEDIA_PAUSED = 3
        // Media.MEDIA_STOPPED = 4
        
        if (status === 0) { // MEDIA_NONE - could indicate an error
          console.warn('Media status returned to NONE - possible playback issue');
        }
      });
      
      this.mediaObject.onSuccess.subscribe(() => {
        console.log('Media playback successful');
      });
      
      this.mediaObject.onError.subscribe(error => {
        console.error('Media error:', error);
        // We'll let the catch block handle fallbacks
        this.mediaObject?.release();
        this.mediaObject = null;
      });
      
      console.log('Starting Media playback');
      this.mediaObject.play();
    } catch (mediaError) {
      console.error('Failed to play with Media API:', mediaError);
      
      // Handle the error based on URI type
      if (uri.startsWith('content://')) {
        try {
          console.log('Trying system player for content URI');
          const mimeType = this.fileHandler.getMimeType(uri);
          await this.fileOpener.open(uri, mimeType);
          console.log('Opened with system audio player');
          this.usingExternalPlayer = true;
          return;
        } catch (error: any) {
          console.error('System player failed:', error);
          // Last resort: try HTML5 Audio if we haven't already
          if (!uri.startsWith('content://')) {
            await this.playWithHtml5Audio(uri);
          } else {
            throw new Error('Unable to play content URI: ' + error?.message || 'Unknown error');
          }
          return;
        }
      }
      
      // For non-content URIs, try the usual fallbacks
      try {
        await this.fileOpener.open(uri, 'audio/mpeg');
        console.log('Opened with system audio player');
        this.usingExternalPlayer = true;
      } catch (error: any) {
        console.error('Failed to open with system player:', error);
        // Last resort: try HTML5 Audio
        await this.playWithHtml5Audio(uri);
      }
    }
  }

  /**
   * Pause audio playback
   */
  pause(): void {
    if (this.usingExternalPlayer) {
      // Can't control external player
      return;
    }
    
    if (this.audioPlayer) {
      this.audioPlayer.pause();
    }
    
    if (this.mediaObject) {
      this.mediaObject.pause();
    }
  }

  /**
   * Resume audio playback
   */
  resume(): void {
    if (this.usingExternalPlayer) {
      // Can't control external player
      return;
    }
    
    if (this.audioPlayer) {
      this.audioPlayer.play().catch(error => {
        console.error('Error resuming HTML5 Audio:', error);
      });
    }
    
    if (this.mediaObject) {
      this.mediaObject.play();
    }
  }

  /**
   * Stop audio playback
   */
  stop(): void {
    if (this.usingExternalPlayer) {
      // Can't control external player
      return;
    }
    
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer.currentTime = 0;
    }
    
    if (this.mediaObject) {
      this.mediaObject.stop();
    }
  }

  /**
   * Release resources
   */
  release(): void {
    this.usingExternalPlayer = false;
    
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer.src = '';
      this.audioPlayer = null;
    }
    
    if (this.mediaObject) {
      this.mediaObject.stop();
      this.mediaObject.release();
      this.mediaObject = null;
    }
  }

  /**
   * Check if audio is currently playing
   */
  isPlaying(): boolean {
    if (this.usingExternalPlayer) {
      return true; // Assume it's playing if using external player
    }
    
    if (this.audioPlayer) {
      return !this.audioPlayer.paused;
    }
    
    if (this.mediaObject) {
      // Media.MEDIA_RUNNING = 2
      return this.mediaStatus === 2;
    }
    
    return false;
  }
}
