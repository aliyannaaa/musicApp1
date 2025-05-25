import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';
import { File } from '@awesome-cordova-plugins/file/ngx';
import { FileOpener } from '@awesome-cordova-plugins/file-opener/ngx';
import { FilePath } from '@ionic-native/file-path/ngx';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { PermissionService } from './permission.service';

/**
 * Result type for content URI resolution
 */
interface ContentUriResult {
  uri: string;
  isExternalPlayer: boolean;
  error?: string;
}

/**
 * Service to handle file operations and content URI resolution
 */
@Injectable({
  providedIn: 'root'
})
export class FileHandlerService {
  constructor(
    private platform: Platform,
    private file: File,
    private fileOpener: FileOpener,
    private filePath: FilePath,
    private permissionService: PermissionService
  ) {}

  /**
   * Attempts to handle a content:// URI for audio playback
   * This is specifically for handling Android's content URIs from file pickers
   */
  async resolveContentUri(uri: string): Promise<ContentUriResult> {
    // If it's not a content URI, just return it
    if (!uri.startsWith('content://')) {
      return { uri, isExternalPlayer: false };
    }

    console.log('Resolving content URI:', uri);

    // Make sure we have storage permission
    const hasPermission = await this.permissionService.hasStoragePermission();
    if (!hasPermission) {
      return {
        uri,
        isExternalPlayer: false,
        error: 'Storage permission denied'
      };
    }

    if (this.platform.is('android')) {
      return await this.handleAndroidContentUri(uri);
    }

    // For non-Android platforms, return the original URI
    return { uri, isExternalPlayer: false };
  }

  /**
   * Handle content URI resolution specifically for Android
   */
  private async handleAndroidContentUri(uri: string): Promise<ContentUriResult> {
    // First attempt: Use FilePath plugin to get the real path
    try {
      const resolvedPath = await this.filePath.resolveNativePath(uri);
      console.log('Resolved path using FilePath:', resolvedPath);
      
      // Verify the resolved path is accessible
      const isAccessible = await this.permissionService.verifyFileAccess(resolvedPath);
      if (isAccessible) {
        return { uri: resolvedPath, isExternalPlayer: false };
      }
    } catch (resolveError) {
      console.warn('Failed to resolve path with FilePath:', resolveError);
    }

    // Second attempt: Try the Capacitor Filesystem plugin
    try {
      // Read the content URI data
      const fileData = await Filesystem.readFile({
        path: uri,
        directory: undefined
      });

      // Create a temporary cache file
      const tempFilePath = `temp_audio_${new Date().getTime()}.mp3`;
      await Filesystem.writeFile({
        path: tempFilePath,
        data: fileData.data,
        directory: Directory.Cache
      });

      // Get the real path of the temporary file
      const tempFileResult = await Filesystem.getUri({
        path: tempFilePath,
        directory: Directory.Cache
      });

      console.log('Temporary file created at:', tempFileResult.uri);
      return { uri: tempFileResult.uri, isExternalPlayer: false };
    } catch (fsError) {
      console.warn('Failed to process with Capacitor Filesystem:', fsError);
    }

    // Last attempt: Try to open with system player
    try {
      const mimeType = this.getMimeType(uri);
      await this.fileOpener.open(uri, mimeType);
      console.log('Opened with system audio player');
      return { uri, isExternalPlayer: true };
    } catch (error) {
      console.error('All resolution methods failed:', error);
      return {
        uri,
        isExternalPlayer: false,
        error: 'Failed to resolve or open content URI'
      };
    }
  }

  /**
   * Returns a file's mime type based on its extension
   */
  getMimeType(path: string): string {
    if (!path) return 'audio/mpeg'; // Default

    const extension = path.split('.').pop()?.toLowerCase() || '';
    const mimeTypes: Record<string, string> = {
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'aac': 'audio/aac',
      'flac': 'audio/flac',
      'm4a': 'audio/mp4'
    };

    return mimeTypes[extension] || 'audio/mpeg';
  }

  /**
   * Clean up temporary files (should be called when app is closing or as needed)
   */
  async cleanupTempFiles(): Promise<void> {
    try {      const cacheContents = await Filesystem.readdir({
        path: '.',
        directory: Directory.Cache
      });

      const audioFiles = cacheContents.files
        .filter(f => f.name.startsWith('temp_audio_'))
        .map(f => f.name);
      
      await Promise.all(
        audioFiles.map(filename => 
          Filesystem.deleteFile({
            path: filename,
            directory: Directory.Cache
          })
        )
      );

      console.log('Temporary audio files cleaned up');
    } catch (error) {
      console.warn('Error cleaning up temp files:', error);
    }
  }
}
