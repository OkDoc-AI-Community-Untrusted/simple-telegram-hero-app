import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, inject, signal, effect, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonButtons, IonTitle, IonContent,
  IonFooter, IonItem, IonInput, IonButton, IonSpinner, IonIcon,
  IonBackButton,
} from '@ionic/angular/standalone';
import { TelegramService } from '../../services/telegram.service';

@Component({
  selector: 'app-chat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IonHeader, IonToolbar, IonButtons, IonTitle, IonContent,
    IonFooter, IonItem, IonInput, IonButton, IonSpinner, IonIcon,
    IonBackButton,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/contacts"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ tg.currentPeerName() }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="refresh()" [disabled]="loadingMessages()" aria-label="Refresh messages">
            @if (loadingMessages()) {
              <ion-spinner name="crescent" slot="icon-only"></ion-spinner>
            } @else {
              <ion-icon slot="icon-only" name="refresh-outline"></ion-icon>
            }
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content #chatContent>
      @if (loadingMessages()) {
        <div class="loading-center">
          <ion-spinner name="crescent"></ion-spinner>
        </div>
      }

      <div class="messages-container">
        @for (msg of tg.messages(); track msg.id) {
          <div class="message-bubble" [class.outgoing]="msg.out" [class.incoming]="!msg.out">
            <div class="message-text">{{ msg.text }}</div>
            <div class="message-time">{{ formatTime(msg.date) }}</div>
          </div>
        }

        @if (tg.messages().length === 0 && !loadingMessages()) {
          <div class="empty-chat">
            <ion-icon name="chatbubbles-outline"></ion-icon>
            <p>No messages yet. Start the conversation!</p>
          </div>
        }
      </div>
    </ion-content>

    <ion-footer>
      <ion-toolbar>
        <ion-item lines="none">
          <ion-input
            [formControl]="messageInput"
            placeholder="Type a message..."
            (keyup.enter)="send()"
          ></ion-input>
          <ion-button
            slot="end"
            fill="clear"
            (click)="send()"
            [disabled]="!messageInput.value?.trim() || sending()"
          >
            @if (sending()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              <ion-icon name="send" slot="icon-only"></ion-icon>
            }
          </ion-button>
        </ion-item>
      </ion-toolbar>
    </ion-footer>
  `,
  styles: [`
    .loading-center {
      display: flex;
      justify-content: center;
      padding: 24px;
    }
    .messages-container {
      display: flex;
      flex-direction: column;
      padding: 12px;
      gap: 8px;
      min-height: 100%;
    }
    .message-bubble {
      max-width: 75%;
      padding: 10px 14px;
      border-radius: 16px;
      word-wrap: break-word;
    }
    .message-bubble.outgoing {
      align-self: flex-end;
      background: var(--ion-color-primary);
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    .message-bubble.incoming {
      align-self: flex-start;
      background: var(--ion-color-light);
      color: var(--ion-text-color);
      border-bottom-left-radius: 4px;
    }
    .message-text {
      font-size: 0.95em;
      line-height: 1.4;
    }
    .message-time {
      font-size: 0.72em;
      opacity: 0.7;
      text-align: right;
      margin-top: 4px;
    }
    .empty-chat {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex: 1;
      color: var(--ion-color-medium);
      padding: 48px 16px;
    }
    .empty-chat ion-icon {
      font-size: 64px;
      margin-bottom: 16px;
    }
    ion-footer ion-item {
      --padding-start: 8px;
      --inner-padding-end: 0;
    }
  `],
})
export class ChatPage implements OnInit, OnDestroy {
  protected readonly tg = inject(TelegramService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly content = viewChild<IonContent>('chatContent');

  protected readonly messageInput = new FormControl('');
  protected readonly loadingMessages = signal(true);
  protected readonly sending = signal(false);

  private peerId = '';

  constructor() {
    effect(() => {
      this.tg.messages();
      const contentEl = this.content();
      if (contentEl) {
        setTimeout(() => contentEl.scrollToBottom(300), 100);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    this.peerId = this.route.snapshot.paramMap.get('peerId') || '';
    if (!this.peerId) {
      this.router.navigate(['/contacts']);
      return;
    }

    this.loadingMessages.set(true);
    await this.tg.loadMessages(this.peerId);
    this.loadingMessages.set(false);
  }

  ngOnDestroy(): void {
    this.tg.currentPeerId.set('');
    this.tg.currentPeerName.set('');
  }

  protected async send(): Promise<void> {
    const text = this.messageInput.value?.trim();
    if (!text || !this.peerId) return;

    this.sending.set(true);
    await this.tg.sendMessage(this.peerId, text);
    this.messageInput.reset();
    this.sending.set(false);
  }

  protected async refresh(): Promise<void> {
    if (!this.peerId || this.loadingMessages()) return;
    this.loadingMessages.set(true);
    await this.tg.loadMessages(this.peerId);
    this.loadingMessages.set(false);
  }

  protected formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
