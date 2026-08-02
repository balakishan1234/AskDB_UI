import { Component, Input, Output, EventEmitter, HostListener, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../../services/theme.service';

export interface CommandItem {
  id: string;
  title: string;
  category: 'Pages' | 'Actions' | 'Documentation' | 'FAQ' | 'Navigation';
  description?: string;
  icon?: string;
  shortcut?: string;
  action: () => void;
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './command-palette.html'
})
export class CommandPaletteComponent implements OnInit {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  searchQuery = '';
  selectedIndex = 0;

  commands: CommandItem[] = [];

  constructor(
    private router: Router,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.initCommands();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.isOpen = !this.isOpen;
      if (this.isOpen) {
        this.selectedIndex = 0;
        this.searchQuery = '';
      }
    } else if (event.key === 'Escape' && this.isOpen) {
      this.closePalette();
    } else if (this.isOpen) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const max = this.filteredCommands.length - 1;
        this.selectedIndex = this.selectedIndex < max ? this.selectedIndex + 1 : 0;
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const max = this.filteredCommands.length - 1;
        this.selectedIndex = this.selectedIndex > 0 ? this.selectedIndex - 1 : max;
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const item = this.filteredCommands[this.selectedIndex];
        if (item) {
          this.executeCommand(item);
        }
      }
    }
  }

  private initCommands(): void {
    this.commands = [
      {
        id: 'cmd-home',
        title: 'Go to Home',
        category: 'Navigation',
        description: 'Landing page & natural language demo',
        icon: 'home',
        action: () => this.navigate('/')
      },
      {
        id: 'cmd-request',
        title: 'Request Account Access',
        category: 'Actions',
        description: '7-step guided enterprise onboarding wizard',
        icon: 'user-plus',
        shortcut: 'Shift + R',
        action: () => this.navigate('/request-access')
      },
      {
        id: 'cmd-pricing',
        title: 'View Pricing & Plans',
        category: 'Pages',
        description: 'Starter, Professional, and Enterprise plans',
        icon: 'tag',
        action: () => this.navigate('/pricing')
      },
      {
        id: 'cmd-features',
        title: 'Explore Platform Features',
        category: 'Pages',
        description: 'Natural language queries, RBAC & Visual Query Studio',
        icon: 'sparkles',
        action: () => this.navigate('/features')
      },
      {
        id: 'cmd-security',
        title: 'Security & Compliance',
        category: 'Documentation',
        description: 'Zero self-registration architecture & SOC2 policies',
        icon: 'shield',
        action: () => this.navigate('/security')
      },
      {
        id: 'cmd-theme',
        title: 'Toggle Color Theme',
        category: 'Actions',
        description: 'Switch between Midnight Aurora Dark and Light mode',
        icon: 'moon',
        shortcut: 'Ctrl + T',
        action: () => {
          this.themeService.toggleTheme();
          this.closePalette();
        }
      },
      {
        id: 'cmd-privacy',
        title: 'Privacy Policy',
        category: 'Documentation',
        description: 'Enterprise data retention & privacy terms',
        icon: 'lock',
        action: () => this.navigate('/privacy')
      },
      {
        id: 'cmd-terms',
        title: 'Terms of Service',
        category: 'Documentation',
        description: 'Acceptable use & admin responsibility',
        icon: 'document',
        action: () => this.navigate('/terms')
      },
      {
        id: 'cmd-contact',
        title: 'Contact Sales & Enterprise Support',
        category: 'Pages',
        description: 'Get in touch with AskDB engineering team',
        icon: 'mail',
        action: () => this.navigate('/contact')
      },
      {
        id: 'cmd-status',
        title: 'System Health & Status',
        category: 'FAQ',
        description: 'Check real-time uptime of API & proxies',
        icon: 'activity',
        action: () => this.navigate('/status')
      },
      {
        id: 'cmd-login',
        title: 'Administrator Sign In',
        category: 'Actions',
        description: 'Access the admin console & pending access requests',
        icon: 'key',
        action: () => this.navigate('/login')
      }
    ];
  }

  get filteredCommands(): CommandItem[] {
    if (!this.searchQuery.trim()) {
      return this.commands;
    }
    const q = this.searchQuery.toLowerCase().trim();
    return this.commands.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  }

  executeCommand(item: CommandItem): void {
    item.action();
  }

  private navigate(path: string): void {
    this.router.navigate([path]);
    this.closePalette();
  }

  closePalette(): void {
    this.isOpen = false;
    this.close.emit();
  }
}
