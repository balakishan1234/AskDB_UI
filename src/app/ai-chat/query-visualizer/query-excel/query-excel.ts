import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-query-excel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './query-excel.html',
})
export class QueryExcel implements OnInit, OnChanges {
  @Input() columns: string[] = [];
  @Input() results: any[] = [];
  @Output() onDataChanged = new EventEmitter<any[]>();

  editableResults: any[] = [];
  toastMessage: string | null = null;

  getColumnLabel(index: number): string {
    return String.fromCharCode(65 + index);
  }

  ngOnInit(): void {
    this.cloneResults();
  }

  ngOnChanges(): void {
    this.cloneResults();
  }

  cloneResults(): void {
    if (this.results) {
      this.editableResults = this.results.map(row => ({ ...row }));
    } else {
      this.editableResults = [];
    }
  }

  onCellChanged(index: number, col: string, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const value = inputElement.value;

    this.editableResults[index][col] = value;
    this.onDataChanged.emit(this.editableResults);
  }

  exportToExcel(): void {
    this.toastMessage = 'Generating spreadsheet sheets and assets...';
    setTimeout(() => {
      try {
        if (!this.columns || this.columns.length === 0 || !this.editableResults || this.editableResults.length === 0) {
          this.toastMessage = 'No data available to export';
          setTimeout(() => { this.toastMessage = null; }, 2000);
          return;
        }

        const headers = this.columns.join(',');
        const rows = this.editableResults.map(row => 
          this.columns.map(col => {
            const val = row[col] === undefined || row[col] === null ? '' : row[col];
            // Escape double quotes and wrap in quotes to prevent CSV injection / issues
            const escaped = ('' + val).replace(/"/g, '""');
            return `"${escaped}"`;
          }).join(',')
        );
        const csvContent = [headers, ...rows].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'AskDB_Report.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        this.toastMessage = 'Spreadsheet compiled! Downloading AskDB_Report.csv...';
      } catch (err) {
        console.error('Failed to export to CSV:', err);
        this.toastMessage = 'Export failed';
      }
      setTimeout(() => {
        this.toastMessage = null;
      }, 1500);
    }, 50);
  }
}
