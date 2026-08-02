import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
      
      <div class="glass-panel p-8 rounded-3xl border border-emerald-500/30 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xl font-bold">
            ✓
          </div>
          <div>
            <h1 class="text-2xl font-bold text-slate-900 dark:text-white font-display">All Systems Operational</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400">AskDB Enterprise Services uptime is 99.98% over past 90 days.</p>
          </div>
        </div>
        <span class="text-xs font-mono text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">LIVE</span>
      </div>

      <!-- Service Health Table -->
      <div class="glass-panel rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800">
        <div class="p-4 bg-slate-100/60 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-500 uppercase tracking-wider">
          Platform Component Status
        </div>
        <div class="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
          
          <div class="p-4 flex items-center justify-between">
            <span class="font-medium text-slate-900 dark:text-white">API Gateway & Request Routers</span>
            <span class="text-emerald-500 font-semibold flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Operational</span>
          </div>

          <div class="p-4 flex items-center justify-between">
            <span class="font-medium text-slate-900 dark:text-white">Natural Language SQL Translation Engine</span>
            <span class="text-emerald-500 font-semibold flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Operational</span>
          </div>

          <div class="p-4 flex items-center justify-between">
            <span class="font-medium text-slate-900 dark:text-white">Admin Access Request & SMTP Verification Queue</span>
            <span class="text-emerald-500 font-semibold flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Operational</span>
          </div>

          <div class="p-4 flex items-center justify-between">
            <span class="font-medium text-slate-900 dark:text-white">Multi-Engine Database Proxies (SQL / Mongo )</span>
            <span class="text-emerald-500 font-semibold flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Operational</span>
          </div>

        </div>
      </div>

    </div>
  `
})
export class StatusPage { }
