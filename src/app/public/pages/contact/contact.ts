import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-12">
      
      <div class="text-center space-y-3 max-w-2xl mx-auto">
        <span class="px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 text-xs font-bold uppercase tracking-wider">Enterprise Engagement</span>
        <h1 class="text-4xl font-extrabold text-slate-900 dark:text-white font-display">Get in Touch with AskDB</h1>
        <p class="text-sm text-slate-600 dark:text-slate-400">Have questions about custom database connectors, on-premise installation, or enterprise SLA plans?</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        <!-- Contact Information Cards -->
        <div class="space-y-4 md:col-span-1">
          <div class="glass-panel p-6 rounded-3xl space-y-2">
            <h4 class="font-bold text-slate-900 dark:text-white text-sm">Enterprise Sales</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400">sales&#64;askdb.com</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">+1 (800) 555-ASKDB</p>
          </div>

          <div class="glass-panel p-6 rounded-3xl space-y-2">
            <h4 class="font-bold text-slate-900 dark:text-white text-sm">Security & Support</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400">secops&#64;askdb.com</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">Response time: &lt; 2 hours</p>
          </div>

          <div class="glass-panel p-6 rounded-3xl space-y-2">
            <h4 class="font-bold text-slate-900 dark:text-white text-sm">Global Headquarters</h4>
            <p class="text-xs text-slate-500 dark:text-slate-400">100 Tech Enterprise Way<br>San Francisco, CA 94107</p>
          </div>
        </div>

        <!-- Contact Form -->
        <div class="glass-panel p-8 rounded-3xl md:col-span-2 border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 class="text-xl font-bold text-slate-900 dark:text-white font-display">Send a Direct Message</h3>

          <div *ngIf="sentSuccess" class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold animate-fade-in">
            ✓ Message received! An enterprise solutions engineer will respond shortly.
          </div>

          <form (submit)="submitForm()" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Your Name *</label>
                <input [(ngModel)]="name" name="name" required type="text" placeholder="John Doe" class="w-full modern-input rounded-xl px-3.5 py-2 text-xs" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Corporate Email *</label>
                <input [(ngModel)]="email" name="email" required type="email" placeholder="john@company.com" class="w-full modern-input rounded-xl px-3.5 py-2 text-xs" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
              <input [(ngModel)]="subject" name="subject" type="text" placeholder="e.g. Enterprise Licensing & SLA Inquiry" class="w-full modern-input rounded-xl px-3.5 py-2 text-xs" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Message *</label>
              <textarea [(ngModel)]="message" name="message" required rows="4" placeholder="How can we help your team?" class="w-full modern-input rounded-xl px-3.5 py-2 text-xs"></textarea>
            </div>

            <button type="submit" [disabled]="!name || !email || !message" class="w-full py-3 rounded-xl btn-gradient text-white text-xs font-bold shadow-md disabled:opacity-40">
              Send Enterprise Message →
            </button>
          </form>
        </div>

      </div>

    </div>
  `
})
export class ContactPage {
  name = '';
  email = '';
  subject = '';
  message = '';
  sentSuccess = false;

  submitForm(): void {
    if (this.name && this.email && this.message) {
      this.sentSuccess = true;
      this.name = '';
      this.email = '';
      this.subject = '';
      this.message = '';
    }
  }
}
