import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16">
      
      <!-- Pricing Header -->
      <div class="text-center space-y-4 max-w-3xl mx-auto">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold uppercase tracking-wider">
          <span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span>Coming Soon — Commercial Licensing</span>
        </div>
        <h1 class="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white font-display">
          Simple, Transparent <span class="glow-text-gradient">Enterprise Pricing</span>
        </h1>
        <p class="text-slate-600 dark:text-slate-300 text-base leading-relaxed">
          Scale natural language database intelligence across your entire organization. Custom deployments available.
        </p>
      </div>

      <!-- Pricing Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        <!-- Starter Tier -->
        <div class="glass-panel p-8 rounded-3xl space-y-6 border border-slate-200 dark:border-slate-800 hover-lift relative flex flex-col justify-between">
          <div class="space-y-4">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Starter</span>
            <div class="flex items-baseline gap-1">
              <span class="text-4xl font-extrabold text-slate-900 dark:text-white font-display">₹1,000</span>
              <span class="text-sm text-slate-400">/month (~$15)</span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400">Ideal for small engineering & business intelligence pods.</p>

            <ul class="space-y-3 pt-4 text-xs text-slate-600 dark:text-slate-300">
              <li class="flex items-center gap-2">
                <span class="text-blue-500 font-bold">✓</span> Internal Teams
              </li>
              <li class="flex items-center gap-2">
                <span class="text-blue-500 font-bold">✓</span> Up to 5 Active Users
              </li>
              <li class="flex items-center gap-2">
                <span class="text-blue-500 font-bold">✓</span> Standard Email Support
              </li>
              <li class="flex items-center gap-2">
                <span class="text-blue-500 font-bold">✓</span> ANSI SQL Engine & Export
              </li>
            </ul>
          </div>

          <a routerLink="/request-access" class="w-full text-center py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-xs transition-colors">
            Request Starter Access
          </a>
        </div>

        <!-- Professional Tier (Featured) -->
        <div class="glass-panel p-8 rounded-3xl space-y-6 border-2 border-blue-500/80 hover-lift relative flex flex-col justify-between shadow-2xl shadow-blue-500/10">
          <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-md">
            Most Popular
          </div>

          <div class="space-y-4 pt-2">
            <span class="text-xs font-bold uppercase tracking-wider text-blue-500">Professional</span>
            <div class="flex items-baseline gap-1">
              <span class="text-4xl font-extrabold text-slate-900 dark:text-white font-display">₹2,500</span>
              <span class="text-sm text-slate-400">/month (~$30)</span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400">Designed for growing departments requiring advanced analytics.</p>

            <ul class="space-y-3 pt-4 text-xs text-slate-600 dark:text-slate-300">
              <li class="flex items-center gap-2">
                <span class="text-blue-500 font-bold">✓</span> Up to 25 Active Users
              </li>
              <li class="flex items-center gap-2">
                <span class="text-blue-500 font-bold">✓</span> Advanced Query Analytics
              </li>
              <li class="flex items-center gap-2">
                <span class="text-blue-500 font-bold">✓</span> Priority Support Response
              </li>
              <li class="flex items-center gap-2">
                <span class="text-blue-500 font-bold">✓</span> Custom Schema Visualizer
              </li>
              <li class="flex items-center gap-2">
                <span class="text-blue-500 font-bold">✓</span> Multi-Database Connectors
              </li>
            </ul>
          </div>

          <a routerLink="/request-access" class="w-full text-center py-3 rounded-xl btn-gradient text-white font-semibold text-xs shadow-md hover-lift">
            Get Started with Pro
          </a>
        </div>

        <!-- Enterprise Tier -->
        <div class="glass-panel p-8 rounded-3xl space-y-6 border border-slate-200 dark:border-slate-800 hover-lift relative flex flex-col justify-between">
          <div class="space-y-4">
            <span class="text-xs font-bold uppercase tracking-wider text-purple-500">Enterprise</span>
            <div class="flex items-baseline gap-1">
              <span class="text-4xl font-extrabold text-slate-900 dark:text-white font-display">Custom</span>
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400">Tailored for large enterprises with custom SLA and dedicated infrastructure.</p>

            <ul class="space-y-3 pt-4 text-xs text-slate-600 dark:text-slate-300">
              <li class="flex items-center gap-2">
                <span class="text-purple-500 font-bold">✓</span> Unlimited Enterprise Users
              </li>
              <li class="flex items-center gap-2">
                <span class="text-purple-500 font-bold">✓</span> Dedicated Account Manager & SLA
              </li>
              <li class="flex items-center gap-2">
                <span class="text-purple-500 font-bold">✓</span> On-Premise / Hybrid Deployment
              </li>
              <li class="flex items-center gap-2">
                <span class="text-purple-500 font-bold">✓</span> Custom Connector Integrations
              </li>
              <li class="flex items-center gap-2">
                <span class="text-purple-500 font-bold">✓</span> SOC2 & HIPAA Compliance Package
              </li>
            </ul>
          </div>

          <a routerLink="/contact" class="w-full text-center py-3 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors">
            Contact Sales
          </a>
        </div>

      </div>

    </div>
  `
})
export class PricingPage {}
