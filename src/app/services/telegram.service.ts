import { Injectable, inject, signal, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage, NewMessageEvent } from 'telegram/events';
import bigInt from 'big-integer';

export interface TgContact {
  id: string;
  accessHash: string;
  name: string;
  phone: string;
  username: string;
}

export interface TgMessage {
  id: number;
  text: string;
  date: Date;
  out: boolean;
  senderName: string;
}

const STORAGE_KEYS = {
  API_ID: 'tg_api_id',
  API_HASH: 'tg_api_hash',
  SESSION: 'tg_session',
  CONTACTS: 'tg_contacts',
} as const;

@Injectable({ providedIn: 'root' })
export class TelegramService {
  private ngZone = inject(NgZone);
  private router = inject(Router);
  private client: TelegramClient | null = null;

  readonly isAuthenticated = signal(false);
  readonly authStep = signal<'credentials' | 'code' | 'password' | 'loading'>('credentials');
  readonly authError = signal('');
  readonly loading = signal(false);

  readonly contacts = signal<TgContact[]>([]);
  readonly messages = signal<TgMessage[]>([]);
  readonly currentPeerId = signal('');
  readonly currentPeerName = signal('');

  private codeResolver?: (code: string) => void;
  private passwordResolver?: (pwd: string) => void;

  onNewMessage?: (senderName: string, text: string) => void;
  onMessageSent?: (recipientName: string, text: string) => void;

  async tryRestoreSession(): Promise<boolean> {
    const apiId = localStorage.getItem(STORAGE_KEYS.API_ID);
    const apiHash = localStorage.getItem(STORAGE_KEYS.API_HASH);
    const sessionStr = localStorage.getItem(STORAGE_KEYS.SESSION);

    if (!apiId || !apiHash || !sessionStr) return false;

    try {
      return await this.initClient(parseInt(apiId, 10), apiHash, sessionStr);
    } catch {
      return false;
    }
  }

  private async initClient(apiId: number, apiHash: string, sessionStr = ''): Promise<boolean> {
    const session = new StringSession(sessionStr);
    this.client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
      useWSS: true,
    });

    await this.client.connect();

    if (await this.client.isUserAuthorized()) {
      this.ngZone.run(() => this.isAuthenticated.set(true));
      this.saveSession();
      this.setupEventHandlers();
      return true;
    }
    return false;
  }

  async startAuth(apiId: number, apiHash: string, phoneNumber: string): Promise<void> {
    this.loading.set(true);
    this.authError.set('');

    try {
      localStorage.setItem(STORAGE_KEYS.API_ID, apiId.toString());
      localStorage.setItem(STORAGE_KEYS.API_HASH, apiHash);

      if (!this.client) {
        const isAuthed = await this.initClient(apiId, apiHash);
        if (isAuthed) {
          this.ngZone.run(() => this.loading.set(false));
          this.router.navigate(['/contacts']);
          return;
        }
      }

      await this.client!.start({
        phoneNumber: async () => phoneNumber,
        phoneCode: async () => {
          this.ngZone.run(() => {
            this.authStep.set('code');
            this.loading.set(false);
          });
          return new Promise<string>(resolve => {
            this.codeResolver = resolve;
          });
        },
        password: async () => {
          this.ngZone.run(() => {
            this.authStep.set('password');
            this.loading.set(false);
          });
          return new Promise<string>(resolve => {
            this.passwordResolver = resolve;
          });
        },
        onError: async (err) => {
          this.ngZone.run(() => {
            this.authError.set(err.message);
            this.loading.set(false);
          });
          return true;
        },
      });

      this.ngZone.run(() => {
        this.isAuthenticated.set(true);
        this.loading.set(false);
      });
      this.saveSession();
      this.setupEventHandlers();
      this.router.navigate(['/contacts']);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      this.ngZone.run(() => {
        this.authError.set(message);
        this.loading.set(false);
      });
    }
  }

  submitCode(code: string): void {
    this.loading.set(true);
    this.authError.set('');
    this.codeResolver?.(code);
  }

  submitPassword(password: string): void {
    this.loading.set(true);
    this.authError.set('');
    this.passwordResolver?.(password);
  }

  private saveSession(): void {
    if (this.client) {
      const sessionStr = this.client.session.save() as unknown as string;
      localStorage.setItem(STORAGE_KEYS.SESSION, sessionStr);
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.addEventHandler((event: NewMessageEvent) => {
      const message = event.message;
      if (message.out || !message.text) return;

      const peerId = message.peerId;
      let senderId = '';
      if (peerId instanceof Api.PeerUser) {
        senderId = peerId.userId.toString();
      }

      const contact = this.contacts().find(c => c.id === senderId);
      const senderName = contact?.name || 'Unknown';

      this.ngZone.run(() => {
        if (senderId === this.currentPeerId()) {
          this.messages.update(msgs => [...msgs, {
            id: message.id,
            text: message.text || '',
            date: new Date(message.date * 1000),
            out: false,
            senderName,
          }]);
        }
      });

      this.onNewMessage?.(senderName, message.text || '');
    }, new NewMessage({}));
  }

  async loadContacts(): Promise<TgContact[]> {
    if (!this.client) {
      return this.loadCachedContacts();
    }

    try {
      const result = await this.client.invoke(
        new Api.contacts.GetContacts({ hash: bigInt(0) })
      );

      if (result instanceof Api.contacts.Contacts) {
        const contacts: TgContact[] = result.users
          .filter((u): u is Api.User => u instanceof Api.User && !u.bot && !u.deleted)
          .map(u => ({
            id: u.id.toString(),
            accessHash: (u.accessHash ?? bigInt(0)).toString(),
            name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || 'Unknown',
            phone: u.phone || '',
            username: u.username || '',
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        this.ngZone.run(() => this.contacts.set(contacts));
        localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
        return contacts;
      }

      return this.loadCachedContacts();
    } catch (err) {
      console.error('Failed to load contacts:', err);
      return this.loadCachedContacts();
    }
  }

  private loadCachedContacts(): TgContact[] {
    const cached = localStorage.getItem(STORAGE_KEYS.CONTACTS);
    if (cached) {
      const contacts = JSON.parse(cached) as TgContact[];
      this.contacts.set(contacts);
      return contacts;
    }
    return [];
  }

  async loadMessages(peerId: string, limit = 20): Promise<TgMessage[]> {
    if (!this.client) return [];

    this.currentPeerId.set(peerId);
    const contact = this.contacts().find(c => c.id === peerId);
    this.currentPeerName.set(contact?.name || 'Unknown');

    try {
      const peer = new Api.InputPeerUser({
        userId: bigInt(peerId),
        accessHash: bigInt(contact?.accessHash || '0'),
      });

      const raw = await this.client.getMessages(peer, { limit });
      const messages: TgMessage[] = raw.map(m => ({
        id: m.id,
        text: m.text || '',
        date: new Date(m.date * 1000),
        out: m.out ?? false,
        senderName: m.out ? 'You' : (contact?.name || 'Them'),
      })).reverse();

      this.ngZone.run(() => this.messages.set(messages));
      return messages;
    } catch (err) {
      console.error('Failed to load messages:', err);
      return [];
    }
  }

  async sendMessage(peerId: string, text: string): Promise<boolean> {
    if (!this.client || !text.trim()) return false;

    const contact = this.contacts().find(c => c.id === peerId);
    if (!contact) return false;

    try {
      const peer = new Api.InputPeerUser({
        userId: bigInt(peerId),
        accessHash: bigInt(contact.accessHash),
      });

      await this.client.sendMessage(peer, { message: text });

      this.ngZone.run(() => {
        this.messages.update(msgs => [...msgs, {
          id: Date.now(),
          text,
          date: new Date(),
          out: true,
          senderName: 'You',
        }]);
      });

      this.onMessageSent?.(contact.name, text);
      return true;
    } catch (err) {
      console.error('Failed to send message:', err);
      return false;
    }
  }

  async searchContacts(query: string): Promise<TgContact[]> {
    const q = query.trim();
    if (!q || !this.client) return this.contacts();

    try {
      const result = await this.client.invoke(
        new Api.contacts.Search({ q, limit: 50 })
      );

      return result.users
        .filter((u): u is Api.User => u instanceof Api.User && !u.bot && !u.deleted)
        .map(u => ({
          id: u.id.toString(),
          accessHash: (u.accessHash ?? bigInt(0)).toString(),
          name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || 'Unknown',
          phone: u.phone || '',
          username: u.username || '',
        }));
    } catch (err) {
      console.error('Failed to search contacts:', err);
      // Fall back to local filter
      const lower = q.toLowerCase();
      return this.contacts().filter(c =>
        c.name.toLowerCase().includes(lower) ||
        c.username.toLowerCase().includes(lower) ||
        c.phone.includes(q)
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
    }
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    localStorage.removeItem(STORAGE_KEYS.API_ID);
    localStorage.removeItem(STORAGE_KEYS.API_HASH);
    localStorage.removeItem(STORAGE_KEYS.CONTACTS);
    this.isAuthenticated.set(false);
    this.authStep.set('credentials');
    this.authError.set('');
    this.contacts.set([]);
    this.messages.set([]);
    this.currentPeerId.set('');
    this.currentPeerName.set('');
    this.router.navigate(['/login']);
  }
}
