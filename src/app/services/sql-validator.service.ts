import { Injectable } from '@angular/core';

export interface SqlValidationResult {
  isValid: boolean;
  isDangerous: boolean;
  detectedCommands: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class SqlValidatorService {

  // ── ONLY these are blocked ────────────────────────────────────────────────
  // ✅ Strictly only mutation / schema / privilege commands

  private readonly BLOCKED_DDL = [
    'DROP', 'ALTER', 'TRUNCATE', 'RENAME', 'CREATE', 'REMOVE'
  ];

  private readonly BLOCKED_DML = [
    'INSERT', 'UPDATE', 'DELETE', 'MERGE', 'UPSERT',
    'REPLACE'
  ];

  private readonly BLOCKED_DCL = [
    'GRANT', 'REVOKE', 'DENY'
  ];

  private readonly BLOCKED_EXEC = [
    'EXEC', 'EXECUTE', 'CALL',
    'SP_EXECUTESQL', 'XP_CMDSHELL',
    'OPENROWSET', 'OPENDATASOURCE'
  ];

  private readonly BLOCKED_TCL = [
    'COMMIT', 'ROLLBACK', 'SAVEPOINT'
  ];

  // ── Severity map ──────────────────────────────────────────────────────────
  private readonly SEVERITY_MAP: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
    'DROP':             'critical',
    'TRUNCATE':         'critical',
    'GRANT':            'critical',
    'REVOKE':           'critical',
    'DENY':             'critical',
    'EXEC':             'critical',
    'EXECUTE':          'critical',
    'CALL':             'critical',
    'SP_EXECUTESQL':    'critical',
    'XP_CMDSHELL':      'critical',
    'OPENROWSET':       'critical',
    'OPENDATASOURCE':   'critical',
    'DELETE':           'high',
    'UPDATE':           'high',
    'ALTER':            'high',
    'MERGE':            'high',
    'INSERT':           'medium',
    'CREATE':           'medium',
    'REPLACE':          'medium',
    'UPSERT':           'medium',
    'RENAME':           'medium',
    'COMMIT':           'low',
    'ROLLBACK':         'low',
    'SAVEPOINT':        'low',
    'REMOVE':           'low',
    'NATURAL_LANGUAGE': 'high',
  };

  // ── Dangerous injection patterns ──────────────────────────────────────────
  // ✅ Only truly dangerous patterns — NOT normal SQL keywords
  private readonly INJECTION_PATTERNS: RegExp[] = [
    /;\s*(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE|EXEC|EXECUTE)\b/i, // stacked queries
    /xp_cmdshell/i,
    /sp_executesql/i,
    /OPENROWSET\s*\(/i,
    /OPENDATASOURCE\s*\(/i,
    /BULK\s+INSERT\b/i,
  ];

  // ── Natural Language Mutation Intent Patterns ─────────────────────────────
  // ✅ Detects natural language phrases that express mutation intent
  private readonly NATURAL_LANGUAGE_MUTATION_PATTERNS: Array<{
    pattern: RegExp;
    intent: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }> = [
    // DELETE intent patterns
    {
      pattern: /\b(delete|deleted|deleting|deletion)\b.*\b(record|row|entry|data|user|table|database|all|every|old|existing)\b/i,
      intent: 'DELETE',
      severity: 'high'
    },
    {
      pattern: /\b(remove|removed|removing)\b.*\b(record|row|entry|data|user|table|database|all|every|old|existing)\b/i,
      intent: 'DELETE',
      severity: 'high'
    },
    {
      pattern: /\berase\b.*\b(record|row|entry|data|user|table|database|all|every|old|existing)\b/i,
      intent: 'DELETE',
      severity: 'high'
    },
    {
      pattern: /\b(wipe|wiped|wiping)\b.*\b(record|row|entry|data|user|table|database|all|every|old|existing)\b/i,
      intent: 'DELETE',
      severity: 'high'
    },
    {
      pattern: /\b(purge|purged|purging)\b.*\b(record|row|entry|data|user|table|database|all|every|old|existing)\b/i,
      intent: 'DELETE',
      severity: 'high'
    },
    {
      pattern: /\b(clear|cleared|clearing)\b.*\b(record|row|entry|data|user|table|database|all|every|old|existing)\b/i,
      intent: 'DELETE',
      severity: 'high'
    },
    // UPDATE / MODIFY intent patterns
    {
      pattern: /\b(update|updated|updating)\b.*\b(record|row|entry|data|user|table|database|all|every|old|existing|customer|employee)\b/i,
      intent: 'UPDATE',
      severity: 'high'
    },
    {
      pattern: /\b(change|changed|changing)\b.*\b(record|row|entry|data|user|table|database|all|every|old|existing|customer|employee)\b/i,
      intent: 'UPDATE',
      severity: 'high'
    },
    {
      pattern: /\b(modify|modified|modifying)\b.*\b(record|row|entry|data|user|table|database|all|every|old|existing|customer|employee)\b/i,
      intent: 'UPDATE',
      severity: 'high'
    },
    {
      pattern: /\b(alter|altered|altering)\b.*\b(record|row|entry|data|user|table|database|all|every|old|existing|customer|employee)\b/i,
      intent: 'ALTER',
      severity: 'high'
    },
    {
      pattern: /\b(edit|edited|editing)\b.*\b(record|row|entry|data|user|table|database|all|every|old|existing|customer|employee)\b/i,
      intent: 'UPDATE',
      severity: 'high'
    },
    // INSERT intent patterns
    {
      pattern: /\b(add|added|adding|insert|inserted|inserting)\b.*\b(record|row|entry|data|user|table|database|new)\b/i,
      intent: 'INSERT',
      severity: 'medium'
    },
    // DROP / DESTROY intent patterns
    {
      pattern: /\b(drop|dropped|dropping|destroy|destroyed|destroying)\b.*\b(table|database|schema|index|view|record|data)\b/i,
      intent: 'DROP',
      severity: 'critical'
    },
    // Reverse patterns — object first, then action verb
    {
      pattern: /\b(record|row|entry|data|user|table|database|all|every|old|existing|customer|employee)\b.*\b(can be|should be|must be|needs to be|will be|has to be)\b.*\b(deleted|removed|erased|wiped|purged|cleared)\b/i,
      intent: 'DELETE',
      severity: 'high'
    },
    {
      pattern: /\b(record|row|entry|data|user|table|database|all|every|old|existing|customer|employee)\b.*\b(can be|should be|must be|needs to be|will be|has to be)\b.*\b(updated|changed|modified|altered|edited)\b/i,
      intent: 'UPDATE',
      severity: 'high'
    },
    // Standalone strong mutation intent verbs with database/data context
    {
      pattern: /\b(truncate|truncated|truncating)\b.*\b(table|database|data|record)\b/i,
      intent: 'TRUNCATE',
      severity: 'critical'
    },
    // "remove all" / "delete all" / "erase all" type patterns
    {
      pattern: /\b(remove|delete|erase|wipe|purge|clear)\b\s+(all|every|each|the\s+entire|the\s+whole)\b/i,
      intent: 'DELETE',
      severity: 'high'
    },
    // Imperative instruction-style patterns (e.g., "erase old data", "remove all users")
    {
      pattern: /^(remove|delete|erase|wipe|purge|clear|drop|destroy|truncate|modify|change|update|alter|edit|add|insert)\s+\w/i,
      intent: 'MUTATION',
      severity: 'high'
    },
    // Patterns suggesting schema changes
    {
      pattern: /\b(rename|renamed|renaming)\b.*\b(table|column|database|schema|index|view)\b/i,
      intent: 'RENAME',
      severity: 'medium'
    },
    {
      pattern: /\b(create|created|creating)\b.*\b(table|database|schema|index|view|user|procedure|trigger)\b/i,
      intent: 'CREATE',
      severity: 'medium'
    },
    // Grant/revoke privilege patterns
    {
      pattern: /\b(grant|revoke|deny)\b.*\b(access|permission|privilege|right)\b/i,
      intent: 'GRANT/REVOKE',
      severity: 'critical'
    },
  ];

  // ── Main validator ────────────────────────────────────────────────────────

  /**
   * Main gatekeeper method to validate query safety.
   * - Strips comments and string literals to prevent false positives.
   * - Performs natural language intent scanning to intercept dangerous prompts.
   * - Runs regex injection pattern checks for stacked queries.
   * - Cross-checks words against blocked DDL/DML/DCL/TCL commands list.
   */
  validate(sql: string): SqlValidationResult {
    if (!sql?.trim()) {
      return this.buildResult(true, false, [], 'low', '');
    }

    const stripped = this.stripCommentsAndStrings(sql);

    // ── Check natural language mutation intent FIRST ───────────────────────
    // This catches prompts and descriptions that are not actual SQL
    const nlResult = this.detectNaturalLanguageMutationIntent(sql);
    if (nlResult) {
      return nlResult;
    }

    // ── Check injection patterns ───────────────────────────────────────────
    const hasDangerousInjection = this.INJECTION_PATTERNS.some(p =>
      p.test(stripped)
    );

    if (hasDangerousInjection) {
      return this.buildResult(
        false, true,
        ['INJECTION_PATTERN'],
        'critical',
        '🚨 Critical: SQL injection pattern detected. Stacked or nested destructive queries are strictly prohibited.'
      );
    }

    // ── Check blocked commands ────────────────────────────────────────────
    const allBlocked = [
      ...this.BLOCKED_DDL,
      ...this.BLOCKED_DML,
      ...this.BLOCKED_DCL,
      ...this.BLOCKED_EXEC,
      ...this.BLOCKED_TCL,
    ];

    const detectedCommands: string[] = [];

    for (const cmd of allBlocked) {
      // ✅ Whole-word match — MUST be a statement keyword
      const regex = new RegExp(`(?:^|\\s|;)${cmd}\\b`, 'i');
      if (regex.test(stripped)) {
        detectedCommands.push(cmd);
      }
    }

    // ✅ If nothing blocked — allow it
    if (detectedCommands.length === 0) {
      return this.buildResult(
        true, false, [], 'low',
        'Query is safe to execute.'
      );
    }

    // ── Compute severity ──────────────────────────────────────────────────
    const severity = this.computeSeverity(detectedCommands);

    // ── Build message ─────────────────────────────────────────────────────
    const message = this.buildMessage(detectedCommands, severity);

    return this.buildResult(false, false, detectedCommands, severity, message);
  }

  // ── Natural Language Intent Detector ─────────────────────────────────────

  /**
   * ✅ Detects natural language phrases that express mutation intent.
   * This catches prompts and instructions that describe destructive operations
   * without necessarily using SQL syntax.
   *
   * Examples caught:
   *  - "the database can be updated or deleted"
   *  - "remove all users"
   *  - "change the customer records"
   *  - "erase old data"
   */
  private detectNaturalLanguageMutationIntent(
    input: string
  ): SqlValidationResult | null {

    const matchedIntents: Array<{
      intent: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }> = [];

    for (const { pattern, intent, severity } of this.NATURAL_LANGUAGE_MUTATION_PATTERNS) {
      if (pattern.test(input)) {
        // Avoid duplicates
        if (!matchedIntents.find(m => m.intent === intent)) {
          matchedIntents.push({ intent, severity });
        }
      }
    }

    if (matchedIntents.length === 0) {
      return null; // No natural language mutation intent detected
    }

    // Compute highest severity across matched intents
    const levels = { low: 0, medium: 1, high: 2, critical: 3 };
    let maxSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    for (const { severity } of matchedIntents) {
      if (levels[severity] > levels[maxSeverity]) {
        maxSeverity = severity;
      }
    }

    const intentNames = matchedIntents.map(m => m.intent);
    const intentList = intentNames.join(', ');

    const severityIcons: Record<string, string> = {
      critical: '🚨 Critical',
      high:     '⛔ High-risk',
      medium:   '⚠️ Restricted',
      low:      'ℹ️ Notice',
    };

    const message = `${severityIcons[maxSeverity]}: Natural language mutation intent detected — `
      + `"${intentList}" operation(s) expressed in plain language. `
      + `Only SELECT-based read queries are permitted. `
      + `Please rephrase your request to retrieve data only.`;

    return this.buildResult(
      false,
      true,
      intentNames.map(i => `NL:${i}`),
      maxSeverity,
      message
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * ✅ Strips SQL comments and string literals before analysis.
   * This prevents false positives from column values like 'DELETE_FLAG'
   */
  private stripCommentsAndStrings(sql: string): string {
    let result = sql;

    // Remove block comments /* ... */
    result = result.replace(/\/\*[\s\S]*?\*\//g, ' ');

    // Remove line comments -- ...
    result = result.replace(/--[^\n]*/g, ' ');

    // ✅ Remove string literals 'value' to prevent false positives
    // e.g. WHERE status = 'DELETED' should NOT trigger DELETE detection
    result = result.replace(/'[^']*'/g, "''");
    result = result.replace(/"[^"]*"/g, '""');

    return result;
  }

  private computeSeverity(
    commands: string[]
  ): 'low' | 'medium' | 'high' | 'critical' {
    const levels = { low: 0, medium: 1, high: 2, critical: 3 };
    let max: 'low' | 'medium' | 'high' | 'critical' = 'low';

    for (const cmd of commands) {
      const level = this.SEVERITY_MAP[cmd.toUpperCase()] ?? 'low';
      if (levels[level] > levels[max]) max = level;
    }

    return max;
  }

  private buildMessage(
    commands: string[],
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): string {
    const cmdList = commands.join(', ');

    const messages: Record<string, string> = {
      critical: `🚨 Critical operation blocked — "${cmdList}" command(s) are strictly prohibited. Only SELECT queries are permitted.`,
      high:     `⛔ High-risk operation detected — "${cmdList}" command(s) can modify or destroy data. Only SELECT queries are allowed.`,
      medium:   `⚠️ Restricted operation — "${cmdList}" command(s) are not permitted in read-only mode.`,
      low:      `ℹ️ Restricted command — "${cmdList}". Please use SELECT statements only.`,
    };

    return messages[severity];
  }

  private buildResult(
    isValid: boolean,
    isDangerous: boolean,
    detectedCommands: string[],
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string
  ): SqlValidationResult {
    return { isValid, isDangerous, detectedCommands, severity, message };
  }
}