import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-query-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './query-table.html',
})
export class QueryTable {
  @Input() columns: string[] = [];
  @Input() results: any[] = [];

  searchTerm: string = '';
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  get filteredAndSortedResults(): any[] {
    if (!this.results) return [];
    
    // Filter
    let items = [...this.results];
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      items = items.filter(row => {
        return Object.values(row).some(val => 
          String(val).toLowerCase().includes(term)
        );
      });
    }

    // Sort
    if (this.sortColumn) {
      items.sort((a, b) => {
        let valA = a[this.sortColumn];
        let valB = b[this.sortColumn];

        // Clean numeric strings (e.g. $142,000 -> 142000) for numeric sorting
        const cleanNum = (val: any) => {
          if (typeof val === 'number') return val;
          const cleaned = String(val).replace(/[$,]/g, '');
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? String(val).toLowerCase() : parsed;
        };

        const compA = cleanNum(valA);
        const compB = cleanNum(valB);

        if (compA < compB) return this.sortDirection === 'asc' ? -1 : 1;
        if (compA > compB) return this.sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return items;
  }

  changeSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }
}
