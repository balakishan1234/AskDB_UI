import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      
      <div class="border-b border-slate-200 dark:border-slate-800 pb-6">
        <span class="text-xs font-bold uppercase text-indigo-500 tracking-wider">Enterprise Terms</span>
        <h1 class="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-display mt-1">Terms of Service</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">Effective Date: August 2026 | AskDB Enterprise Platform</p>
      </div>

      <div class="glass-panel p-8 rounded-3xl space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        
        <section class="space-y-2">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">1. Acceptable Use</h3>
          <p>AskDB is designed for authorized corporate business intelligence and database administration. Users must not attempt to execute unauthorized data extraction, circumvent workspace boundaries, or inject malicious payloads.</p>
        </section>

        <section class="space-y-2">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">2. Account Ownership & Invitation Model</h3>
          <p>Accounts are strictly tied to verified corporate email identities. Account credentials must not be shared between employees. Self-registration is prohibited.</p>
        </section>

        <section class="space-y-2">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">3. Administrator Responsibility</h3>
          <p>Designated System Administrators are solely responsible for reviewing pending access requests, assigning database permissions, revoking inactive accounts, and managing user workspace access control.</p>
        </section>

        <section class="space-y-2">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">4. Availability & SLA</h3>
          <p>While AskDB targets 99.9% service availability for cloud proxy services, maintenance windows and system updates will be scheduled with advance notification to enterprise admins.</p>
        </section>

        <section class="space-y-2">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">5. Restrictions & Termination</h3>
          <p>AskDB reserves the right to immediately suspend or terminate access for any account violating security policies or attempting unauthorized database mutation.</p>
        </section>

      </div>

    </div>
  `
})
export class TermsPage {}
