import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class SessionTimeoutService {

  onWarning = new Subject<void>();
  onTimeout = new Subject<void>();
  onDismiss = new Subject<void>(); // ✅ NEW - force hide warning popup

  private testMode = true; //true for testing , false for production

  private productionTimeout = 30 * 60 * 1000; // 30 minutes
  private productionWarning = 60 * 1000;       // 60 seconds

  private testTimeout = 30 * 1000; // 30 seconds
  private testWarning = 10 * 1000; // 10 seconds

  private get timeoutDuration(): number {
    return this.testMode ? this.testTimeout : this.productionTimeout;
  }

  private get warningDuration(): number {
    return this.testMode ? this.testWarning : this.productionWarning;
  }

  private timeoutTimer: any;
  private warningTimer: any;

  // ✅ Controls active timer session
  private isLoggedIn = false;
  private isWarningActive = false;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    // Listen for session clear notifications from auth service (e.g., cross-tab logout)
    this.authService.onSessionCleared.subscribe(() => {
      this.logout(false);
    });

    // Start session tracking if already logged in on service instantiation (e.g. page refresh)
    if (this.authService.isLoggedIn()) {
      this.startSession();
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === 'askdb_last_activity' && event.newValue) {
          this.resetTimer(false, true);
        }
      });
    }
  }

  // ✅ Get warning seconds for countdown display
  getWarningSeconds(): number {
    return this.warningDuration / 1000;
  }

  /**
   * Spawns timers upon successful user login.
   * Initializes isLoggedIn state tracker.
   */
  startSession() {
    this.isLoggedIn = true;
    this.isWarningActive = false;
    this.resetTimer(true);
  }

  /**
   * Resets timeouts on user activity (mouse movement, key presses, clicks, or requests).
   * - Records time of activity in localStorage for cross-tab synchrony.
   * - Schedules `warningTimer` to open warning dialog.
   * - Schedules `timeoutTimer` to automatically sign the user out.
   */
  resetTimer(force = false, fromStorage = false) {
    if (!this.isLoggedIn) return;
    if (this.isWarningActive && !force && !fromStorage) return;

    clearTimeout(this.timeoutTimer);
    clearTimeout(this.warningTimer);

    if (this.isWarningActive && fromStorage) {
      this.dismissWarning();
    }

    if (!fromStorage && typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem('askdb_last_activity', Date.now().toString());
    }

    // Fire warning before timeout
    this.warningTimer = setTimeout(() => {
      this.isWarningActive = true;
      this.onWarning.next();
    }, this.timeoutDuration - this.warningDuration);

    // Fire logout at timeout
    this.timeoutTimer = setTimeout(() => {
      this.onTimeout.next();
      this.logout(false);
    }, this.timeoutDuration);
  }

  /**
   * Invalidates active timers and switches state tracking flags off.
   */
  stopSession() {
    this.isLoggedIn = false;
    this.isWarningActive = false;
    clearTimeout(this.timeoutTimer);
    clearTimeout(this.warningTimer);
  }

  // ✅ Force hide warning popup
  dismissWarning() {
    this.isWarningActive = false;
    this.onDismiss.next();
  }

  /**
   * Handles user session logouts.
   * - Stops active timeout timers.
   * - Clears credentials locally, dispatches backend sign out if `explicit` is checked, and redirects user to `/login`.
   */
  logout(explicit = false) {
    if (!this.isLoggedIn) return;
    this.stopSession();
    if (explicit) {
      this.authService.logout().subscribe({
        next: () => this.router.navigate(['/login']),
        error: (err) => {
          console.warn('Logout request failed. Redirecting to login anyway.', err);
          this.router.navigate(['/login']);
        }
      });
    } else {
      this.authService.clearLocalSession();
      this.router.navigate(['/login']);
    }
  }
}