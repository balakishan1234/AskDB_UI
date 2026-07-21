import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError, Subject } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { API_CONFIG } from '../config/api.config';

export interface UserSession {
  userId: number;
  userName: string;
  roleId: number;
  roleName: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
}

export interface LoginResponse {
  user: UserSession;
  sessionInfo?: SessionInfo;
  message?: string;
}

export interface SessionInfo {
  sessionId: string;
  device: string;
  browser: string;
  loginTime: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser: UserSession | null = null;

  private readonly SESSION_KEY = 'user';
  private readonly EMAIL_KEY = 'userEmail';
  private readonly NAME_KEY = 'userName';
  private readonly ROLE_KEY = 'userRole';
  private readonly SESSION_INFO_KEY = 'sessionInfo';
  private readonly SESSION_FLAG_KEY = 'askdb_session_active';

  public onSessionCleared = new Subject<void>();
  private tabId = Math.random().toString(36).substring(2, 15);
  private heartbeatInterval: any;

  constructor(private http: HttpClient) {
    this.initSession();
  }

  /**
   * Initializes session state on tab startup/reload.
   * - Performs cross-tab checks using active tab heartbeats.
   * - Clears local/session storage if this is the first tab opening fresh.
   * - Starts heartbeat cycle and attaches listeners for unload and cross-tab logout.
   */
  private initSession(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;

    // Check if other tabs are active, and clean up inactive heartbeats
    const otherActive = this.cleanActiveTabsAndCheck();
    const tabAlive = sessionStorage.getItem(this.SESSION_FLAG_KEY);

    if (!tabAlive && !otherActive) {
      // First tab opening fresh, or all tabs closed previously
      this.clearAllStorage();
    } else {
      // Page refresh, or opening a new tab when a session is already active
      sessionStorage.setItem(this.SESSION_FLAG_KEY, 'true');
      this.loadSessionFromStorage();
    }

    // Start periodic heartbeat updates for this tab
    this.heartbeatInterval = setInterval(() => {
      this.updateTabHeartbeat();
    }, 2000);

    // Listen for tab close/refresh to clean up active tabs list immediately
    window.addEventListener('beforeunload', () => {
      this.removeTabFromActiveList();
    });

    // Listen for storage events (e.g. logout in another tab)
    window.addEventListener('storage', (event) => {
      if (event.key === this.SESSION_KEY && !event.newValue) {
        this.currentUser = null;
        this.onSessionCleared.next();
      }
    });
  }

  /**
   * Periodically updates this tab's heartbeat timestamp in localStorage.
   * Allows other tabs to know this tab is currently active.
   */
  private updateTabHeartbeat(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    const now = Date.now();
    const raw = localStorage.getItem('askdb_active_tabs');
    let tabs: Record<string, number> = {};
    if (raw) {
      try {
        tabs = JSON.parse(raw);
      } catch (e) {
        tabs = {};
      }
    }
    tabs[this.tabId] = now;
    localStorage.setItem('askdb_active_tabs', JSON.stringify(tabs));
  }

  /**
   * Iterates through active tabs listed in localStorage.
   * Removes heartbeats older than 5 seconds (stale tabs) and returns
   * true if any other tab has checked in recently.
   */
  private cleanActiveTabsAndCheck(): boolean {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
    const now = Date.now();
    const raw = localStorage.getItem('askdb_active_tabs');
    if (!raw) {
      const tabs = { [this.tabId]: now };
      localStorage.setItem('askdb_active_tabs', JSON.stringify(tabs));
      return false;
    }

    let tabs: Record<string, number> = {};
    try {
      tabs = JSON.parse(raw);
    } catch (e) {
      tabs = {};
    }

    let otherActive = false;
    const cleanTabs: Record<string, number> = {};
    for (const [id, timestamp] of Object.entries(tabs)) {
      if (id === this.tabId) continue;
      // Stale threshold is 5 seconds
      if (now - timestamp < 5000) {
        otherActive = true;
        cleanTabs[id] = timestamp;
      }
    }
    cleanTabs[this.tabId] = now;
    localStorage.setItem('askdb_active_tabs', JSON.stringify(cleanTabs));
    return otherActive;
  }

  /**
   * Removes this tab's ID from the list of active heartbeats in localStorage.
   */
  private removeTabFromActiveList(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem('askdb_active_tabs');
    if (!raw) return;
    try {
      const tabs = JSON.parse(raw);
      delete tabs[this.tabId];
      localStorage.setItem('askdb_active_tabs', JSON.stringify(tabs));
    } catch (e) {
      // Ignore
    }
  }

  /**
   * Authenticates user using corporate email and password.
   * - Utilizes mock authentication database if API_CONFIG.useMock is enabled.
   * - Otherwise, issues post request to `/auth/login` endpoint.
   * - Triggers saveSession on success.
   */
  login(email: string, password?: string): Observable<LoginResponse> {
    const input = email.trim();

    if (API_CONFIG.useMock) {
      return this.resolveMockLogin(input, password);
    }

    return this.http
      .post<any>(
        `${API_CONFIG.apiUrl}/auth/login`,
        { email: input, password },
        { withCredentials: true }
      )
      .pipe(
        map((response: any) => {
          const userData = response?.user ?? response;
          const session: UserSession = {
            userId: userData.userId,
            userName: userData.userName,
            roleId: userData.roleId,
            roleName: userData.roleName,
            email: userData.email || input,
            name: userData.userName,
            role: userData.roleId === 1 ? 'admin' : 'user',
          };

          return {
            user: session,
            sessionInfo: response?.sessionInfo as SessionInfo | undefined,
            message: response?.message,
          } as LoginResponse;
        }),
        tap((loginResponse: LoginResponse) => {
          this.saveSession(loginResponse.user);

          if (loginResponse.sessionInfo) {
            localStorage.setItem(
              this.SESSION_INFO_KEY,
              JSON.stringify(loginResponse.sessionInfo)
            );
          } else {
            localStorage.removeItem(this.SESSION_INFO_KEY);
          }
        }),
        catchError((error: any) => {
          console.warn('Backend API /auth/login failed.', error);
          return throwError(() => error);
        })
      );
  }

  private resolveMockLogin(
    email: string,
    password?: string
  ): Observable<LoginResponse> {
    if (!email) {
      return throwError(() => new Error('Please enter your corporate email.'));
    }

    if (!password?.trim()) {
      return throwError(() => new Error('Please enter your password.'));
    }

    const cleanInput = email.toLowerCase();
    const isMockAdmin =
      cleanInput === 'admin@cgi.com' || cleanInput === 'admin@test.com';

    let resolvedEmail = '';
    let displayName = 'Enterprise User';
    let roleId = 2;
    let roleName = 'User';

    if (isMockAdmin) {
      resolvedEmail = 'admin@cgi.com';
      displayName = 'System Administrator';
      roleId = 1;
      roleName = 'Admin';
    } else {
      let usersList: any[] = [];
      const stored = localStorage.getItem('admin_users');

      if (stored) {
        usersList = JSON.parse(stored);
      } else {
        usersList = [
          {
            id: 'u1',
            name: 'John Doe',
            email: 'john.doe@cgi.com',
            roleId: 2,
            roleName: 'User',
            workspaces: [
              {
                id: 'w1',
                name: 'Sales Analytics',
                provider: 'SQL Server',
                env: 'Production',
                accessLevel: 'User',
                tables: 183,
                schemas: 42
              },
              {
                id: 'w2',
                name: 'Customer Feedback',
                provider: 'PostgreSQL',
                env: 'UAT',
                accessLevel: 'User',
                tables: 48,
                schemas: 8
              },
            ],
          },
          {
            id: 'u2',
            name: 'Jane Smith',
            email: 'jane.smith@cgi.com',
            roleId: 2,
            roleName: 'User',
            workspaces: [
              {
                id: 'w3',
                name: 'Marketing Campaign',
                provider: 'MySQL',
                env: 'Development',
                accessLevel: 'Admin',
                tables: 35,
                schemas: 6
              },
            ],
          },
          {
            id: 'u3',
            name: 'Alex Johnson',
            email: 'alex.johnson@cgi.com',
            roleId: 2,
            roleName: 'User',
            workspaces: [
              {
                id: 'w4',
                name: 'Billing Sandbox',
                provider: 'PostgreSQL',
                env: 'Development',
                accessLevel: 'Admin',
                tables: 43,
                schemas: 9
              },
              {
                id: 'w2',
                name: 'Customer Feedback',
                provider: 'PostgreSQL',
                env: 'UAT',
                accessLevel: 'User',
                tables: 48,
                schemas: 8
              },
            ],
          },
        ];
        localStorage.setItem('admin_users', JSON.stringify(usersList));
      }

      const aliasMap: Record<string, string> = {
        'john@test.com': 'john.doe@cgi.com',
        'jane@test.com': 'jane.smith@cgi.com',
        'alex@test.com': 'alex.johnson@cgi.com',
      };

      const searchEmail = aliasMap[cleanInput] ?? cleanInput;
      const matched = usersList.find(
        (u) => u.email.toLowerCase() === searchEmail
      );

      if (!matched) {
        return throwError(
          () =>
            new Error(
              'Access denied. User profile not found in Admin registry. Please contact your administrator.'
            )
        );
      }

      resolvedEmail = matched.email;
      displayName = matched.name;
      roleId = matched.roleId ?? 2;
      roleName = matched.roleName ?? 'User';
    }

    const session: UserSession = {
      userId: roleId === 1 ? 1 : 2,
      userName: displayName,
      roleId,
      roleName,
      email: resolvedEmail,
      name: displayName,
      role: roleId === 1 ? 'admin' : 'user',
    };

    this.saveSession(session);
    return of({ user: session, message: 'Login successful' });
  }

  logout(): Observable<void> {
    if (API_CONFIG.useMock) {
      this.clearSession(true); // explicit manual logout
      return of(undefined);
    }

    return this.http
      .post<void>(
        `${API_CONFIG.apiUrl}/auth/logout`,
        {},
        { withCredentials: true }
      )
      .pipe(
        tap(() => this.clearSession(true)), // explicit manual logout
        catchError((err) => {
          console.warn('Backend /auth/logout failed. Clearing session locally.', err);
          this.clearSession(true); // explicit manual logout
          return throwError(() => err);
        })
      );
  }

  getCurrentUser(): UserSession | null {
    if (!this.currentUser) {
      this.loadSessionFromStorage();
    }
    return this.currentUser;
  }

  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null;
  }

  clearLocalSession(): void {
    this.clearSession(false); // automatic timeout/expiration preserves email convenience key
  }

  private saveSession(session: UserSession): void {
    this.currentUser = session;

    localStorage.setItem(this.EMAIL_KEY, session.email);
    localStorage.setItem(this.NAME_KEY, session.userName);
    localStorage.setItem(this.ROLE_KEY, session.role);
    localStorage.setItem(
      this.SESSION_KEY,
      JSON.stringify({
        userId: session.userId,
        userName: session.userName,
        roleId: session.roleId,
        roleName: session.roleName,
        email: session.email,
      })
    );

    // Save the last email convenience key for pre-populating login screen on lock/expiration
    localStorage.setItem('askdb_last_email', session.email);

    sessionStorage.setItem(this.SESSION_FLAG_KEY, 'true');
  }

  /**
   * Invalidates current user object and triggers clean up procedures.
   * - Saves/removes pre-populated emails depending on whether logout was explicit.
   */
  private clearSession(explicit = false): void {
    this.currentUser = null;
    this.clearAllStorage(explicit);
  }

  /**
   * Wipes session variables, local state, tab tracking, and cached workspaces.
   * - Clears credentials (`SESSION_KEY`, `EMAIL_KEY`, `NAME_KEY`, `ROLE_KEY`).
   * - Removes current active workspace keys to prevent cross-login info leak.
   * - Iterates over local storage to remove cached state.
   * - Stops the tab heartbeat and notifies other parts of the app.
   */
  private clearAllStorage(explicit = false): void {
    this.currentUser = null;

    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.EMAIL_KEY);
    localStorage.removeItem(this.NAME_KEY);
    localStorage.removeItem(this.ROLE_KEY);
    localStorage.removeItem(this.SESSION_INFO_KEY);
    localStorage.removeItem('askdb_last_activity');

    // ✅ Clean up active workspace mapping keys to prevent session privacy leaks
    localStorage.removeItem('connectedWorkspace');
    localStorage.removeItem('workspace_access_times');

    if (explicit) {
      localStorage.removeItem('askdb_last_email');
    }

    sessionStorage.removeItem(this.SESSION_FLAG_KEY);

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key?.startsWith('askdb_state_') ||
        key?.startsWith('askdb_first_visit')
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((k) => localStorage.removeItem(k));

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.removeTabFromActiveList();

    this.onSessionCleared.next();
  }

  private loadSessionFromStorage(): void {
    const userStr = localStorage.getItem(this.SESSION_KEY);

    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        this.currentUser = {
          userId: user.userId,
          userName: user.userName,
          roleId: user.roleId,
          roleName: user.roleName,
          email: user.email,
          name: user.userName,
          role: user.roleId === 1 ? 'admin' : 'user',
        };
        return;
      } catch (e) {
        console.error('Failed to parse user session from localStorage:', e);
        this.clearAllStorage();
      }
    }

    const email = localStorage.getItem(this.EMAIL_KEY);
    const name = localStorage.getItem(this.NAME_KEY);
    const role = localStorage.getItem(this.ROLE_KEY) as 'admin' | 'user' | null;

    if (email && name && role) {
      this.currentUser = {
        userId: role === 'admin' ? 1 : 2,
        userName: name,
        roleId: role === 'admin' ? 1 : 2,
        roleName: role === 'admin' ? 'Admin' : 'User',
        email,
        name,
        role,
      };
    } else {
      this.currentUser = null;
    }
  }
}