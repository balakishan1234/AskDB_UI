import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MockConsole } from './mock-console/mock-console';
import { MockConsoleService } from './services/mock-console.service';
import { SessionWarningComponent } from './session-warning/session-warning';
import { SessionTimeoutService } from './services/session-timeout.service';
import { filter, Subscription } from 'rxjs';

import { NavbarComponent } from './public/components/navbar/navbar';
import { FooterComponent } from './public/components/footer/footer';
import { ChatbotComponent } from './public/components/chatbot/chatbot';
import { CommandPaletteComponent } from './public/components/command-palette/command-palette';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    MockConsole,
    SessionWarningComponent,
    NavbarComponent,
    FooterComponent,
    ChatbotComponent,
    CommandPaletteComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  isPublicPage = true;
  isCommandPaletteOpen = false;
  scrollProgress = 0;
  private routerSub!: Subscription;

  constructor(
    public mockConsoleService: MockConsoleService,
    private sessionService: SessionTimeoutService,
    private router: Router
  ) {}

  ngOnInit() {
    this.routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects || event.url || '/';
      const internalRoutes = ['/work-space', '/ai-chat', '/login'];
      this.isPublicPage = !internalRoutes.some(r => url.startsWith(r));
    });
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    const totalHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    if (totalHeight > 0) {
      this.scrollProgress = Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100));
    }
  }

  @HostListener('document:mousemove')
  @HostListener('document:keypress')
  @HostListener('document:click')
  onUserActivity() {
    if (!this.isPublicPage) {
      this.sessionService.resetTimer();
    }
  }

  openCommandPalette(): void {
    this.isCommandPaletteOpen = true;
  }

  closeCommandPalette(): void {
    this.isCommandPaletteOpen = false;
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
  }
}