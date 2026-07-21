import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { API_CONFIG } from '../config/api.config';
import { ThemeService } from '../services/theme.service';
import { MockConsoleService } from '../services/mock-console.service';
import { SessionTimeoutService } from '../services/session-timeout.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {

  get isMockMode(): boolean {
    return API_CONFIG.useMock;
  }

  email: string = '';
  password: string = '';
  errorMessage: string | null = null;
  warningMessage: string | null = null;

  showForgotModal: boolean = false;
  forgotEmail: string = '';
  forgotError: string | null = null;
  forgotSuccess: boolean = false;
  isSendingReset: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    public themeService: ThemeService,
    private mockConsoleService: MockConsoleService,
    private sessionService: SessionTimeoutService
  ) {}

  ngOnInit() {
    // ✅ Always stop session and clear warning when login page loads
    // This handles:
    // 1. Normal logout → redirect to login
    // 2. Auto timeout logout → redirect to login
    // 3. Manual navigation to login
    this.sessionService.stopSession();

    // ✅ Force hide any lingering warning popup
    // This prevents popup showing on login page after timeout redirect
    this.sessionService.dismissWarning();

    // Pre-populate email with the last logged-in user's email for locked-screen convenience
    const lastEmail = localStorage.getItem('askdb_last_email');
    if (lastEmail) {
      this.email = lastEmail;
    }
  }

  openForgotModal(event: Event): void {
    event.preventDefault();
    this.showForgotModal = true;
    this.forgotEmail = this.email;
    this.forgotError = null;
    this.forgotSuccess = false;
    this.isSendingReset = false;
  }

  closeForgotModal(): void {
    this.showForgotModal = false;
    this.forgotEmail = '';
    this.forgotError = null;
    this.forgotSuccess = false;
    this.isSendingReset = false;
  }

  submitForgot(): void {
    const emailInput = this.forgotEmail.trim();

    if (!emailInput) {
      this.forgotError = 'Please enter your corporate email address.';
      return;
    }

    if (
      !emailInput.endsWith('@cgi.com') &&
      !emailInput.endsWith('@test.com')
    ) {
      this.forgotError =
        'Please enter a valid corporate email address (e.g. @cgi.com).';
      return;
    }

    this.isSendingReset = true;
    this.forgotError = null;

    setTimeout(() => {
      this.isSendingReset = false;
      this.forgotSuccess = true;
    }, 100);
  }

  onLogin(): void {
    const input = this.email.trim();

    if (!input) {
      this.errorMessage = 'Please enter your corporate email address.';
      return;
    }

    if (!this.password || !this.password.trim()) {
      this.errorMessage = 'Please enter your password.';
      return;
    }

    this.authService.login(input, this.password).subscribe({
      next: (response) => {
        this.errorMessage = null;
        this.warningMessage =
          response.message && response.message !== 'Login successful'
            ? response.message
            : null;

        // ✅ Start session ONLY after successful login
        this.sessionService.startSession();

        this.router.navigate(['/work-space']);
      },
      error: (err) => {
        this.warningMessage = null;

        if (err?.status === 429) {
          this.errorMessage =
            err?.error?.message ||
            'Maximum concurrent sessions reached. Please logout from another device.';
        } else if (err?.status === 401) {
          this.errorMessage = 'Invalid email or password';
        } else {
          this.errorMessage =
            err?.error?.message || 'Login failed. Please try again.';
        }
      },
    });
  }

  openMockConsole(): void {
    this.mockConsoleService.open();
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }
}