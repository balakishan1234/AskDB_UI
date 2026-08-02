import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      
      <div class="border-b border-slate-200 dark:border-slate-800 pb-6">
        <span class="text-xs font-bold uppercase text-blue-500 tracking-wider">Enterprise Legal Policy</span>
        <h1 class="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white font-display mt-1">Privacy Policy</h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-2">Effective Date: August 2026 | AskDB Enterprise Platform</p>
      </div>

      <div class="glass-panel p-8 rounded-3xl space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        
        <section class="space-y-2">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">1. Introduction</h3>
          <p>AskDB Inc. ("AskDB", "we", "our") values the privacy and security of enterprise user data. This Privacy Policy governs the collection, processing, and protection of information when using AskDB application services.</p>
        </section>

        <section class="space-y-2">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">2. Information Collected</h3>
          <p>We collect identity and technical metadata necessary to enforce our Zero Self-Registration policy:</p>
          <ul class="list-disc pl-5 space-y-1">
            <li>Requester Full Name, Corporate Email Address, Company, Department, and Employee ID.</li>
            <li>System Metadata: IP Address, User Agent, Timezone, and Access Timestamps.</li>
            <li>Natural Language Queries submitted for SQL translation within registered workspaces.</li>
          </ul>
        </section>

        <section class="space-y-2">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">3. Authentication & Account Creation</h3>
          <p>Accounts are created strictly via manual System Administrator approval. Initial temporary passwords are generated securely and dispatched directly via encrypted SMTP transport.</p>
        </section>

        <section class="space-y-2">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">4. Cookies & Local Session Storage</h3>
          <p>We utilize local browser storage (localStorage and essential session tokens) solely to maintain active workspace state, user theme preferences, and session security timeouts. We do not use third-party tracking cookies.</p>
        </section>

        <section class="space-y-2">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">5. Database Usage & Data Isolation</h3>
          <p>AskDB executes database queries directly against client-provided database connection strings. We do not copy, index, or sell database payload contents. Raw query results are held in transient browser memory only.</p>
        </section>

        <section class="space-y-2">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">6. Security Standards & Retention</h3>
          <p>All data in transit is encrypted using TLS 1.3. Audit logs are retained for 365 days in compliance with enterprise governance policies before automatic archiving.</p>
        </section>

        <section class="space-y-2">
          <h3 class="text-lg font-bold text-slate-900 dark:text-white">7. Contact Information</h3>
          <p>For privacy inquiries or compliance data requests, please contact our Data Protection Officer at <a href="mailto:privacy@askdb.com" class="text-blue-500 underline">privacy@askdb.com</a>.</p>
        </section>

      </div>

    </div>
  `
})
export class PrivacyPage {}
