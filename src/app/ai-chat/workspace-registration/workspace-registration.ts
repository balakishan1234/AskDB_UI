import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WorkspaceService } from '../../services/workspace.service';

@Component({
  selector: 'app-workspace-registration',
  imports: [CommonModule, FormsModule],
  templateUrl: './workspace-registration.html',
  styleUrl: './workspace-registration.css',
})
export class WorkspaceRegistration {
  @Output() onRegister = new EventEmitter<any>();
  @Output() onCancel = new EventEmitter<void>();

  // Form states
  workspaceName: string = '';
  environment: 'Production' | 'UAT' | 'Development' = 'Development';
  selectedDb: string = 'sqlserver';

  // DB Details
  serverName: string = '';
  databaseName: string = '';
  username: string = '';
  password: string = '';
  host: string = '';
  port: string = '';
  mongoUri: string = '';
  oracleService: string = '';
  sqlitePath: string = '';

  // Feedback states
  isTesting: boolean = false;
  toastMessage: string | null = null;
  toastState: 'success' | 'error' | null = null;

  constructor(private workspaceService: WorkspaceService) {}

  testConnection(): void {
    if (!this.workspaceName) {
      this.showToast('Please specify a Workspace Name first.', 'error');
      return;
    }

    this.isTesting = true;
    this.showToast('Verifying connection details with secure API...', null);

    const connectionDetails = {
      workspaceName: this.workspaceName,
      environment: this.environment,
      selectedDb: this.selectedDb,
      serverName: this.serverName,
      databaseName: this.databaseName,
      username: this.username,
      password: this.password,
      host: this.host,
      port: this.port,
      mongoUri: this.mongoUri,
      oracleService: this.oracleService,
      sqlitePath: this.sqlitePath
    };

    this.workspaceService.testConnection(connectionDetails).subscribe({
      next: () => {
        this.isTesting = false;
        this.showToast(`Successfully established secure connection to database!`, 'success');
      },
      error: (err) => {
        this.isTesting = false;
        this.showToast(err.message || 'Connection test failed.', 'error');
      }
    });
  }

  registerWorkspace(): void {
    if (!this.workspaceName.trim()) {
      this.showToast('Please enter a workspace name.', 'error');
      return;
    }

    let provider = 'SQL Server';
    if (this.selectedDb === 'postgres') provider = 'PostgreSQL';
    if (this.selectedDb === 'mongodb') provider = 'MongoDB';
    if (this.selectedDb === 'mysql') provider = 'MySQL';
    if (this.selectedDb === 'oracle') provider = 'Oracle';
    if (this.selectedDb === 'sqlite') provider = 'SQLite';

    const hostValue = (this.host.trim() || this.serverName.trim()) || 'localhost';
    const defaultPort = this.selectedDb === 'mysql' ? '3306' : this.selectedDb === 'postgres' ? '5432' : this.selectedDb === 'oracle' ? '1521' : '1433';
    const portValue = this.port.trim() || defaultPort;

    const newWorkspace = {
      id: 'w_' + Date.now(),
      name: this.workspaceName.trim(),
      provider: provider,
      env: this.environment,
      host: hostValue,
      port: portValue,
      databaseName: this.databaseName.trim(),
      username: this.username.trim(),
      dbPassword: this.password,
      tables: Math.floor(Math.random() * 100) + 15,
      schemas: Math.floor(Math.random() * 10) + 2,
      lastAccessed: 'Just now'
    };

    this.onRegister.emit(newWorkspace);
    this.resetForm();
  }

  cancel(): void {
    this.onCancel.emit();
  }

  private showToast(msg: string, state: 'success' | 'error' | null): void {
    this.toastMessage = msg;
    this.toastState = state;
    if (state) {
      setTimeout(() => {
        if (this.toastMessage === msg) {
          this.toastMessage = null;
          this.toastState = null;
        }
      }, 4000);
    }
  }

  private resetForm(): void {
    this.workspaceName = '';
    this.environment = 'Development';
    this.selectedDb = 'sqlserver';
    this.serverName = '';
    this.databaseName = '';
    this.username = '';
    this.password = '';
    this.host = '';
    this.port = '';
    this.mongoUri = '';
    this.oracleService = '';
    this.sqlitePath = '';
  }
}
