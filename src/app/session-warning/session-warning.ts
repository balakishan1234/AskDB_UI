import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SessionTimeoutService } from '../services/session-timeout.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-session-warning',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './session-warning.html',
  styleUrl: './session-warning.css'
})
export class SessionWarningComponent implements OnInit, OnDestroy {
  showModal = false; // ✅ Must be false by default
  countdown = 0;
  
  password = '';
  isVerifying = false;
  errorMessage: string | null = null;
  showPasswordText = false;

  userName = '';
  userEmail = '';
  userInitial = '';

  private countdownInterval: any;
  private subs = new Subscription();

  constructor(
    private sessionService: SessionTimeoutService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.subs.add(this.sessionService.onWarning.subscribe(() => {
      this.showModal = true;
      this.password = '';
      this.errorMessage = null;
      this.showPasswordText = false;
      
      const user = this.authService.getCurrentUser();
      this.userName = user?.userName || 'Enterprise User';
      this.userEmail = user?.email || '';
      this.userInitial = this.userName.charAt(0).toUpperCase();

      this.startCountdown();
      this.cdr.detectChanges(); // Force repaint when popup triggers
    }));

    this.subs.add(this.sessionService.onTimeout.subscribe(() => {
      this.closeModal();
      this.cdr.detectChanges();
    }));

    this.subs.add(this.sessionService.onDismiss.subscribe(() => {
      this.closeModal();
      this.cdr.detectChanges();
    }));
  }

  startCountdown() {
    this.countdown = this.sessionService.getWarningSeconds();
    if (this.countdownInterval) clearInterval(this.countdownInterval);

    this.countdownInterval = setInterval(() => {
      this.countdown--;
      this.cdr.detectChanges(); // Force repaint of countdown text
      if (this.countdown <= 0) {
        this.clearCountdown();
      }
    }, 1000);
  }

  closeModal() {
    this.showModal = false;
    this.password = '';
    this.errorMessage = null;
    this.showPasswordText = false;
    this.clearCountdown();
  }

  clearCountdown() {
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }

  stayLoggedIn() {
    const email = this.authService.getCurrentUser()?.email;
    if (!email) {
      this.errorMessage = 'Active session email not found. Please log in again.';
      this.cdr.detectChanges();
      return;
    }

    const trimmedPassword = this.password.trim();
    if (!trimmedPassword) {
      this.errorMessage = 'Please enter your password.';
      this.cdr.detectChanges();
      return;
    }

    this.isVerifying = true;
    this.errorMessage = null;
    this.cdr.detectChanges();

    this.authService.login(email, trimmedPassword).subscribe({
      next: () => {
        this.isVerifying = false;
        this.closeModal();
        this.sessionService.resetTimer(true); // Force reset the timer since they successfully verified
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isVerifying = false;
        if (err?.status === 401) {
          this.errorMessage = 'Invalid password. Please try again.';
        } else {
          this.errorMessage = err?.error?.message || 'Verification failed. Please try again.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  logoutNow() {
    this.closeModal();
    this.sessionService.logout(true);
    this.cdr.detectChanges();
  }

  togglePasswordVisibility() {
    this.showPasswordText = !this.showPasswordText;
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    this.clearCountdown();
  }
}