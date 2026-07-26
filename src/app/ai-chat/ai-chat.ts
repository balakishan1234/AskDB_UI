import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, Subscription } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { QueryTable } from './query-visualizer/query-table/query-table';
import { QueryCharts } from './query-visualizer/query-charts/query-charts';
import { QueryExcel } from './query-visualizer/query-excel/query-excel';
import { QuerySummary } from './query-visualizer/query-summary/query-summary';

import { AuthService } from '../services/auth.service';
import { SessionTimeoutService } from '../services/session-timeout.service';
import { WorkspaceService, Workspace } from '../services/workspace.service';
import { ChatQueryService, ChatMessage } from '../services/chat-query.service';
import { ThemeService } from '../services/theme.service';
import { MockConsoleService } from '../services/mock-console.service';
import { API_CONFIG } from '../config/api.config';
import { SqlWarningPopup } from '../Validations/sql-warning-popup/sql-warning-popup';
import { SqlValidatorService, SqlValidationResult } from '../services/sql-validator.service';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VisualizerTab {
  key: 'table' | 'charts' | 'excel' | 'Summary';
  label: string;
}

interface PersistedWorkspaceState {
  chatMessages: ChatMessage[];
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-ai-chat',
  // ✅ Use Default change detection so BehaviorSubject updates propagate
  changeDetection: ChangeDetectionStrategy.Default,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    QueryTable,
    QueryCharts,
    QueryExcel,
    QuerySummary,
    SqlWarningPopup,
  ],
  templateUrl: './ai-chat.html',
  styleUrl: './ai-chat.css',
})
export class AIChat implements OnInit, OnDestroy {

  // ── Mock mode ──────────────────────────────────────────────────────────────
  get isMockMode(): boolean {
    return API_CONFIG.useMock;
  }

  // ── View state ─────────────────────────────────────────────────────────────
  activeView: 'chat' = 'chat';
  isSidebarOpen      = false;

  // ── User session ───────────────────────────────────────────────────────────
  userName     = '';
  userEmail    = '';
  userInitials = '';

  // ── Workspaces ─────────────────────────────────────────────────────────────
  workspaces: Workspace[]        = [];
  selectedWorkspace: Workspace | null = null;

  // ── Chat state ─────────────────────────────────────────────────────────────
  newMessage   = '';
  chatMessages: Record<string, ChatMessage[]> = {};

  // ── First-time visitor flag ────────────────────────────────────────────────
  isFirstTimeUser = false;

  // ── Loading / cancellation ─────────────────────────────────────────────────
  isGeneratingSql                              = false;
  private generateSqlSub: Subscription | null  = null;
  private querySubs = new Map<ChatMessage, Subscription>();

  // ── Toast notifications ────────────────────────────────────────────────────
  toastMessage: string | null             = null;
  toastState: 'success' | 'error' | null  = null;

  // ── Dropdown visibility ────────────────────────────────────────────────────
  showWorkspaceDetails = false;
  showUserProfile      = false;

  // ── Visualizer tabs ────────────────────────────────────────────────────────
  readonly visualizerTabs: VisualizerTab[] = [
    { key: 'table',   label: 'Data Grid' },
    { key: 'charts',  label: 'Charts'    },
    { key: 'excel',   label: 'Excel'     },
    { key: 'Summary', label: 'Summary'   },
  ];

  // ── SQL Validation state ───────────────────────────────────────────────────
  showSqlWarning                        = false;
  sqlValidation: SqlValidationResult | null = null;
  pendingMsg: ChatMessage | null            = null;

  // ── Destroy signal ─────────────────────────────────────────────────────────
  // ✅ Single subject — replaces all individual Subscription teardowns
  private readonly destroy$ = new Subject<void>();

  // ── Constructor ────────────────────────────────────────────────────────────
  constructor(
    private router:             Router,
    private route:              ActivatedRoute,
    private authService:        AuthService,
    public  workspaceService:   WorkspaceService,   // ✅ public — used in template
    private chatQueryService:   ChatQueryService,
    private sanitizer:          DomSanitizer,
    private cdr:                ChangeDetectorRef,
    private mockConsoleService: MockConsoleService,
    public  themeService:       ThemeService,
    private sqlValidator:       SqlValidatorService,
    private sessionTimeoutService: SessionTimeoutService,
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.checkFirstTimeVisitor();
    this.loadUserSession();

    // ✅ Subscribe to the reactive workspace stream FIRST
    // This ensures the sidebar/header always reflect the latest selection
    this.workspaceService.selectedWorkspace$
      .pipe(takeUntil(this.destroy$))
      .subscribe(ws => {
        this.selectedWorkspace = ws;

        // ✅ Log for debugging — remove in production
        console.log('[AIChat] selectedWorkspace$ updated →', ws);

        this.cdr.markForCheck();
      });

    // ✅ Then load workspaces — selectWorkspace() will call setSelectedWorkspace()
    this.loadWorkspaces();
  }

  ngOnDestroy(): void {
    // ✅ One signal kills all takeUntil subscriptions
    this.destroy$.next();
    this.destroy$.complete();

    // Cancel any in-flight requests
    this.generateSqlSub?.unsubscribe();
    this.querySubs.forEach(sub => sub.unsubscribe());
    this.querySubs.clear();
  }

  // ── First-time visitor ─────────────────────────────────────────────────────

  private checkFirstTimeVisitor(): void {
    const flag = 'askdb_first_visit_shown';
    if (!localStorage.getItem(flag)) {
      this.isFirstTimeUser = true;
      localStorage.setItem(flag, 'true');
    }
  }

  // ── Host listeners ─────────────────────────────────────────────────────────

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (
      !target.closest('.workspace-details-trigger') &&
      !target.closest('.workspace-details-dropdown')
    ) {
      this.showWorkspaceDetails = false;
    }
    if (
      !target.closest('.user-profile-trigger') &&
      !target.closest('.user-profile-dropdown')
    ) {
      this.showUserProfile = false;
    }
  }

  // ── Session ────────────────────────────────────────────────────────────────

  private loadUserSession(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    this.userEmail    = user.email;
    this.userName     = user.name;
    this.userInitials = user.name
      .split(' ')
      .map((p: string) => p.charAt(0))
      .join('')
      .toUpperCase();
  }

  // ── Workspaces ─────────────────────────────────────────────────────────────

  loadWorkspaces(): void {
    this.workspaceService
      .getWorkspaces(this.userEmail)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.workspaces = data;

          // ✅ Normalize every workspace through the service mappers
          // so env/provider values are always canonical UI strings
          this.workspaces = data.map(w => ({
            ...w,
            env:      this.workspaceService.mapEnvToFrontend(w.env)      || w.env,
            provider: this.workspaceService.mapProviderToFrontend(w.provider) || w.provider,
          }));

          // Check route param first
          const paramId = this.route.snapshot.queryParams['id'];
          if (paramId) {
            const match = this.workspaces.find(w => w.id === paramId);
            if (match) { this.selectWorkspace(match); return; }
          }

          // Otherwise auto-select first workspace
          if (this.workspaces.length > 0 && !this.selectedWorkspace) {
            this.selectWorkspace(this.workspaces[0]);
          }
        },
        error: (err) => {
          console.error('[AIChat] Failed to load workspaces:', err);
          this.showToastNotification(
            'Failed to load workspaces: ' + (err?.message ?? 'Unknown error'),
            'error'
          );
        },
      });
  }

  /**
   * ✅ selectWorkspace now calls setSelectedWorkspace()
   * which pushes through the BehaviorSubject → sidebar/header auto-update
   */
  selectWorkspace(workspace: Workspace): void {
    // ✅ Always normalize before selecting — defensive against stale data
    const normalized: Workspace = {
      ...workspace,
      env:      this.workspaceService.mapEnvToFrontend(workspace.env)       || workspace.env,
      provider: this.workspaceService.mapProviderToFrontend(workspace.provider) || workspace.provider,
    };

    // ✅ Push through BehaviorSubject — triggers selectedWorkspace$ subscription above
    this.workspaceService.setSelectedWorkspace(normalized);

    this.activeView    = 'chat';
    this.isSidebarOpen = false;

    this.workspaceService.setLastAccessed(normalized.id);
    this.restoreOrInitWorkspaceState(normalized);

    // ✅ Fetch full details (host, port, databaseName, username, mongoUri, oracleService, etc.)
    this.workspaceService.getWorkspaceDetails(normalized.id).subscribe({
      next: details => {
        const fullWs: Workspace = {
          ...normalized,
          ...details,
          env:      this.workspaceService.mapEnvToFrontend(details.env)       || details.env || normalized.env,
          provider: this.workspaceService.mapProviderToFrontend(details.provider) || details.provider || normalized.provider,
        };
        this.workspaceService.setSelectedWorkspace(fullWs);
        this.cdr.markForCheck();
      },
      error: err => {
        console.warn('[AIChat] Failed to load full details for workspace:', err);
      }
    });

    // ✅ markForCheck ensures OnPush-compatible zones also update
    this.cdr.markForCheck();
  }

  // ── Workspace state persistence ────────────────────────────────────────────

  private storageKey(wsId: string): string {
    return `askdb_state_${this.userEmail}_${wsId}`;
  }

  saveWorkspaceState(wsId: string): void {
    if (!wsId) return;
    const state: PersistedWorkspaceState = {
      chatMessages: this.chatMessages[wsId] ?? [],
    };
    try {
      localStorage.setItem(this.storageKey(wsId), JSON.stringify(state));
    } catch (e) {
      console.warn('[AIChat] Could not persist workspace state:', e);
    }
  }

  private restoreOrInitWorkspaceState(workspace: Workspace): void {
    const stored = localStorage.getItem(this.storageKey(workspace.id));
    if (stored) {
      try {
        const state: PersistedWorkspaceState = JSON.parse(stored);
        this.chatMessages[workspace.id] = state.chatMessages.map(msg =>
          this.hydrateMessage(msg)
        );
        return;
      } catch {
        console.warn('[AIChat] Could not parse stored workspace state — resetting.');
      }
    }
    this.resetWorkspaceStateToDefault(workspace);
  }

  private hydrateMessage(msg: ChatMessage): ChatMessage {
    if (msg.sql) {
      msg.originalSql      ??= msg.sql;
      msg.activeResultMode ??= 'normal';
      msg.visualizerTab    ??= 'table';
      msg.showResults      ??= true;
      msg.isExecuting        = false; // ✅ Never persist "executing" state
    }
    return msg;
  }

  resetWorkspaceStateToDefault(workspace: Workspace): void {
    const messages: ChatMessage[] = [];

    if (this.isFirstTimeUser) {
      messages.push({
        sender: 'ai',
        type:   'welcome',
        text:   `👋 Welcome to AskDB, ${this.userName || 'there'}! I'm your AI-powered database assistant. Ask me anything in plain English and I'll write and run the SQL for you.`,
      });
    }

    this.chatMessages[workspace.id] = messages;
    this.saveWorkspaceState(workspace.id);
  }

  // ── Messaging ──────────────────────────────────────────────────────────────

  sendMessage(): void {
    if (this.isGeneratingSql) return;

    const text = this.newMessage.trim();

    // ✅ Guard: snapshot selectedWorkspace once — avoid null mid-flight
    const workspace = this.selectedWorkspace;
    if (!text || !workspace) return;

    // Validate raw SQL typed directly in input
    const inputValidation = this.sqlValidator.validate(text);
    if (!inputValidation.isValid) {
      this.sqlValidation  = inputValidation;
      this.pendingMsg     = null;
      this.showSqlWarning = true;
      return;
    }

    const wsId = workspace.id;
    if (!this.chatMessages[wsId]) this.chatMessages[wsId] = [];

    this.chatMessages[wsId].push({ sender: 'user', text });
    this.saveWorkspaceState(wsId);
    this.newMessage      = '';
    this.isGeneratingSql = true;

    this.generateSqlSub = this.chatQueryService
      .generateSql(text, workspace)   // ✅ Pass snapshot — never null
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isGeneratingSql = false;
          this.generateSqlSub  = null;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (aiMessage) => {
          const hasOutput = !!aiMessage.sql?.trim() || (aiMessage.results?.length ?? 0) > 0;

          if (!hasOutput) {
            this.cdr.markForCheck();
            return;
          }

          // Fallback text
          if (aiMessage.input && !aiMessage.text) {
            aiMessage.text = aiMessage.input;
          }
           aiMessage.input = aiMessage.input || text;

          if (aiMessage.sql) {
            aiMessage.originalSql      = aiMessage.sql;
            aiMessage.isEdited         = false;
            aiMessage.activeResultMode = 'normal';
            aiMessage.visualizerTab    = 'table';
            aiMessage.showResults      = true;
            aiMessage.sqlValidation    = this.sqlValidator.validate(aiMessage.sql);
          }

          if (!this.chatMessages[wsId]) this.chatMessages[wsId] = [];
          this.chatMessages[wsId].push(aiMessage);

          // ✅ Only scroll if user is still on the same workspace
          if (this.selectedWorkspace?.id === wsId) {
            this.scrollChatToBottom();
          }

          this.saveWorkspaceState(wsId);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.showToastNotification(
            'Failed to generate query: ' + (err?.message ?? 'Unknown error'),
            'error'
          );
        },
      });
  }

  stopGeneratingSql(): void {
    this.generateSqlSub?.unsubscribe();
    this.generateSqlSub  = null;
    this.isGeneratingSql = false;
    this.showToastNotification('SQL generation cancelled.', 'error');
  }

  // ── Query execution ────────────────────────────────────────────────────────

  runQueryOnMessage(msg: ChatMessage): void {
    if (!msg.sql?.trim()) return;

    const validation = this.sqlValidator.validate(msg.sql);
    if (!validation.isValid) {
      this.sqlValidation  = validation;
      this.pendingMsg     = msg;
      this.showSqlWarning = true;
      msg.sqlValidation   = validation;
      this.showToastNotification(
        `Blocked: ${validation.detectedCommands.join(', ')} command(s) detected.`,
        'error'
      );
      return;
    }

    msg.sqlValidation = undefined;
    this.executeQuery(msg);
  }

  private executeQuery(msg: ChatMessage): void {
    // ✅ Snapshot workspace — guards against it changing mid-execution
    const workspace = this.selectedWorkspace;
    if (!workspace) {
      this.showToastNotification('No workspace selected.', 'error');
      return;
    }

    msg.isExecuting = true;
    this.showToastNotification('Executing SQL statement…', null);

    const sub = this.chatQueryService
      .runQuery(msg.sql!, workspace)  // ✅ Pass snapshot — never null
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          msg.isExecuting = false;
          this.querySubs.delete(msg);
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (result) => {
          msg.columns     = result.columns;
          msg.results     = result.results;
          msg.showResults = true;

          this.showToastNotification('SQL query executed successfully!', 'success');

          if (this.selectedWorkspace) {
            this.saveWorkspaceState(this.selectedWorkspace.id);
          }

          this.cdr.markForCheck();
        },
        error: (err) => {
          this.showToastNotification(
            'Execution error: ' + (err?.message ?? 'Unknown error'),
            'error'
          );
        },
      });

    this.querySubs.set(msg, sub);
  }

  stopQuery(msg: ChatMessage): void {
    const sub = this.querySubs.get(msg);
    if (sub) {
      sub.unsubscribe();
      this.querySubs.delete(msg);
    }
    msg.isExecuting = false;
    this.showToastNotification('SQL query execution cancelled.', 'error');
    this.cdr.markForCheck();
  }

  // ── SQL Warning Popup handlers ─────────────────────────────────────────────

  /** User clicked "Edit Query" — close popup, keep SQL editable */
  onWarningConfirm(): void {
    this.showSqlWarning = false;
    this.sqlValidation  = null;
    // ✅ Do NOT clear pendingMsg.sql — user wants to fix it
  }

  /** User clicked "Discard" — reset SQL to original safe version */
  onWarningClose(): void {
    if (this.pendingMsg) {
      this.pendingMsg.sql           = this.pendingMsg.originalSql ?? '';
      this.pendingMsg.isEdited      = false;
      this.pendingMsg.sqlValidation = undefined;

      if (this.selectedWorkspace) {
        this.saveWorkspaceState(this.selectedWorkspace.id);
      }
    }

    this.showSqlWarning = false;
    this.sqlValidation  = null;
    this.pendingMsg     = null;
    this.cdr.markForCheck();
  }

  // ── Message mutations ──────────────────────────────────────────────────────

  onMessageSqlChanged(msg: ChatMessage, sql: string): void {
    msg.sql           = sql;
    msg.isEdited      = sql !== msg.originalSql;
    msg.sqlValidation = this.sqlValidator.validate(sql);

    if (this.selectedWorkspace) {
      this.saveWorkspaceState(this.selectedWorkspace.id);
    }
  }

  toggleMessageResultMode(msg: ChatMessage, mode: 'normal' | 'advanced'): void {
    msg.activeResultMode = mode;
    if (this.selectedWorkspace) {
      this.saveWorkspaceState(this.selectedWorkspace.id);
    }
  }

  toggleMessageVisualizerTab(msg: ChatMessage, tab: VisualizerTab['key']): void {
    msg.visualizerTab = tab;
    if (this.selectedWorkspace) {
      this.saveWorkspaceState(this.selectedWorkspace.id);
    }
  }

  handleMessageDataChanged(msg: ChatMessage, updatedRows: any[]): void {
    msg.results = [...updatedRows];
    if (this.selectedWorkspace) {
      this.saveWorkspaceState(this.selectedWorkspace.id);
    }
  }

  // ── SQL utilities ──────────────────────────────────────────────────────────

  getHighlightedSql(sql: string): SafeHtml {
    const keywords = [
      'SELECT', 'FROM', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
      'OUTER JOIN', 'ON', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING',
      'DESC', 'ASC', 'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL',
      'SUM', 'COUNT', 'AVG', 'MIN', 'MAX',
      'TOP', 'LIMIT', 'OFFSET', 'FORMAT', 'AS',
      'YEAR', 'MONTH', 'DAY', 'CAST', 'CONVERT',
      'DISTINCT', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
    ];

    let html = sql
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    keywords.forEach(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, 'gi');
      html = html.replace(
        regex,
        match => `<span class="text-indigo-400 font-semibold">${match}</span>`
      );
    });

    // String literals
    html = html.replace(
      /'([^']*)'/g,
      `<span class="text-emerald-400">'$1'</span>`
    );

    // Numbers
    html = html.replace(
      /\b(\d+(?:\.\d+)?)\b/g,
      `<span class="text-amber-400">$1</span>`
    );

    // Comments
    html = html.replace(
      /(--[^\n]*)/g,
      `<span class="text-slate-500 italic">$1</span>`
    );

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  copySql(sql: string): void {
    navigator.clipboard.writeText(sql).then(() => {
      this.showToastNotification('SQL query copied to clipboard!', 'success');
    });
  }

  // ── Workspace registration ─────────────────────────────────────────────────

  handleWorkspaceRegistered(newWorkspace: Workspace): void {
    this.workspaceService.registerWorkspace(newWorkspace).subscribe({
      next: (registered) => {
        // ✅ Normalize immediately on registration
        const normalized: Workspace = {
          ...registered,
          env:      this.workspaceService.mapEnvToFrontend(registered.env)       || registered.env,
          provider: this.workspaceService.mapProviderToFrontend(registered.provider) || registered.provider,
        };

        if (!this.workspaces.some(w => w.id === normalized.id)) {
          this.workspaces.unshift(normalized);
        }
        this.selectWorkspace(normalized);
        this.router.navigate(['/ai-chat'], { queryParams: { id: normalized.id } });
        this.showToastNotification(
          `Workspace "${normalized.name}" registered successfully!`,
          'success'
        );
      },
      error: (err) => {
        this.showToastNotification(
          'Failed to register workspace: ' + (err?.message ?? 'Unknown error'),
          'error'
        );
      },
    });
  }

  // ── Toast ──────────────────────────────────────────────────────────────────

  showToastNotification(
    message: string,
    state: 'success' | 'error' | null
  ): void {
    this.toastMessage = message;
    this.toastState   = state;

    if (state !== null) {
      setTimeout(() => {
        if (this.toastMessage === message) {
          this.toastMessage = null;
          this.toastState   = null;
        }
      }, 3000);
    }
  }

  // ── Chat utilities ─────────────────────────────────────────────────────────

  resetChat(): void {
    if (!this.selectedWorkspace) return;
    this.resetWorkspaceStateToDefault(this.selectedWorkspace);
    this.showToastNotification('Conversation reset successfully.', 'success');
  }

  private scrollChatToBottom(): void {
    setTimeout(() => {
      const el = document.getElementById('chat-scroll-area');
      if (el) el.scrollTop = el.scrollHeight;
    }, 100);
  }

  // ── Auth ───────────────────────────────────────────────────────────────────

  logout(): void {
    this.sessionTimeoutService.logout(true);
  }

  // ── Mock console ───────────────────────────────────────────────────────────

  openMockConsole(): void {
    this.mockConsoleService.open();
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }
}