import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { ThemeService } from '../services/theme.service';
import { AuthService } from '../services/auth.service';

interface DemoQuery {
  id: string;
  tabLabel: string;
  prompt: string;
  sql: string;
  columns: string[];
  results: Array<Record<string, string | number>>;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home implements OnInit, OnDestroy {

  protected title = 'AskDb';

  protected demoQueries: DemoQuery[] = [
    {
      id: 'revenue',
      tabLabel: 'Top Revenue',
      prompt: 'Show top 10 customers by revenue this year',
      sql: `SELECT TOP 10 c.CustomerName, SUM(o.TotalAmount) AS Revenue
FROM Customers c
JOIN Orders o ON c.CustomerID = o.CustomerID
WHERE o.OrderDate >= '2026-01-01'
GROUP BY c.CustomerName
ORDER BY Revenue DESC;`,
      columns: ['Customer', 'Revenue'],
      results: [
        { Customer: 'Acme Corp', Revenue: '$245,000' },
        { Customer: 'TechNova', Revenue: '$190,000' },
        { Customer: 'FutureSoft', Revenue: '$175,000' },
        { Customer: 'GlobalTrade', Revenue: '$162,300' },
        { Customer: 'Apex Industries', Revenue: '$148,900' }
      ]
    },
    {
      id: 'inventory',
      tabLabel: 'Low Stock Alerts',
      prompt: 'List products with less than 15 units in stock that need reordering',
      sql: `SELECT ProductName, UnitsInStock, ReorderLevel
FROM Products
WHERE UnitsInStock < 15
AND Discontinued = 0
ORDER BY UnitsInStock ASC;`,
      columns: ['Product Name', 'In Stock', 'Reorder Level'],
      results: [
        { 'Product Name': 'UltraMonitor 4K', 'In Stock': 3, 'Reorder Level': 10 },
        { 'Product Name': 'Ergonomic Desk Chair', 'In Stock': 5, 'Reorder Level': 15 },
        { 'Product Name': 'Wireless Mouse MX', 'In Stock': 12, 'Reorder Level': 20 },
        { 'Product Name': 'USB-C Hub Multi', 'In Stock': 14, 'Reorder Level': 15 }
      ]
    },
    {
      id: 'performance',
      tabLabel: 'Sales Performance',
      prompt: 'Summarize monthly sales performance and growth for this year',
      sql: `SELECT
FORMAT(OrderDate, 'MMMM') AS SalesMonth,
COUNT(OrderID) AS TotalOrders,
SUM(TotalAmount) AS TotalSales
FROM Orders
WHERE YEAR(OrderDate)=2026
GROUP BY MONTH(OrderDate),FORMAT(OrderDate,'MMMM')
ORDER BY MONTH(OrderDate);`,
      columns: ['Month', 'OrdersCount', 'SalesAmount'],
      results: [
        { Month: 'January', OrdersCount: 142, SalesAmount: '$89,450' },
        { Month: 'February', OrdersCount: 168, SalesAmount: '$104,200' },
        { Month: 'March', OrdersCount: 195, SalesAmount: '$128,600' },
        { Month: 'April', OrdersCount: 220, SalesAmount: '$145,800' },
        { Month: 'May', OrdersCount: 265, SalesAmount: '$179,300' }
      ]
    }
  ];

  protected selectedQuery = signal<DemoQuery>(this.demoQueries[0]);
  protected activeStep = signal<number>(1);
  protected typedPrompt = signal<string>('');
  protected isTyping = signal<boolean>(false);

  private animationIntervals: any[] = [];
  private animationTimeouts: any[] = [];

  constructor(
    private sanitizer: DomSanitizer,
    protected router: Router,
    private route: ActivatedRoute,
    public themeService: ThemeService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {

    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/work-space']);
      return;
    }

    this.startPipelineAnimation();

    this.route.fragment.subscribe(fragment => {

      if (!fragment) return;

      if (fragment === 'demo') {

        this.startPipelineAnimation();

      } else {

        setTimeout(() => {

          const element = document.getElementById(fragment);

          if (element) {
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
              inline: 'nearest'
            });
          }

        }, 10);

      }

    });

  }

  ngOnDestroy(): void {
    this.clearAnimations();
  }

  protected selectQuery(query: DemoQuery): void {
    this.selectedQuery.set(query);
    this.startPipelineAnimation();
  }

  private clearAnimations(): void {

    this.animationIntervals.forEach(interval => clearInterval(interval));
    this.animationTimeouts.forEach(timeout => clearTimeout(timeout));

    this.animationIntervals = [];
    this.animationTimeouts = [];

    this.isTyping.set(false);

  }

  protected startPipelineAnimation(): void {

    this.clearAnimations();

    this.activeStep.set(1);
    this.typedPrompt.set('');

    const targetPrompt = this.selectedQuery().prompt;

    let charIndex = 0;

    this.isTyping.set(true);

    const interval = setInterval(() => {

      if (charIndex < targetPrompt.length) {

        this.typedPrompt.update(value => value + targetPrompt.charAt(charIndex));
        charIndex++;

      } else {

        clearInterval(interval);

        this.isTyping.set(false);

        const t2 = setTimeout(() => {

          this.activeStep.set(2);

          const t3 = setTimeout(() => {

            this.activeStep.set(3);

            const t4 = setTimeout(() => {

              this.activeStep.set(4);

            }, 750);

            this.animationTimeouts.push(t4);

          }, 900);

          this.animationTimeouts.push(t3);

        }, 250);

        this.animationTimeouts.push(t2);

      }

    }, 12);

    this.animationIntervals.push(interval);

  }
    protected getHighlightedSql(sql: string): SafeHtml {

    const keywords = [
      'SELECT',
      'FROM',
      'JOIN',
      'ON',
      'WHERE',
      'GROUP BY',
      'ORDER BY',
      'DESC',
      'ASC',
      'AND',
      'SUM',
      'COUNT',
      'TOP',
      'FORMAT',
      'AS',
      'YEAR'
    ];

    let highlighted = sql;

    // Escape HTML
    highlighted = highlighted
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // SQL Keywords
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      highlighted = highlighted.replace(
        regex,
        `<span class="text-indigo-400 font-semibold">${keyword}</span>`
      );
    });

    // Strings
    highlighted = highlighted.replace(
      /'([^']+)'/g,
      `<span class="text-emerald-400">'$1'</span>`
    );

    // Numbers
    highlighted = highlighted.replace(
      /\b(\d+)\b/g,
      `<span class="text-amber-400">$1</span>`
    );

    return this.sanitizer.bypassSecurityTrustHtml(highlighted);

  }

  protected getSingleLineSql(sql: string): string {

    return sql
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  }

  goToHome(): void {
    this.router.navigate(['/']);
  }

}