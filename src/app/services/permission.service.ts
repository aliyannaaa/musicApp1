import { Injectable } from '@angular/core';
import { Filesystem } from '@capacitor/filesystem';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {

  constructor() { }

  async requestStoragePermission(): Promise<boolean> {
    try {
      const status = await Filesystem.requestPermissions();
      return status.publicStorage === 'granted';
    } catch (error) {
      console.error('Permission error:', error);
      return false;
    }
  }
}