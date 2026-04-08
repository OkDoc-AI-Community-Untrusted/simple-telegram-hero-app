import { Injectable, inject, signal, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { NewMessage, NewMessageEvent } from 'telegram/events';
import bigInt from 'big-integer';
import { environment } from '../../environments/environment';

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

export type DialogType = 'user' | 'group' | 'channel' | 'bot';

export interface TgDialog {
  id: string;
  accessHash: string;
  type: DialogType;
  name: string;
  lastMessage: string;
  lastMessageDate: Date;
  unreadCount: number;
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
  readonly dialogs = signal<TgDialog[]>([]);
  readonly messages = signal<TgMessage[]>([]);
  readonly currentPeerId = signal('');
  readonly currentPeerName = signal('');

  private codeResolver?: (code: string) => void;
  private passwordResolver?: (pwd: string) => void;

  onNewMessage?: (senderName: string, text: string) => void;
  onMessageSent?: (recipientName: string, text: string) => void;

  get defaultApiId(): string {
    return environment.telegram.apiId;
  }

  get defaultApiHash(): string {
    return environment.telegram.apiHash;
  }

  get hasDefaultCredentials(): boolean {
    return this.isValidCredential(this.defaultApiId) && this.isValidCredential(this.defaultApiHash);
  }

  private isValidCredential(value: string): boolean {
    return !!value && value !== 'TELEGRAM_API_ID_PLACEHOLDER' && value !== 'TELEGRAM_API_HASH_PLACEHOLDER';
  }

  async tryRestoreSession(): Promise<boolean> {
    const apiId = localStorage.getItem(STORAGE_KEYS.API_ID) || this.defaultApiId;
    const apiHash = localStorage.getItem(STORAGE_KEYS.API_HASH) || this.defaultApiHash;
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

  async startAuth(apiId: number, apiHash: string, phoneNumber: string, useCustomCredentials = false): Promise<void> {
    this.loading.set(true);
    this.authError.set('');

    try {
      if (useCustomCredentials) {
        localStorage.setItem(STORAGE_KEYS.API_ID, apiId.toString());
        localStorage.setItem(STORAGE_KEYS.API_HASH, apiHash);
      } else {
        localStorage.removeItem(STORAGE_KEYS.API_ID);
        localStorage.removeItem(STORAGE_KEYS.API_HASH);
      }

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

    this.client.addEventHandler(async (event: NewMessageEvent) => {
      const message = event.message;
      if (message.out || !message.text) return;

      let senderName = 'Unknown';
      try {
        if (message.senderId) {
          const sender = await this.client!.getEntity(message.senderId);
          if (sender instanceof Api.User) {
            senderName = [sender.firstName, sender.lastName].filter(Boolean).join(' ') || sender.username || 'Unknown';
          } else if (sender instanceof Api.Chat) {
            senderName = sender.title || 'Group';
          } else if (sender instanceof Api.Channel) {
            senderName = sender.title || 'Channel';
          }
        }
      } catch {
        const contact = this.contacts().find(c => c.id === message.senderId?.toString());
        senderName = contact?.name || 'Unknown';
      }

      const peerId = message.peerId;
      let chatId = '';
      if (peerId instanceof Api.PeerUser) {
        chatId = peerId.userId.toString();
      } else if (peerId instanceof Api.PeerChat) {
        chatId = peerId.chatId.toString();
      } else if (peerId instanceof Api.PeerChannel) {
        chatId = peerId.channelId.toString();
      }

      this.ngZone.run(() => {
        if (chatId === this.currentPeerId()) {
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

  async loadDialogs(): Promise<TgDialog[]> {
    if (!this.client) return [];

    try {
      const result = await this.client.invoke(
        new Api.messages.GetDialogs({
          offsetDate: 0,
          offsetId: 0,
          offsetPeer: new Api.InputPeerEmpty(),
          limit: 100,
          hash: bigInt(0),
        })
      );

      if (!(result instanceof Api.messages.Dialogs) && !(result instanceof Api.messages.DialogsSlice)) {
        return [];
      }

      const usersMap = new Map<string, Api.User>();
      const chatsMap = new Map<string, Api.Chat | Api.Channel>();
      for (const u of result.users) {
        if (u instanceof Api.User) usersMap.set(u.id.toString(), u);
      }
      for (const c of result.chats) {
        if (c instanceof Api.Chat) chatsMap.set(c.id.toString(), c);
        else if (c instanceof Api.Channel) chatsMap.set(c.id.toString(), c);
      }

      const messagesMap = new Map<number, Api.Message>();
      for (const m of result.messages) {
        if (m instanceof Api.Message) messagesMap.set(m.id, m);
      }

      const dialogs: TgDialog[] = [];
      for (const d of result.dialogs) {
        if (!(d instanceof Api.Dialog)) continue;

        const topMsg = messagesMap.get(d.topMessage);
        let id = '';
        let name = '';
        let type: DialogType = 'user';
        let accessHash = '0';

        if (d.peer instanceof Api.PeerUser) {
          id = d.peer.userId.toString();
          const user = usersMap.get(id);
          if (user) {
            name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Unknown';
            accessHash = (user.accessHash ?? bigInt(0)).toString();
            type = user.bot ? 'bot' : 'user';
          }
        } else if (d.peer instanceof Api.PeerChat) {
          id = d.peer.chatId.toString();
          const chat = chatsMap.get(id);
          if (chat && chat instanceof Api.Chat) {
            name = chat.title || 'Group';
            type = 'group';
          }
        } else if (d.peer instanceof Api.PeerChannel) {
          id = d.peer.channelId.toString();
          const channel = chatsMap.get(id);
          if (channel && channel instanceof Api.Channel) {
            name = channel.title || 'Channel';
            accessHash = (channel.accessHash ?? bigInt(0)).toString();
            type = channel.megagroup ? 'group' : 'channel';
          }
        }

        if (!id || !name) continue;

        dialogs.push({
          id,
          accessHash,
          type,
          name,
          lastMessage: topMsg?.text || '',
          lastMessageDate: topMsg ? new Date(topMsg.date * 1000) : new Date(0),
          unreadCount: d.unreadCount ?? 0,
        });
      }

      dialogs.sort((a, b) => b.lastMessageDate.getTime() - a.lastMessageDate.getTime());
      this.ngZone.run(() => this.dialogs.set(dialogs));
      return dialogs;
    } catch (err) {
      console.error('Failed to load dialogs:', err);
      return [];
    }
  }

  async searchDialogs(query: string): Promise<TgDialog[]> {
    const q = query.trim();
    if (!q) return this.dialogs();

    const lower = q.toLowerCase();
    return this.dialogs().filter(d => d.name.toLowerCase().includes(lower));
  }

  private buildInputPeer(peerId: string, dialog?: TgDialog | null, contact?: TgContact | null): Api.TypeInputPeer {
    if (dialog) {
      if (dialog.type === 'group' && !dialog.accessHash) {
        return new Api.InputPeerChat({ chatId: bigInt(peerId) });
      }
      if (dialog.type === 'group' || dialog.type === 'channel') {
        return new Api.InputPeerChannel({ channelId: bigInt(peerId), accessHash: bigInt(dialog.accessHash) });
      }
      return new Api.InputPeerUser({ userId: bigInt(peerId), accessHash: bigInt(dialog.accessHash) });
    }
    if (contact) {
      return new Api.InputPeerUser({ userId: bigInt(peerId), accessHash: bigInt(contact.accessHash) });
    }
    return new Api.InputPeerUser({ userId: bigInt(peerId), accessHash: bigInt(0) });
  }

  private findPeer(peerId: string): { name: string; dialog?: TgDialog; contact?: TgContact } {
    const dialog = this.dialogs().find(d => d.id === peerId);
    const contact = this.contacts().find(c => c.id === peerId);
    const name = dialog?.name || contact?.name || 'Unknown';
    return { name, dialog, contact };
  }

  async loadMessages(peerId: string, limit = 20): Promise<TgMessage[]> {
    if (!this.client) return [];

    this.currentPeerId.set(peerId);
    const { name, dialog, contact } = this.findPeer(peerId);
    this.currentPeerName.set(name);

    try {
      const peer = this.buildInputPeer(peerId, dialog, contact);
      const raw = await this.client.getMessages(peer, { limit });

      const messages: TgMessage[] = raw.map(m => {
        let senderName = 'Them';
        if (m.out) {
          senderName = 'You';
        } else if (m.fromId instanceof Api.PeerUser) {
          const fromId = m.fromId.userId.toString();
          const c = this.contacts().find(ct => ct.id === fromId);
          const d = this.dialogs().find(dl => dl.id === fromId);
          senderName = c?.name || d?.name || 'Them';
        }
        return {
          id: m.id,
          text: m.text || '',
          date: new Date(m.date * 1000),
          out: m.out ?? false,
          senderName,
        };
      }).reverse();

      this.ngZone.run(() => this.messages.set(messages));
      return messages;
    } catch (err) {
      console.error('Failed to load messages:', err);
      return [];
    }
  }

  async sendMessage(peerId: string, text: string): Promise<boolean> {
    if (!this.client || !text.trim()) return false;

    const { name, dialog, contact } = this.findPeer(peerId);
    if (!dialog && !contact) return false;

    try {
      const peer = this.buildInputPeer(peerId, dialog, contact);

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

      this.onMessageSent?.(name, text);
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
    this.dialogs.set([]);
    this.messages.set([]);
    this.currentPeerId.set('');
    this.currentPeerName.set('');
    this.router.navigate(['/login']);
  }
}
