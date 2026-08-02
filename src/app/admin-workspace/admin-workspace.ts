import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { WorkspaceService, AppUser, UserWorkspace, Workspace } from '../services/workspace.service';
import { API_CONFIG } from '../config/api.config';
import { ThemeService } from '../services/theme.service';
import { SessionService } from '../services/session.service';
import { MockConsoleService } from '../services/mock-console.service';
import { SessionTimeoutService } from '../services/session-timeout.service';
import { AccessRequestService, AccessRequest } from '../services/access-request.service';

@Component({
  selector: 'app-admin-workspace',
  standalone: true, // ✅ Add this
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-workspace.html',
  styleUrl: './admin-workspace.css',
})
export class AdminWorkspace implements OnInit {

  get isMockMode(): boolean {
    return API_CONFIG.useMock;
  }

  userName: string = 'System Administrator';
  userEmail: string = 'admin@cgi.com';

  // ADMIN Dashboard Variables
  users: AppUser[] = [];
  selectedUser: AppUser | null = null;
  adminUserSearch: string = '';
  activeAdminView: 'users' | 'workspaces' | 'my-workspaces' | 'requests' = 'workspaces';
  globalWorkspaces: any[] = [];

  // Access Requests Tab Variables
  requestSearchQuery: string = '';
  requestTabFilter: 'Pending' | 'Approved' | 'Rejected' | 'Expired' | 'All' = 'Pending';
  selectedAccessRequest: AccessRequest | null = null;
  showRequestDetailsModal: boolean = false;
  showRejectModal: boolean = false;
  rejectionReasonInput: string = '';
  showEmailTemplateModal: boolean = false;
  previewEmailType: 'request_received' | 'new_admin_notification' | 'approved' | 'rejected' | 'welcome' | 'password_reset' = 'approved';
  previewEmailHtml: string = '';

  // My Workspaces Tab Variables
  myWorkspaces: Workspace[] = [];
  myWorkspacesSearchQuery: string = '';
  myWorkspacesSelectedEnv: string = 'All';

  // Connection Dialog Modal States
  showConnectModal: boolean = false;
  connectingWorkspace: Workspace | null = null;
  dbPasswordInput: string = '';
  rememberPassword: boolean = true;
  showPasswordText: boolean = false;
  isVerifyingConnection: boolean = false;
  connectError: string | null = null;
  connectSuccess: boolean = false;
  toastMessage: string | null = null;
  toastState: 'loading' | 'success' | null = null;
  adminWorkspaces: Workspace[] = [];
  showCreateWsModal: boolean = false;
  private workspaceRegistryLoading: boolean = false;
  private workspaceRegistryLoaded: boolean = false;
  private needsFallbackUserFromRegistry: boolean = false;
  private currentSessionUserId: string = '1';
  editingWorkspaceId: string | null = null;

  // Modals management
  showAddUserModal: boolean = false;
  showAddWsModal: boolean = false;
  showUserPermissionsModal: boolean = false;
  isSavingUserPermissions: boolean = false;

  // Add User Form
  newUserName: string = '';
  newUserEmail: string = '';
  newUserError: string | null = null;
  selectedRegWsIds: string[] = [];
  selectedRegAccess: 'Admin' | 'User' = 'User';

  // Create Global Workspace Form
  createWsName: string = '';
  createWsProvider: string = 'SQL Server';
  createWsEnv: 'Production' | 'UAT' | 'Development' = 'Production';
  createWsTables: number = 24;
  createWsSchemas: number = 4;
  createWsHost: string = '';
  createWsPort: string = '';
  createWsDbName: string = '';
  createWsUsername: string = '';
  createWsMongoUri: string = '';
  createWsOracleService: string = '';
  createWsSqlitePath: string = '';
  createWsError: string | null = null;

  // Assign Workspace Form
  assignSelectedWsId: string = '';
  assignAccessLevel: 'Admin' | 'User' = 'User';
  assignWsError: string | null = null;
  isLogoutAllLoading: boolean = false;

  get assignableWorkspaces(): any[] {
    return this.adminWorkspaces.length > 0
      ? this.adminWorkspaces
      : this.globalWorkspaces;
  }

  get availableWorkspacesForSelectedUser(): any[] {
    if (!this.selectedUser) {
      return this.assignableWorkspaces;
    }
    const assignedWorkspaceIds = new Set(
      (this.selectedUser.workspaces || []).map(w => `${w.id}`.trim())
    );
    return this.assignableWorkspaces.filter(
      w => !assignedWorkspaceIds.has(`${w.id}`.trim())
    );
  }

  constructor(
    private router: Router,
    private authService: AuthService,
    private sessionService: SessionService,
    private workspaceService: WorkspaceService,
    public themeService: ThemeService,
    private mockConsoleService: MockConsoleService,
    private cdr: ChangeDetectorRef,
    private sessionTimeoutService: SessionTimeoutService,
    public accessRequestService: AccessRequestService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userName = user.name;
      this.userEmail = user.email;
      this.currentSessionUserId = user.userId?.toString() || '1';
    }

    this.loadWorkspaceRegistry();
    this.loadMyWorkspaces();

    this.workspaceService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        if (this.users.length > 0) {
          this.selectedUser = this.users[0];
          return;
        }
        this.needsFallbackUserFromRegistry = true;
        this.populateFallbackCurrentUserFromRegistry();
      },
      error: (err) => {
        console.error('Failed to load admin users:', err);
      }
    });
  }

  setActiveAdminView(view: 'users' | 'workspaces' | 'my-workspaces' | 'requests'): void {
    this.activeAdminView = view;
    if (view === 'workspaces') {
      this.loadWorkspaceRegistry();
    } else if (view === 'my-workspaces') {
      this.loadMyWorkspaces();
    }
  }

  loadMyWorkspaces(): void {
    this.workspaceService.getWorkspaces(this.userEmail).subscribe({
      next: (data) => {
        this.myWorkspaces = data.map(w => ({
          ...w,
          lastAccessed: this.workspaceService.getRelativeTimeString(
            w.id,
            w.lastAccessed
          )
        }));
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load my workspaces:', err);
      }
    });
  }

  private loadWorkspaceRegistry(): void {
    if (this.workspaceRegistryLoading) return;
    if (
      this.workspaceRegistryLoaded &&
      this.assignableWorkspaces.length > 0
    ) {
      if (this.needsFallbackUserFromRegistry) {
        this.populateFallbackCurrentUserFromRegistry();
      }
      return;
    }

    this.workspaceRegistryLoading = true;
    this.workspaceService.getGlobalWorkspaces().subscribe({
      next: (data) => {
        const normalized = Array.isArray(data) ? data : [];
        this.globalWorkspaces = [...normalized];
        this.adminWorkspaces = [...normalized];
        this.workspaceRegistryLoaded = true;
        this.workspaceRegistryLoading = false;

        if (
          !this.assignSelectedWsId &&
          this.assignableWorkspaces.length > 0
        ) {
          this.assignSelectedWsId = this.assignableWorkspaces[0].id;
        }

        if (this.needsFallbackUserFromRegistry) {
          this.populateFallbackCurrentUserFromRegistry();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.workspaceRegistryLoading = false;
        console.error('Failed to load global workspaces:', err);
      }
    });
  }

  private populateFallbackCurrentUserFromRegistry(): void {
    if (this.users.length > 0) {
      this.needsFallbackUserFromRegistry = false;
      return;
    }

    const source = this.assignableWorkspaces || [];
    if (source.length === 0) return;

    const fallbackWorkspaces: UserWorkspace[] = source.map((w: any) => ({
      id: w.id,
      name: w.name,
      provider: w.provider || 'SQL Server',
      env: w.env || 'Development',
      accessLevel: (w.accessLevel || 'Admin') as 'Admin' | 'User',
      tables: w.tables,
      schemas: w.schemas,
      host: w.host,
      port: w.port,
      databaseName: w.databaseName,
      username: w.username,
      mongoUri: w.mongoUri,
      oracleService: w.oracleService,
      sqlitePath: w.sqlitePath,
      dbPassword: w.dbPassword
    }));

    const fallbackUser: AppUser = {
      id: this.currentSessionUserId,
      name: this.userName || 'Current User',
      email: this.userEmail || '',
      workspaces: fallbackWorkspaces
    };

    this.users = [fallbackUser];
    this.selectedUser = fallbackUser;
    this.needsFallbackUserFromRegistry = false;
    this.cdr.detectChanges();
  }

  get totalActiveAssignments(): number {
    return this.users.reduce(
      (sum, user) => sum + (user.workspaces?.length || 0),
      0
    );
  }

  get filteredUsers(): AppUser[] {
    return this.users.filter(u => {
      const q = this.adminUserSearch.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    });
  }

  selectUser(user: AppUser): void {
    this.selectedUser = user;
    this.closeAllModals();
  }

  openUserPermissionsModal(): void {
    if (!this.selectedUser) return;
    this.assignWsError = null;
    this.assignAccessLevel = 'User';
    const availableWorkspaces = this.availableWorkspacesForSelectedUser;
    this.assignSelectedWsId =
      availableWorkspaces.length > 0 ? availableWorkspaces[0].id : '';
    this.showUserPermissionsModal = true;
  }

  addUser(): void {
    this.newUserName = this.newUserName.trim();
    this.newUserEmail = this.newUserEmail.trim();

    if (!this.newUserName || !this.newUserEmail) {
      this.newUserError = 'Please fill out all fields.';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.newUserEmail)) {
      this.newUserError = 'Please enter a valid email address.';
      return;
    }

    const userWorkspaces: UserWorkspace[] = this.selectedRegWsIds.map(wsId => {
      const globalWs = this.assignableWorkspaces.find(w => w.id === wsId);
      return {
        id: wsId,
        name: globalWs ? globalWs.name : 'Workspace',
        provider: globalWs ? globalWs.provider : 'SQL Server',
        env: globalWs ? globalWs.env : 'Production',
        accessLevel: this.selectedRegAccess,
        tables: globalWs ? globalWs.tables : 24,
        schemas: globalWs ? globalWs.schemas : 4,
        host: globalWs?.host || '',
        port: globalWs?.port || '',
        databaseName: globalWs?.databaseName || '',
        username: globalWs?.username || '',
        mongoUri: globalWs?.mongoUri || '',
        oracleService: globalWs?.oracleService || '',
        sqlitePath: globalWs?.sqlitePath || ''
      };
    });

    const newUser: AppUser = {
      id: 'u_' + Date.now(),
      name: this.newUserName,
      email: this.newUserEmail.toLowerCase(),
      workspaces: userWorkspaces
    };

    this.workspaceService.addUser(newUser).subscribe({
      next: addedUser => {
        this.users.push(addedUser);
        this.selectedUser = addedUser;
        this.showAddUserModal = false;
        this.resetAddUserForm();
      },
      error: err => {
        this.newUserError = err.message || 'Failed to add user.';
      }
    });
  }

  deleteUser(userId: string): void {
    if (
      confirm(
        'Are you sure you want to delete this user? All their workspace associations will be removed.'
      )
    ) {
      this.workspaceService.deleteUser(userId).subscribe({
        next: () => {
          this.users = this.users.filter(u => u.id !== userId);
          if (this.selectedUser?.id === userId) {
            this.selectedUser =
              this.users.length > 0 ? this.users[0] : null;
          }
        },
        error: err => {
          console.error('Failed to delete user:', err);
        }
      });
    }
  }

  resetAddUserForm(): void {
    this.newUserName = '';
    this.newUserEmail = '';
    this.newUserError = null;
    this.selectedRegWsIds = [];
    this.selectedRegAccess = 'User';
  }

  toggleRegWs(wsId: string): void {
    const idx = this.selectedRegWsIds.indexOf(wsId);
    if (idx > -1) {
      this.selectedRegWsIds.splice(idx, 1);
    } else {
      this.selectedRegWsIds.push(wsId);
    }
  }

  isRegWsSelected(wsId: string): boolean {
    return this.selectedRegWsIds.includes(wsId);
  }

  selectAllRegWs(): void {
    this.selectedRegWsIds = this.assignableWorkspaces.map(w => w.id);
  }

  clearAllRegWs(): void {
    this.selectedRegWsIds = [];
  }

  addWorkspace(): void {
    if (!this.selectedUser) {
      this.assignWsError = 'No user selected.';
      return;
    }

    if (!this.assignSelectedWsId) {
      this.assignWsError = 'Please select a workspace.';
      return;
    }

    const globalWs = this.assignableWorkspaces.find(
      w => `${w.id}`.trim() === `${this.assignSelectedWsId}`.trim()
    );

    if (!globalWs) {
      this.assignWsError = 'Selected workspace not found.';
      return;
    }

    if (
      this.selectedUser.workspaces.some(
        w => `${w.id}`.trim() === `${globalWs.id}`.trim()
      )
    ) {
      this.assignWsError =
        'This database workspace is already assigned to this user.';
      return;
    }

    const newWs: UserWorkspace = {
      id: globalWs.id,
      name: globalWs.name,
      provider: globalWs.provider,
      env: globalWs.env,
      accessLevel: this.assignAccessLevel,
      tables: globalWs.tables,
      schemas: globalWs.schemas,
      host: globalWs.host || '',
      port: globalWs.port || '',
      databaseName: globalWs.databaseName || '',
      username: globalWs.username || '',
      mongoUri: globalWs.mongoUri || '',
      oracleService: globalWs.oracleService || '',
      sqlitePath: globalWs.sqlitePath || ''
    };

    const updatedWorkspaces = [
      ...(this.selectedUser.workspaces || []),
      newWs
    ];
    this.persistSelectedUserWorkspaceAssignments(updatedWorkspaces, false);
  }

  removeWorkspaceFromUser(workspaceId: string): void {
    if (!this.selectedUser) {
      this.assignWsError = 'No user selected.';
      return;
    }

    const updatedWorkspaces = this.selectedUser.workspaces.filter(
      w => `${w.id}`.trim() !== `${workspaceId}`.trim()
    );
    this.persistSelectedUserWorkspaceAssignments(updatedWorkspaces, false);
  }

  resetAddWsForm(): void {
    this.assignSelectedWsId =
      this.availableWorkspacesForSelectedUser.length > 0
        ? this.availableWorkspacesForSelectedUser[0].id
        : '';
    this.assignAccessLevel = 'User';
    this.assignWsError = null;
  }

  saveUserPermissions(): void {
    if (!this.selectedUser) return;

    const updatedWorkspaces = [...(this.selectedUser.workspaces || [])];

    if (this.assignSelectedWsId) {
      const selectedWorkspace = this.assignableWorkspaces.find(
        w => `${w.id}`.trim() === `${this.assignSelectedWsId}`.trim()
      );
      const isAlreadyAssigned = updatedWorkspaces.some(
        w => `${w.id}`.trim() === `${this.assignSelectedWsId}`.trim()
      );

      if (selectedWorkspace && !isAlreadyAssigned) {
        updatedWorkspaces.push({
          id: selectedWorkspace.id,
          name: selectedWorkspace.name,
          provider: selectedWorkspace.provider,
          env: selectedWorkspace.env,
          accessLevel: this.assignAccessLevel,
          tables: selectedWorkspace.tables,
          schemas: selectedWorkspace.schemas,
          host: selectedWorkspace.host || '',
          port: selectedWorkspace.port || '',
          databaseName: selectedWorkspace.databaseName || '',
          username: selectedWorkspace.username || ''
        });
      }
    }

    this.persistSelectedUserWorkspaceAssignments(updatedWorkspaces, true);
  }

  private persistSelectedUserWorkspaceAssignments(
    updatedWorkspaces: UserWorkspace[],
    closeOnSuccess: boolean
  ): void {
    if (!this.selectedUser) {
      this.assignWsError = 'No user selected.';
      return;
    }

    const selectedUserRef = this.selectedUser;
    this.isSavingUserPermissions = true;
    this.assignWsError = null;

    this.workspaceService
      .updateUserWorkspaceAssignments(
        selectedUserRef,
        updatedWorkspaces.map(w => w.id)
      )
      .subscribe({
        next: () => {
          if (
            this.selectedUser &&
            this.selectedUser.id === selectedUserRef.id
          ) {
            this.selectedUser.workspaces = updatedWorkspaces;
            const availableWorkspaces =
              this.availableWorkspacesForSelectedUser;
            this.assignSelectedWsId =
              availableWorkspaces.length > 0
                ? availableWorkspaces[0].id
                : '';
            this.showAddWsModal = false;
            this.resetAddWsForm();
          }
          if (closeOnSuccess) {
            this.showUserPermissionsModal = false;
          }
          this.isSavingUserPermissions = false;
          this.cdr.detectChanges();
        },
        error: err => {
          if (err?.status === 200 || err?.status === 204) {
            if (
              this.selectedUser &&
              this.selectedUser.id === selectedUserRef.id
            ) {
              this.selectedUser.workspaces = updatedWorkspaces;
              const availableWorkspaces =
                this.availableWorkspacesForSelectedUser;
              this.assignSelectedWsId =
                availableWorkspaces.length > 0
                  ? availableWorkspaces[0].id
                  : '';
              this.showAddWsModal = false;
              this.resetAddWsForm();
            }
            if (closeOnSuccess) {
              this.showUserPermissionsModal = false;
            }
            this.isSavingUserPermissions = false;
            this.cdr.detectChanges();
            return;
          }
          this.assignWsError =
            err?.error?.message ||
            err?.message ||
            'Failed to update workspace permissions.';
          this.isSavingUserPermissions = false;
          this.cdr.detectChanges();
        }
      });
  }

  createGlobalWorkspace(): void {
    this.createWsName = this.createWsName.trim();
    if (!this.createWsName) {
      this.createWsError = 'Workspace database name cannot be empty.';
      return;
    }

    if (
      this.globalWorkspaces.some(
        w => w.name.toLowerCase() === this.createWsName.toLowerCase()
      )
    ) {
      this.createWsError =
        'A workspace with this name already exists globally.';
      return;
    }

    const newWs = {
      id: 'gw_' + Date.now(),
      name: this.createWsName,
      provider: this.createWsProvider,
      env: this.createWsEnv,
      tables: this.createWsTables || 10,
      schemas: this.createWsSchemas || 1,
      host: this.createWsHost.trim() || 'localhost',
      port: this.createWsPort.trim() || (this.createWsProvider === 'MySQL' ? '3306' : this.createWsProvider === 'PostgreSQL' ? '5432' : this.createWsProvider === 'Oracle' ? '1521' : '1433'),
      databaseName:
        this.createWsDbName.trim() ||
        this.createWsName.toLowerCase().replace(/\s+/g, '_') + '_db',
      username: this.createWsUsername.trim() || 'admin',
      mongoUri: this.createWsMongoUri.trim(),
      oracleService: this.createWsOracleService.trim(),
      sqlitePath: this.createWsSqlitePath.trim()
    };

    this.workspaceService.createGlobalWorkspace(newWs).subscribe({
      next: addedWs => {
        this.globalWorkspaces.push(addedWs);
        this.adminWorkspaces.push(addedWs);
        this.workspaceRegistryLoaded = true;
        this.showCreateWsModal = false;
        this.resetCreateWsForm();
        this.loadMyWorkspaces();
      },
      error: err => {
        this.createWsError = err.message || 'Failed to create workspace.';
      }
    });
  }

  deleteGlobalWorkspace(wsId: string): void {
    if (
      confirm(
        'Are you sure you want to delete this global workspace database?'
      )
    ) {
      this.workspaceService.deleteGlobalWorkspace(wsId).subscribe({
        next: () => {
          this.globalWorkspaces = this.globalWorkspaces.filter(
            w => w.id !== wsId
          );
          this.adminWorkspaces = this.adminWorkspaces.filter(
            w => w.id !== wsId
          );
          if (this.assignSelectedWsId === wsId) {
            this.assignSelectedWsId =
              this.assignableWorkspaces.length > 0
                ? this.assignableWorkspaces[0].id
                : '';
          }
          this.loadMyWorkspaces();
        },
        error: err => {
          console.error('Failed to delete global workspace:', err);
        }
      });
    }
  }

  updateGlobalWorkspace(ws: any): void {
    this.editingWorkspaceId = ws.id;
    this.createWsName = ws.name || '';
    this.createWsProvider = ws.provider || 'SQL Server';
    this.createWsEnv = (ws.env || 'Production') as
      | 'Production'
      | 'UAT'
      | 'Development';
    this.createWsTables = ws.tables ?? 24;
    this.createWsSchemas = ws.schemas ?? 4;
    this.createWsHost = ws.host || '';
    this.createWsPort = ws.port || '';
    this.createWsDbName = ws.databaseName || '';
    this.createWsUsername = ws.username || '';
    this.createWsMongoUri = ws.mongoUri || '';
    this.createWsOracleService = ws.oracleService || '';
    this.createWsSqlitePath = ws.sqlitePath || '';
    this.createWsError = null;
    this.showCreateWsModal = true;
  }

  saveWorkspace(): void {
    if (this.editingWorkspaceId) {
      this.updateWorkspaceFromForm();
      return;
    }
    this.createGlobalWorkspace();
  }

  private updateWorkspaceFromForm(): void {
    if (!this.editingWorkspaceId) return;
    this.createWsName = this.createWsName.trim();
    if (!this.createWsName) {
      this.createWsError = 'Workspace database name cannot be empty.';
      return;
    }

    const updatedWs = {
      id: this.editingWorkspaceId,
      name: this.createWsName,
      provider: this.createWsProvider,
      env: this.createWsEnv,
      tables: this.createWsTables || 10,
      schemas: this.createWsSchemas || 1,
      host: this.createWsHost.trim() || 'localhost',
      port: this.createWsPort.trim() || (this.createWsProvider === 'MySQL' ? '3306' : this.createWsProvider === 'PostgreSQL' ? '5432' : this.createWsProvider === 'Oracle' ? '1521' : '1433'),
      databaseName:
        this.createWsDbName.trim() ||
        this.createWsName.toLowerCase().replace(/\s+/g, '_') + '_db',
      username: this.createWsUsername.trim() || 'admin',
      mongoUri: this.createWsMongoUri.trim(),
      oracleService: this.createWsOracleService.trim(),
      sqlitePath: this.createWsSqlitePath.trim()
    };

    this.workspaceService.updateGlobalWorkspace(updatedWs).subscribe({
      next: savedWs => {
        this.globalWorkspaces = this.globalWorkspaces.map(w =>
          w.id === savedWs.id ? { ...w, ...savedWs } : w
        );
        this.adminWorkspaces = this.adminWorkspaces.map(w =>
          w.id === savedWs.id ? { ...w, ...savedWs } : w
        );
        this.users = this.users.map(u => ({
          ...u,
          workspaces: (u.workspaces || []).map(userWs =>
            userWs.id === savedWs.id ? { ...userWs, ...savedWs } : userWs
          )
        }));

        if (this.selectedUser) {
          this.selectedUser =
            this.users.find(u => u.id === this.selectedUser!.id) ||
            this.selectedUser;
        }

        this.showCreateWsModal = false;
        this.resetCreateWsForm();
        this.loadMyWorkspaces();
      },
      error: err => {
        console.error('Failed to update global workspace:', err);
      }
    });
  }

  resetCreateWsForm(): void {
    this.editingWorkspaceId = null;
    this.createWsName = '';
    this.createWsProvider = 'SQL Server';
    this.createWsEnv = 'Production';
    this.createWsTables = 24;
    this.createWsSchemas = 4;
    this.createWsHost = '';
    this.createWsPort = '';
    this.createWsDbName = '';
    this.createWsUsername = '';
    this.createWsMongoUri = '';
    this.createWsOracleService = '';
    this.createWsSqlitePath = '';
    this.createWsError = null;
  }

  closeAllModals(): void {
    this.showAddUserModal = false;
    this.showAddWsModal = false;
    this.showCreateWsModal = false;
    this.showUserPermissionsModal = false;
  }

  // ✅ Fixed logout - now stops session properly
  logout(): void {
    this.sessionTimeoutService.logout(true); // ✅ Use session service logout
  }

  // ✅ Fixed logoutFromAllDevices
  logoutFromAllDevices(): void {
    const confirmed = confirm(
      'This will logout from ALL devices including this one.\n\nYou will need to login again.\n\nContinue?'
    );
    if (!confirmed) return;

    this.isLogoutAllLoading = true;
    this.sessionService.logoutFromAllDevices().subscribe({
      next: () => {
        this.performLogoutAllCleanupAndRedirect();
      },
      error: () => {
        this.performLogoutAllCleanupAndRedirect();
      },
      complete: () => {
        this.isLogoutAllLoading = false;
      }
    });
  }

  private performLogoutAllCleanupAndRedirect(): void {
    this.isLogoutAllLoading = false;
    this.sessionTimeoutService.logout(true); // ✅ Use session service logout
  }

  // Getters for My Workspaces
  get myWorkspacesTotalCount(): number {
    return this.myWorkspaces.length;
  }

  get myWorkspacesProdCount(): number {
    return this.myWorkspaces.filter(w => w.env === 'Production').length;
  }

  get myWorkspacesUatCount(): number {
    return this.myWorkspaces.filter(w => w.env === 'UAT').length;
  }

  get myWorkspacesDevCount(): number {
    return this.myWorkspaces.filter(w => w.env === 'Development').length;
  }

  get filteredMyWorkspaces(): Workspace[] {
    return this.myWorkspaces.filter(w => {
      const matchesSearch =
        w.name.toLowerCase().includes(this.myWorkspacesSearchQuery.toLowerCase()) ||
        w.provider.toLowerCase().includes(this.myWorkspacesSearchQuery.toLowerCase());
      const matchesEnv =
        this.myWorkspacesSelectedEnv === 'All' || w.env === this.myWorkspacesSelectedEnv;
      return matchesSearch && matchesEnv;
    });
  }

  selectMyWorkspacesEnv(env: string): void {
    this.myWorkspacesSelectedEnv = env;
  }

  // Connection Helpers
  /**
   * Triggers the connection dialog modal for admin's personal workspaces.
   * - Retrieves specific database configuration from the workspace service.
   * - If a saved password exists, populates the input field.
   */
  openWorkspace(workspaceId: string): void {
    const ws = this.myWorkspaces.find(w => w.id === workspaceId);
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
   * Initiates connection handshake verification against database workspace (Admin context).
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
            if (this.connectingWorkspace) {
              this.workspaceService.setSelectedWorkspace(this.connectingWorkspace);
            }
            this.router.navigate(['/ai-chat'], {
              queryParams: { id: this.connectingWorkspace?.id }
            });
          },
          error: err => {
            console.warn('Failed to update workspace password policy. Proceeding anyway.', err);
            this.isVerifyingConnection = false;
            this.connectSuccess = true;
            this.showConnectModal = false;
            if (this.connectingWorkspace) {
              this.workspaceService.setSelectedWorkspace(this.connectingWorkspace);
            }
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

  openMockConsole(): void {
    this.mockConsoleService.open();
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }

  // --- Access Requests Handlers ---
  get filteredAccessRequests(): AccessRequest[] {
    let list = this.accessRequestService.getRequests();
    if (this.requestTabFilter !== 'All') {
      list = list.filter(r => r.status === this.requestTabFilter);
    }
    if (this.requestSearchQuery.trim()) {
      const q = this.requestSearchQuery.toLowerCase();
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.company.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    }
    return list;
  }

  get pendingAccessRequestsCount(): number {
    return this.accessRequestService.getStats().pending;
  }

  viewAccessRequestDetails(req: AccessRequest): void {
    this.selectedAccessRequest = req;
    this.showRequestDetailsModal = true;
  }

  closeAccessRequestDetails(): void {
    this.showRequestDetailsModal = false;
    this.selectedAccessRequest = null;
  }

  approveAccessRequest(req: AccessRequest): void {
    const updated = this.accessRequestService.updateStatus(req.id, 'Approved', undefined, `${this.userName} (${this.userEmail})`);
    if (updated) {
      const existingUser = this.users.find(u => u.email.toLowerCase() === req.email.toLowerCase());
      if (!existingUser) {
        const newUser: AppUser = {
          id: `usr-${Date.now()}`,
          name: req.name,
          email: req.email,
          workspaces: []
        };
        this.users.unshift(newUser);
      }

      this.toastMessage = `Approved access for ${req.name}. Credentials generated!`;
      this.toastState = 'success';
      setTimeout(() => {
        this.toastMessage = null;
        this.toastState = null;
      }, 3000);

      this.previewEmailTemplate('approved', updated);
    }
  }

  promptRejectAccessRequest(req: AccessRequest): void {
    this.selectedAccessRequest = req;
    this.rejectionReasonInput = '';
    this.showRejectModal = true;
  }

  confirmRejectAccessRequest(): void {
    if (!this.selectedAccessRequest) return;
    const reason = this.rejectionReasonInput.trim() || 'Could not verify employment or security clearance.';
    const updated = this.accessRequestService.updateStatus(this.selectedAccessRequest.id, 'Rejected', reason, `${this.userName} (${this.userEmail})`);
    
    this.showRejectModal = false;
    this.toastMessage = `Rejected request ${this.selectedAccessRequest.id}`;
    this.toastState = 'success';
    setTimeout(() => {
      this.toastMessage = null;
      this.toastState = null;
    }, 2500);

    if (updated) {
      this.previewEmailTemplate('rejected', updated);
    }
  }

  previewEmailTemplate(type: 'request_received' | 'new_admin_notification' | 'approved' | 'rejected' | 'welcome' | 'password_reset', req?: AccessRequest): void {
    const targetData = req || this.selectedAccessRequest || {
      name: 'Sarah Jenkins',
      email: 'sarah.jenkins@acmeenterprise.com',
      company: 'Acme Enterprise',
      department: 'Data Analytics',
      whyAccess: 'Quarterly Q3 audit reporting access required.'
    };

    this.previewEmailType = type;
    this.previewEmailHtml = this.accessRequestService.getEmailTemplateHtml(type, targetData);
    this.showEmailTemplateModal = true;
  }
}