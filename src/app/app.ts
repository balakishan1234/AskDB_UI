import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MockConsole } from './mock-console/mock-console';
import { MockConsoleService } from './services/mock-console.service';
import { SessionWarningComponent } from './session-warning/session-warning';
import { SessionTimeoutService } from './services/session-timeout.service';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, MockConsole, SessionWarningComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  private isLoginPage = false;
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
      this.isLoginPage = event.urlAfterRedirects === '/login' || event.urlAfterRedirects === '/';
    });
  }

  @HostListener('document:mousemove')
  @HostListener('document:keypress')
  @HostListener('document:click')
  onUserActivity() {
    if (!this.isLoginPage) {
      this.sessionService.resetTimer();
    }
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
  }
}