import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminWorkspace } from '../admin-workspace/admin-workspace';
import { AuthService } from '../services/auth.service';
import { WorkspaceService, Workspace } from '../services/workspace.service';
import { API_CONFIG } from '../config/api.config';
import { ThemeService } from '../services/theme.service';
import { MockConsoleService } from '../services/mock-console.service';
import { ChangeDetectorRef } from '@angular/core';
import { SessionTimeoutService } from '../services/session-timeout.service'; // ✅ Add

@Component({
  selector: 'app-work-space',
  standalone: true, // ✅ Add
  imports: [CommonModule, FormsModule, AdminWorkspace],
  templateUrl: './work-space.html',
  styleUrl: './work-space.css',
})
export class WorkSpace implements OnInit, OnDestroy { // ✅ Add OnDestroy

  get isMockMode(): boolean {
    return API_CONFIG.useMock;
  }

  userName: string = '';
  userEmail: string = '';
  isAdmin: boolean = false;
  searchQuery: string = '';
  selectedEnv: string = 'All';

  // Toasts
  toastMessage: string | null = null;
  toastState: 'loading' | 'success' | null = null;

  // USER Dashboard Workspaces
  workspaces: Workspace[] = [];
  recentWorkspace: Workspace | null = null;

  // Connection Dialog Modal States
  showConnectModal: boolean = false;
  connectingWorkspace: Workspace | null = null;
  dbPasswordInput: string = '';
  rememberPassword: boolean = true;
  showPasswordText: boolean = false;
  isVerifyingConnection: boolean = false;
  connectError: string | null = null;
  connectSuccess: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private workspaceService: WorkspaceService,
    public themeService: ThemeService,
    private mockConsoleService: MockConsoleService,
    private cdr: ChangeDetectorRef,
    private sessionTimeoutService: SessionTimeoutService // ✅ Add
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userName = user.name;
      this.userEmail = user.email;
      this.isAdmin = user.role === 'admin';
    }

    if (this.isAdmin) {
      return;
    }

    this.workspaceService.getWorkspaces(this.userEmail).subscribe({
      next: (data) => {
        let mapped = data.map(w => ({
          ...w,
          lastAccessed: this.workspaceService.getRelativeTimeString(
            w.id,
            w.lastAccessed
          )
        }));

        try {
          const accessTimes = JSON.parse(
            localStorage.getItem('workspace_access_times') || '{}'
          );
          mapped.sort((a, b) => {
            const timeA = accessTimes[a.id] || 0;
            const timeB = accessTimes[b.id] || 0;
            return timeB - timeA;
          });
        } catch (e) {}

        this.workspaces = mapped;
        this.cdr.detectChanges();

        const recentId = this.workspaceService.getLastAccessedId();
        if (recentId) {
          this.recentWorkspace =
            this.workspaces.find(w => w.id === recentId) || null;
        }
        if (!this.recentWorkspace && this.workspaces.length > 0) {
          this.recentWorkspace = this.workspaces[0];
        }
      },
      error: (err) => {
        console.error('Failed to load workspaces:', err);
      }
    });
  }

  // ✅ Cleanup on destroy
  ngOnDestroy(): void {
    // Nothing needed here
    // Session timer continues running across routes
  }

  // --- USER DASHBOARD GETTERS ---
  get totalCount(): number {
    return this.workspaces.length;
  }

  get prodCount(): number {
    return this.workspaces.filter(w => w.env === 'Production').length;
  }

  get uatCount(): number {
    return this.workspaces.filter(w => w.env === 'UAT').length;
  }

  get devCount(): number {
    return this.workspaces.filter(w => w.env === 'Development').length;
  }

  get filteredWorkspaces(): Workspace[] {
    return this.workspaces.filter(w => {
      const matchesSearch =
        w.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        w.provider.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchesEnv =
        this.selectedEnv === 'All' || w.env === this.selectedEnv;
      return matchesSearch && matchesEnv;
    });
  }

  selectEnv(env: string): void {
    this.selectedEnv = env;
  }

  /**
   * Triggers the connection dialog modal.
   * - Retrieves specific database configuration from the workspace service.
   * - If a saved password exists, populates the input field.
   */
  openWorkspace(workspaceId: string): void {
    const ws = this.workspaces.find(w => w.id === workspaceId);
    if (!ws) return;

    this.connectingWorkspace = null;
    this.dbPasswordInput = '';
    this.connectError = null;
    this.connectSuccess = false;
    this.isVerifyingConnection = true;
    this.showConnectModal = true;
    this.rememberPassword = true;
    this.showPasswordText = false;

    this.workspaceService.getWorkspaceDetails(ws.id).subscribe({
      next: details => {
        this.isVerifyingConnection = false;
        this.connectingWorkspace = details;
        this.dbPasswordInput = details.dbPassword || '';
        this.rememberPassword = !!this.dbPasswordInput;
        this.cdr.detectChanges();
      },
      error: err => {
        this.isVerifyingConnection = false;
        this.connectError =
          err.message || 'Failed to retrieve database workspace details.';
      }
    });
  }

  /**
   * Initiates connection handshake verification against database workspace.
   * - Saves the input password to persistence if 'Remember for future sessions' is checked.
   * - Wipes stored password if unchecked.
   * - On success, redirects the user to the AI Chat viewport.
   */
  submitConnect(): void {
    if (!this.connectingWorkspace) return;

    this.isVerifyingConnection = true;
    this.connectError = null;

    const connectionData = {
      workspaceId: this.connectingWorkspace.id,
      workspaceName: this.connectingWorkspace.name,
      env: this.connectingWorkspace.env,
      provider: this.connectingWorkspace.provider,
      host: this.connectingWorkspace.host,
      port: this.connectingWorkspace.port,
      databaseName: this.connectingWorkspace.databaseName,
      username: this.connectingWorkspace.username,
      password: this.dbPasswordInput
    };

    this.workspaceService.testConnection(connectionData).subscribe({
      next: () => {
        // ✅ If rememberPassword is checked, store the password. Otherwise, clear any previously saved password.
        const passwordToSave = this.rememberPassword ? this.dbPasswordInput : '';
        this.workspaceService.updateWorkspacePassword(this.connectingWorkspace!.id, passwordToSave).subscribe({
          next: () => {
            this.isVerifyingConnection = false;
            this.connectSuccess = true;
            this.showConnectModal = false;
            this.router.navigate(['/ai-chat'], {
              queryParams: { id: this.connectingWorkspace?.id }
            });
          },
          error: err => {
            console.warn('Failed to update workspace password policy. Proceeding anyway.', err);
            this.isVerifyingConnection = false;
            this.connectSuccess = true;
            this.showConnectModal = false;
            this.router.navigate(['/ai-chat'], {
              queryParams: { id: this.connectingWorkspace?.id }
            });
          }
        });
      },
      error: err => {
        console.error('TEST CONNECTION FAILED', err);
        this.isVerifyingConnection = false;
        this.connectError =
          err.message || 'Connection failed. Please check your credentials.';
      }
    });
  }

  /**
   * Resets database workspace password credentials.
   * - Dispatches request to clear the saved credentials on the backend/mock registry.
   */
  forgetPassword(): void {
    if (!this.connectingWorkspace) return;
    this.dbPasswordInput = '';
    this.rememberPassword = false;

    this.workspaceService
      .updateWorkspacePassword(this.connectingWorkspace.id, '')
      .subscribe({
        next: () => {
          if (this.connectingWorkspace) {
            this.connectingWorkspace.dbPassword = '';
          }
          this.connectError = null;
          this.toastMessage = 'Saved password forgotten.';
          this.toastState = 'success';
          setTimeout(() => {
            this.toastMessage = null;
            this.toastState = null;
          }, 2000);
        },
        error: err => {
          this.connectError =
            err.message || 'Failed to forget saved password.';
        }
      });
  }

  closeConnectModal(): void {
    this.showConnectModal = false;
    this.connectingWorkspace = null;
    this.dbPasswordInput = '';
    this.connectError = null;
    this.connectSuccess = false;
    this.showPasswordText = false;
  }

  // ✅ Fixed logout - stops session properly
  logout(): void {
    this.sessionTimeoutService.logout(true);
  }

  openMockConsole(): void {
    this.mockConsoleService.open();
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }
}