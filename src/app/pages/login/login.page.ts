import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
  IonCardContent, IonItem, IonInput, IonButton, IonSpinner, IonText, IonIcon,
  IonCheckbox,
} from '@ionic/angular/standalone';
import { TelegramService } from '../../services/telegram.service';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle,
    IonCardContent, IonItem, IonInput, IonButton, IonSpinner, IonText, IonIcon,
    IonCheckbox,
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
                @case ('credentials') { Enter your phone number to connect }
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
                      label="Phone Number"
                      labelPlacement="stacked"
                      type="tel"
                      formControlName="phone"
                      placeholder="+1234567890"
                    ></ion-input>
                  </ion-item>

                  <!-- Advanced: Bring your own app -->
                  <div class="advanced-toggle" (click)="showAdvanced.set(!showAdvanced())">
                    <ion-icon [name]="showAdvanced() ? 'chevron-up-outline' : 'settings-outline'"></ion-icon>
                    <span>{{ showAdvanced() ? 'Hide advanced options' : 'Advanced options' }}</span>
                  </div>

                  @if (showAdvanced()) {
                    <div class="advanced-section">
                      <ion-item lines="none">
                        <ion-checkbox
                          [checked]="useOwnApp()"
                          (ionChange)="onUseOwnAppChange($event)"
                          labelPlacement="end"
                        >
                          Bring your own Telegram App
                        </ion-checkbox>
                      </ion-item>

                      @if (useOwnApp()) {
                        <ion-text color="medium">
                          <p class="hint">
                            Go to <a href="https://my.telegram.org" target="_blank" rel="noopener">my.telegram.org</a>,
                            create an app, and paste your credentials below.
                          </p>
                        </ion-text>
                        <ion-item>
                          <ion-input
                            label="API ID"
                            labelPlacement="stacked"
                            type="number"
                            formControlName="apiId"
                            placeholder="Your API ID"
                          ></ion-input>
                        </ion-item>
                        <ion-item>
                          <ion-input
                            label="API Hash"
                            labelPlacement="stacked"
                            type="text"
                            formControlName="apiHash"
                            placeholder="Your API Hash"
                          ></ion-input>
                        </ion-item>
                      }
                    </div>
                  }

                  <ion-button
                    expand="block"
                    type="button"
                    (click)="onConnect()"
                    [disabled]="!canConnect() || tg.loading()"
                    class="ion-margin-top"
                  >
                    @if (tg.loading()) {
                      <ion-spinner name="crescent" slot="start"></ion-spinner>
                    }
                    Connect
                  </ion-button>
                </div>
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
    .advanced-toggle {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 16px;
      padding: 8px 4px;
      cursor: pointer;
      color: var(--ion-color-medium);
      font-size: 0.9em;
      user-select: none;
    }
    .advanced-toggle:hover {
      color: var(--ion-color-primary);
    }
    .advanced-section {
      margin-top: 8px;
      padding: 8px 0;
      border-top: 1px solid var(--ion-color-light);
    }
  `],
})
export class LoginPage implements OnInit {
  protected readonly tg = inject(TelegramService);
  private readonly router = inject(Router);
  protected readonly restoring = signal(false);
  protected readonly showAdvanced = signal(false);
  protected readonly useOwnApp = signal(false);

  protected readonly credentialsForm = new FormGroup({
    apiId: new FormControl(''),
    apiHash: new FormControl(''),
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

    const savedApiId = localStorage.getItem('tg_api_id');
    const savedApiHash = localStorage.getItem('tg_api_hash');
    if (savedApiId && savedApiHash) {
      this.useOwnApp.set(true);
      this.showAdvanced.set(true);
      this.credentialsForm.patchValue({ apiId: savedApiId, apiHash: savedApiHash });
    } else if (!this.tg.hasDefaultCredentials) {
      // No built-in credentials (placeholders or empty) — require user to provide their own
      this.useOwnApp.set(true);
      this.showAdvanced.set(true);
    }
  }

  protected canConnect(): boolean {
    const phone = this.credentialsForm.value.phone;
    if (!phone) return false;
    if (this.useOwnApp()) {
      const { apiId, apiHash } = this.credentialsForm.value;
      return !!apiId && !!apiHash;
    }
    return this.tg.hasDefaultCredentials;
  }

  protected onUseOwnAppChange(event: CustomEvent): void {
    this.useOwnApp.set(event.detail.checked);
  }

  protected onConnect(): void {
    const phone = this.credentialsForm.value.phone;
    if (!phone) return;

    let apiId: number;
    let apiHash: string;

    if (this.useOwnApp()) {
      const { apiId: customId, apiHash: customHash } = this.credentialsForm.value;
      if (!customId || !customHash) return;
      apiId = parseInt(customId, 10);
      apiHash = customHash;
    } else {
      apiId = parseInt(this.tg.defaultApiId, 10);
      apiHash = this.tg.defaultApiHash;
    }

    this.tg.startAuth(apiId, apiHash, phone, this.useOwnApp());
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
