import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { OkDocService } from './services/okdoc.service';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonApp, IonRouterOutlet],
  template: `
    <ion-app>
      <ion-router-outlet />
    </ion-app>
  `,
})
export class App implements OnInit {
  private readonly okdoc = inject(OkDocService);

  ngOnInit(): void {
    this.okdoc.initialize();
  }
}
