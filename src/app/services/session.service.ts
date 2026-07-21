import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

export interface ActiveSession {
  sessionId: string;
  deviceInfo: string;
  browserInfo: string;
  ipAddress: string;
  loginTime: string;
  lastActivity: string;
  isCurrentSession: boolean;
  location?: string;
}

export interface ActiveSessionsResponse {
  totalSessions: number;
  sessions: ActiveSession[];
}

export interface CurrentSessionInfo {
  sessionId: string;
  userId: number;
  userName: string;
  device: string;
  browser: string;
  ipAddress: string;
}

@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private readonly baseUrl = `${API_CONFIG.apiUrl}/sessions`;

  constructor(private http: HttpClient) {}

  /**
   * Retrieves active concurrent sessions for the authenticated user.
   * - In mock mode, returns a single default active session.
   */
  getActiveSessions(): Observable<ActiveSessionsResponse> {
    if (API_CONFIG.useMock) {
      return of({
        totalSessions: 1,
        sessions: [
          {
            sessionId: 'mock_sess_1',
            deviceInfo: 'Windows PC',
            browserInfo: 'Chrome Browser',
            ipAddress: '127.0.0.1',
            loginTime: new Date().toISOString(),
            lastActivity: new Date().toISOString(),
            isCurrentSession: true,
            location: 'Local Handshake'
          }
        ]
      });
    }
    return this.http.get<ActiveSessionsResponse>(`${this.baseUrl}/active`, { withCredentials: true });
  }

  /**
   * Retrieves metadata of the current active session.
   * - In mock mode, returns fallback values representing the corporate session.
   */
  getCurrentSession(): Observable<CurrentSessionInfo> {
    if (API_CONFIG.useMock) {
      return of({
        sessionId: 'mock_sess_1',
        userId: 1,
        userName: 'System Administrator',
        device: 'Windows PC',
        browser: 'Chrome Browser',
        ipAddress: '127.0.0.1'
      });
    }
    return this.http.get<CurrentSessionInfo>(`${this.baseUrl}/current`, { withCredentials: true });
  }

  /**
   * Dispatches command to terminate a specific session by ID.
   */
  logoutSession(sessionId: string): Observable<{ message: string }> {
    if (API_CONFIG.useMock) {
      return of({ message: `Session ${sessionId} terminated successfully.` });
    }
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${sessionId}`, { withCredentials: true });
  }

  /**
   * Dispatches command to invalidate other concurrent user sessions.
   */
  logoutOtherSessions(): Observable<{ message: string }> {
    if (API_CONFIG.useMock) {
      return of({ message: 'Other active sessions terminated.' });
    }
    return this.http.post<{ message: string }>(`${this.baseUrl}/logout-others`, {}, { withCredentials: true });
  }

  /**
   * Dispatches command to invalidate all concurrent user sessions (self included).
   */
  logoutAllSessions(): Observable<{ message: string }> {
    if (API_CONFIG.useMock) {
      return of({ message: 'All active sessions terminated.' });
    }
    return this.http.post<{ message: string }>(`${this.baseUrl}/logout-all`, {}, { withCredentials: true });
  }

  /**
   * Terminate all concurrent sessions across all user devices.
   */
  logoutFromAllDevices(): Observable<{ message: string }> {
    return this.logoutAllSessions();
  }
}
