import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      
      <!-- Security Header -->
      <div class="text-center space-y-4 max-w-3xl mx-auto">
        <span class="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 text-xs font-semibold uppercase tracking-wider">
          Enterprise Security Architecture
        </span>
        <h1 class="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white font-display">
          Zero Self-Registration & <span class="glow-text-gradient">Strict Governance</span>
        </h1>
        <p class="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
          AskDB is designed from the ground up for high-security enterprise environments. We eliminate self-signups and enforce mandatory manual administrator review.
        </p>
      </div>

      <!-- Security Pillars -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        <div class="glass-panel p-8 rounded-3xl space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-xl font-bold">🔒</div>
          <h3 class="text-2xl font-bold text-slate-900 dark:text-white font-display">Zero Self-Registration Model</h3>
          <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Public visitors cannot create accounts autonomously. Account creation is strictly mediated through the 7-step guided onboarding wizard and must be reviewed and approved by an authorized System Administrator.
          </p>
        </div>

        <div class="glass-panel p-8 rounded-3xl space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-xl font-bold">🔑</div>
          <h3 class="text-2xl font-bold text-slate-900 dark:text-white font-display">Forced Temporary Password Reset</h3>
          <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            When an administrator approves a user, a single-use temporary password is encrypted and emailed to the requester. The system automatically forces an immediate password reset upon first authentication.
          </p>
        </div>

        <div class="glass-panel p-8 rounded-3xl space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center text-xl font-bold">🛡️</div>
          <h3 class="text-2xl font-bold text-slate-900 dark:text-white font-display">Role-Based Access Control (RBAC)</h3>
          <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Users are assigned explicit permissions per database instance. Administrators can restrict actions to read-only queries, block schema mutation statements (DROP, ALTER, TRUNCATE), and restrict database workspace access.
          </p>
        </div>

        <div class="glass-panel p-8 rounded-3xl space-y-4">
          <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-xl font-bold">📋</div>
          <h3 class="text-2xl font-bold text-slate-900 dark:text-white font-display">End-to-End Audit Trail</h3>
          <p class="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Every user prompt, generated SQL statement, IP address, user agent, and admin approval decision is stored in immutably logged security tables for compliance audits.
          </p>
        </div>

      </div>

      <!-- Compliance Banner -->
      <div class="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-slate-300 flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="space-y-2">
          <h4 class="text-xl font-bold text-white font-display">Need SOC2 or ISO 27001 Compliance Reports?</h4>
          <p class="text-xs text-slate-400 max-w-xl">
            AskDB Security whitepapers and compliance packages are available to enterprise security reviewers upon request.
          </p>
        </div>
        <a routerLink="/contact" class="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shrink-0">
          Request Security Package
        </a>
      </div>

    </div>
  `
})
export class SecurityPage {}
