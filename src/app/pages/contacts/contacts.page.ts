import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonContent, IonSpinner, IonList, IonItem, IonAvatar, IonLabel,
  IonSearchbar, IonSegment, IonSegmentButton, IonBadge, IonNote,
} from '@ionic/angular/standalone';
import { TelegramService, TgContact, TgDialog } from '../../services/telegram.service';
import { OkDocService } from '../../services/okdoc.service';

@Component({
  selector: 'app-contacts',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
    IonContent, IonSpinner, IonList, IonItem, IonAvatar, IonLabel,
    IonSearchbar, IonSegment, IonSegmentButton, IonBadge, IonNote,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Telegram</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="refresh()">
            <ion-icon slot="icon-only" name="refresh-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="logout()">
            <ion-icon slot="icon-only" name="log-out-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment [value]="activeTab()" (ionChange)="onTabChange($event)">
          <ion-segment-button value="chats">Chats</ion-segment-button>
          <ion-segment-button value="contacts">Contacts</ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (activeTab() === 'chats') {
        <ion-searchbar
          placeholder="Search chats..."
          [debounce]="250"
          (ionInput)="onChatSearch($event)"
        ></ion-searchbar>

        @if (tg.loading()) {
          <div class="loading-center">
            <ion-spinner name="crescent"></ion-spinner>
            <p>Loading chats...</p>
          </div>
        }

        @if (filteredDialogs().length === 0 && !tg.loading()) {
          <div class="empty-state">
            <ion-icon name="chatbubbles-outline"></ion-icon>
            <p>No chats found</p>
            <ion-button fill="outline" (click)="refresh()">Refresh</ion-button>
          </div>
        }

        <ion-list>
          @for (dialog of filteredDialogs(); track dialog.id) {
            <ion-item button (click)="openChat(dialog.id)">
              <ion-avatar slot="start">
                <div class="avatar-placeholder" [class.bot]="dialog.type === 'bot'" [class.group]="dialog.type === 'group'" [class.channel]="dialog.type === 'channel'">
                  @if (dialog.type === 'group') {
                    <ion-icon name="people-outline"></ion-icon>
                  } @else if (dialog.type === 'channel') {
                    <ion-icon name="megaphone-outline"></ion-icon>
                  } @else if (dialog.type === 'bot') {
                    <ion-icon name="hardware-chip-outline"></ion-icon>
                  } @else {
                    {{ dialog.name.charAt(0).toUpperCase() }}
                  }
                </div>
              </ion-avatar>
              <ion-label>
                <h2>{{ dialog.name }}</h2>
                @if (dialog.lastMessage) {
                  <p class="last-message">{{ dialog.lastMessage }}</p>
                }
              </ion-label>
              <div slot="end" class="chat-meta">
                <ion-note class="message-time">{{ formatDate(dialog.lastMessageDate) }}</ion-note>
                @if (dialog.unreadCount > 0) {
                  <ion-badge color="primary">{{ dialog.unreadCount }}</ion-badge>
                }
              </div>
            </ion-item>
          }
        </ion-list>
      }

      @if (activeTab() === 'contacts') {
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
      }
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
    .avatar-placeholder.group {
      background: var(--ion-color-success);
    }
    .avatar-placeholder.channel {
      background: var(--ion-color-warning);
    }
    .avatar-placeholder.bot {
      background: var(--ion-color-tertiary);
    }
    .avatar-placeholder ion-icon {
      font-size: 1.3em;
    }
    .username {
      color: var(--ion-color-primary);
    }
    .last-message {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    }
    .chat-meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
      min-width: 50px;
    }
    .message-time {
      font-size: 0.75em;
    }
    ion-badge {
      border-radius: 10px;
      min-width: 20px;
      text-align: center;
    }
  `],
})
export class ContactsPage implements OnInit, OnDestroy {
  protected readonly tg = inject(TelegramService);
  private readonly okdoc = inject(OkDocService);
  private readonly router = inject(Router);

  readonly activeTab = signal<'chats' | 'contacts'>('chats');

  protected readonly searchResults = signal<TgContact[] | null>(null);
  protected readonly chatSearchResults = signal<TgDialog[] | null>(null);
  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  protected readonly filteredContacts = computed(() => {
    return this.searchResults() ?? this.tg.contacts();
  });

  protected readonly filteredDialogs = computed(() => {
    return this.chatSearchResults() ?? this.tg.dialogs();
  });

  async ngOnInit(): Promise<void> {
    this.okdoc.onSwitchTab = (tab) => this.activeTab.set(tab);

    this.tg.loading.set(true);
    await Promise.all([
      this.tg.loadDialogs(),
      this.tg.contacts().length === 0 ? this.tg.loadContacts() : Promise.resolve(),
    ]);
    this.tg.loading.set(false);
  }

  ngOnDestroy(): void {
    this.okdoc.onSwitchTab = undefined;
  }

  protected openChat(peerId: string): void {
    this.router.navigate(['/chat', peerId]);
  }

  protected async refresh(): Promise<void> {
    this.tg.loading.set(true);
    if (this.activeTab() === 'chats') {
      await this.tg.loadDialogs();
    } else {
      await this.tg.loadContacts();
    }
    this.tg.loading.set(false);
  }

  protected onTabChange(event: CustomEvent): void {
    this.activeTab.set(event.detail.value);
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

  protected onChatSearch(event: CustomEvent): void {
    const query = (event.detail.value ?? '').trim();
    if (this.searchTimeout) clearTimeout(this.searchTimeout);

    if (!query) {
      this.chatSearchResults.set(null);
      return;
    }

    this.searchTimeout = setTimeout(async () => {
      const results = await this.tg.searchDialogs(query);
      this.chatSearchResults.set(results);
    }, 300);
  }

  protected formatDate(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const oneDay = 86400000;

    if (diff < oneDay && now.getDate() === date.getDate()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 7 * oneDay) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  protected logout(): void {
    this.tg.disconnect();
  }
}
