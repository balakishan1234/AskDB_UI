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
  explanation?: any;
  keyFinding?: string;
  summary?: string;
  executiveSummary?: string;
  keyFindings?: string[];
  conclusion?: string;

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
      serverName:     (workspace.host || '').trim() || 'localhost',
      port:           (workspace.port || '').toString().trim() || '1433',
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

          let rawExplanation = response.explanation ?? response.Explanation;
          let execSummary = '';
          let keyFindingsList: string[] = [];
          let conclusionText = '';

          if (typeof rawExplanation === 'string') {
            try {
              const parsed = JSON.parse(rawExplanation);
              if (parsed && typeof parsed === 'object') {
                rawExplanation = parsed;
              }
            } catch {
              // plain string explanation
            }
          }

          if (rawExplanation && typeof rawExplanation === 'object') {
            execSummary = rawExplanation.executiveSummary ?? rawExplanation.ExecutiveSummary ?? '';
            const kf = rawExplanation.keyFindings ?? rawExplanation.KeyFindings ?? rawExplanation.key_findings;
            if (Array.isArray(kf)) {
              keyFindingsList = kf.map((item: any) => String(item));
            } else if (typeof kf === 'string' && kf.trim()) {
              keyFindingsList = [kf.trim()];
            }
            conclusionText = rawExplanation.conclusion ?? rawExplanation.Conclusion ?? '';
          }

          if (!execSummary && response.executiveSummary) {
            execSummary = String(response.executiveSummary);
          }
          if (keyFindingsList.length === 0 && response.keyFindings) {
            if (Array.isArray(response.keyFindings)) {
              keyFindingsList = response.keyFindings.map((i: any) => String(i));
            } else if (typeof response.keyFindings === 'string') {
              keyFindingsList = [response.keyFindings];
            }
          }
          if (!conclusionText && response.conclusion) {
            conclusionText = String(response.conclusion);
          }

          const legacyKeyFinding = response.keyFinding ?? response.key_finding ?? response.KeyFinding ?? (keyFindingsList.length > 0 ? keyFindingsList[0] : '');
          const legacySummary = typeof response.summary === 'string' ? response.summary : (execSummary || (typeof rawExplanation === 'string' ? rawExplanation : ''));

          const aiMessage: ChatMessage = {
            sender:           'ai',
            type:             'query',
            text:
              'I have compiled and executed a query on the active database nodes. ' +
              'Review and run it below.',
            sql:              generatedSql,
            originalSql:      generatedSql,
            columns:          mapped.columns,
            results:          mapped.results,
            showResults:      false,
            isExecuting:      false,
            isEdited:         false,
            explanation:      rawExplanation ?? response.explanation ?? response.Explanation ?? '',
            executiveSummary: execSummary,
            keyFindings:      keyFindingsList,
            conclusion:       conclusionText,
            keyFinding:       legacyKeyFinding,
            summary:          legacySummary,
            input:            response.input ?? text,
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

  // ── Mock Large Dataset Generators ──────────────────────────────────────────

  private generateMockCustomerRows(count: number = 65): Array<Record<string, string | number>> {
    const countries = ['United States', 'Canada', 'United Kingdom', 'Germany', 'Australia', 'Japan', 'France', 'Brazil', 'India', 'Singapore'];
    const statuses = ['Active', 'Pending', 'Verified', 'VIP'];
    const companyPrefixes = ['Acme', 'TechNova', 'FutureSoft', 'GlobalTrade', 'Apex', 'CyberPulse', 'CloudScale', 'OmniTech', 'DataFlex', 'Vanguard', 'Synergy', 'Zenith', 'Nexus', 'Starlight', 'Hyperion', 'InnoWave', 'Quantum', 'Aura', 'Velocity', 'Titan'];
    const companySuffixes = ['Corp', 'Solutions', 'Group', 'Inc', 'Industries', 'Systems', 'Labs', 'Enterprises', 'Networks', 'Dynamics', 'Partners', 'Technologies'];

    const rows: Array<Record<string, string | number>> = [];
    for (let i = 1; i <= count; i++) {
      const name = `${companyPrefixes[i % companyPrefixes.length]} ${companySuffixes[i % companySuffixes.length]}`;
      const country = countries[i % countries.length];
      const status = statuses[i % statuses.length];
      const revenueVal = 25000 + (i * 3750) % 450000;
      const revenue = `$${revenueVal.toLocaleString()}`;
      const month = String((i % 12) + 1).padStart(2, '0');
      const day = String((i % 28) + 1).padStart(2, '0');
      const date = `2026-${month}-${day}`;

      rows.push({
        'ID': `CUST-${1000 + i}`,
        'Customer': name,
        'Country': country,
        'Status': status,
        'Revenue': revenue,
        'Last Order Date': date
      });
    }
    return rows;
  }

  private generateMockInventoryRows(count: number = 60): Array<Record<string, string | number>> {
    const categories = ['Hardware', 'Peripherals', 'Accessories', 'Networking', 'Storage'];
    const products = ['UltraMonitor 4K', 'Ergonomic Desk Chair', 'Wireless Mouse MX', 'USB-C Hub Multi', 'Mechanical Keyboard', 'NVMe SSD 2TB', 'HD WebCam 1080p', 'Smart Desk Lamp', 'Noise-Canceling Headset', 'Gigabit Router X', 'Power Bank 20k', 'Thunderbolt Dock', 'Portable Monitor 15"', 'Ergonomic Stand', 'Dual-Band Adapter'];

    const rows: Array<Record<string, string | number>> = [];
    for (let i = 1; i <= count; i++) {
      const pName = `${products[i % products.length]} Pro v${(i % 3) + 1}`;
      const category = categories[i % categories.length];
      const stock = (i * 3 + 1) % 45;
      const reorder = 10 + (i % 15);
      const priceVal = 29.99 + (i * 14.5) % 850;
      const price = `$${priceVal.toFixed(2)}`;

      rows.push({
        'ID': `PROD-${2000 + i}`,
        'Product Name': pName,
        'Category': category,
        'In Stock': stock,
        'Reorder Level': reorder,
        'Unit Price': price
      });
    }
    return rows;
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
    let keyFindingText = '';
    let summaryText = '';

    // Stock / Inventory
    if (
      textLower.includes('stock')    ||
      textLower.includes('product')  ||
      textLower.includes('inventory')
    ) {
      responseText  = `Compiled inventory query returning 60 active records for **${workspace.name}**.`;
      generatedSql  =
        `SELECT TOP 60\n` +
        `  ProductID, ProductName, Category, UnitsInStock, ReorderLevel, UnitPrice\n` +
        `FROM Products\n` +
        `WHERE Discontinued = 0\n` +
        `ORDER BY UnitsInStock ASC;`;
      cols = ['ID', 'Product Name', 'Category', 'In Stock', 'Reorder Level', 'Unit Price'];
      res  = this.generateMockInventoryRows(60);
      keyFindingText = `14 out of 60 hardware inventory items fall below their minimum reorder thresholds, with UltraMonitor 4K Pro having the lowest available inventory at 4 units.`;
      summaryText = `This query evaluates 60 active product stock items across five core hardware categories, automatically filtering out discontinued products. Results are sorted in ascending order of unit inventory to surface critical low-stock items at the top of the dataset. This operational breakdown enables inventory teams to rapidly identify reorder requirements and avoid supply shortages.`;
      explanationText = summaryText;

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
      keyFindingText = `Monthly sales revenue demonstrated strong upward growth of 63%, scaling from $89,450 in January to $145,800 in April across 725 total completed orders.`;
      summaryText = `This performance aggregation calculates total completed orders and gross sales revenue grouped by calendar month. Transaction dates are formatted into human-readable monthly labels and sorted chronologically to track quarterly growth trajectories and customer purchase trends over time.`;
      explanationText = summaryText;

    // Customer / Revenue / Default (Returns 65 Records for Pagination Testing)
    } else {
      responseText  = `Compiled high-volume accounts query returning 65 records for **${workspace.name}**.`;
      generatedSql  =
        `SELECT TOP 65\n` +
        `  CustomerID, CustomerName, Country, AccountStatus, AnnualRevenue, LastOrderDate\n` +
        `FROM Customers\n` +
        `WHERE OrderDate >= '2026-01-01'\n` +
        `ORDER BY AnnualRevenue DESC;`;
      cols = ['ID', 'Customer', 'Country', 'Status', 'Revenue', 'Last Order Date'];
      res  = this.generateMockCustomerRows(65);
      keyFindingText = `Enterprise revenue is concentrated heavily among top-tier client accounts, led by Acme Corp ($447,500) and TechNova Industries ($422,000).`;
      summaryText = `This dataset aggregates 65 active customer accounts across international enterprise markets recorded in the current fiscal year. Client records are filtered for active account status and sorted in descending order by annual revenue performance to surface primary enterprise relationships and account performance metrics.`;
      explanationText = summaryText;
    }

    const mockExecSummary = summaryText;
    const mockKeyFindings = [
      keyFindingText,
      `Dataset includes ${res.length} total rows across ${cols.length} column fields.`,
      `Target database environment: ${workspace.name}`
    ].filter(Boolean);
    const mockConclusion = `All ${res.length} records are active and validated against the workspace schema.`;

    const msg: ChatMessage = {
      sender:           'ai',
      type:             'query',
      text:             responseText,
      sql:              generatedSql,
      originalSql:      generatedSql,
      columns:          cols,
      results:          res,
      showResults:      false,
      isExecuting:      false,
      isEdited:         false,
      executiveSummary: mockExecSummary,
      keyFindings:      mockKeyFindings,
      conclusion:       mockConclusion,
      explanation: {
        executiveSummary: mockExecSummary,
        keyFindings:      mockKeyFindings,
        conclusion:       mockConclusion,
      },
      keyFinding:       keyFindingText,
      summary:          summaryText,
      input:            text,
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
      sqlLower.includes('stock')    ||
      sqlLower.includes('product')  ||
      sqlLower.includes('inventory')
    ) {
      result = {
        columns: ['ID', 'Product Name', 'Category', 'In Stock', 'Reorder Level', 'Unit Price'],
        results: this.generateMockInventoryRows(60),
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
        columns: ['ID', 'Customer', 'Country', 'Status', 'Revenue', 'Last Order Date'],
        results: this.generateMockCustomerRows(65),
      };
    }

    return of(result).pipe(delay(20));
  }
}