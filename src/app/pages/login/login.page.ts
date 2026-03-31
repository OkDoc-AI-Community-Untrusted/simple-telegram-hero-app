import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonCardContent, IonItem, IonInput, IonButton, IonSpinner, IonText, IonIcon,
} from '@ionic/angular/standalone';
import { TelegramService } from '../../services/telegram.service';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
    IonCardContent, IonItem, IonInput, IonButton, IonSpinner, IonText, IonIcon,
  ],
  template: `
    <ion-content class="ion-padding">
      <div class="login-container">
        <ion-card>
          <ion-card-header>
            <ion-card-title>
              <ion-icon name="paper-plane-outline"></ion-icon>
              Telegram Login
            </ion-card-title>
            <ion-card-subtitle>
              @switch (tg.authStep()) {
                @case ('credentials') { Enter your Telegram API credentials }
                @case ('code') { Enter the verification code sent to your phone }
                @case ('password') { Enter your two-factor authentication password }
                @case ('loading') { Connecting... }
              }
            </ion-card-subtitle>
          </ion-card-header>

          <ion-card-content>
            @if (restoring()) {
              <div class="loading-center">
                <ion-spinner name="crescent"></ion-spinner>
                <p>Restoring session...</p>
              </div>
            } @else {
              @if (tg.authStep() === 'credentials') {
                <div [formGroup]="credentialsForm">
                  <ion-item>
                    <ion-input
                      label="API ID"
                      labelPlacement="stacked"
                      type="number"
                      formControlName="apiId"
                      placeholder="Enter your API ID from my.telegram.org"
                    ></ion-input>
                  </ion-item>
                  <ion-item>
                    <ion-input
                      label="API Hash"
                      labelPlacement="stacked"
                      type="text"
                      formControlName="apiHash"
                      placeholder="Enter your API Hash"
                    ></ion-input>
                  </ion-item>
                  <ion-item>
                    <ion-input
                      label="Phone Number"
                      labelPlacement="stacked"
                      type="tel"
                      formControlName="phone"
                      placeholder="+1234567890"
                    ></ion-input>
                  </ion-item>
                  <ion-button
                    expand="block"
                    type="button"
                    (click)="onConnect()"
                    [disabled]="credentialsForm.invalid || tg.loading()"
                    class="ion-margin-top"
                  >
                    @if (tg.loading()) {
                      <ion-spinner name="crescent" slot="start"></ion-spinner>
                    }
                    Connect
                  </ion-button>
                </div>

                <ion-text color="medium">
                  <p class="hint">
                    Get your API credentials from
                    <a href="https://my.telegram.org" target="_blank" rel="noopener">my.telegram.org</a>
                  </p>
                </ion-text>
              }

              @if (tg.authStep() === 'code') {
                <div [formGroup]="codeForm">
                  <ion-item>
                    <ion-input
                      label="Verification Code"
                      labelPlacement="stacked"
                      type="text"
                      formControlName="code"
                      placeholder="Enter the code you received"
                      inputmode="numeric"
                    ></ion-input>
                  </ion-item>
                  <ion-button
                    expand="block"
                    type="button"
                    (click)="onSubmitCode()"
                    [disabled]="codeForm.invalid || tg.loading()"
                    class="ion-margin-top"
                  >
                    @if (tg.loading()) {
                      <ion-spinner name="crescent" slot="start"></ion-spinner>
                    }
                    Verify Code
                  </ion-button>
                </div>
              }

              @if (tg.authStep() === 'password') {
                <div [formGroup]="passwordForm">
                  <ion-item>
                    <ion-input
                      label="2FA Password"
                      labelPlacement="stacked"
                      type="password"
                      formControlName="password"
                      placeholder="Enter your two-factor password"
                    ></ion-input>
                  </ion-item>
                  <ion-button
                    expand="block"
                    type="button"
                    (click)="onSubmitPassword()"
                    [disabled]="passwordForm.invalid || tg.loading()"
                    class="ion-margin-top"
                  >
                    @if (tg.loading()) {
                      <ion-spinner name="crescent" slot="start"></ion-spinner>
                    }
                    Submit Password
                  </ion-button>
                </div>
              }

              @if (tg.authError()) {
                <ion-text color="danger">
                  <p class="error-text">{{ tg.authError() }}</p>
                </ion-text>
              }
            }
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100%;
    }
    ion-card {
      max-width: 450px;
      width: 100%;
    }
    ion-card-title ion-icon {
      vertical-align: middle;
      margin-right: 8px;
    }
    .hint {
      font-size: 0.85em;
      text-align: center;
      margin-top: 16px;
    }
    .error-text {
      text-align: center;
      margin-top: 12px;
    }
    .loading-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px;
    }
  `],
})
export class LoginPage implements OnInit {
  protected readonly tg = inject(TelegramService);
  private readonly router = inject(Router);
  protected readonly restoring = signal(false);

  protected readonly credentialsForm = new FormGroup({
    apiId: new FormControl('', Validators.required),
    apiHash: new FormControl('', Validators.required),
    phone: new FormControl('', Validators.required),
  });

  protected readonly codeForm = new FormGroup({
    code: new FormControl('', Validators.required),
  });

  protected readonly passwordForm = new FormGroup({
    password: new FormControl('', Validators.required),
  });

  async ngOnInit(): Promise<void> {
    if (this.tg.isAuthenticated()) {
      this.router.navigate(['/contacts']);
      return;
    }

    this.restoring.set(true);
    const restored = await this.tg.tryRestoreSession();
    this.restoring.set(false);

    if (restored) {
      this.router.navigate(['/contacts']);
      return;
    }

    const apiId = localStorage.getItem('tg_api_id');
    const apiHash = localStorage.getItem('tg_api_hash');
    if (apiId) this.credentialsForm.patchValue({ apiId });
    if (apiHash) this.credentialsForm.patchValue({ apiHash });
  }

  protected onConnect(): void {
    if (this.credentialsForm.invalid) return;
    const { apiId, apiHash, phone } = this.credentialsForm.value;
    this.tg.startAuth(parseInt(apiId!, 10), apiHash!, phone!);
  }

  protected onSubmitCode(): void {
    if (this.codeForm.invalid) return;
    this.tg.submitCode(this.codeForm.value.code!);
  }

  protected onSubmitPassword(): void {
    if (this.passwordForm.invalid) return;
    this.tg.submitPassword(this.passwordForm.value.password!);
  }
}
