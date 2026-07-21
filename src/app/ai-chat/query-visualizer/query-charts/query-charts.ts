import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface BarData {
  label: string;
  value: number;
  displayValue: string;
  heightPercent: number;
  heightValue: number;
  yPosition: number;
}

interface HorizontalBarData {
  label: string;
  value: number;
  displayValue: string;
  width: number;
  y: number;
  barHeight: number;
  labelX: number;
  labelY: number;
  valueX: number;
  valueY: number;
}

interface LinePoint {
  x: number;
  y: number;
  label: string;
  value: number;
  displayValue: string;
}

interface LineChartData {
  points: LinePoint[];
  linePath: string;
  areaPath: string;
}

interface PieSlice {
  label: string;
  value: number;
  displayValue: string;
  percentText: string;
  percent: number;
  color: string;
  d: string;
  tx: number;
  ty: number;
}

interface ChartType {
  key: 'bar' | 'horizontal-bar' | 'line' | 'area' | 'pie' | 'donut';
  label: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const PIE_COLORS: string[] = [
  '#3b82f6', // blue-500
  '#6366f1', // indigo-500
  '#06b6d4', // cyan-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#a855f7', // purple-500
  '#ec4899', // pink-500
  '#ef4444', // red-500
  '#14b8a6', // teal-500
  '#f97316', // orange-500
];

const SVG_CONFIG = {
  width: 500,
  height: 200,
  paddingTop: 20,
  paddingBottom: 20,
  paddingLeft: 35,
  paddingRight: 35,
  chartHeight: 160,
  hBarPaddingLeft: 110,
  hBarMaxWidth: 350,
} as const;

// ─── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-query-charts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './query-charts.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueryCharts implements OnInit, OnChanges {

  // ── Inputs ────────────────────────────────────
  @Input() columns: string[] = [];
  @Input() results: Record<string, any>[] = [];

  // ── Template Refs ─────────────────────────────
  @ViewChild('chartSvg') chartSvgRef!: ElementRef<SVGSVGElement>;

  // ── Chart State ───────────────────────────────
  chartType: ChartType['key'] = 'bar';
  labelColumn = '';
  valueColumn = '';
  numericColumns: string[] = [];
  categoricalColumns: string[] = [];

  // ── Download State ────────────────────────────
  isDownloadingPng = false;
  isDownloadingSvg = false;

  // ── Chart Type Definitions (used in template) ─
  readonly chartTypes: ChartType[] = [
    { key: 'bar',            label: 'Bar'     },
    { key: 'horizontal-bar', label: 'H-Bar'   },
    { key: 'line',           label: 'Line'    },
    { key: 'area',           label: 'Area'    },
    { key: 'pie',            label: 'Pie'     },
    { key: 'donut',          label: 'Donut'   },
  ];

  constructor(private cdr: ChangeDetectorRef) {}

  // ─── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.detectColumns();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['columns'] || changes['results']) {
      this.detectColumns();
      this.cdr.markForCheck();
    }
  }

  // ─── Column Detection ───────────────────────────────────────────────────────

  detectColumns(): void {
    const hasData = this.columns?.length > 0 && this.results?.length > 0;

    if (!hasData) {
      this.numericColumns     = [];
      this.categoricalColumns = [];
      this.labelColumn        = '';
      this.valueColumn        = '';
      return;
    }

    this.numericColumns     = [];
    this.categoricalColumns = [];

    for (const col of this.columns) {
      // Check multiple rows to be more accurate
      const sampleSize  = Math.min(5, this.results.length);
      const numericRows = this.results
        .slice(0, sampleSize)
        .filter(row => this.isNumeric(row[col])).length;

      if (numericRows >= sampleSize * 0.8) {
        this.numericColumns.push(col);
      } else {
        this.categoricalColumns.push(col);
      }
    }

    // Set defaults only if not already set or column no longer exists
    if (!this.valueColumn || !this.numericColumns.includes(this.valueColumn)) {
      this.valueColumn = this.numericColumns[0]
        ?? this.columns[this.columns.length - 1]
        ?? '';
    }

    if (!this.labelColumn || !this.categoricalColumns.includes(this.labelColumn)) {
      this.labelColumn = this.categoricalColumns[0]
        ?? this.columns[0]
        ?? '';
    }
  }

  // ─── Utility ────────────────────────────────────────────────────────────────

  isNumeric(val: any): boolean {
    if (typeof val === 'number') return !isNaN(val);
    if (val === null || val === undefined || val === '') return false;
    const cleaned = String(val).replace(/[$,%\s]/g, '');
    const num     = parseFloat(cleaned);
    return cleaned !== '' && !isNaN(num) && isFinite(num);
  }

  cleanNum(val: any): number {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    if (val === null || val === undefined || val === '') return 0;
    const cleaned = String(val).replace(/[$,%\s]/g, '');
    const num     = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  formatValue(val: number): string {
    if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(1) + 'B';
    if (val >= 1_000_000)     return (val / 1_000_000).toFixed(1) + 'M';
    if (val >= 1_000)         return (val / 1_000).toFixed(1) + 'K';
    if (Number.isInteger(val)) return val.toString();
    return val.toFixed(2);
  }

  truncateLabel(label: string, maxLen = 12): string {
    return label.length > maxLen ? label.slice(0, maxLen - 1) + '…' : label;
  }

  // ─── Chart Data Getters ─────────────────────────────────────────────────────

  get barChartData(): BarData[] {
    if (!this.results?.length || !this.valueColumn) return [];

    const { paddingTop, chartHeight } = SVG_CONFIG;
    const values = this.results.map(row => this.cleanNum(row[this.valueColumn]));
    const maxVal = Math.max(...values, 1);

    return this.results.map((row, i) => {
      const val     = values[i];
      const percent = val / maxVal;
      const height  = Math.max(2, percent * chartHeight); // min 2px so 0-value is visible
      const y       = paddingTop + chartHeight - height;

      return {
        label:         this.truncateLabel(String(row[this.labelColumn] ?? '')),
        value:         val,
        displayValue:  this.formatValue(val),
        heightPercent: percent * 100,
        heightValue:   height,
        yPosition:     y,
      };
    });
  }

  get horizontalBarChartData(): HorizontalBarData[] {
    if (!this.results?.length || !this.valueColumn) return [];

    const {
      paddingTop, chartHeight,
      hBarPaddingLeft, hBarMaxWidth
    } = SVG_CONFIG;

    const values    = this.results.map(row => this.cleanNum(row[this.valueColumn]));
    const maxVal    = Math.max(...values, 1);
    const barSpacing = chartHeight / this.results.length;
    const barHeight  = Math.min(22, Math.max(6, barSpacing * 0.65));

    return this.results.map((row, i) => {
      const val   = values[i];
      const width = Math.max(2, (val / maxVal) * hBarMaxWidth);
      const y     = paddingTop + i * barSpacing + (barSpacing - barHeight) / 2;
      const mid   = y + barHeight / 2 + 3.5;

      return {
        label:        this.truncateLabel(String(row[this.labelColumn] ?? '')),
        value:        val,
        displayValue: this.formatValue(val),
        width,
        y,
        barHeight,
        labelX:  hBarPaddingLeft - 8,
        labelY:  mid,
        valueX:  hBarPaddingLeft + width + 6,
        valueY:  mid,
      };
    });
  }

  get lineChartData(): LineChartData {
    const empty: LineChartData = { points: [], linePath: '', areaPath: '' };
    if (!this.results?.length || !this.valueColumn) return empty;

    const {
      width: svgWidth, paddingLeft, paddingRight,
      paddingTop, chartHeight
    } = SVG_CONFIG;

    const chartWidth = svgWidth - paddingLeft - paddingRight;
    const values     = this.results.map(row => this.cleanNum(row[this.valueColumn]));
    const maxVal     = Math.max(...values, 1);
    const bottom     = paddingTop + chartHeight; // y=180

    const points: LinePoint[] = this.results.map((row, i) => {
      const val     = values[i];
      const percent = val / maxVal;
      const x = paddingLeft + (
        this.results.length > 1
          ? i * (chartWidth / (this.results.length - 1))
          : chartWidth / 2
      );
      const y = bottom - percent * chartHeight;

      return {
        x,
        y,
        label:        this.truncateLabel(String(row[this.labelColumn] ?? '')),
        value:        val,
        displayValue: this.formatValue(val),
      };
    });

    if (!points.length) return empty;

    const first = points[0];
    const last  = points[points.length - 1];

    const linePath = `M ${first.x} ${first.y} ` +
      points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');

    const areaPath =
      `M ${first.x} ${bottom} ` +
      `L ${first.x} ${first.y} ` +
      points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') +
      ` L ${last.x} ${bottom} Z`;

    return { points, linePath, areaPath };
  }

  get totalValue(): string {
    if (!this.results?.length || !this.valueColumn) return '0';
    const sum = this.results.reduce(
      (acc, row) => acc + this.cleanNum(row[this.valueColumn]), 0
    );
    return this.formatValue(sum);
  }

  get pieChartSlices(): PieSlice[] {
    if (!this.results?.length || !this.valueColumn) return [];

    const values = this.results.map(row => this.cleanNum(row[this.valueColumn]));
    const total  = values.reduce((s, v) => s + v, 0);
    if (total === 0) return [];

    const cx = 100, cy = 100, r = 75;
    const textR = 50; // text placement radius

    let accumulated = 0;

    return this.results.map((row, i) => {
      const val     = values[i];
      const percent = val / total;
      const label   = this.truncateLabel(String(row[this.labelColumn] ?? ''));
      const color   = PIE_COLORS[i % PIE_COLORS.length];

      const startAngle = accumulated * 2 * Math.PI - Math.PI / 2;
      accumulated += percent;
      const endAngle  = accumulated * 2 * Math.PI - Math.PI / 2;
      const midAngle  = startAngle + (endAngle - startAngle) / 2;

      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);

      // Handle full-circle (100%) edge case
      const d = percent >= 0.9999
        ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${percent > 0.5 ? 1 : 0} 1 ${x2} ${y2} Z`;

      return {
        label,
        value:        val,
        displayValue: this.formatValue(val),
        percentText:  (percent * 100).toFixed(1) + '%',
        percent,
        color,
        d,
        tx: cx + textR * Math.cos(midAngle),
        ty: cy + textR * Math.sin(midAngle),
      };
    });
  }

  // ─── Download ────────────────────────────────────────────────────────────────

  /**
   * Finds the active chart SVG. Uses ViewChild first, then falls back to DOM query.
   */
  private getActiveSvg(): SVGSVGElement | null {
    // ViewChild is most reliable when available
    if (this.chartSvgRef?.nativeElement) {
      return this.chartSvgRef.nativeElement;
    }

    // Fallback: query the host element
    return document.querySelector<SVGSVGElement>(
      'app-query-charts svg.chart-svg'
    );
  }

  /**
   * Prepares a clean clone of the SVG for export:
   * - Adds xmlns
   * - Inlines explicit width/height from viewBox
   * - Adds white background
   * - Removes Tailwind CSS classes (they don't apply in exported SVG)
   */
  private prepareSvgClone(svgEl: SVGSVGElement): SVGSVGElement {
    const clone = svgEl.cloneNode(true) as SVGSVGElement;

    // Ensure xmlns
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // Resolve dimensions from viewBox
    const vb = svgEl.viewBox.baseVal;
    const w  = vb.width  || 500;
    const h  = vb.height || 200;
    clone.setAttribute('width',  String(w));
    clone.setAttribute('height', String(h));

    // Remove class attributes (Tailwind classes are useless in exported SVG)
    clone.querySelectorAll('[class]').forEach(el => el.removeAttribute('class'));

    // White background rect
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x',      '0');
    bg.setAttribute('y',      '0');
    bg.setAttribute('width',  String(w));
    bg.setAttribute('height', String(h));
    bg.setAttribute('fill',   '#ffffff');
    clone.insertBefore(bg, clone.firstChild);

    return clone;
  }

  downloadAsSvg(): void {
    const svgEl = this.getActiveSvg();
    if (!svgEl) {
      console.warn('[QueryCharts] SVG element not found for download.');
      return;
    }

    this.isDownloadingSvg = true;

    try {
      const clone     = this.prepareSvgClone(svgEl);
      const svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' +
        new XMLSerializer().serializeToString(clone);

      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      this.triggerDownload(
        URL.createObjectURL(blob),
        `${this.chartType}-chart-${this.valueColumn}-${Date.now()}.svg`
      );
    } catch (err) {
      console.error('[QueryCharts] SVG export failed:', err);
    } finally {
      this.isDownloadingSvg = false;
    }
  }

  downloadAsPng(): void {
    const svgEl = this.getActiveSvg();
    if (!svgEl) {
      console.warn('[QueryCharts] SVG element not found for download.');
      return;
    }

    this.isDownloadingPng = true;

    try {
      const clone = this.prepareSvgClone(svgEl);
      const vb    = svgEl.viewBox.baseVal;
      const w     = vb.width  || 500;
      const h     = vb.height || 200;
      const scale = 2; // 2× for retina quality

      const svgString = new XMLSerializer().serializeToString(clone);
      const svgBlob   = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl    = URL.createObjectURL(svgBlob);

      const img    = new Image();
      img.onload   = () => {
        const canvas = document.createElement('canvas');
        canvas.width  = w * scale;
        canvas.height = h * scale;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('[QueryCharts] Could not get canvas 2D context.');
          URL.revokeObjectURL(svgUrl);
          this.isDownloadingPng = false;
          return;
        }

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw SVG at 2× scale
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(svgUrl);

        canvas.toBlob(blob => {
          if (!blob) {
            console.error('[QueryCharts] canvas.toBlob() returned null.');
            this.isDownloadingPng = false;
            return;
          }
          this.triggerDownload(
            URL.createObjectURL(blob),
            `${this.chartType}-chart-${this.valueColumn}-${Date.now()}.png`
          );
          this.isDownloadingPng = false;
          this.cdr.markForCheck();
        }, 'image/png');
      };

      img.onerror = (err) => {
        console.error('[QueryCharts] Failed to load SVG as image:', err);
        URL.revokeObjectURL(svgUrl);
        this.isDownloadingPng = false;
        this.cdr.markForCheck();
      };

      img.src = svgUrl;

    } catch (err) {
      console.error('[QueryCharts] PNG export failed:', err);
      this.isDownloadingPng = false;
    }
  }

  /**
   * Creates a temporary anchor tag and triggers a file download.
   * Cleans up the object URL after a short delay.
   */
  private triggerDownload(url: string, filename: string): void {
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Revoke after browser has started the download
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}