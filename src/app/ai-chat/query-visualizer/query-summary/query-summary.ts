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

  /** The user's original natural-language question */
  @Input() userQuestion?: string;

  /** AI-generated explanation of the query */
  @Input() explanation?: string;

  /** Column names from the result set */
  @Input() columns: string[] = [];

  /** Result rows from the query */
  @Input() results: Array<Record<string, string | number>> = [];

  // ── Derived state ──────────────────────────────────────────────────────────

  columnStats:         ColumnStat[] = [];
  totalRows:           number       = 0;
  totalColumns:        number       = 0;
  numericColumns:      ColumnStat[] = [];
  stringColumns:       ColumnStat[] = [];
  explanationPoints:  string[]     = [];
  overallDataHealth:   number       = 100;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['results']     ||
      changes['columns']     ||
      changes['explanation']
    ) {
      this.computeStats();
      this.computeExplanationPoints();
    }
  }

  // ── Explanation Breakdown ─────────────────────────────────────────────────

  private computeExplanationPoints(): void {
    if (!this.explanation || !this.explanation.trim()) {
      this.explanationPoints = [];
      return;
    }

    const raw = this.explanation.trim();

    // 1. If explanation has explicit newlines or list items
    if (raw.includes('\n') || /[•\-\*\d+\.]/.test(raw)) {
      const lines = raw
        .split(/\r?\n/)
        .map(line => line.replace(/^[•\-\*\d+\.\s]+/, '').trim())
        .filter(line => line.length > 0);

      if (lines.length > 1) {
        this.explanationPoints = lines;
        return;
      }
    }

    // 2. If single paragraph, split by sentence ends (. , ; ) if paragraph is multi-sentence
    const sentences = raw
      .split(/(?<=\.|\;)\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (sentences.length > 1) {
      this.explanationPoints = sentences;
    } else {
      this.explanationPoints = [raw];
    }
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