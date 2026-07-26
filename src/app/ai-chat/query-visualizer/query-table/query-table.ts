import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-query-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './query-table.html',
})
export class QueryTable implements OnChanges {
  @Input() columns: string[] = [];
  @Input() results: any[] = [];

  searchTerm: string = '';
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // ── Pagination State ────────────────────────────────────────────────────────
  currentPage: number = 1;
  pageSize: number = 10;
  pageSizeOptions: number[] = [10, 20, 50, 100];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['results'] || changes['columns']) {
      this.currentPage = 1;
    }
  }

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

  // ── Pagination Getters ──────────────────────────────────────────────────────

  get paginatedResults(): any[] {
    const all = this.filteredAndSortedResults;
    if (this.pageSize <= 0) return all; // All option
    const start = (this.currentPage - 1) * this.pageSize;
    return all.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    if (this.pageSize <= 0) return 1;
    return Math.ceil(this.filteredAndSortedResults.length / this.pageSize) || 1;
  }

  get startRowIndex(): number {
    if (this.filteredAndSortedResults.length === 0) return 0;
    const effectivePageSize = this.pageSize > 0 ? this.pageSize : this.filteredAndSortedResults.length;
    return (this.currentPage - 1) * effectivePageSize + 1;
  }

  get endRowIndex(): number {
    if (this.pageSize <= 0) return this.filteredAndSortedResults.length;
    return Math.min(this.currentPage * this.pageSize, this.filteredAndSortedResults.length);
  }

  // ── Handlers & Navigation ──────────────────────────────────────────────────

  onSearchChange(): void {
    this.currentPage = 1;
  }

  changeSort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.currentPage = 1;
  }

  setPageSize(size: number | string): void {
    this.pageSize = Number(size);
    this.currentPage = 1;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  firstPage(): void {
    this.currentPage = 1;
  }

  lastPage(): void {
    this.currentPage = this.totalPages;
  }

  getPageNumbers(): (number | string)[] {
    const total = this.totalPages;
    const current = this.currentPage;

    if (total <= 7) {
      const pages: number[] = [];
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }

    if (current <= 3) {
      return [1, 2, 3, 4, '...', total];
    } else if (current >= total - 2) {
      return [1, '...', total - 3, total - 2, total - 1, total];
    } else {
      return [1, '...', current - 1, current, current + 1, '...', total];
    }
  }
}
