// query-summary.ts
import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

export interface ColumnStat {
  name:        string;
  type:        'number' | 'string' | 'date' | 'mixed';
  min?:        number;
  max?:        number;
  avg?:        number;
  sum?:        number;
  nullCount:   number;
  uniqueCount: number;
  topValue?:   string | number;
}

@Component({
  selector:    'app-query-summary',
  standalone:  true,
  imports:     [CommonModule],
  templateUrl: './query-summary.html',
})
export class QuerySummary implements OnChanges {

  // ── Inputs ─────────────────────────────────────────────────────────────────

  // ── Inputs ─────────────────────────────────────────────────────────────────

  /** The user's original natural-language question */
  @Input() userQuestion?: string;

  /** Executive summary text */
  @Input() executiveSummary?: string;

  /** Key findings list (array of strings or single string) */
  @Input() keyFindings?: string[] | string;

  /** Final analytical conclusion text */
  @Input() conclusion?: string;

  /** Key analytical finding / takeaway (legacy fallback) */
  @Input() keyFinding?: string;

  /** Detailed AI summary text in paragraph format */
  @Input() summary?: string;

  /** AI-generated explanation of the query (object or string) */
  @Input() explanation?: any;

  /** Column names from the result set */
  @Input() columns: string[] = [];

  /** Result rows from the query */
  @Input() results: Array<Record<string, string | number>> = [];

  // ── Derived state ──────────────────────────────────────────────────────────

  columnStats:            ColumnStat[] = [];
  totalRows:              number       = 0;
  totalColumns:           number       = 0;
  numericColumns:         ColumnStat[] = [];
  stringColumns:          ColumnStat[] = [];
  summaryParagraphs:      string[]     = [];
  overallDataHealth:      number       = 100;

  parsedExecutiveSummary: string       = '';
  parsedKeyFindings:      string[]     = [];
  parsedConclusion:       string       = '';

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['results']          ||
      changes['columns']          ||
      changes['explanation']      ||
      changes['summary']          ||
      changes['keyFinding']       ||
      changes['executiveSummary'] ||
      changes['keyFindings']      ||
      changes['conclusion']       ||
      changes['userQuestion']
    ) {
      this.computeStats();
      this.parseExplanationData();
      this.computeSummaryParagraphs();
    }
  }

  // ── Structured Explanation Parsers & Getters ──────────────────────────────

  private parseExplanationData(): void {
    let exec = this.executiveSummary || '';
    let findings: string[] = [];
    let conc = this.conclusion || '';

    if (Array.isArray(this.keyFindings)) {
      findings = this.keyFindings.map(f => String(f));
    } else if (typeof this.keyFindings === 'string' && this.keyFindings.trim()) {
      findings = [this.keyFindings.trim()];
    }

    let expObj: any = this.explanation;
    if (typeof expObj === 'string') {
      try {
        const parsed = JSON.parse(expObj);
        if (parsed && typeof parsed === 'object') {
          expObj = parsed;
        }
      } catch {
        /* plain string */
      }
    }

    if (expObj && typeof expObj === 'object') {
      if (!exec) {
        exec = expObj.executiveSummary ?? expObj.ExecutiveSummary ?? '';
      }
      if (findings.length === 0) {
        const kf = expObj.keyFindings ?? expObj.KeyFindings ?? expObj.key_findings;
        if (Array.isArray(kf)) {
          findings = kf.map((item: any) => String(item));
        } else if (typeof kf === 'string' && kf.trim()) {
          findings = [kf.trim()];
        }
      }
      if (!conc) {
        conc = expObj.conclusion ?? expObj.Conclusion ?? '';
      }
    }

    // Legacy single keyFinding fallback
    if (findings.length === 0 && this.keyFinding && this.keyFinding.trim()) {
      findings = [this.keyFinding.trim()];
    }

    this.parsedExecutiveSummary = exec.trim();
    this.parsedKeyFindings      = findings;
    this.parsedConclusion       = conc.trim();
  }

  get effectiveExecutiveSummary(): string {
    if (this.parsedExecutiveSummary) return this.parsedExecutiveSummary;
    if (this.summary && this.summary.trim()) return this.summary.trim();
    if (typeof this.explanation === 'string' && this.explanation.trim()) return this.explanation.trim();
    return '';
  }

  get effectiveKeyFindingsList(): string[] {
    if (this.parsedKeyFindings.length > 0) {
      return this.parsedKeyFindings;
    }
    // Dynamic fallback key finding if results exist
    if (this.results?.length && this.columns?.length) {
      return [`Identified ${this.totalRows} record${this.totalRows === 1 ? '' : 's'} across ${this.totalColumns} database field${this.totalColumns === 1 ? '' : 's'}.`];
    }
    return [];
  }

  get effectiveConclusion(): string {
    return this.parsedConclusion;
  }

  get effectiveKeyFinding(): string {
    if (this.effectiveKeyFindingsList.length > 0) {
      return this.effectiveKeyFindingsList[0];
    }
    return '';
  }

  // ── Paragraph Format Breakdown (NO BULLETS) ───────────────────────────────

  private computeSummaryParagraphs(): void {
    const raw = (this.summary || this.explanation || '').trim();
    if (!raw) {
      this.summaryParagraphs = [];
      return;
    }

    // Strip bullet point markers (1., -, *, •) from lines if present
    const cleanedText = raw
      .split(/\r?\n/)
      .map((line: string) => line.replace(/^[•\-\*\d+\.\s]+/, '').trim())
      .filter((line: string) => line.length > 0)
      .join(' ');

    // Group into readable paragraphs (split on double spaces, clear stops or multi-sentence blocks)
    const sentences = cleanedText
      .split(/(?<=\.)\s+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    if (sentences.length <= 2) {
      this.summaryParagraphs = [cleanedText];
      return;
    }

    // Combine 2-3 sentences into readable paragraphs
    const paragraphs: string[] = [];
    let currentPara = '';
    sentences.forEach((s: string, idx: number) => {
      currentPara = currentPara ? `${currentPara} ${s}` : s;
      if ((idx + 1) % 2 === 0 || idx === sentences.length - 1) {
        paragraphs.push(currentPara);
        currentPara = '';
      }
    });

    this.summaryParagraphs = paragraphs.length > 0 ? paragraphs : [cleanedText];
  }

  // ── Stats computation ──────────────────────────────────────────────────────

  private computeStats(): void {
    this.totalRows    = this.results?.length  ?? 0;
    this.totalColumns = this.columns?.length  ?? 0;
    this.columnStats  = [];

    if (!this.columns?.length || !this.results?.length) return;

    this.columnStats = this.columns.map(col => {
      const values = this.results.map(row => row[col]);

      // ── Null / empty count ────────────────────────────────────────────────
      const nullCount = values.filter(
        v => v === null || v === undefined || v === ''
      ).length;

      // ── Unique values ─────────────────────────────────────────────────────
      const uniqueCount = new Set(values.map(v => String(v ?? ''))).size;

      // ── Detect column type ────────────────────────────────────────────────
      const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
      const numeric = nonNull.filter(v => !isNaN(Number(v)));
      const isDateLike = nonNull.some(v =>
        typeof v === 'string' && /\d{4}-\d{2}-\d{2}/.test(v)
      );

      let type: ColumnStat['type'] = 'string';
      if (nonNull.length > 0 && numeric.length === nonNull.length) {
        type = 'number';
      } else if (isDateLike) {
        type = 'date';
      } else if (numeric.length > 0 && numeric.length < nonNull.length) {
        type = 'mixed';
      }

      // ── Top / most frequent value ─────────────────────────────────────────
      const freqMap = new Map<string, number>();
      values.forEach(v => {
        const key = String(v ?? '');
        freqMap.set(key, (freqMap.get(key) ?? 0) + 1);
      });
      let topValue: string | number | undefined;
      let topFreq = 0;
      freqMap.forEach((freq, key) => {
        if (freq > topFreq) { topFreq = freq; topValue = key; }
      });

      const stat: ColumnStat = { name: col, type, nullCount, uniqueCount, topValue };

      // ── Numeric aggregates ────────────────────────────────────────────────
      if (type === 'number') {
        const nums = nonNull.map(v => Number(v));
        stat.min = Math.min(...nums);
        stat.max = Math.max(...nums);
        stat.sum = nums.reduce((a, b) => a + b, 0);
        stat.avg = stat.sum / nums.length;
      }

      return stat;
    });

    this.numericColumns = this.columnStats.filter(c => c.type === 'number');
    this.stringColumns  = this.columnStats.filter(c => c.type !== 'number');

    const totalCells = this.totalRows * this.totalColumns;
    if (totalCells > 0) {
      const totalNulls = this.columnStats.reduce((sum, col) => sum + col.nullCount, 0);
      this.overallDataHealth = Math.max(0, Math.round(((totalCells - totalNulls) / totalCells) * 100));
    } else {
      this.overallDataHealth = 100;
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  formatNumber(value: number | undefined): string {
    if (value === undefined || isNaN(value)) return '—';
    if (Math.abs(value) >= 1_000_000) return (value / 1_000_000).toFixed(2) + 'M';
    if (Math.abs(value) >= 1_000)     return (value / 1_000).toFixed(1)     + 'K';
    return value % 1 === 0
      ? value.toLocaleString()
      : value.toFixed(2);
  }

  getTypeIcon(type: ColumnStat['type']): string {
    switch (type) {
      case 'number': return '#';
      case 'date':   return '📅';
      case 'mixed':  return '~';
      default:       return 'Aa';
    }
  }

  getTypeBadgeClass(type: ColumnStat['type']): string {
    switch (type) {
      case 'number': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'date':   return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'mixed':  return 'bg-amber-50 text-amber-700 border-amber-200';
      default:       return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  }

  /** Bar width percentage for uniqueness indicator */
  uniquenessPercent(stat: ColumnStat): number {
    if (!this.totalRows) return 0;
    return Math.round((stat.uniqueCount / this.totalRows) * 100);
  }

  /** Bar width percentage for null indicator */
  nullPercent(stat: ColumnStat): number {
    if (!this.totalRows) return 0;
    return Math.round((stat.nullCount / this.totalRows) * 100);
  }
   safeString(value: string | number | undefined | null): string {
    if (value === undefined || value === null) return '';
    return String(value);
  }
}