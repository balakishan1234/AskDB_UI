import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay, map, catchError } from 'rxjs/operators';
import { API_CONFIG } from '../config/api.config';
import { SqlValidationResult } from './sql-validator.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ChatMessage {
  sender: 'user' | 'ai';
  text?: string;
  input?: string;
  type?: 'welcome' | 'workspace' | 'query';

  // SQL fields
  sql?: string;
  originalSql?: string;
  isEdited?: boolean;
  isExecuting?: boolean;
  explanation?: string;

  // Result fields
  columns?: string[];
  results?: Array<Record<string, string | number>>;
  showResults?: boolean;
  activeResultMode?: 'normal' | 'advanced';
  visualizerTab?: 'table' | 'charts' | 'excel' | 'Summary';
  sqlValidation?: SqlValidationResult;
}

export interface QueryResult {
  columns: string[];
  results: Array<Record<string, string | number>>;
}

// ✅ Workspace context passed to every API call
export interface WorkspaceContext {
  id: string;
  name: string;
  provider: string;
  env: string;
  host?: string;
  port?: string;
  databaseName?: string;
  username?: string;
  dbPassword?: string;
}

// ✅ Shape of every backend request payload
interface QueryPayload {
  question?: string;
  sqlQuery?: string;
  workspaceId: number | string;
  userId: number | string;
  dbPassword: string;
  databaseType: string;
  serverName: string;
  port: string;
  environmentType: string;
  databaseName: string;
  databaseUserName: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ChatQueryService {

  private readonly httpOptions = { withCredentials: true };

  constructor(private http: HttpClient) {}

  // ── Session helpers ───────────────────────────────────────────────────────

  private getStoredUserId(): number | string {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user?.userId != null) return user.userId;
    } catch { /* ignore */ }
    return 1;
  }

  private cleanWorkspaceId(id: string): number | string {
    if (!id) return id;
    const idText = id.toString().trim();
    let cleanId = idText;
    if (/^gw_?\d+$/i.test(idText)) cleanId = idText.replace(/^gw_?/i, '');
    else if (/^w_?\d+$/i.test(idText)) cleanId = idText.replace(/^w_?/i, '');
    const num = parseInt(cleanId, 10);
    return isNaN(num) ? id : num;
  }

  // ── Provider / Env mappers (mirrors WorkspaceService) ────────────────────

  private mapProviderToBackend(provider?: string | null): string {
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
      case 'mysql':        return 'MySQL';
      case 'oracle':       return 'Oracle';
      case 'sqlite':       return 'SQLite';
      default:             return provider;
    }
  }

  private mapEnvToBackend(env?: string | null): string {
    if (!env) return 'Dev';
    switch (env.trim().toLowerCase()) {
      case 'production': return 'Prod';
      case 'development': return 'Dev';
      case 'uat': return 'UAT';
      default: return 'Dev';
    }
  }

  // ── ✅ Build the full payload the backend expects ─────────────────────────

  /**
   * Formulates the standard payload expected by backend query/execution routes.
   * Consolidates user context, target database credentials, environment type, and engine mappings.
   */
  private buildPayload(
    workspace: WorkspaceContext,
    extra: { question?: string; sqlQuery?: string }
  ): QueryPayload {
    return {
      ...extra,
      workspaceId:    this.cleanWorkspaceId(workspace.id),
      userId:         this.getStoredUserId(),
      dbPassword:     workspace.dbPassword     ?? '',
      databaseType:   this.mapProviderToBackend(workspace.provider),
      serverName:     workspace.host           ?? 'localhost',
      port:           workspace.port           ?? '1433',
      environmentType: this.mapEnvToBackend(workspace.env),
      databaseName:   workspace.databaseName   ?? '',
      databaseUserName: workspace.username     ?? '',
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private extractColumnsFromSql(sql: string): string[] {
    const columns: string[] = [];
    const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM/i);

    if (selectMatch?.[1]) {
      const parts = selectMatch[1].split(',');
      parts.forEach(part => {
        const aliasMatch = part.match(/AS\s+(\w+)/i);
        if (aliasMatch?.[1]) {
          columns.push(aliasMatch[1].replace(/['"`]/g, '').trim());
        } else {
          const cleanPart = part.trim();
          const dotParts  = cleanPart.split('.');
          const colName   = dotParts[dotParts.length - 1].trim();

          if (colName && colName !== '*' && !colName.includes('(')) {
            columns.push(colName.replace(/['"`]/g, ''));
          } else {
            columns.push(`Col_${columns.length + 1}`);
          }
        }
      });
    }

    return columns;
  }

  // ── Map query response ────────────────────────────────────────────────────────

  /**
   * Normalizes the response shape from database query endpoints.
   * - Unwraps EF Core/System.Text.Json `$values` wrapper array formatting.
   * - Parses raw arrays of objects or raw 2D arrays to format a consistent columns/results grid shape.
   */
  private mapQueryResponse(response: any): QueryResult {
    if (!response) return { columns: [], results: [] };

    const generatedSql: string =
      response.generatedSql ??
      response.sql          ??
      response.GeneratedSql ??
      response.query        ??
      '';

  // ✅ Type as unknown first — avoids TypeScript narrowing it to 'never'
  let rawRows: unknown =
    response.rows     ??
    response.data     ??
    response.results  ??
    response.Records  ??
    [];

  // ✅ Unwrap EF Core / System.Text.Json $values wrapper
  if (
    rawRows !== null &&
    typeof rawRows === 'object' &&
    !Array.isArray(rawRows) &&
    '$values' in rawRows &&
    Array.isArray((rawRows as Record<string, unknown>)['$values'])
  ) {
    rawRows = (rawRows as Record<string, unknown>)['$values'];
  }

  // ✅ Final safety — ensure it's always a plain array
  const rows: any[] = Array.isArray(rawRows) ? rawRows : [];

  // ── Empty result set ────────────────────────────────────────────────────────
  if (rows.length === 0) {
    const columns: string[] =
      response.columns  ??
      response.Columns  ??
      this.extractColumnsFromSql(generatedSql) ??
      [];
    return { columns, results: [] };
  }

  // ── Object array ────────────────────────────────────────────────────────────
  if (!Array.isArray(rows[0]) && typeof rows[0] === 'object' && rows[0] !== null) {
    const columns: string[] =
      response.columns ??
      response.Columns ??
      Object.keys(rows[0] as Record<string, unknown>);

    const results = rows.map((row: Record<string, unknown>) => {
      const record: Record<string, string | number> = {};
      columns.forEach((col: string) => {
        if (col in row) {
          const val = row[col];
          record[col] = (val as string | number) ?? '';
        } else {
          // ✅ Case-insensitive key fallback
          const matchKey = Object.keys(row).find(
            k => k.toLowerCase() === col.toLowerCase()
          );
          record[col] = matchKey
            ? ((row[matchKey] as string | number) ?? '')
            : '';
        }
      });
      return record;
    });

    return { columns, results };
  }

  // ── 2D array response ───────────────────────────────────────────────────────
  let columns: string[] =
    response.columns ??
    response.Columns ??
    this.extractColumnsFromSql(generatedSql) ??
    [];

  const rowLen = Array.isArray(rows[0]) ? (rows[0] as unknown[]).length : 0;

  // Pad columns to match row width
  while (columns.length < rowLen) {
    columns.push(`Column_${columns.length + 1}`);
  }

  // Trim columns if wider than rows
  if (columns.length > rowLen && rowLen > 0) {
    columns = columns.slice(0, rowLen);
  }

  const results = rows.map((row: unknown[]) => {
    const record: Record<string, string | number> = {};
    columns.forEach((col: string, idx: number) => {
      record[col] = (row[idx] as string | number) ?? '';
    });
    return record;
  });

  return { columns, results };
}

  // ── Generate SQL ──────────────────────────────────────────────────────────

  /**
   * Sends a natural-language question to the AI endpoint.
   * ✅ Now includes full workspace context so the backend knows
   *    which DB engine / environment to target.
   *
   * POST /api/dashboard/query
   * Body: { question, workspaceId, userId, dbPassword,
   *         databaseType, serverName, port,
   *         environmentType, databaseName, databaseUserName }
   */
  generateSql(text: string, workspace: WorkspaceContext): Observable<ChatMessage> {
    if (API_CONFIG.useMock) {
      return this.resolveMockGenerateSql(text, workspace);
    }

    const payload = this.buildPayload(workspace, { question: text });

    console.log('[ChatQueryService] generateSql payload →', payload);

    return this.http
      .post<any>(`${API_CONFIG.apiUrl}/dashboard/query`, payload, this.httpOptions)
      .pipe(
        map((response: any) => {
          console.log('[ChatQueryService] generateSql raw response ←', response);

          // ✅ Safely extract SQL — backend may use different keys
          const generatedSql: string =
            response.generatedSql ??
            response.sql          ??
            response.GeneratedSql ??
            response.query        ??
            '';

          const mapped = this.mapQueryResponse(response);

          const aiMessage: ChatMessage = {
            sender:      'ai',
            type:        'query',
            text:
              'I have compiled and executed a query on the active database nodes. ' +
              'Review and run it below.',
            sql:         generatedSql,
            originalSql: generatedSql,
            columns:     mapped.columns,
            results:     mapped.results,
            showResults: false,
            isExecuting: false,
            isEdited:    false,
            explanation: response.explanation ?? response.Explanation ?? '',
            input:       response.input       ?? text,
          };

          return aiMessage;
        }),
        catchError((error: any) => {
          console.error('[ChatQueryService] /dashboard/query failed', error);
          return throwError(() => error);
        })
      );
  }

  // ── Run / Execute Query ───────────────────────────────────────────────────

  /**
   * Executes a raw SQL string against the connected workspace database.
   * ✅ Now includes full workspace context in the request body.
   *
   * POST /api/dashboard/execute-sql
   * Body: { sqlQuery, workspaceId, userId, dbPassword,
   *         databaseType, serverName, port,
   *         environmentType, databaseName, databaseUserName }
   */
  runQuery(sql: string, workspace: WorkspaceContext): Observable<QueryResult> {
    console.log('[ChatQueryService] runQuery sql →', sql);

    if (API_CONFIG.useMock) {
      return this.resolveMockRunQuery(sql, workspace);
    }

    const payload = this.buildPayload(workspace, { sqlQuery: sql });

    console.log('[ChatQueryService] runQuery payload →', payload);

    return this.http
      .post<any>(
        `${API_CONFIG.apiUrl}/dashboard/execute-sql`,
        payload,
        this.httpOptions
      )
      .pipe(
        map((response: any) => {
          console.log('[ChatQueryService] runQuery raw response ←', response);
          return this.mapQueryResponse(response);
        }),
        catchError((error: any) => {
          console.error('[ChatQueryService] /dashboard/execute-sql failed', error);
          return throwError(() => error);
        })
      );
  }

  // ── Mock: Generate SQL ────────────────────────────────────────────────────

  private resolveMockGenerateSql(
    text: string,
    workspace: WorkspaceContext
  ): Observable<ChatMessage> {
    const textLower = text.toLowerCase();
    let responseText = '';
    let generatedSql = '';
    let cols: string[] = [];
    let res: Array<Record<string, string | number>> = [];
    let explanationText = '';

    // Customer / Revenue
    if (
      textLower.includes('customer') ||
      textLower.includes('revenue')  ||
      textLower.includes('top sales')
    ) {
      responseText  = `Compiled top-performing customers by revenue query for **${workspace.name}**.`;
      generatedSql  =
        `SELECT TOP 10\n` +
        `  c.CustomerName,\n` +
        `  c.Country,\n` +
        `  SUM(o.TotalAmount) AS Revenue\n` +
        `FROM Customers c\n` +
        `JOIN Orders o ON c.CustomerID = o.CustomerID\n` +
        `WHERE o.OrderDate >= '2026-01-01'\n` +
        `GROUP BY c.CustomerName, c.Country\n` +
        `ORDER BY Revenue DESC;`;
      cols = ['Customer', 'Country', 'Revenue'];
      res  = [
        { Customer: 'Acme Corp',          Country: 'United States', Revenue: '$245,000' },
        { Customer: 'TechNova Solutions', Country: 'Canada',        Revenue: '$190,000' },
        { Customer: 'FutureSoft Group',   Country: 'United Kingdom',Revenue: '$175,000' },
        { Customer: 'GlobalTrade Inc',    Country: 'Germany',       Revenue: '$162,300' },
        { Customer: 'Apex Industries',    Country: 'Australia',     Revenue: '$148,900' },
      ];
      explanationText = `This query aggregates the total sales amount by customer and country to show the top-performing customers by revenue.`;

    // Stock / Inventory
    } else if (
      textLower.includes('stock')    ||
      textLower.includes('product')  ||
      textLower.includes('inventory')
    ) {
      responseText  = `Compiled inventory query filtered by reorder thresholds for **${workspace.name}**.`;
      generatedSql  =
        `SELECT\n` +
        `  ProductName,\n` +
        `  UnitsInStock,\n` +
        `  ReorderLevel\n` +
        `FROM Products\n` +
        `WHERE UnitsInStock < 15\n` +
        `  AND Discontinued = 0\n` +
        `ORDER BY UnitsInStock ASC;`;
      cols = ['Product Name', 'In Stock', 'Reorder Level'];
      res  = [
        { 'Product Name': 'UltraMonitor 4K',     'In Stock': 3,  'Reorder Level': 10 },
        { 'Product Name': 'Ergonomic Desk Chair', 'In Stock': 5,  'Reorder Level': 15 },
        { 'Product Name': 'Wireless Mouse MX',    'In Stock': 12, 'Reorder Level': 20 },
        { 'Product Name': 'USB-C Hub Multi',      'In Stock': 14, 'Reorder Level': 15 },
      ];
      explanationText = `This query filters products in stock that are below their reorder threshold and are not discontinued, sorted by inventory count in ascending order.`;

    // Performance / Monthly
    } else if (
      textLower.includes('performance') ||
      textLower.includes('monthly')     ||
      textLower.includes('summarize')
    ) {
      responseText  = `Monthly performance aggregates from transaction logs for **${workspace.name}**.`;
      generatedSql  =
        `SELECT\n` +
        `  FORMAT(OrderDate, 'MMMM') AS SalesMonth,\n` +
        `  COUNT(OrderID) AS TotalOrders,\n` +
        `  SUM(TotalAmount) AS TotalSales\n` +
        `FROM Orders\n` +
        `GROUP BY MONTH(OrderDate), FORMAT(OrderDate, 'MMMM')\n` +
        `ORDER BY MONTH(OrderDate);`;
      cols = ['Month', 'OrdersCount', 'SalesAmount'];
      res  = [
        { Month: 'January',  OrdersCount: 142, SalesAmount: '$89,450'  },
        { Month: 'February', OrdersCount: 168, SalesAmount: '$104,200' },
        { Month: 'March',    OrdersCount: 195, SalesAmount: '$128,600' },
        { Month: 'April',    OrdersCount: 220, SalesAmount: '$145,800' },
      ];
      explanationText = `This query aggregates orders count and total sales amount grouped by month to evaluate business performance trends.`;

    // Default
    } else {
      responseText    = '';
      generatedSql    = '';
      cols            = [];
      res             = [];
      explanationText = '';
    }

    const msg: ChatMessage = {
      sender:      'ai',
      type:        'query',
      text:        responseText,
      sql:         generatedSql,
      originalSql: generatedSql,
      columns:     cols,
      results:     res,
      showResults: false,
      isExecuting: false,
      isEdited:    false,
      explanation: explanationText,
      input:       text,
    };

    return of(msg).pipe(delay(50));
  }

  // ── Mock: Run Query ───────────────────────────────────────────────────────

  private resolveMockRunQuery(
    sql: string,
    workspace: WorkspaceContext
  ): Observable<QueryResult> {
    const sqlLower = sql.toLowerCase();
    let result: QueryResult;

    if (
      sqlLower.includes('customer') ||
      sqlLower.includes('revenue')  ||
      sqlLower.includes('country')
    ) {
      result = {
        columns: ['Customer', 'Country', 'Revenue'],
        results: [
          { Customer: 'Acme Corp',          Country: 'United States', Revenue: '$245,000' },
          { Customer: 'TechNova Solutions', Country: 'Canada',        Revenue: '$190,000' },
          { Customer: 'FutureSoft Group',   Country: 'United Kingdom',Revenue: '$175,000' },
          { Customer: 'GlobalTrade Inc',    Country: 'Germany',       Revenue: '$162,300' },
          { Customer: 'Apex Industries',    Country: 'Australia',     Revenue: '$148,900' },
        ],
      };
    } else if (
      sqlLower.includes('stock')    ||
      sqlLower.includes('product')  ||
      sqlLower.includes('inventory')
    ) {
      result = {
        columns: ['Product Name', 'In Stock', 'Reorder Level'],
        results: [
          { 'Product Name': 'UltraMonitor 4K',     'In Stock': 3,  'Reorder Level': 10 },
          { 'Product Name': 'Ergonomic Desk Chair', 'In Stock': 5,  'Reorder Level': 15 },
          { 'Product Name': 'Wireless Mouse MX',    'In Stock': 12, 'Reorder Level': 20 },
          { 'Product Name': 'USB-C Hub Multi',      'In Stock': 14, 'Reorder Level': 15 },
        ],
      };
    } else if (
      sqlLower.includes('performance') ||
      sqlLower.includes('monthly')     ||
      sqlLower.includes('orderscount')
    ) {
      result = {
        columns: ['Month', 'OrdersCount', 'SalesAmount'],
        results: [
          { Month: 'January',  OrdersCount: 142, SalesAmount: '$89,450'  },
          { Month: 'February', OrdersCount: 168, SalesAmount: '$104,200' },
          { Month: 'March',    OrdersCount: 195, SalesAmount: '$128,600' },
          { Month: 'April',    OrdersCount: 220, SalesAmount: '$145,800' },
        ],
      };
    } else {
      result = {
        columns: [],
        results: [],
      };
    }

    return of(result).pipe(delay(20));
  }
}