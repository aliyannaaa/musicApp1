import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { IonicModule } from '@ionic/angular';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { Media } from '@awesome-cordova-plugins/media/ngx';
import { FileChooser } from '@awesome-cordova-plugins/file-chooser/ngx';
import { HttpClientJsonpModule } from '@angular/common/http';


@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule, // ✅ Ensure this is imported
    IonicModule.forRoot(),
    AppRoutingModule,
    HttpClientJsonpModule,
  ],
  providers: [
    Media,
    FileChooser
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}