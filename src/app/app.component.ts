import { Component } from '@angular/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { initialize } from '@ionic/core';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor() {
    this.initializeApp();
  }

  async initializeApp() {
    // Hide the splash screen after a delay
    await SplashScreen.hide({ fadeOutDuration: 500 });
  }
}
