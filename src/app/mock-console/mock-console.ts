import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { API_CONFIG } from '../config/api.config';
import { MockConsoleService } from '../services/mock-console.service';

interface EndpointInfo {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  mockHandler: string;
}

@Component({
  selector: 'app-mock-console',
  imports: [CommonModule],
  templateUrl: './mock-console.html',
  styleUrl: './mock-console.css'
})
export class MockConsole {
  @Output() close = new EventEmitter<void>();

  endpoints: EndpointInfo[] = [
    { method: 'POST', path: '/auth/login', description: 'User / Admin authentication login', mockHandler: 'resolveMockLogin()' },
    { method: 'POST', path: '/auth/logout', description: 'Clear user session and tokens', mockHandler: 'clearSession()' },
    { method: 'GET', path: '/sessions/active', description: 'Get all active sessions for current user', mockHandler: 'N/A (backend endpoint)' },
    { method: 'GET', path: '/sessions/current', description: 'Get current device session details', mockHandler: 'N/A (backend endpoint)' },
    { method: 'DELETE', path: '/sessions/{sessionId}', description: 'Logout a specific remote session', mockHandler: 'N/A (backend endpoint)' },
    { method: 'POST', path: '/sessions/logout-others', description: 'Logout all sessions except current', mockHandler: 'N/A (backend endpoint)' },
    { method: 'POST', path: '/sessions/logout-all', description: 'Logout all sessions including current', mockHandler: 'N/A (backend endpoint)' },
    { method: 'GET', path: '/users/my-users', description: 'Admin: Retrieve list of corporate profiles', mockHandler: 'resolveMockUsers()' },
    { method: 'GET', path: '/users/{id}', description: 'Admin: Get user details & active workspaces', mockHandler: 'getUserDetails()' },
    { method: 'POST', path: '/users', description: 'Admin: Register a new system user profile', mockHandler: 'resolveMockAddUser()' },
    { method: 'DELETE', path: '/users/{id}', description: 'Admin: Revoke and delete user system profile', mockHandler: 'resolveMockDeleteUser()' },
    { method: 'GET', path: '/users/{userId}/workspaces', description: 'Retrieve mapped workspaces for current user (dropdown and assignment source)', mockHandler: 'resolveMockWorkspaces()' },
    { method: 'PUT', path: '/users/{userId}/workspaces', description: 'Admin: Map / revoke workspace access for user', mockHandler: 'resolveMockAddWorkspaceToUser() / resolveMockDeleteWorkspaceForUser()' },
    { method: 'POST', path: '/workspaces', description: 'Admin: Register a new global database workspace', mockHandler: 'resolveMockCreateGlobalWorkspace()' },
    { method: 'GET', path: '/workspaces/{id}', description: 'Retrieve specific workspace credentials & schema count', mockHandler: 'resolveMockWorkspaceDetails()' },
    { method: 'PUT', path: '/workspaces/{id}', description: 'Modify credentials or edit connection parameters', mockHandler: 'resolveMockEditWorkspaceForUser() / resolveMockUpdateWorkspacePassword()' },
    { method: 'DELETE', path: '/workspaces/{id}', description: 'Admin: Revoke and remove global workspace catalog node', mockHandler: 'resolveMockDeleteGlobalWorkspace()' },
    { method: 'POST', path: '/dashboard/connect', description: 'Establish secure connection & verify DB handshake', mockHandler: 'testConnection() (0.1s delay)' },
    { method: 'POST', path: '/dashboard/query', description: 'Compile natural language query or execute raw SQL', mockHandler: 'resolveMockGenerateSql() / resolveMockRunQuery()' }
  ];

  constructor(public mockConsoleService: MockConsoleService) { }

  get isMockActive(): boolean {
    return API_CONFIG.useMock;
  }

  onClose(): void {
    this.mockConsoleService.close();
    this.close.emit();
  }
}
