import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { Media } from '@awesome-cordova-plugins/media/ngx';
import { FileChooser } from '@awesome-cordova-plugins/file-chooser/ngx';
import { HttpClientJsonpModule } from '@angular/common/http';
import { AndroidPermissions } from '@awesome-cordova-plugins/android-permissions/ngx';
import { File } from '@awesome-cordova-plugins/file/ngx';
import { FilePath } from '@ionic-native/file-path/ngx';
import { FileOpener } from '@awesome-cordova-plugins/file-opener/ngx';
import { DocumentViewer } from '@ionic-native/document-viewer/ngx';
import { PermissionService } from './services/permission.service';
import { AudioPlayerService } from './services/audio-player.service';
import { FileHandlerService } from './services/file-handler.service';


@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule, // ✅ Ensure this is imported
    IonicModule.forRoot(),
    AppRoutingModule,
    HttpClientJsonpModule,
  ],  providers: [
    Media,
    FileChooser,
    AndroidPermissions,
    File,
    FilePath,
    FileOpener,
    DocumentViewer,
    PermissionService,
    AudioPlayerService,
    FileHandlerService
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}