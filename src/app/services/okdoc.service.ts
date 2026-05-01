import { Injectable, inject, NgZone, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DialogFilter, TelegramService } from './telegram.service';

export type ActiveTab = 'all_chats' | 'personal_chats' | 'group_chats' | 'channel_chats' | 'bot_chats' | 'contacts';

@Injectable({ providedIn: 'root' })
export class OkDocService {
  private tg = inject(TelegramService);
  private router = inject(Router);
  private ngZone = inject(NgZone);

  readonly activeTab = signal<ActiveTab>('all_chats');

  private readonly tabLabels: Record<ActiveTab, string> = {
    all_chats: 'All Chats',
    personal_chats: 'Personal Chats',
    group_chats: 'Group Chats',
    channel_chats: 'Channels',
    bot_chats: 'Bot Chats',
    contacts: 'Contacts',
  };

  notifyTabChanged(tab: ActiveTab): void {
    if (typeof OkDoc !== 'undefined') {
      OkDoc.notify(`Telegram tab changed to ${this.tabLabels[tab]}.`);
    }
  }

  setActiveTab(tab: ActiveTab, notify = true): void {
    this.activeTab.set(tab);
    if (notify) {
      this.notifyTabChanged(tab);
    }
  }

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
      description: 'Switch between app views (login, chat) or Telegram tabs by name',
      inputSchema: {
        type: 'object',
        properties: {
          view: {
            type: 'string',
            description: 'The view to switch to',
            enum: [
              'login', 'chat',
              'contacts',
              'chats', 'all_chats', 'all',
              'personal_chats', 'personal', 'private_chats', 'private',
              'group_chats', 'groups', 'group',
              'channel_chats', 'channels', 'channel',
              'bot_chats', 'bots', 'bot',
            ],
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

        const tab = this.viewToTab(view);
        if (tab) {
          this.switchToTab(tab);
          return { content: [{ type: 'text', text: `Switched to ${this.tabLabels[tab]} tab.` }] };
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

    OkDoc.registerTool('switch_tab', {
      description: 'Open one of the Telegram tabs by name',
      inputSchema: {
        type: 'object',
        properties: {
          tab: {
            type: 'string',
            description: 'Tab to open',
            enum: [
              'contacts',
              'chats', 'all_chats', 'all',
              'personal_chats', 'personal', 'private_chats', 'private',
              'group_chats', 'groups', 'group',
              'channel_chats', 'channels', 'channel',
              'bot_chats', 'bots', 'bot',
            ],
          },
        },
        required: ['tab'],
      },
      handler: async (args) => {
        const tab = this.viewToTab(String(args['tab']));
        if (!tab) {
          return { content: [{ type: 'text', text: `Unknown tab: ${String(args['tab'])}` }], isError: true };
        }
        this.switchToTab(tab);
        return { content: [{ type: 'text', text: `Opened ${this.tabLabels[tab]} tab.` }] };
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
      description:
        'Search the user\'s OWN saved Telegram contacts locally by name, username, or phone. ' +
        'Mirrors the in-app contacts search. Does NOT query Telegram\'s global directory. ' +
        'If no match is found, consider asking the user whether to try `global_search`.',
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
      description: 'List Telegram chats by category, sorted by last message. Archived chats are hidden unless explicitly included or enabled.',
      inputSchema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Chat category to list',
            enum: ['all', 'personal', 'group', 'channel', 'bot'],
          },
          includeArchived: {
            type: 'boolean',
            description: 'Include archived chats even when the app toggle is off',
          },
        },
      },
      annotations: { readOnlyHint: true },
      handler: async (args) => {
        if (!this.tg.isAuthenticated()) {
          return { content: [{ type: 'text', text: 'Not authenticated. Please log in first.' }], isError: true };
        }

        const includeArchived = this.resolveIncludeArchived(args['includeArchived']);
        const filter = this.resolveDialogFilter(args['type']);
        const source = this.tg.dialogs().length ? this.tg.dialogs() : await this.tg.loadDialogs(includeArchived);
        const dialogs = this.tg.filterDialogs(source, filter, includeArchived);
        if (dialogs.length === 0) {
          return { content: [{ type: 'text', text: 'No chats found.' }] };
        }

        const text = dialogs
          .map(d => `- ${d.name} (ID: ${d.id}, Type: ${this.formatDialogType(d.type)}${d.archived ? ', Archived' : ''}${d.unreadCount ? ', Unread: ' + d.unreadCount : ''})`)
          .join('\n');

        return {
          content: [{ type: 'text', text: `Chats (${dialogs.length}):\n${text}` }],
          structuredContent: { dialogs },
        };
      },
    });

    OkDoc.registerTool('search_chats', {
      description:
        'Search the user\'s EXISTING chats (dialogs) locally by name. ' +
        'Mirrors the in-app chats search — only returns conversations the user is already part of. ' +
        'Does NOT discover new public channels/groups. ' +
        'If no match is found, consider asking the user whether to try `global_search`.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query to match against chat names' },
          type: {
            type: 'string',
            description: 'Chat category to search',
            enum: ['all', 'personal', 'group', 'channel', 'bot'],
          },
          includeArchived: {
            type: 'boolean',
            description: 'Include archived chats even when the app toggle is off',
          },
        },
        required: ['query'],
      },
      annotations: { readOnlyHint: true },
      handler: async (args) => {
        if (!this.tg.isAuthenticated()) {
          return { content: [{ type: 'text', text: 'Not authenticated. Please log in first.' }], isError: true };
        }

        const query = String(args['query']);
        const includeArchived = this.resolveIncludeArchived(args['includeArchived']);
        if (!this.tg.dialogs().length || includeArchived) {
          await this.tg.loadDialogs(includeArchived);
        }

        const filter = this.resolveDialogFilter(args['type']);
        const matches = await this.tg.searchDialogs(query, filter, includeArchived);

        if (matches.length === 0) {
          return { content: [{ type: 'text', text: `No chats found matching "${query}".` }] };
        }

        const text = matches
          .map(d => `- ${d.name} (ID: ${d.id}, Type: ${this.formatDialogType(d.type)}${d.archived ? ', Archived' : ''}${d.unreadCount ? ', Unread: ' + d.unreadCount : ''})`)
          .join('\n');

        return {
          content: [{ type: 'text', text: `Found ${matches.length} chat(s) matching "${query}":\n${text}` }],
          structuredContent: { dialogs: matches },
        };
      },
    });

    OkDoc.registerTool('set_archived_chats_visibility', {
      description: 'Show or hide archived Telegram chats in tabs, chat search, and chat listing tools',
      inputSchema: {
        type: 'object',
        properties: {
          showArchived: {
            type: 'boolean',
            description: 'true to show archived chats, false to hide them',
          },
        },
        required: ['showArchived'],
      },
      handler: async (args) => {
        const showArchived = Boolean(args['showArchived']);
        await this.tg.setShowArchivedChats(showArchived);
        return { content: [{ type: 'text', text: `Archived chats are now ${showArchived ? 'shown' : 'hidden'}.` }] };
      },
    });

    OkDoc.registerTool('global_search', {
      description:
        'Global Telegram search across the entire Telegram network — finds users, public groups, ' +
        'channels, and bots the user does NOT already have in their contacts or chats. ' +
        'IMPORTANT: Prefer `search_contacts` and `search_chats` first. Only call `global_search` ' +
        'AFTER explicitly asking the user for confirmation when the local searches return no results.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'The search query (name, username, title)' },
          limit: { type: 'number', description: 'Max results (default 50, max 100)', minimum: 1, maximum: 100 },
        },
        required: ['query'],
      },
      annotations: { readOnlyHint: true },
      handler: async (args) => {
        if (!this.tg.isAuthenticated()) {
          return { content: [{ type: 'text', text: 'Not authenticated. Please log in first.' }], isError: true };
        }

        const query = String(args['query']);
        const limit = Math.min(Number(args['limit']) || 50, 100);
        const { users, chats } = await this.tg.globalSearch(query, limit);

        if (users.length === 0 && chats.length === 0) {
          return { content: [{ type: 'text', text: `Global search found nothing for "${query}".` }] };
        }

        const userLines = users.map(u => `- [user] ${u.name} (ID: ${u.id}${u.username ? ', @' + u.username : ''})`);
        const chatLines = chats.map(c => `- [${c.type}] ${c.name} (ID: ${c.id})`);
        const text = [...userLines, ...chatLines].join('\n');

        return {
          content: [{
            type: 'text',
            text: `Global search results for "${query}" (${users.length} user(s), ${chats.length} chat(s)):\n${text}`,
          }],
          structuredContent: { users, chats },
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
    this.tg.onNewMessage = ({ senderName, chatId, chatName, chatType, text }) => {
      if (typeof OkDoc === 'undefined') return;

      const isPersonal = chatType === 'personal';
      const header = isPersonal
        ? `New message from ${senderName}`
        : `New message in ${chatType === 'channel' ? 'channel' : 'group'} "${chatName}" [id:${chatId}] from ${senderName}`;

      OkDoc.notify(`${header}: ${text}`);
    };

    this.tg.onMessageSent = (recipientName: string, text: string) => {
      if (typeof OkDoc !== 'undefined') {
        OkDoc.notify(`Message sent to ${recipientName}: ${text}`);
      }
    };

    this.tg.onArchiveVisibilityChanged = (showArchived) => {
      if (typeof OkDoc !== 'undefined') {
        OkDoc.notify(`Archived chats are now ${showArchived ? 'shown' : 'hidden'}.`);
      }
    };
  }

  private switchToTab(tab: ActiveTab): void {
    this.setActiveTab(tab);
    this.ngZone.run(() => this.router.navigate(['/contacts']));
  }

  private viewToTab(view: string): ActiveTab | null {
    const normalized = view.trim().toLowerCase().replace(/[\s-]+/g, '_');
    switch (normalized) {
      case 'contacts':
      case 'contact':
        return 'contacts';
      case 'chats':
      case 'all':
      case 'all_chats':
        return 'all_chats';
      case 'personal':
      case 'personal_chat':
      case 'personal_chats':
      case 'private':
      case 'private_chat':
      case 'private_chats':
        return 'personal_chats';
      case 'group':
      case 'groups':
      case 'group_chat':
      case 'group_chats':
        return 'group_chats';
      case 'channel':
      case 'channels':
      case 'channel_chat':
      case 'channel_chats':
        return 'channel_chats';
      case 'bot':
      case 'bots':
      case 'bot_chat':
      case 'bot_chats':
        return 'bot_chats';
      default:
        return null;
    }
  }

  private resolveDialogFilter(value: unknown): DialogFilter {
    if (value === 'personal' || value === 'group' || value === 'channel' || value === 'bot') return value;
    return 'all';
  }

  private resolveIncludeArchived(value: unknown): boolean {
    return typeof value === 'boolean' ? value : this.tg.showArchivedChats();
  }

  private formatDialogType(type: string): string {
    return type === 'personal' ? 'personal' : type;
  }
}
