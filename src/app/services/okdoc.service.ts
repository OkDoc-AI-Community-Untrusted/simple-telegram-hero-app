import { Injectable, inject, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { TelegramService } from './telegram.service';

export type ActiveTab = 'chats' | 'contacts';

@Injectable({ providedIn: 'root' })
export class OkDocService {
  private tg = inject(TelegramService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  onSwitchTab?: (tab: ActiveTab) => void;

  initialize(): void {
    if (typeof OkDoc === 'undefined') return;

    OkDoc.init({
      id: 'simple-telegram-hero-app',
      name: 'Simple Telegram Hero App',
      namespace: 'simple-telegram-hero-app',
      version: '1.0.0',
      description: 'Simple Telegram web client with contacts and messaging',
      icon: 'paper-plane-outline',
      mode: 'foreground',
      author: { name: 'OkDoc Community', url: 'https://github.com/okDoc-ai' },
    });

    this.registerTools();
    this.setupNotifiers();
  }

  private registerTools(): void {
    OkDoc.registerTool('switch_view', {
      description: 'Switch between app views (login, contacts, chats, chat) or tabs',
      inputSchema: {
        type: 'object',
        properties: {
          view: {
            type: 'string',
            description: 'The view to switch to',
            enum: ['login', 'contacts', 'chats', 'chat'],
          },
          peerId: {
            type: 'string',
            description: 'Contact/chat ID (required when view is "chat")',
          },
        },
        required: ['view'],
      },
      handler: async (args) => {
        const view = String(args['view']);

        if (view === 'contacts') {
          this.ngZone.run(() => this.router.navigate(['/contacts']));
          this.onSwitchTab?.('contacts');
          return { content: [{ type: 'text', text: 'Switched to contacts tab.' }] };
        }

        if (view === 'chats') {
          this.ngZone.run(() => this.router.navigate(['/contacts']));
          this.onSwitchTab?.('chats');
          return { content: [{ type: 'text', text: 'Switched to chats tab.' }] };
        }

        if (view === 'chat') {
          const peerId = args['peerId'] ? String(args['peerId']) : '';
          if (!peerId) {
            return { content: [{ type: 'text', text: 'Error: peerId is required for chat view.' }], isError: true };
          }
          this.ngZone.run(() => this.router.navigate(['/chat', peerId]));
          return { content: [{ type: 'text', text: `Opened chat view for peer ${peerId}.` }] };
        }

        if (view === 'login') {
          this.ngZone.run(() => this.router.navigate(['/login']));
          return { content: [{ type: 'text', text: 'Switched to login view.' }] };
        }

        return { content: [{ type: 'text', text: `Unknown view: ${view}` }], isError: true };
      },
    });

    OkDoc.registerTool('list_contacts', {
      description: 'List all Telegram contacts',
      annotations: { readOnlyHint: true },
      handler: async () => {
        if (!this.tg.isAuthenticated()) {
          return { content: [{ type: 'text', text: 'Not authenticated. Please log in first.' }], isError: true };
        }

        const contacts = await this.tg.loadContacts();
        if (contacts.length === 0) {
          return { content: [{ type: 'text', text: 'No contacts found.' }] };
        }

        const text = contacts
          .map(c => `- ${c.name} (ID: ${c.id}${c.phone ? ', Phone: ' + c.phone : ''}${c.username ? ', @' + c.username : ''})`)
          .join('\n');

        return {
          content: [{ type: 'text', text: `Contacts (${contacts.length}):\n${text}` }],
          structuredContent: { contacts },
        };
      },
    });

    OkDoc.registerTool('search_contacts', {
      description: 'Search contacts by name, username, or phone number and return matching IDs',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query to match against contact name, username, or phone' },
        },
        required: ['query'],
      },
      annotations: { readOnlyHint: true },
      handler: async (args) => {
        if (!this.tg.isAuthenticated()) {
          return { content: [{ type: 'text', text: 'Not authenticated. Please log in first.' }], isError: true };
        }

        if (!this.tg.contacts().length) {
          await this.tg.loadContacts();
        }

        const query = String(args['query']);
        const matches = await this.tg.searchContacts(query);

        if (matches.length === 0) {
          return { content: [{ type: 'text', text: `No contacts found matching "${query}".` }] };
        }

        const text = matches
          .map(c => `- ${c.name} (ID: ${c.id}${c.phone ? ', Phone: ' + c.phone : ''}${c.username ? ', @' + c.username : ''})`)
          .join('\n');

        return {
          content: [{ type: 'text', text: `Found ${matches.length} contact(s) matching "${query}":\n${text}` }],
          structuredContent: { contacts: matches },
        };
      },
    });

    OkDoc.registerTool('list_chats', {
      description: 'List all Telegram chats (users, groups, channels, bots) sorted by last message',
      annotations: { readOnlyHint: true },
      handler: async () => {
        if (!this.tg.isAuthenticated()) {
          return { content: [{ type: 'text', text: 'Not authenticated. Please log in first.' }], isError: true };
        }

        const dialogs = this.tg.dialogs().length ? this.tg.dialogs() : await this.tg.loadDialogs();
        if (dialogs.length === 0) {
          return { content: [{ type: 'text', text: 'No chats found.' }] };
        }

        const text = dialogs
          .map(d => `- ${d.name} (ID: ${d.id}, Type: ${d.type}${d.unreadCount ? ', Unread: ' + d.unreadCount : ''})`)
          .join('\n');

        return {
          content: [{ type: 'text', text: `Chats (${dialogs.length}):\n${text}` }],
          structuredContent: { dialogs },
        };
      },
    });

    OkDoc.registerTool('search_chats', {
      description: 'Search chats by name',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query to match against chat names' },
        },
        required: ['query'],
      },
      annotations: { readOnlyHint: true },
      handler: async (args) => {
        if (!this.tg.isAuthenticated()) {
          return { content: [{ type: 'text', text: 'Not authenticated. Please log in first.' }], isError: true };
        }

        if (!this.tg.dialogs().length) {
          await this.tg.loadDialogs();
        }

        const query = String(args['query']);
        const matches = await this.tg.searchDialogs(query);

        if (matches.length === 0) {
          return { content: [{ type: 'text', text: `No chats found matching "${query}".` }] };
        }

        const text = matches
          .map(d => `- ${d.name} (ID: ${d.id}, Type: ${d.type}${d.unreadCount ? ', Unread: ' + d.unreadCount : ''})`)
          .join('\n');

        return {
          content: [{ type: 'text', text: `Found ${matches.length} chat(s) matching "${query}":\n${text}` }],
          structuredContent: { dialogs: matches },
        };
      },
    });

    OkDoc.registerTool('open_conversation', {
      description: 'Open a conversation with a specific contact',
      inputSchema: {
        type: 'object',
        properties: {
          peerId: { type: 'string', description: 'The contact ID to open conversation with' },
        },
        required: ['peerId'],
      },
      handler: async (args) => {
        if (!this.tg.isAuthenticated()) {
          return { content: [{ type: 'text', text: 'Not authenticated. Please log in first.' }], isError: true };
        }

        const peerId = String(args['peerId']);
        await this.tg.loadMessages(peerId);
        this.ngZone.run(() => this.router.navigate(['/chat', peerId]));

        const contact = this.tg.contacts().find(c => c.id === peerId);
        return { content: [{ type: 'text', text: `Opened conversation with ${contact?.name || peerId}.` }] };
      },
    });

    OkDoc.registerTool('send_message', {
      description: 'Send a text message to a contact',
      inputSchema: {
        type: 'object',
        properties: {
          peerId: { type: 'string', description: 'The contact ID to send message to' },
          message: { type: 'string', description: 'The text message to send' },
        },
        required: ['peerId', 'message'],
      },
      handler: async (args) => {
        if (!this.tg.isAuthenticated()) {
          return { content: [{ type: 'text', text: 'Not authenticated. Please log in first.' }], isError: true };
        }

        const peerId = String(args['peerId']);
        const message = String(args['message']);
        const success = await this.tg.sendMessage(peerId, message);

        if (success) {
          const contact = this.tg.contacts().find(c => c.id === peerId);
          return { content: [{ type: 'text', text: `Message sent to ${contact?.name || peerId}: "${message}"` }] };
        }
        return { content: [{ type: 'text', text: 'Failed to send message.' }], isError: true };
      },
    });

    OkDoc.registerTool('read_messages', {
      description: 'Read the last N messages from a conversation',
      inputSchema: {
        type: 'object',
        properties: {
          peerId: { type: 'string', description: 'The contact ID to read messages from' },
          count: { type: 'number', description: 'Number of messages to read (default: 10)', minimum: 1, maximum: 100 },
        },
        required: ['peerId'],
      },
      annotations: { readOnlyHint: true },
      handler: async (args) => {
        if (!this.tg.isAuthenticated()) {
          return { content: [{ type: 'text', text: 'Not authenticated. Please log in first.' }], isError: true };
        }

        const peerId = String(args['peerId']);
        const count = Number(args['count']) || 10;
        const messages = await this.tg.loadMessages(peerId, count);

        if (messages.length === 0) {
          return { content: [{ type: 'text', text: 'No messages found.' }] };
        }

        const contact = this.tg.contacts().find(c => c.id === peerId);
        const text = messages
          .map(m => `[${m.out ? 'You' : contact?.name || 'Them'}] ${m.text}`)
          .join('\n');

        return {
          content: [{ type: 'text', text: `Last ${messages.length} messages with ${contact?.name || peerId}:\n${text}` }],
          structuredContent: { messages },
        };
      },
    });
  }

  private setupNotifiers(): void {
    this.tg.onNewMessage = (senderName: string, text: string) => {
      if (typeof OkDoc !== 'undefined') {
        OkDoc.notify(`New message from ${senderName}: ${text}`);
      }
    };

    this.tg.onMessageSent = (recipientName: string, text: string) => {
      if (typeof OkDoc !== 'undefined') {
        OkDoc.notify(`Message sent to ${recipientName}: ${text}`);
      }
    };
  }
}
