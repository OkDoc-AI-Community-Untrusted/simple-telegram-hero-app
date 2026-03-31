import { Component, ChangeDetectionStrategy, OnInit, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonContent, IonSpinner, IonList, IonItem, IonAvatar, IonLabel,
  IonSearchbar,
} from '@ionic/angular/standalone';
import { TelegramService, TgContact } from '../../services/telegram.service';

@Component({
  selector: 'app-contacts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
    IonContent, IonSpinner, IonList, IonItem, IonAvatar, IonLabel,
    IonSearchbar,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Contacts</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="refresh()">
            <ion-icon slot="icon-only" name="refresh-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="logout()">
            <ion-icon slot="icon-only" name="log-out-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-searchbar
        placeholder="Search contacts..."
        [debounce]="250"
        (ionInput)="onSearch($event)"
      ></ion-searchbar>

      @if (tg.loading()) {
        <div class="loading-center">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Loading contacts...</p>
        </div>
      }

      @if (tg.contacts().length === 0 && !tg.loading()) {
        <div class="empty-state">
          <ion-icon name="people-outline"></ion-icon>
          <p>No contacts found</p>
          <ion-button fill="outline" (click)="refresh()">Refresh</ion-button>
        </div>
      }

      <ion-list>
        @for (contact of filteredContacts(); track contact.id) {
          <ion-item button (click)="openChat(contact.id)">
            <ion-avatar slot="start">
              <div class="avatar-placeholder">{{ contact.name.charAt(0).toUpperCase() }}</div>
            </ion-avatar>
            <ion-label>
              <h2>{{ contact.name }}</h2>
              @if (contact.phone) {
                <p>{{ contact.phone }}</p>
              }
              @if (contact.username) {
                <p class="username">{{ '@' + contact.username }}</p>
              }
            </ion-label>
            <ion-icon name="chevron-forward-outline" slot="end" color="medium"></ion-icon>
          </ion-item>
        }
      </ion-list>
    </ion-content>
  `,
  styles: [`
    .loading-center {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 16px;
      color: var(--ion-color-medium);
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 16px;
      color: var(--ion-color-medium);
    }
    .empty-state ion-icon {
      font-size: 64px;
      margin-bottom: 16px;
    }
    .avatar-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--ion-color-primary);
      color: #fff;
      font-size: 1.2em;
      font-weight: 600;
      border-radius: 50%;
    }
    .username {
      color: var(--ion-color-primary);
    }
  `],
})
export class ContactsPage implements OnInit {
  protected readonly tg = inject(TelegramService);
  private readonly router = inject(Router);
  protected readonly searchResults = signal<TgContact[] | null>(null);
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  protected readonly filteredContacts = computed(() => {
    return this.searchResults() ?? this.tg.contacts();
  });

  async ngOnInit(): Promise<void> {
    if (this.tg.contacts().length === 0) {
      this.tg.loading.set(true);
      await this.tg.loadContacts();
      this.tg.loading.set(false);
    }
  }

  protected openChat(peerId: string): void {
    this.router.navigate(['/chat', peerId]);
  }

  protected async refresh(): Promise<void> {
    this.tg.loading.set(true);
    await this.tg.loadContacts();
    this.tg.loading.set(false);
  }

  protected onSearch(event: CustomEvent): void {
    const query = (event.detail.value ?? '').trim();
    if (this.searchTimeout) clearTimeout(this.searchTimeout);

    if (!query) {
      this.searchResults.set(null);
      return;
    }

    this.searchTimeout = setTimeout(async () => {
      const results = await this.tg.searchContacts(query);
      this.searchResults.set(results);
    }, 300);
  }

  protected logout(): void {
    this.tg.disconnect();
  }
}
