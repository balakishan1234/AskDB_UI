import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError, forkJoin, BehaviorSubject } from 'rxjs';
import { delay, tap, map, catchError, switchMap } from 'rxjs/operators';
import { API_CONFIG } from '../config/api.config';

export interface Workspace {
  id: string;
  name: string;
  provider: string;
  env: string;
  tables?: number;
  schemas?: number;
  lastAccessed: string;
  accessLevel?: 'Admin' | 'User';
  host?: string;
  port?: string;
  databaseName?: string;
  username?: string;
  dbPassword?: string;
}

export interface UserWorkspace {
  id: string;
  name: string;
  provider: string;
  env: string;
  accessLevel: 'Admin' | 'User';
  tables?: number;
  schemas?: number;
  host?: string;
  port?: string;
  databaseName?: string;
  username?: string;
  mongoUri?: string;
  oracleService?: string;
  sqlitePath?: string;
  dbPassword?: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  roleId?: number;
  isActive?: boolean;
  workspaces: UserWorkspace[];
}

interface SessionContext {
  userId: number | string;
  roleId: number;
}

// ✅ Canonical env values used throughout the UI
export type EnvKey = 'Production' | 'UAT' | 'Development' | '';

// ✅ Canonical provider values used throughout the UI
export type ProviderKey =
  | 'SQL Server'
  | 'PostgreSQL'
  | 'MySQL'
  | 'MongoDB'
  | 'Oracle'
  | 'SQLite'
  | '';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {

  // ================================================================
  // ✅ REACTIVE SELECTED WORKSPACE STATE
  // All components subscribe to this — no more stale references
  // ================================================================
  private _selectedWorkspace = new BehaviorSubject<Workspace | null>(null);

  /** Stream that emits whenever the active workspace changes */
  readonly selectedWorkspace$ = this._selectedWorkspace.asObservable();

  /** Set the active workspace — always emits a fresh object copy */
  setSelectedWorkspace(ws: Workspace | null): void {
    this._selectedWorkspace.next(ws ? { ...ws } : null);
  }

  /** Snapshot of current workspace (use sparingly — prefer the stream) */
  get currentWorkspace(): Workspace | null {
    return this._selectedWorkspace.getValue();
  }

  // ================================================================
  // PRIVATE HELPERS
  // ================================================================

  private readonly httpOptions = { withCredentials: true };
  private readonly debugApi = true;

  private debugLog(message: string, data?: any): void {
    if (!this.debugApi) return;
    console.log(`[WorkspaceService] ${message}`, data ?? '');
  }

  // ----------------------------------------------------------------
  // ✅ ENV MAPPING — single source of truth
  // ----------------------------------------------------------------

  /**
   * Converts ANY backend env string → canonical UI label.
   * Handles: 'prod', 'production', 'Prod', 'Production', 'PRODUCTION'
   *          'dev', 'development', 'Development'
   *          'uat', 'UAT'
   */
  mapEnvToFrontend(env?: string | null): EnvKey {
    if (!env || typeof env !== 'string') return '';
    switch (env.trim().toLowerCase()) {
      case 'prod':
      case 'production':
        return 'Production';
      case 'dev':
      case 'development':
        return 'Development';
      case 'uat':
        return 'UAT';
      default:
        return '';
    }
  }

  /** Converts UI label → backend enum string */
  mapEnvToBackend(env?: string | null): string {
    if (!env) return 'Dev';
    switch (env.trim().toLowerCase()) {
      case 'production': return 'Prod';
      case 'development': return 'Dev';
      case 'uat': return 'UAT';
      default: return 'Dev';
    }
  }

  // ----------------------------------------------------------------
  // ✅ PROVIDER MAPPING — single source of truth
  // ----------------------------------------------------------------

  /**
   * Converts ANY backend DB type string → canonical UI label.
   * Handles: 'sqlserver', 'sql server', 'SQLServer', 'mssql'
   *          'postgresql', 'postgres', 'pg'
   *          'mongodb', 'mongo'
   *          'mysql', 'oracle', 'sqlite'
   */
  mapProviderToFrontend(dbType?: string | null): ProviderKey {
    if (!dbType || typeof dbType !== 'string') return '';
    switch (dbType.trim().toLowerCase().replace(/\s+/g, '')) {
      case 'sqlserver':
      case 'mssql':
      case 'sql':
        return 'SQL Server';
      case 'postgresql':
      case 'postgres':
      case 'pg':
        return 'PostgreSQL';
      case 'mongodb':
      case 'mongo':
        return 'MongoDB';
      case 'mysql':
        return 'MySQL';
      case 'oracle':
        return 'Oracle';
      case 'sqlite':
        return 'SQLite';
      default:
        return '';
    }
  }

  /** Converts UI label → backend enum string */
  mapProviderToBackend(provider?: string | null): string {
    if (!provider) return 'SQLServer';
    switch (provider.trim().toLowerCase().replace(/\s+/g, '')) {
      case 'sqlserver':
      case 'sql server':
      case 'mssql':
        return 'SQLServer';
      case 'postgresql':
      case 'postgres':
      case 'pg':
        return 'PostgreSQL';
      case 'mongodb':
      case 'mongo':
        return 'MongoDB';
      case 'mysql':
        return 'MySQL';
      case 'oracle':
        return 'Oracle';
      case 'sqlite':
        return 'SQLite';
      default:
        return provider;
    }
  }

  // ----------------------------------------------------------------
  // UI HELPER METHODS (used by components)
  // ----------------------------------------------------------------

  /** Returns Tailwind badge classes for the env value */
  getEnvBadgeClass(env?: string | null): string {
    switch (this.mapEnvToFrontend(env)) {
      case 'Production':  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'UAT':         return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Development': return 'bg-blue-50 text-blue-700 border-blue-200';
      default:            return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  }

  /** Returns Tailwind dot color class for the env value */
  getEnvDotClass(env?: string | null): string {
    switch (this.mapEnvToFrontend(env)) {
      case 'Production':  return 'bg-emerald-500';
      case 'UAT':         return 'bg-amber-500';
      case 'Development': return 'bg-blue-500';
      default:            return 'bg-slate-400';
    }
  }

  /** Returns Tailwind stripe color class for the env value */
  getEnvStripeClass(env?: string | null): string {
    switch (this.mapEnvToFrontend(env)) {
      case 'Production':  return 'bg-emerald-400';
      case 'UAT':         return 'bg-amber-400';
      case 'Development': return 'bg-blue-400';
      default:            return 'bg-slate-300';
    }
  }

  // ----------------------------------------------------------------
  // UTILITY PICKERS
  // ----------------------------------------------------------------

  private cleanWorkspaceId(id: string | number): number | string {
    if (typeof id === 'number') return id;
    if (!id) return id;
    const idText = id.toString().trim();
    let cleanId = idText;
    if (/^gw_?\d+$/i.test(idText)) cleanId = idText.replace(/^gw_?/i, '');
    else if (/^w_?\d+$/i.test(idText)) cleanId = idText.replace(/^w_?/i, '');
    const num = parseInt(cleanId, 10);
    return isNaN(num) ? id : num;
  }

  private cleanUserId(id: string | number): number | string {
    if (typeof id === 'number') return id;
    if (!id) return id;
    const idText = id.toString().trim();
    let cleanId = idText;
    if (/^u_?\d+$/i.test(idText)) cleanId = idText.replace(/^u_?/i, '');
    const num = parseInt(cleanId, 10);
    return isNaN(num) ? id : num;
  }

  private pickId(source: any, keys: string[]): string {
    for (const key of keys) {
      const value = source?.[key];
      if (value !== undefined && value !== null && `${value}`.trim() !== '') {
        return `${value}`.trim();
      }
    }
    return '';
  }

  private pickText(source: any, keys: string[], fallback: string = ''): string {
    for (const key of keys) {
      const value = source?.[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return fallback;
  }

  private pickArray(source: any, keys: string[]): any[] {
    if (Array.isArray(source)) return source;
    if (!source || typeof source !== 'object') return [];
    for (const key of keys) {
      const value = source[key];
      if (Array.isArray(value)) return value;
    }
    if (Array.isArray(source.$values)) return source.$values;
    if (source.workspaceId !== undefined || source.id !== undefined) return [source];
    return [];
  }

  // ----------------------------------------------------------------
  // ✅ CORE WORKSPACE MAPPER — always normalizes env + provider
  // ----------------------------------------------------------------
  private mapWorkspaceSummary(item: any): Workspace {
    const rawEnv = item.environmentType ?? item.EnvironmentType
      ?? item.env ?? item.Env ?? '';

    const rawProvider = item.DatabaseType ?? item.databaseType
      ?? item.provider ?? item.Provider ?? '';

    const mappedEnv = this.mapEnvToFrontend(rawEnv);
    const mappedProvider = this.mapProviderToFrontend(rawProvider);

    if (!mappedEnv) {
      console.warn(
        `[WorkspaceService] Unknown env value: "${rawEnv}" for workspace`,
        item
      );
    }
    if (!mappedProvider) {
      console.warn(
        `[WorkspaceService] Unknown provider value: "${rawProvider}" for workspace`,
        item
      );
    }

    return {
      id: this.pickId(item, ['workspaceId', 'WorkspaceId', 'id', 'Id']),
      name: this.pickText(
        item,
        ['workspaceName', 'name', 'workSpaceName', 'WorkspaceName'],
        'Workspace'
      ),
      provider: mappedProvider,
      env: mappedEnv,
      lastAccessed: 'Recently',
      host: item.ServerName ?? item.serverName ?? item.host ?? 'localhost',
      port: item.Port?.toString() ?? item.port?.toString() ?? '1433',
      databaseName: item.DatabaseName ?? item.databaseName ?? '',
      username: item.DatabaseUserName ?? item.databaseUserName
        ?? item.username ?? 'admin',
      dbPassword: item.dbPassword ?? item.password ?? 'admin',
    };
  }

  // ----------------------------------------------------------------
  // SESSION
  // ----------------------------------------------------------------

  private getStoredSessionContext(): SessionContext {
    let userId: number | string = 1;
    let roleId = 2;
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user?.userId != null) userId = this.cleanUserId(user.userId);
        if (user?.roleId != null) roleId = Number(user.roleId) || 2;
      }
    } catch { /* ignore */ }
    if (localStorage.getItem('userRole') === 'admin') roleId = 1;
    return { userId, roleId };
  }

  // ----------------------------------------------------------------
  // Mock data
  // ----------------------------------------------------------------

  private defaultUsers: AppUser[] = [
    {
      id: 'u_admin', name: 'System Administrator', email: 'admin@cgi.com',
      workspaces: [
        {
          id: 'w1', name: 'Sales Analytics',
          provider: 'SQL Server', env: 'Production',
          accessLevel: 'Admin', tables: 183, schemas: 42,
          host: 'sql-prod-server.cgi.com', port: '1433',
          databaseName: 'sales_analytics', username: 'john_doe'
        },
        {
          id: 'w3', name: 'Marketing Campaign',
          provider: 'MySQL', env: 'Development',
          accessLevel: 'Admin', tables: 35, schemas: 6,
          host: 'mysql-dev-server.cgi.com', port: '3306',
          databaseName: 'marketing_db', username: 'jane_smith'
        }
      ]
    },
    {
      id: 'u1', name: 'John Doe', email: 'john.doe@cgi.com',
      workspaces: [
        {
          id: 'w1', name: 'Sales Analytics',
          provider: 'SQL Server', env: 'Production',
          accessLevel: 'User', tables: 183, schemas: 42,
          host: 'sql-prod-server.cgi.com', port: '1433',
          databaseName: 'sales_analytics', username: 'john_doe'
        },
        {
          id: 'w2', name: 'Customer Feedback',
          provider: 'PostgreSQL', env: 'UAT',
          accessLevel: 'User', tables: 48, schemas: 8,
          host: 'pg-uat-server.cgi.com', port: '5432',
          databaseName: 'customer_feedback', username: 'john_doe_ro'
        }
      ]
    },
    {
      id: 'u2', name: 'Jane Smith', email: 'jane.smith@cgi.com',
      workspaces: [
        {
          id: 'w3', name: 'Marketing Campaign',
          provider: 'MySQL', env: 'Development',
          accessLevel: 'Admin', tables: 35, schemas: 6,
          host: 'mysql-dev-server.cgi.com', port: '3306',
          databaseName: 'marketing_db', username: 'jane_smith'
        }
      ]
    },
    {
      id: 'u3', name: 'Alex Johnson', email: 'alex.johnson@cgi.com',
      workspaces: [
        {
          id: 'w4', name: 'Billing Sandbox',
          provider: 'PostgreSQL', env: 'Development',
          accessLevel: 'Admin', tables: 43, schemas: 9,
          host: 'pg-dev-server.cgi.com', port: '5432',
          databaseName: 'billing_sandbox', username: 'alex_johnson'
        },
        {
          id: 'w2', name: 'Customer Feedback',
          provider: 'PostgreSQL', env: 'UAT',
          accessLevel: 'User', tables: 48, schemas: 8,
          host: 'pg-uat-server.cgi.com', port: '5432',
          databaseName: 'customer_feedback', username: 'alex_johnson'
        }
      ]
    }
  ];

  constructor(private http: HttpClient) {}

  // ----------------------------------------------------------------
  // LAST ACCESSED TRACKING
  // ----------------------------------------------------------------

  setLastAccessed(workspaceId: string): void {
    try {
      const times = JSON.parse(
        localStorage.getItem('workspace_access_times') || '{}'
      );
      times[workspaceId] = Date.now();
      localStorage.setItem('workspace_access_times', JSON.stringify(times));
      localStorage.setItem('connectedWorkspace', workspaceId);
    } catch (e) {
      console.error('Error setting last accessed workspace:', e);
    }
  }

  getLastAccessedId(): string | null {
    try {
      const times = JSON.parse(
        localStorage.getItem('workspace_access_times') || '{}'
      );
      let mostRecentId: string | null = null;
      let maxTime = 0;
      for (const id in times) {
        if (times[id] > maxTime) { maxTime = times[id]; mostRecentId = id; }
      }
      return mostRecentId || localStorage.getItem('connectedWorkspace');
    } catch {
      return localStorage.getItem('connectedWorkspace');
    }
  }

  getRelativeTimeString(workspaceId: string, fallback = 'Recently'): string {
    try {
      const times = JSON.parse(
        localStorage.getItem('workspace_access_times') || '{}'
      );
      const time = times[workspaceId];
      if (!time) return fallback;
      const diff = Date.now() - time;
      const s = Math.floor(diff / 1000);
      const m = Math.floor(s / 60);
      const h = Math.floor(m / 60);
      const d = Math.floor(h / 24);
      if (s < 60) return 'Just now';
      if (m < 60) return `${m}m ago`;
      if (h < 24) return `${h}h ago`;
      if (d < 7) return `${d}d ago`;
      return new Date(time).toLocaleDateString();
    } catch {
      return fallback;
    }
  }

  // ================================================================
  // PUBLIC API METHODS
  // ================================================================

  /**
   * Retrieves all workspaces assigned to a specific user email.
   * - In mock mode, queries mock users registry from localStorage and filters by email mapping.
   * - Otherwise, issues a REST request to `/users/{userId}/workspaces` endpoint.
   */
  getWorkspaces(email: string | null): Observable<Workspace[]> {
    if (API_CONFIG.useMock) return this.resolveMockWorkspaces(email);

    const session = this.getStoredSessionContext();
    const url = `${API_CONFIG.apiUrl}/users/${session.userId}/workspaces`;

    return this.http.get<any>(url, this.httpOptions).pipe(
      tap(p => this.debugLog(`GET ${url}`, p)),
      catchError(() =>
        this.http.get<any>(url).pipe(
          tap(p => this.debugLog(`GET ${url} (no creds)`, p))
        )
      ),
      map(payload => {
        const list = this.pickArray(payload, ['data', 'items', 'results', 'workspaces']);
        this.debugLog(`Mapped ${list.length} workspaces`);
        return list.map((item: any) => this.mapWorkspaceSummary(item));
      }),
      catchError(error => {
        console.warn('GET workspaces failed', error);
        return throwError(() => error);
      })
    );
  }

  private resolveMockWorkspaces(email: string | null): Observable<Workspace[]> {
    if (!email) return of([]);

    return this.resolveMockUsers().pipe(
      switchMap(users => {
        // normalize test emails
        const emailMap: Record<string, string> = {
          'john@test.com': 'john.doe@cgi.com',
          'jane@test.com': 'jane.smith@cgi.com',
          'alex@test.com': 'alex.johnson@cgi.com',
          'admin@test.com': 'admin@cgi.com',
        };
        const lookup = emailMap[email.toLowerCase()] ?? email.toLowerCase();
        const user = users.find(u => u.email.toLowerCase() === lookup);
        if (!user) return of([]);

        return of(
          user.workspaces.map(w => ({
            id: w.id,
            name: w.name,
            // ✅ Always re-run through mapper in case stored data is raw
            provider: this.mapProviderToFrontend(w.provider) || w.provider,
            env: this.mapEnvToFrontend(w.env) || w.env,
            tables: w.tables,
            schemas: w.schemas,
            lastAccessed: 'Just assigned',
            accessLevel: w.accessLevel,
            host: w.host,
            port: w.port,
            databaseName: w.databaseName,
            username: w.username,
            dbPassword: w.dbPassword ?? 'admin',
          }))
        );
      })
    );
  }

  /**
   * Fetches detailed database connection information for a workspace by ID.
   * - Retrieves parameters like host, port, database engine, schema details, and credentials.
   */
  getWorkspaceDetails(workspaceId: string): Observable<Workspace> {
    if (API_CONFIG.useMock) return this.resolveMockWorkspaceDetails(workspaceId);

    const cleanWsId = this.cleanWorkspaceId(workspaceId);
    return this.http
      .get<any>(`${API_CONFIG.apiUrl}/workspaces/${cleanWsId}`, this.httpOptions)
      .pipe(
        map(res => this.mapWorkspaceSummary(res)),
        catchError(error => {
          console.warn(`GET /workspaces/${cleanWsId} failed`, error);
          return throwError(() => error);
        })
      );
  }

  private resolveMockWorkspaceDetails(workspaceId: string): Observable<Workspace> {
    return this.resolveMockUsers().pipe(
      switchMap(users => {
        const cleanTargetId = workspaceId.toString().replace(/^(gw|w)_?/i, '');
        for (const u of users) {
          const found = u.workspaces.find(
            w => w.id.toString().replace(/^(gw|w)_?/i, '') === cleanTargetId
          );
          if (found) return of(this.buildWorkspaceFromUserWs(found));
        }

        const storedGlobal = localStorage.getItem('admin_workspaces');
        const globals = storedGlobal ? JSON.parse(storedGlobal) : [];
        const foundGlobal = globals.find(
          (w: any) => w.id.toString().replace(/^(gw|w)_?/i, '') === cleanTargetId
        );
        if (foundGlobal) return of(this.mapWorkspaceSummary(foundGlobal));

        return throwError(() => new Error('Workspace not found.'));
      })
    );
  }

  /** Build a Workspace from a UserWorkspace (mock data already has canonical values) */
  private buildWorkspaceFromUserWs(w: UserWorkspace): Workspace {
    return {
      id: w.id,
      name: w.name,
      // ✅ Re-map so even stale localStorage data is normalized
      provider: this.mapProviderToFrontend(w.provider) || w.provider,
      env: this.mapEnvToFrontend(w.env) || w.env,
      tables: w.tables,
      schemas: w.schemas,
      lastAccessed: 'Recently',
      accessLevel: w.accessLevel,
      host: w.host ?? 'localhost',
      port: w.port ?? '1433',
      databaseName: w.databaseName ?? 'default_db',
      username: w.username ?? 'admin',
      dbPassword: w.dbPassword ?? 'admin',
    };
  }

  /**
   * Dispatches credentials to test/establish connection to the database.
   * - Saves workspace ID to last accessed persistence keys.
   */
  testConnection(connectionData: any): Observable<boolean> {
    const wId = connectionData.workspaceId || connectionData.id;
    const pwd = connectionData.password || connectionData.dbPassword || '';
    let userId: any = 1;
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      if (u?.userId) userId = this.cleanUserId(u.userId);
    } catch { /* ignore */ }

    if (API_CONFIG.useMock) {
      this.setLastAccessed(wId);
      return of(true).pipe(delay(100));
    }

    return this.http.post<any>(
      `${API_CONFIG.apiUrl}/dashboard/connect`,
      { userId, workspaceId: this.cleanWorkspaceId(wId), dbPassword: pwd },
      this.httpOptions
    ).pipe(
      tap(() => this.setLastAccessed(wId)),
      map(() => true),
      catchError(error => {
        console.warn('/dashboard/connect failed', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Updates database connection credential passwords.
   * - Modifies localStorage mock parameters or executes REST PUT update.
   */
  updateWorkspacePassword(workspaceId: string, password: string): Observable<any> {
    if (API_CONFIG.useMock) {
      return this.resolveMockUpdateWorkspacePassword(workspaceId, password);
    }
    const cleanWsId = this.cleanWorkspaceId(workspaceId);
    return this.http.put<any>(
      `${API_CONFIG.apiUrl}/workspaces/${cleanWsId}`,
      { dbPassword: password },
      this.httpOptions
    ).pipe(
      catchError(error => {
        console.warn(`PUT /workspaces/${cleanWsId} (password) failed`, error);
        return throwError(() => error);
      })
    );
  }

  private resolveMockUpdateWorkspacePassword(
    workspaceId: string,
    password: string
  ): Observable<any> {
    const cleanTargetId = workspaceId.toString().replace(/^(gw|w)_?/i, '');
    const updateInStorage = (key: string, finder: (w: any) => boolean) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const list = JSON.parse(raw);
        const item = list.find(finder);
        if (item) {
          item.dbPassword = password;
          localStorage.setItem(key, JSON.stringify(list));
        }
      } catch { /* ignore */ }
    };

    updateInStorage('admin_workspaces', w =>
      w.id.toString().replace(/^(gw|w)_?/i, '') === cleanTargetId
    );
    updateInStorage('workspaces', w =>
      w.id.toString().replace(/^(gw|w)_?/i, '') === cleanTargetId
    );

    try {
      const raw = localStorage.getItem('admin_users');
      const users = raw ? JSON.parse(raw) : this.defaultUsers;
      users.forEach((u: any) => {
        const ws = u.workspaces?.find(
          (w: any) => w.id.toString().replace(/^(gw|w)_?/i, '') === cleanTargetId
        );
        if (ws) ws.dbPassword = password;
      });
      localStorage.setItem('admin_users', JSON.stringify(users));
    } catch { /* ignore */ }

    return of({ success: true });
  }

  registerWorkspace(newWorkspace: Workspace): Observable<Workspace> {
    if (API_CONFIG.useMock) return this.resolveMockRegisterWorkspace(newWorkspace);

    const payload = {
      workspaceName: newWorkspace.name,
      databaseType: this.mapProviderToBackend(newWorkspace.provider),
      serverName: newWorkspace.host || 'localhost',
      port: newWorkspace.port || '1433',
      environmentType: this.mapEnvToBackend(newWorkspace.env),
      databaseName: newWorkspace.databaseName || '',
      databaseUserName: newWorkspace.username || ''
    };

    return this.http.post<any>(
      `${API_CONFIG.apiUrl}/workspaces`,
      payload,
      this.httpOptions
    ).pipe(
      map(res => ({
        ...newWorkspace,
        id: (res.workspaceId || res.id || newWorkspace.id)?.toString()
      })),
      catchError(error => {
        console.warn('POST /workspaces failed', error);
        return throwError(() => error);
      })
    );
  }

  private resolveMockRegisterWorkspace(ws: Workspace): Observable<Workspace> {
    try {
      const list: Workspace[] = JSON.parse(
        localStorage.getItem('workspaces') || '[]'
      );
      list.unshift(ws);
      localStorage.setItem('workspaces', JSON.stringify(list));
    } catch { /* ignore */ }
    return of(ws);
  }

  // ================================================================
  // ADMIN PORTAL
  // ================================================================

  getUsers(): Observable<AppUser[]> {
    if (API_CONFIG.useMock) return this.resolveMockUsers();

    const url = `${API_CONFIG.apiUrl}/users/my-users`;
    return this.http.get<any>(url, this.httpOptions).pipe(
      tap(p => this.debugLog(`GET ${url}`, p)),
      catchError(() => this.http.get<any>(url)),
      switchMap(payload => {
        const users = this.pickArray(payload, ['data', 'items', 'results', 'users']);
        if (!users.length) return of([] as AppUser[]);
        return forkJoin(
          users.map((u: any) =>
            this.getUserDetails(
              this.pickId(u, ['userId', 'UserId', 'id', 'Id'])
            ).pipe(
              catchError(() => of({
                id: this.pickId(u, ['userId', 'UserId', 'id', 'Id']),
                name: this.pickText(u, ['userName', 'name'], 'User'),
                email: this.pickText(u, ['email'], ''),
                workspaces: [] as UserWorkspace[]
              }))
            )
          )
        );
      }),
      catchError(error => {
        console.warn('GET /users/my-users failed', error);
        return throwError(() => error);
      })
    );
  }

  private getUserDetails(id: string): Observable<AppUser> {
    const cleanId = this.cleanUserId(id);
    const url = `${API_CONFIG.apiUrl}/users/${cleanId}`;
    return forkJoin({
      user: this.http.get<any>(url, this.httpOptions).pipe(
        catchError(() => this.http.get<any>(url))
      ),
      workspaces: this.getUserWorkspaces(id).pipe(
        catchError(() => of([] as UserWorkspace[]))
      )
    }).pipe(
      map(({ user: res, workspaces }) => ({
        id: this.pickId(res, ['userId', 'UserId', 'id', 'Id']),
        name: this.pickText(res, ['userName', 'name'], 'User'),
        email: this.pickText(res, ['email'], ''),
        roleId: Number(res.roleId) || 2,
        isActive: res.isActive !== undefined ? !!res.isActive : true,
        workspaces
      }))
    );
  }

  private resolveMockUsers(): Observable<AppUser[]> {
    const stored = localStorage.getItem('admin_users');
    let users: AppUser[] = [];
    if (stored) {
      try {
        users = JSON.parse(stored);
      } catch (e) {
        users = [];
      }
    }
    
    // Check if admin user is present, if not add it to maintain dynamic compatibility
    const adminEmail = 'admin@cgi.com';
    const hasAdmin = users.some(u => u.email.toLowerCase() === adminEmail);
    if (!hasAdmin) {
      users.push({
        id: 'u_admin',
        name: 'System Administrator',
        email: adminEmail,
        workspaces: [
          {
            id: 'w1', name: 'Sales Analytics',
            provider: 'SQL Server', env: 'Production',
            accessLevel: 'Admin', tables: 183, schemas: 42,
            host: 'sql-prod-server.cgi.com', port: '1433',
            databaseName: 'sales_analytics', username: 'john_doe'
          },
          {
            id: 'w3', name: 'Marketing Campaign',
            provider: 'MySQL', env: 'Development',
            accessLevel: 'Admin', tables: 35, schemas: 6,
            host: 'mysql-dev-server.cgi.com', port: '3306',
            databaseName: 'marketing_db', username: 'jane_smith'
          }
        ]
      });
      localStorage.setItem('admin_users', JSON.stringify(users));
    }
    return of(users);
  }

  private getUserWorkspaces(userId: string): Observable<UserWorkspace[]> {
    const cleanId = this.cleanUserId(userId);
    const url = `${API_CONFIG.apiUrl}/users/${cleanId}/workspaces`;
    return this.http.get<any>(url, this.httpOptions).pipe(
      catchError(() => this.http.get<any>(url)),
      map(payload => {
        const raw = this.pickArray(
          payload,
          ['data', 'items', 'results', 'workspaces']
        );
        return raw.map((w: any) => ({
          id: this.pickId(w, ['workspaceId', 'WorkspaceId', 'id', 'Id']),
          name: this.pickText(
            w,
            ['workspaceName', 'name', 'workSpaceName', 'WorkspaceName'],
            'Workspace'
          ),
          // ✅ Always normalize
          provider: this.mapProviderToFrontend(
            w.DatabaseType ?? w.databaseType ?? w.provider
          ),
          env: this.mapEnvToFrontend(
            w.environmentType ?? w.EnvironmentType ?? w.env
          ),
          accessLevel: (w.accessLevel || 'User') as 'Admin' | 'User',
          tables: w.tables,
          schemas: w.schemas,
          host: w.serverName ?? w.ServerName ?? w.host ?? '',
          port: w.port?.toString() ?? w.Port?.toString() ?? '',
          databaseName: w.databaseName ?? w.DatabaseName ?? '',
          username: w.databaseUserName ?? w.DatabaseUserName ?? w.username ?? '',
        }));
      })
    );
  }

  private saveUsersMock(users: AppUser[]): void {
    localStorage.setItem('admin_users', JSON.stringify(users));
  }

  addUser(newUser: AppUser): Observable<AppUser> {
    if (API_CONFIG.useMock) return this.resolveMockAddUser(newUser);

    const payload = {
      userName: newUser.name,
      email: newUser.email,
      password: 'password123',
      roleId: 2,
      isActive: true,
      workspaceIds: (newUser.workspaces || []).map(w => this.cleanWorkspaceId(w.id))
    };

    return this.http.post<any>(
      `${API_CONFIG.apiUrl}/users`,
      payload,
      this.httpOptions
    ).pipe(
      switchMap(res => {
        const createdId = (res?.userId || res?.id)?.toString();
        return createdId
          ? this.getUserDetails(createdId)
          : of({ ...newUser, roleId: 2, isActive: true });
      }),
      catchError(error => {
        console.warn('POST /users failed', error);
        return throwError(() => error);
      })
    );
  }

  private resolveMockAddUser(newUser: AppUser): Observable<AppUser> {
    return this.resolveMockUsers().pipe(
      tap(users => { users.push(newUser); this.saveUsersMock(users); }),
      map(() => newUser)
    );
  }

  deleteUser(userId: string): Observable<void> {
    if (API_CONFIG.useMock) return this.resolveMockDeleteUser(userId);
    const cleanId = this.cleanUserId(userId);
    return this.http.delete<void>(
      `${API_CONFIG.apiUrl}/users/${cleanId}`,
      this.httpOptions
    ).pipe(
      catchError(error => {
        console.warn(`DELETE /users/${cleanId} failed`, error);
        return throwError(() => error);
      })
    );
  }

  private resolveMockDeleteUser(userId: string): Observable<void> {
    return this.resolveMockUsers().pipe(
      tap(users => {
        this.saveUsersMock(users.filter(u => u.id !== userId));
      }),
      map(() => undefined)
    );
  }

  addWorkspaceToUser(userId: string, newWs: UserWorkspace): Observable<UserWorkspace> {
    if (API_CONFIG.useMock) {
      return this.resolveMockAddWorkspaceToUser(userId, newWs);
    }
    const cleanId = this.cleanUserId(userId);
    return this.getUserDetails(userId).pipe(
      switchMap(user => {
        const wsIds = user.workspaces.map(w => this.cleanWorkspaceId(w.id));
        const newId = this.cleanWorkspaceId(newWs.id);
        if (!wsIds.includes(newId)) wsIds.push(newId);
        return this.http.put<any>(
          `${API_CONFIG.apiUrl}/users/${cleanId}/workspaces`,
          {
            userName: user.name,
            email: user.email,
            roleId: user.roleId || 2,
            isActive: user.isActive ?? true,
            password: '',
            workspaceIds: wsIds
          },
          this.httpOptions
        ).pipe(map(() => newWs));
      }),
      catchError(error => {
        console.warn(`PUT /users/${cleanId}/workspaces failed`, error);
        return throwError(() => error);
      })
    );
  }

  private resolveMockAddWorkspaceToUser(
    userId: string,
    newWs: UserWorkspace
  ): Observable<UserWorkspace> {
    return this.resolveMockUsers().pipe(
      tap(users => {
        const user = users.find(u => u.id === userId);
        if (user) { user.workspaces.push(newWs); this.saveUsersMock(users); }
      }),
      map(() => newWs)
    );
  }

  updateUserWorkspaceAssignments(
    user: AppUser,
    workspaceIds: Array<string | number>
  ): Observable<void> {
    if (API_CONFIG.useMock) {
      return this.resolveMockUsers().pipe(
        tap(users => {
          const found = users.find(u => u.id === user.id);
          if (found) {
            const ids = new Set(workspaceIds.map(id => id.toString()));
            
            // Get mock global workspaces to load template configs
            let allGlobal: any[] = [];
            try {
              const storedGlobal = localStorage.getItem('admin_workspaces');
              if (storedGlobal) {
                allGlobal = JSON.parse(storedGlobal);
              }
            } catch (e) {
              console.error('Failed to parse admin_workspaces from localStorage', e);
            }
            if (allGlobal.length === 0) {
              allGlobal = [
                {
                  id: 'gw1', name: 'Sales Analytics',
                  provider: 'SQL Server', env: 'Production',
                  tables: 183, schemas: 42,
                  host: 'sql-prod-server.cgi.com', port: '1433',
                  databaseName: 'sales_analytics', username: 'john_doe', dbPassword: 'admin'
                },
                {
                  id: 'gw2', name: 'Customer Feedback',
                  provider: 'PostgreSQL', env: 'UAT',
                  tables: 48, schemas: 8,
                  host: 'pg-uat-server.cgi.com', port: '5432',
                  databaseName: 'customer_feedback', username: 'john_doe_ro', dbPassword: 'admin'
                },
                {
                  id: 'gw3', name: 'Marketing Campaign',
                  provider: 'MySQL', env: 'Development',
                  tables: 35, schemas: 6,
                  host: 'mysql-dev-server.cgi.com', port: '3306',
                  databaseName: 'marketing_db', username: 'jane_smith', dbPassword: 'admin'
                }
              ];
            }

            const newWorkspaces: UserWorkspace[] = [];
            for (const id of ids) {
              const cleanId = id.toString().replace(/^(gw|w)_?/i, '');
              const existing = found.workspaces.find(
                w => w.id.toString().replace(/^(gw|w)_?/i, '') === cleanId
              );
              if (existing) {
                newWorkspaces.push(existing);
              } else {
                const globalWs = allGlobal.find(
                  w => w.id.toString().replace(/^(gw|w)_?/i, '') === cleanId
                );
                if (globalWs) {
                  newWorkspaces.push({
                    id: globalWs.id.toString().startsWith('w_') ? globalWs.id : 'w_' + cleanId,
                    name: globalWs.name,
                    provider: globalWs.provider,
                    env: globalWs.env,
                    accessLevel: 'User',
                    tables: globalWs.tables || 24,
                    schemas: globalWs.schemas || 4,
                    host: globalWs.host || 'localhost',
                    port: globalWs.port?.toString() || '1433',
                    databaseName: globalWs.databaseName || '',
                    username: globalWs.username || 'admin',
                    dbPassword: globalWs.dbPassword ?? 'admin'
                  });
                }
              }
            }

            found.workspaces = newWorkspaces;
            this.saveUsersMock(users);
          }
        }),
        map(() => undefined)
      );
    }

    const cleanId = this.cleanUserId(user.id);
    return this.http.put(
      `${API_CONFIG.apiUrl}/users/${cleanId}/workspaces`,
      {
        userName: user.name,
        email: user.email,
        roleId: user.roleId || 2,
        isActive: user.isActive ?? true,
        password: '',
        workspaceIds: workspaceIds
          .map(id => Number(this.cleanWorkspaceId(id)))
          .filter(id => Number.isFinite(id) && id > 0)
      },
      { ...this.httpOptions, responseType: 'text' }
    ).pipe(
      map(() => undefined),
      catchError(error => {
        console.warn(`PUT /users/${cleanId}/workspaces failed`, error);
        return throwError(() => error);
      })
    );
  }

  editWorkspaceForUser(
    userId: string,
    updatedWs: UserWorkspace
  ): Observable<UserWorkspace> {
    if (API_CONFIG.useMock) {
      return this.resolveMockEditWorkspaceForUser(userId, updatedWs);
    }
    const cleanWsId = this.cleanWorkspaceId(updatedWs.id);
    return this.http.put<any>(
      `${API_CONFIG.apiUrl}/workspaces/${cleanWsId}`,
      {
        workspaceName: updatedWs.name,
        databaseType: this.mapProviderToBackend(updatedWs.provider),
        serverName: updatedWs.host || 'localhost',
        port: updatedWs.port?.toString() || '1433',
        environmentType: this.mapEnvToBackend(updatedWs.env)
      },
      this.httpOptions
    ).pipe(
      map(() => updatedWs),
      catchError(error => {
        console.warn(`PUT /workspaces/${cleanWsId} failed`, error);
        return throwError(() => error);
      })
    );
  }

  private resolveMockEditWorkspaceForUser(
    userId: string,
    updatedWs: UserWorkspace
  ): Observable<UserWorkspace> {
    return this.resolveMockUsers().pipe(
      tap(users => {
        const user = users.find(u => u.id === userId);
        if (user) {
          const idx = user.workspaces.findIndex(w => w.id === updatedWs.id);
          if (idx !== -1) {
            user.workspaces[idx] = updatedWs;
            this.saveUsersMock(users);
          }
        }
      }),
      map(() => updatedWs)
    );
  }

  deleteWorkspaceForUser(userId: string, wsId: string): Observable<void> {
    if (API_CONFIG.useMock) {
      return this.resolveMockDeleteWorkspaceForUser(userId, wsId);
    }
    const cleanUId = this.cleanUserId(userId);
    const cleanWId = this.cleanWorkspaceId(wsId);
    return this.getUserDetails(userId).pipe(
      switchMap(user => {
        const wsIds = user.workspaces
          .map(w => this.cleanWorkspaceId(w.id))
          .filter(id => id !== cleanWId);
        return this.http.put<any>(
          `${API_CONFIG.apiUrl}/users/${cleanUId}/workspaces`,
          {
            userName: user.name,
            email: user.email,
            roleId: user.roleId || 2,
            isActive: user.isActive ?? true,
            password: '',
            workspaceIds: wsIds
          },
          this.httpOptions
        ).pipe(map(() => undefined));
      }),
      catchError(error => {
        console.warn(`PUT /users/${cleanUId}/workspaces (delete ws) failed`, error);
        return throwError(() => error);
      })
    );
  }

  private resolveMockDeleteWorkspaceForUser(
    userId: string,
    wsId: string
  ): Observable<void> {
    return this.resolveMockUsers().pipe(
      tap(users => {
        const user = users.find(u => u.id === userId);
        if (user) {
          user.workspaces = user.workspaces.filter(w => w.id !== wsId);
          this.saveUsersMock(users);
        }
      }),
      map(() => undefined)
    );
  }

  getGlobalWorkspaces(): Observable<any[]> {
    if (API_CONFIG.useMock) return this.resolveMockGlobalWorkspaces();

    return this.getWorkspaces(null).pipe(
      map(workspaces =>
        (workspaces || []).map(w => ({
          id: w.id,
          name: w.name,
          provider: w.provider,
          env: w.env,
          port: w.port || '1433',
          databaseName: w.databaseName || '',
          username: w.username || 'admin',
          dbPassword: w.dbPassword ?? 'admin'
        }))
      ),
      catchError(error => {
        console.warn('GET global workspaces failed', error);
        return throwError(() => error);
      })
    );
  }

  private resolveMockGlobalWorkspaces(): Observable<any[]> {
    const stored = localStorage.getItem('admin_workspaces');
    if (stored) return of(JSON.parse(stored));
    const initial = [
      {
        id: 'gw1', name: 'Sales Analytics',
        provider: 'SQL Server', env: 'Production',
        tables: 183, schemas: 42,
        host: 'sql-prod-server.cgi.com', port: '1433',
        databaseName: 'sales_analytics', username: 'john_doe', dbPassword: 'admin'
      },
      {
        id: 'gw2', name: 'Customer Feedback',
        provider: 'PostgreSQL', env: 'UAT',
        tables: 48, schemas: 8,
        host: 'pg-uat-server.cgi.com', port: '5432',
        databaseName: 'customer_feedback', username: 'john_doe_ro', dbPassword: 'admin'
      },
      {
        id: 'gw3', name: 'Marketing Campaign',
        provider: 'MySQL', env: 'Development',
        tables: 35, schemas: 6,
        host: 'mysql-dev-server.cgi.com', port: '3306',
        databaseName: 'marketing_db', username: 'jane_smith', dbPassword: 'admin'
      },
      {
        id: 'gw4', name: 'Billing Sandbox',
        provider: 'PostgreSQL', env: 'Development',
        tables: 43, schemas: 9,
        host: 'pg-dev-server.cgi.com', port: '5432',
        databaseName: 'billing_sandbox', username: 'alex_johnson', dbPassword: 'admin'
      }
    ];
    localStorage.setItem('admin_workspaces', JSON.stringify(initial));
    return of(initial);
  }

  createGlobalWorkspace(newWs: any): Observable<any> {
    if (API_CONFIG.useMock) return this.resolveMockCreateGlobalWorkspace(newWs);

    return this.http.post<any>(
      `${API_CONFIG.apiUrl}/workspaces`,
      {
        workspaceName: newWs.name,
        databaseType: this.mapProviderToBackend(newWs.provider),
        serverName: newWs.host || 'localhost',
        port: newWs.port?.toString() || '1433',
        environmentType: this.mapEnvToBackend(newWs.env),
        databaseName: newWs.databaseName || '',
        databaseUserName: newWs.username || ''
      },
      this.httpOptions
    ).pipe(
      map(res => ({
        ...newWs,
        id: (res.workspaceId || res.id || newWs.id)?.toString()
      })),
      catchError(error => {
        console.warn('POST /workspaces failed', error);
        return throwError(() => error);
      })
    );
  }

  private resolveMockCreateGlobalWorkspace(newWs: any): Observable<any> {
    return this.getGlobalWorkspaces().pipe(
      tap(list => {
        list.push(newWs);
        localStorage.setItem('admin_workspaces', JSON.stringify(list));
      }),
      map(() => newWs)
    );
  }

  updateGlobalWorkspace(updatedWs: any): Observable<any> {
    if (API_CONFIG.useMock) return this.resolveMockUpdateGlobalWorkspace(updatedWs);

    const cleanWsId = this.cleanWorkspaceId(updatedWs.id);
    return this.http.put<any>(
      `${API_CONFIG.apiUrl}/workspaces/${cleanWsId}`,
      {
        workspaceName: updatedWs.name,
        databaseType: this.mapProviderToBackend(updatedWs.provider),
        serverName: updatedWs.host || 'localhost',
        port: updatedWs.port?.toString() || '1433',
        environmentType: this.mapEnvToBackend(updatedWs.env),
        databaseName: updatedWs.databaseName || '',
        databaseUserName: updatedWs.username || ''
      },
      this.httpOptions
    ).pipe(
      map(() => updatedWs),
      catchError(error => {
        console.warn(`PUT /workspaces/${cleanWsId} failed`, error);
        return throwError(() => error);
      })
    );
  }

  private resolveMockUpdateGlobalWorkspace(updatedWs: any): Observable<any> {
    return this.getGlobalWorkspaces().pipe(
      map(list => {
        const cleanUpdatedId = updatedWs.id.toString().replace(/^(gw|w)_?/i, '');
        const updated = list.map(w =>
          w.id.toString().replace(/^(gw|w)_?/i, '') === cleanUpdatedId ? { ...w, ...updatedWs } : w
        );
        localStorage.setItem('admin_workspaces', JSON.stringify(updated));

        // Also sync changes with mock users
        try {
          const usersStr = localStorage.getItem('admin_users');
          if (usersStr) {
            const users: AppUser[] = JSON.parse(usersStr);
            let changed = false;
            users.forEach(u => {
              u.workspaces = (u.workspaces || []).map(w => {
                if (w.id.toString().replace(/^(gw|w)_?/i, '') === cleanUpdatedId) {
                  changed = true;
                  return {
                    ...w,
                    name: updatedWs.name,
                    provider: this.mapProviderToFrontend(updatedWs.provider) || updatedWs.provider,
                    env: this.mapEnvToFrontend(updatedWs.env) || updatedWs.env,
                    tables: updatedWs.tables,
                    schemas: updatedWs.schemas,
                    host: updatedWs.host,
                    port: updatedWs.port,
                    databaseName: updatedWs.databaseName,
                    username: updatedWs.username,
                    dbPassword: updatedWs.dbPassword
                  };
                }
                return w;
              });
            });
            if (changed) {
              localStorage.setItem('admin_users', JSON.stringify(users));
            }
          }
        } catch (e) {
          console.error('Failed to sync updated workspace with mock users', e);
        }

        return updatedWs;
      })
    );
  }

  deleteGlobalWorkspace(wsId: string): Observable<void> {
    if (API_CONFIG.useMock) return this.resolveMockDeleteGlobalWorkspace(wsId);

    const cleanWsId = this.cleanWorkspaceId(wsId);
    return this.http.delete<void>(
      `${API_CONFIG.apiUrl}/workspaces/${cleanWsId}`,
      this.httpOptions
    ).pipe(
      catchError(error => {
        console.warn(`DELETE /workspaces/${cleanWsId} failed`, error);
        return throwError(() => error);
      })
    );
  }

  private resolveMockDeleteGlobalWorkspace(wsId: string): Observable<void> {
    return this.getGlobalWorkspaces().pipe(
      tap(list => {
        const cleanDeletedId = wsId.toString().replace(/^(gw|w)_?/i, '');
        localStorage.setItem(
          'admin_workspaces',
          JSON.stringify(list.filter(w => w.id.toString().replace(/^(gw|w)_?/i, '') !== cleanDeletedId))
        );

        // Also sync deletion with mock users
        try {
          const usersStr = localStorage.getItem('admin_users');
          if (usersStr) {
            const users: AppUser[] = JSON.parse(usersStr);
            let changed = false;
            users.forEach(u => {
              const beforeCount = u.workspaces?.length || 0;
              u.workspaces = (u.workspaces || []).filter(
                w => w.id.toString().replace(/^(gw|w)_?/i, '') !== cleanDeletedId
              );
              if ((u.workspaces?.length || 0) !== beforeCount) {
                changed = true;
              }
            });
            if (changed) {
              localStorage.setItem('admin_users', JSON.stringify(users));
            }
          }
        } catch (e) {
          console.error('Failed to sync deleted workspace with mock users', e);
        }
      }),
      map(() => undefined)
    );
  }
}