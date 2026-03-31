import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { TelegramService } from '../services/telegram.service';

export const authGuard: CanActivateFn = () => {
  const tg = inject(TelegramService);
  const router = inject(Router);
  return tg.isAuthenticated() || router.createUrlTree(['/login']);
};
