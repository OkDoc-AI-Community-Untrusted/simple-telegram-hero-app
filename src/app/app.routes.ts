import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage),
  },
  {
    path: 'contacts',
    loadComponent: () => import('./pages/contacts/contacts.page').then(m => m.ContactsPage),
    canActivate: [authGuard],
  },
  {
    path: 'chat/:peerId',
    loadComponent: () => import('./pages/chat/chat.page').then(m => m.ChatPage),
    canActivate: [authGuard],
  },
];
