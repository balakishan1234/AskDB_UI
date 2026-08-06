-------Developer Technical Notes------------------

# AskDb - Angular Concepts, Architectural Logic & Code Explanations

This document provides a deep dive into the **Angular concepts, architecture, methods, and logic** used in the **AskDb** application. It is designed to help developers and stakeholders understand the codebase and explain the system logic to others.

---

## 🛠️ 1. Angular Core Architecture Concepts

### Standalone Components
In traditional Angular, components had to be declared inside an `NgModule`. AskDb uses **Standalone Components** (introduced in Angular 14+ and standard in Angular 18/20).
* **How it works**: Every component declares its own imports directly. For example, in [ai-chat.ts](file:///d:/ASK/AskDb/src/app/ai-chat/ai-chat.ts):
  ```typescript
  @Component({
    selector: 'app-ai-chat',
    imports: [CommonModule, FormsModule, RouterLink, QueryTable, QueryCharts, QueryExcel],
    templateUrl: './ai-chat.html',
    styleUrl: './ai-chat.css',
  })
  export class AIChat implements OnInit, OnDestroy { ... }
  ```
* **Why we use it**: It simplifies module organization, makes components self-contained, and allows for faster building and optimization.

### Zoneless Change Detection
AskDb is configured with **Zoneless Change Detection** in [app.config.ts](file:///d:/ASK/AskDb/src/app/app.config.ts):
```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    ...
  ]
};
```
* **Traditional Angular**: Relies on `Zone.js` to monkey-patch asynchronous browser APIs (setTimeout, events, promises) and trigger global dirty-checking when anything asynchronous happens.
* **Zoneless Angular**: Removes `Zone.js` overhead completely. Angular monitors state changes via signals, event triggers, HTTP responses, or direct component scheduler checks.
* **Why we use it**: It yields significant performance improvements, smaller bundle sizes, and compatibility with modern JS architectures.

### Dependency Injection (DI)
Angular handles components' service requirements using an advanced Dependency Injection (DI) container.
* **Services Configuration**: Services such as [auth.service.ts](file:///d:/ASK/AskDb/src/app/services/auth.service.ts) are marked with `@Injectable({ providedIn: 'root' })`. This instantiates them as singleton instances shared across all pages.
* **Constructor Injection**: In [work-space.ts](file:///d:/ASK/AskDb/src/app/work-space/work-space.ts), dependencies are injected through the constructor parameters:
  ```typescript
  constructor(
    private router: Router,
    private authService: AuthService,
    private workspaceService: WorkspaceService
  ) {}
  ```

---

## 🔄 2. Reactive Programming with RxJS

Angular utilizes **RxJS** (Reactive Extensions for JavaScript) to coordinate asynchronous processes and HTTP communications. In AskDb, we rely on standard streams and operations:

1. **Observables (`Observable<T>`)**: Asynchronous streams representing datasets returned over time.
2. **Operators**: Functions used in a `.pipe()` sequence to inspect or alter incoming stream data:
   * `map()`: Re-formats raw backend data to frontend interfaces (e.g., mapping backend array columns to custom objects in `WorkspaceService`).
   * `catchError()`: Grabs errors from failed HTTP transactions and returns alternative streams (e.g., falling back to client-side mock workflows in case the backend REST API server isn't running).
   * `tap()`: Runs side effects without altering the stream value (e.g., caching user login tokens inside LocalStorage).
   * `delay()`: Artificially pauses streams to simulate network latency for smoother loading animations.
   * `switchMap()`: Cancels current streams and triggers nested async tasks (used when querying detailed workspaces listings for multiple users in a single operation).

---

## 🎨 3. UI Template Logic & Directives

### Structural Control Block Syntax
The application template files make use of Angular's modern block syntax (introduced in Angular 17+ as a replacement for `*ngIf` and `*ngFor` directives):
* **Conditional Blocks (`@if` / `@else`)**:
  ```html
  @if (isVerifyingConnection) {
    <div class="spinner">Verifying...</div>
  } @else {
    <button (click)="submitConnect()">Connect</button>
  }
  ```
* **Looping Blocks (`@for` with `track`)**:
  ```html
  @for (ws of workspaces; track ws.id) {
    <div class="card" (click)="openWorkspace(ws.name)">
      <h3>{{ ws.name }}</h3>
    </div>
  }
  ```
  The `track` keyword is required and provides Angular with a key to identify which elements to update or re-render when the underlying array changes.

### Event & Value Binding
* **Two-way Data Binding (`[(ngModel)]`)**: Synchronizes form field inputs directly with class variables. Changes made in the template update the TS property immediately, and vice-versa.
* **Property Binding (`[class.xyz]` or `[ngClass]`)**: Conditionally applies CSS classes based on Boolean evaluations (e.g. styling cards based on whether the workspace environment is UAT, Prod, or Development).

---

## 📂 4. Deep Component-Level Method Explanations

### A. Login Component (`Login` class)
* **Location**: [login.ts](file:///d:/ASK/AskDb/src/app/login/login.ts)
* **`onLogin()`**: Triggers authentication validations. It trims user email inputs, checks for passwords, and calls the `AuthService.login()` pipeline. 
* **Session Redirections**: Upon successful resolution of the login observable, it navigates users to `/work-space`.

### B. User Workspace Component (`WorkSpace` class)
* **Location**: [work-space.ts](file:///d:/ASK/AskDb/src/app/work-space/work-space.ts)
* **`filteredWorkspaces`**: A dynamic getter that filters user workspace database cards based on query searches or selected environments (Production, UAT, Development).
* **`openWorkspace()`**: Fetches workspace metadata (host, port, DB provider) from `WorkspaceService`, pre-fills the connection form with saved credentials, and pops up the connection modal.
* **`submitConnect()`**: Test-runs database connection handshakes via the secure API. If verified successfully, it saves the password updates to the backend and redirects the user to the `/ai-chat` screen with query arguments matching the target workspace ID.

### C. AI Chat Assistant Component (`AIChat` class)
* **Location**: [ai-chat.ts](file:///d:/ASK/AskDb/src/app/ai-chat/ai-chat.ts)
* **`saveWorkspaceState()` / `selectWorkspace()`**: State management helper methods. In order to prevent chat logs, typed SQL, or query results from disappearing when switching between database workspace panels, it serializes and caches states in `localStorage` indexed by workspace IDs.
* **`sendMessage()`**: Submits natural language inputs to `ChatQueryService.generateSql()`, sets progress loaders, appends results to chat history lists, and redirects generated SQL statements straight into the Query Editor console.
* **`runQuery()`**: Calls the database execution services. Upon completion, it updates visual tables, updates charts, and toggles spreadsheet grid representations.
* **`getHighlightedSql()`**: Custom regex formatter. It parses raw SQL scripts and wraps SQL keywords (`SELECT`, `FROM`, `JOIN`, `WHERE`) in classes containing text-indigo-400 styles to improve readability.
* **`onDocumentClick()`** via `@HostListener`: Listens for global clicks outside of specific dropdown menus (like workspace settings or user profiles) to automatically dismiss them.

### D. Excel spreadsheet Component (`QueryExcel` class)
* **Location**: [query-excel.ts](file:///d:/ASK/AskDb/src/app/ai-chat/query-visualizer/query-excel/query-excel.ts)
* **`onCellChanged()`**: Captures inputs when cell grids are edited. It modifies target index rows, updates dataset instances in memory, and triggers the `onDataChanged` emitter to notify parent containers of the updates.
* **`exportToExcel()`**: Creates a client-side spreadsheet download. 
  1. It loops through active spreadsheet cells.
  2. It wraps column values in double quotes, escaping internal quotes to prevent **CSV injection**.
  3. It constructs a CSV character stream.
  4. It instantiates a web `Blob` (`{ type: 'text/csv;charset=utf-8;' }`).
  5. It generates a temporary download URL, programmatically clicks a hidden anchor element to trigger local browser downloads, and clean-caches URL objects afterward.

### E. Admin Workspace Console (`AdminWorkspace` class)
* **Location**: [admin-workspace.ts](file:///d:/ASK/AskDb/src/app/admin-workspace/admin-workspace.ts)
* **User CRUD methods**:
  * `addUser()`: Validates that corporate emails match the `@cgi.com` suffix before adding users to the local system database.
  * `deleteUser()`: Revokes system accounts and deletes corresponding workspaces allocations.
* **Assignments & Global catalog**:
  * `addWorkspace()`: Links active global database profiles (SQL Server, MySQL, Postgres) to target users, setting access clearances (`Owner`, `Read Only`).
  * `createGlobalWorkspace()`: Registers global database connections catalog entries.

---

## 🔒 5. HTML Safety & DomSanitizer

Since the application dynamically generates code components (specifically SQL syntax highlighting in the chat log and code editor), Angular's default HTML sanitizer will escape or remove `<span>` and `<style>` blocks to prevent Cross-Site Scripting (XSS) attacks.

To bypass this safely, we use the Angular **`DomSanitizer`** service:
```typescript
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

constructor(private sanitizer: DomSanitizer) {}

getHighlightedSql(sql: string): SafeHtml {
  let highlighted = sql;
  // ... perform regex replacements to wrap keywords in HTML spans ...
  return this.sanitizer.bypassSecurityTrustHtml(highlighted);
}
```
* **`bypassSecurityTrustHtml`**: Explicitly instructs Angular that the generated string is safe to be rendered dynamically using `[innerHTML]`.
