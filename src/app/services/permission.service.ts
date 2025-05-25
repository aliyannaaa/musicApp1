import { Injectable } from '@angular/core';
import { Filesystem } from '@capacitor/filesystem';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { Platform } from '@ionic/angular';
import { File } from '@awesome-cordova-plugins/file/ngx';

/**
 * Permission types supported by the app
 */
export enum PermissionType {
  STORAGE = 'storage',
  AUDIO = 'audio'
}

/**
 * Service to handle all permission-related functionality
 */
@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private permissionCache: { [key in PermissionType]?: boolean } = {};
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps: { [key in PermissionType]?: number } = {};

  constructor(
    private androidPermissions: AndroidPermissions,
    private platform: Platform,
    private file: File
  ) {}

  /**
   * Request storage permissions appropriate for the current platform and Android version
   */
  async requestStoragePermission(): Promise<boolean> {
    try {
      let hasAllPermissions = true;

      // Request Capacitor filesystem permissions
      try {
        const status = await Filesystem.requestPermissions();
        console.log('Filesystem permissions status:', status);
      } catch (error) {
        console.warn('Error requesting filesystem permissions:', error);
        hasAllPermissions = false;
      }

      // Handle Android-specific permissions
      if (this.platform.is('android')) {
        const sdkVersion = await this.getAndroidSDKVersion();
        hasAllPermissions = await this.handleAndroidPermissions(sdkVersion);
      }

      // Update cache
      this.updatePermissionCache(PermissionType.STORAGE, hasAllPermissions);
      
      return hasAllPermissions;
    } catch (error) {
      console.error('Permission error:', error);
      this.updatePermissionCache(PermissionType.STORAGE, false);
      return false;
    }
  }

  /**
   * Check if we have storage permission without requesting it
   */
  async hasStoragePermission(): Promise<boolean> {
    // Check cache first
    const cachedResult = this.getCachedPermission(PermissionType.STORAGE);
    if (cachedResult !== undefined) {
      return cachedResult;
    }

    try {
      if (this.platform.is('android')) {
        const sdkVersion = await this.getAndroidSDKVersion();
        const permission = sdkVersion >= 33
          ? this.androidPermissions.PERMISSION.READ_MEDIA_AUDIO
          : this.androidPermissions.PERMISSION.READ_EXTERNAL_STORAGE;

        const result = await this.checkPermission(permission);
        this.updatePermissionCache(PermissionType.STORAGE, result);
        return result;
      }

      // For non-Android platforms, assume we have permission
      this.updatePermissionCache(PermissionType.STORAGE, true);
      return true;
    } catch (error) {
      console.error('Error checking storage permission:', error);
      this.updatePermissionCache(PermissionType.STORAGE, false);
      return false;
    }
  }

  /**
   * Verify if a file is accessible with current permissions
   */
  async verifyFileAccess(path: string): Promise<boolean> {
    try {
      await this.file.resolveLocalFilesystemUrl(path);
      return true;
    } catch (error) {
      console.warn('File access verification failed:', error);
      return false;
    }
  }

  /**
   * Clear the permission cache
   */
  clearPermissionCache(): void {
    this.permissionCache = {};
    this.cacheTimestamps = {};
  }

  /**
   * Handle Android-specific permissions based on SDK version
   */
  private async handleAndroidPermissions(sdkVersion: number): Promise<boolean> {
    if (sdkVersion >= 33) {
      console.log('Using Android 13+ permissions');
      return await this.handleModernAndroidPermissions();
    } else {
      console.log('Using legacy storage permissions');
      return await this.handleLegacyAndroidPermissions();
    }
  }

  /**
   * Handle permissions for Android 13+ (SDK 33+)
   */
  private async handleModernAndroidPermissions(): Promise<boolean> {
    const permissions = [
      this.androidPermissions.PERMISSION.READ_MEDIA_AUDIO
    ];

    const results = await Promise.all(
      permissions.map(permission => this.requestAndroidPermission(permission))
    );

    return results.every(result => result === true);
  }

  /**
   * Handle permissions for Android < 13
   */
  private async handleLegacyAndroidPermissions(): Promise<boolean> {
    return await this.requestAndroidPermission(
      this.androidPermissions.PERMISSION.READ_EXTERNAL_STORAGE
    );
  }

  /**
   * Request a specific Android permission
   */
  private async requestAndroidPermission(permission: string): Promise<boolean> {
    try {
      const checkResult = await this.checkPermission(permission);
      if (checkResult) return true;

      const result = await this.androidPermissions.requestPermission(permission);
      console.log(`Permission ${permission} result:`, result);
      return result.hasPermission;
    } catch (error) {
      console.warn(`Error requesting permission ${permission}:`, error);
      return false;
    }
  }

  /**
   * Check if a specific permission is granted
   */
  private async checkPermission(permission: string): Promise<boolean> {
    try {
      const result = await this.androidPermissions.checkPermission(permission);
      return result.hasPermission;
    } catch (error) {
      console.error(`Error checking permission ${permission}:`, error);
      return false;
    }
  }

  /**
   * Get Android SDK version
   */
  private async getAndroidSDKVersion(): Promise<number> {
    if (!this.platform.is('android')) return 0;

    try {
      const userAgent = navigator.userAgent || '';
      const match = userAgent.match(/Android\s([0-9\.]*)/);
      
      if (match?.[1]) {
        const majorVersion = parseInt(match[1].split('.')[0], 10);
        const versionToSDK: Record<number, number> = {
          5: 21, 6: 23, 7: 24, 8: 26, 9: 28,
          10: 29, 11: 30, 12: 31, 13: 33, 14: 34
        };
        return versionToSDK[majorVersion] || 29;
      }
    } catch (error) {
      console.error('Error getting Android SDK version:', error);
    }
    
    return 29; // Default to Android 10 (SDK 29)
  }

  /**
   * Get a cached permission value if it's still valid
   */
  private getCachedPermission(type: PermissionType): boolean | undefined {
    const timestamp = this.cacheTimestamps[type];
    if (timestamp && Date.now() - timestamp < this.CACHE_DURATION) {
      return this.permissionCache[type];
    }
    return undefined;
  }

  /**
   * Update the permission cache with a new value
   */
  private updatePermissionCache(type: PermissionType, value: boolean): void {
    this.permissionCache[type] = value;
    this.cacheTimestamps[type] = Date.now();
  }
}