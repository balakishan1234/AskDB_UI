import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      
      <!-- Hero Header -->
      <div class="text-center space-y-4 max-w-3xl mx-auto">
        <span class="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 text-xs font-semibold uppercase tracking-wider">
          Enterprise Capabilities
        </span>
        <h1 class="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white font-display">
          Everything You Need to Query Databases with <span class="glow-text-gradient">Natural Language</span>
        </h1>
        <p class="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
          AskDB combines domain-tuned natural language translation with multi-tenant database connectivity, role-based security, and visual query execution.
        </p>
      </div>

      <!-- Feature Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        
        <!-- Feature 1 -->
        <div class="glass-panel p-6 rounded-3xl space-y-4 hover-lift">
          <div class="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xl">
            ⚡
          </div>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white">Natural Language to SQL</h3>
          <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Translate complex business questions into ANSI SQL, T-SQL, PL/SQL, or MQL in milliseconds with high-confidence schema resolution.
          </p>
        </div>

        <!-- Feature 2 -->
        <div class="glass-panel p-6 rounded-3xl space-y-4 hover-lift">
          <div class="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xl">
            🛡️
          </div>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white">Zero Self-Registration</h3>
          <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Accounts are invitation-only. Every access request goes through a multi-step guided wizard and administrator manual approval.
          </p>
        </div>

        <!-- Feature 3 -->
        <div class="glass-panel p-6 rounded-3xl space-y-4 hover-lift">
          <div class="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold text-xl">
            📊
          </div>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white">Visual Query Studio</h3>
          <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Instant table rendering, column sorting, pagination, and automated chart visualizations for fast business decision making.
          </p>
        </div>

        <!-- Feature 4 -->
        <div class="glass-panel p-6 rounded-3xl space-y-4 hover-lift">
          <div class="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-bold text-xl">
            🔐
          </div>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white">Granular Workspace RBAC</h3>
          <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Assign user access on a per-database workspace level. Enforce read-only locks or schema restriction policies easily.
          </p>
        </div>

        <!-- Feature 5 -->
        <div class="glass-panel p-6 rounded-3xl space-y-4 hover-lift">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xl">
            📑
          </div>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white">Audit Logging & Governance</h3>
          <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Comprehensive audit logs for every query execution, schema inspection, and admin approval step for enterprise compliance.
          </p>
        </div>

        <!-- Feature 6 -->
        <div class="glass-panel p-6 rounded-3xl space-y-4 hover-lift">
          <div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xl">
            🔌
          </div>
          <h3 class="text-xl font-bold text-slate-900 dark:text-white">Multi-Engine Connectors</h3>
          <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Connect to SQL Server, PostgreSQL, Oracle, MongoDB, Snowflake, and SQLite out of the box with zero client software installation.
          </p>
        </div>

      </div>

      <!-- Call to Action -->
      <div class="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-center space-y-6 shadow-2xl">
        <h2 class="text-3xl font-extrabold font-display">Ready to Transform Enterprise Database Access?</h2>
        <p class="text-blue-100 max-w-xl mx-auto text-sm">
          Submit an account access request to get your team verified by your system administrator.
        </p>
        <div>
          <a routerLink="/request-access" class="inline-block px-8 py-3 rounded-xl bg-white text-blue-600 font-bold text-sm hover:bg-slate-100 transition-colors shadow-lg">
            Request Access Now →
          </a>
        </div>
      </div>

    </div>
  `
})
export class FeaturesPage {}
