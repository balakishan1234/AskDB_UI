import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
      
      <div class="text-center space-y-3">
        <span class="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 text-xs font-bold uppercase tracking-wider">Mission & Vision</span>
        <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white font-display">Democratizing Enterprise Data Safely</h1>
        <p class="text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
          AskDB empowers every business team member to extract insights from relational and document databases in plain English without exposing enterprise infrastructure.
        </p>
      </div>

      <div class="glass-panel p-8 rounded-3xl space-y-6 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <h3 class="text-xl font-bold text-slate-900 dark:text-white font-display">Why AskDB Was Built</h3>
        <p>
          Traditional business intelligence tools either require complex SQL writing skills or produce rigid static dashboards. AskDB bridges the gap by allowing users to ask freeform questions while retaining strict administrator-governed access control.
        </p>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          <div class="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <h4 class="font-bold text-slate-900 dark:text-white text-xs uppercase text-blue-500">Zero Trust Access</h4>
            <p class="text-xs text-slate-500 mt-1">Manual approval workflow ensures only verified employees receive account credentials.</p>
          </div>
          <div class="p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <h4 class="font-bold text-slate-900 dark:text-white text-xs uppercase text-indigo-500">Multi-Database Support</h4>
            <p class="text-xs text-slate-500 mt-1">Connect SQL Server, PostgreSQL, Oracle, and MongoDB seamlessly in one unified console.</p>
          </div>
        </div>
      </div>

    </div>
  `
})
export class AboutPage {}
