import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div class="glass-panel p-10 rounded-3xl max-w-md w-full space-y-6 shadow-2xl border border-slate-200 dark:border-slate-800">
        <span class="text-6xl font-extrabold text-blue-500 font-display block">404</span>
        <div class="space-y-2">
          <h1 class="text-2xl font-bold text-slate-900 dark:text-white font-display">Page Not Found</h1>
          <p class="text-xs text-slate-500 dark:text-slate-400">The requested enterprise URL does not exist or has been moved.</p>
        </div>
        <div class="flex flex-col gap-2 pt-2">
          <a routerLink="/" class="w-full py-3 rounded-xl btn-gradient text-white text-xs font-bold shadow-md">
            Return to Home Page
          </a>
          <a routerLink="/request-access" class="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold">
            Request Account Access
          </a>
        </div>
      </div>
    </div>
  `
})
export class NotFoundPage {}
